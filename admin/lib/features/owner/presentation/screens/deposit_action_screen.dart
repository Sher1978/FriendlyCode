import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:provider/provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class DepositActionScreen extends StatefulWidget {
  final String? initialUserId;
  final String? initialAction; // 'deduct' or 'topup'

  const DepositActionScreen({
    super.key,
    this.initialUserId,
    this.initialAction,
  });

  @override
  State<DepositActionScreen> createState() => _DepositActionScreenState();
}

class _DepositActionScreenState extends State<DepositActionScreen> {
  bool _isLoading = true;
  String _activeTab = 'topup'; // default to topup

  bool _isStaffUser = false;
  bool _isCheckingStaff = true;

  bool _b2bSubmitted = false;
  bool _isSubmittingB2B = false;

  final TextEditingController _b2bNameCtrl = TextEditingController();
  final TextEditingController _b2bVenueCtrl = TextEditingController();
  final TextEditingController _b2bContactCtrl = TextEditingController();
  final TextEditingController _b2bCityCtrl = TextEditingController();

  String? _userId;
  String _userName = 'Гость';
  String _userEmail = '';
  double _currentBalance = 0.0;
  bool _hasLockedDiscount = false;
  String _venueId = '';

  final TextEditingController _amountCtrl = TextEditingController();
  final TextEditingController _searchCtrl = TextEditingController();
  int _selectedBonusPercent = 0;
  bool _isProcessing = false;

  // QR Scanner state
  bool _showScanner = false;
  bool _scanProcessed = false;
  MobileScannerController? _scannerCtrl;

  @override
  void initState() {
    super.initState();
    _resolveParams();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _searchCtrl.dispose();
    _b2bNameCtrl.dispose();
    _b2bVenueCtrl.dispose();
    _b2bContactCtrl.dispose();
    _b2bCityCtrl.dispose();
    _scannerCtrl?.dispose();
    super.dispose();
  }

  Future<void> _checkStaffPermission() async {
    setState(() => _isCheckingStaff = true);
    try {
      final user = AuthService().currentUser;
      if (user == null) {
        _isStaffUser = false;
        return;
      }

      final docSnap = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .get();

      if (docSnap.exists) {
        final data = docSnap.data();
        final role = (data?['role'] ?? '').toString().toLowerCase();
        if (role == 'owner' ||
            role == 'admin' ||
            role == 'superadmin' ||
            role == 'manager' ||
            role == 'staff' ||
            role == 'waiter' ||
            user.email?.toLowerCase() == '0451611@gmail.com') {
          _isStaffUser = true;
          return;
        }
      }

      final roleProvider = Provider.of<RoleProvider>(context, listen: false);
      if (roleProvider.canManageVenues ||
          roleProvider.venueIds.isNotEmpty ||
          roleProvider.isSuperAdmin) {
        _isStaffUser = true;
        return;
      }

      _isStaffUser = false;
    } catch (e) {
      debugPrint('Error checking staff permission: $e');
      _isStaffUser = false;
    } finally {
      if (mounted) setState(() => _isCheckingStaff = false);
    }
  }

  Map<String, String> _parseQueryParamsFromUrl(String url) {
    final result = <String, String>{};
    try {
      final uri = Uri.parse(url);
      result.addAll(uri.queryParameters);
      if (uri.hasFragment && uri.fragment.contains('?')) {
        final queryStr = uri.fragment.split('?').last;
        final fragUri = Uri.parse('http://dummy.com/?$queryStr');
        result.addAll(fragUri.queryParameters);
      }
    } catch (e) {
      debugPrint('Error parsing query params from URL: $e');
    }
    return result;
  }

  Future<void> _resolveParams() async {
    await _checkStaffPermission();

    final params = _parseQueryParamsFromUrl(Uri.base.toString());
    final qSearch = widget.initialUserId ??
        params['search'] ??
        params['uid'] ??
        params['q'];
    final qAction = widget.initialAction ?? params['action'];

    if (qAction == 'topup' || qAction == 'deduct') {
      _activeTab = qAction!;
    }

    final roleProvider = Provider.of<RoleProvider>(context, listen: false);
    _venueId = roleProvider.venueId ?? '';

    if (qSearch != null && qSearch.isNotEmpty) {
      await _loadUserData(qSearch.trim());
    } else {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadUserData(String query) async {
    final cleanQuery = query.trim();
    if (cleanQuery.isEmpty) return;

    setState(() {
      _isLoading = true;
      _showScanner = false;
      _scanProcessed = false;
    });

    try {
      // If query is a full URL, extract the search term / action first
      final urlParams = _parseQueryParamsFromUrl(cleanQuery);
      final searchFromUrl =
          urlParams['uid'] ?? urlParams['search'] ?? urlParams['q'];
      final actionFromUrl = urlParams['action'];

      if (actionFromUrl == 'deduct' || actionFromUrl == 'topup') {
        _activeTab = actionFromUrl!;
      }

      final targetSearch = searchFromUrl ?? cleanQuery;

      DocumentSnapshot<Map<String, dynamic>>? userDoc;

      // 1. Try users collection by doc ID (UID)
      var docCandidate = await FirebaseFirestore.instance
          .collection('users')
          .doc(targetSearch)
          .get();

      if (docCandidate.exists) {
        userDoc = docCandidate;
      } else {
        // 2. Try by email exact match
        final byEmail = await FirebaseFirestore.instance
            .collection('users')
            .where('email', isEqualTo: targetSearch.toLowerCase())
            .limit(1)
            .get();
        if (byEmail.docs.isNotEmpty) {
          userDoc = byEmail.docs.first;
        } else {
          // 3. Try by displayName exact match (e.g. Cyrillic "Шер")
          final byDisplayName = await FirebaseFirestore.instance
              .collection('users')
              .where('displayName', isEqualTo: targetSearch)
              .limit(1)
              .get();
          if (byDisplayName.docs.isNotEmpty) {
            userDoc = byDisplayName.docs.first;
          } else {
            // 4. Fallback in-memory search across users collection for Cyrillic/partial match
            final allUsers = await FirebaseFirestore.instance
                .collection('users')
                .limit(100)
                .get();
            final qLower = targetSearch.toLowerCase();
            final match = allUsers.docs.where((d) {
              final data = d.data();
              final name = (data['displayName'] ?? data['name'] ?? '')
                  .toString()
                  .toLowerCase();
              final email = (data['email'] ?? '').toString().toLowerCase();
              final uid = d.id.toLowerCase();
              return name.contains(qLower) ||
                  email.contains(qLower) ||
                  uid == qLower;
            }).firstOrNull;
            if (match != null) {
              userDoc = match;
            }
          }
        }
      }

      if (userDoc != null && userDoc.exists) {
        final data = userDoc.data()!;
        _userId = userDoc.id;
        _userName = data['displayName'] ?? data['name'] ?? 'Гость';
        _userEmail = data['email'] ?? '';
        _currentBalance = (data['deposit_balance'] ?? 0.0).toDouble();
        _hasLockedDiscount = data['hasLockedDiscount'] ?? false;
      } else {
        // 5. Try leads
        if (_venueId.isNotEmpty) {
          final leadsSnap = await FirebaseFirestore.instance
              .collection('leads')
              .where('venueId', isEqualTo: _venueId)
              .get();
          final qLower = targetSearch.toLowerCase();
          final match = leadsSnap.docs.where((d) {
            final data = d.data();
            final gName = (data['guestName'] ?? '').toString().toLowerCase();
            final gContact =
                (data['guestContact'] ?? '').toString().toLowerCase();
            return d.id == targetSearch ||
                gName.contains(qLower) ||
                gContact.contains(qLower);
          }).firstOrNull;

          if (match != null && match.exists) {
            final leadData = match.data();
            _userId = leadData['guestId'] ?? match.id;
            _userName = leadData['guestName'] ?? 'Гость';
            _userEmail = leadData['guestContact'] ?? '';
            final uDoc = await FirebaseFirestore.instance
                .collection('users')
                .doc(_userId)
                .get();
            if (uDoc.exists) {
              _currentBalance =
                  (uDoc.data()?['deposit_balance'] ?? 0.0).toDouble();
              _hasLockedDiscount = uDoc.data()?['hasLockedDiscount'] ?? false;
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading user for deposit action: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── QR SCAN ──────────────────────────────────────────────────────────────

  void _openScanner() {
    _scannerCtrl = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
    );
    setState(() {
      _showScanner = true;
      _scanProcessed = false;
    });
  }

  void _closeScanner() {
    _scannerCtrl?.dispose();
    _scannerCtrl = null;
    setState(() => _showScanner = false);
  }

  void _onQrDetected(BarcodeCapture capture) {
    if (_scanProcessed) return;
    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null || raw.isEmpty) return;

    _scanProcessed = true;
    _closeScanner();

    final params = _parseQueryParamsFromUrl(raw);
    final search = params['search'] ?? params['uid'] ?? params['q'];
    final action = params['action'];

    if (action == 'topup' || action == 'deduct') {
      setState(() => _activeTab = action!);
    }

    if (search != null && search.isNotEmpty) {
      _loadUserData(search.trim());
    } else {
      _loadUserData(raw.trim());
    }
  }

  // ── TRANSACTIONS ─────────────────────────────────────────────────────────

  Future<void> _performDeduction() async {
    if (_userId == null || _userId!.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Сначала найдите или отсканируйте QR-код гостя'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    final rawAmount = _amountCtrl.text.replaceAll(' ', '').replaceAll(',', '.').trim();
    final amount = double.tryParse(rawAmount);
    if (amount == null || amount <= 0) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Введите корректную сумму списания'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    if (amount > _currentBalance) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Сумма списания превышает текущий баланс!'),
            backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isProcessing = true);
    try {
      final newBalance = _currentBalance - amount;
      final staffUser = AuthService().currentUser;
      final staffName =
          staffUser?.displayName ?? staffUser?.email ?? 'Официант';

      await FirebaseFirestore.instance
          .collection('users')
          .doc(_userId)
          .set({
        'deposit_balance': newBalance,
        if (_venueId.isNotEmpty) 'deposit_venue_id': _venueId,
        if (_venueId.isNotEmpty)
          'deposit_balances': {_venueId: newBalance},
      }, SetOptions(merge: true));

      await FirebaseFirestore.instance.collection('deposit_transactions').add({
        'userId': _userId,
        'guestName': _userName,
        'guestEmail': _userEmail,
        'venueId': _venueId,
        'amount': amount,
        'type': 'DEBIT',
        'previousBalance': _currentBalance,
        'newBalance': newBalance,
        'staffName': staffName,
        'staffEmail': staffUser?.email ?? '',
        'createdAt': FieldValue.serverTimestamp(),
      });

      setState(() => _currentBalance = newBalance);
      _amountCtrl.clear();

      if (mounted) {
        showCupertinoDialog(
          context: context,
          builder: (ctx) => CupertinoAlertDialog(
            title: const Text('Успешное списание'),
            content: Text(
                'Сумма $amount ₫ списана с депозита $_userName.\nОстаток: $newBalance ₫'),
            actions: [
              CupertinoDialogAction(
                  child: const Text('ОК'),
                  onPressed: () => Navigator.pop(ctx)),
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint('Error deduction: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка при списании: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _performTopUp() async {
    if (_userId == null || _userId!.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Сначала найдите или отсканируйте QR-код гостя'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    final rawAmount = _amountCtrl.text.replaceAll(' ', '').replaceAll(',', '.').trim();
    final amount = double.tryParse(rawAmount);
    if (amount == null || amount <= 0) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Введите корректную сумму пополнения (например: 100000)'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    setState(() => _isProcessing = true);
    try {
      final bonusAmount = amount * (_selectedBonusPercent / 100.0);
      final totalCredit = amount + bonusAmount;
      final newBalance = _currentBalance + totalCredit;
      final staffUser = AuthService().currentUser;
      final staffName =
          staffUser?.displayName ?? staffUser?.email ?? 'Персонал';

      await FirebaseFirestore.instance
          .collection('users')
          .doc(_userId)
          .set({
        'deposit_balance': newBalance,
        if (_venueId.isNotEmpty) 'deposit_venue_id': _venueId,
        if (_venueId.isNotEmpty)
          'deposit_balances': {_venueId: newBalance},
        'hasLockedDiscount': _hasLockedDiscount,
        'displayName': _userName,
        'email': _userEmail,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      await FirebaseFirestore.instance.collection('deposit_transactions').add({
        'userId': _userId,
        'guestName': _userName,
        'guestEmail': _userEmail,
        'venueId': _venueId,
        'amount': amount,
        'bonusPercent': _selectedBonusPercent,
        'bonusAmount': bonusAmount,
        'totalCredit': totalCredit,
        'type': 'CREDIT',
        'previousBalance': _currentBalance,
        'newBalance': newBalance,
        'staffName': staffName,
        'staffEmail': staffUser?.email ?? '',
        'createdAt': FieldValue.serverTimestamp(),
      });

      setState(() => _currentBalance = newBalance);
      _amountCtrl.clear();

      if (mounted) {
        showCupertinoDialog(
          context: context,
          builder: (ctx) => CupertinoAlertDialog(
            title: const Text('Успешное пополнение'),
            content: Text(
                'Депозит $_userName пополнен на $totalCredit ₫ (Бонус $_selectedBonusPercent%).\nНовый баланс: $newBalance ₫'),
            actions: [
              CupertinoDialogAction(
                  child: const Text('ОК'),
                  onPressed: () => Navigator.pop(ctx)),
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint('Error top up: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка при пополнении: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_isCheckingStaff) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: CupertinoActivityIndicator(
            radius: 16,
            color: AppColors.accentYellow,
          ),
        ),
      );
    }

    if (!_isStaffUser) {
      return _buildB2BPartnerLeadScreen();
    }

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.chevron_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Управление Депозитом Гостя',
          style: TextStyle(
              color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
        ),
        // ── 📷 Camera button — backup scan flow ──────────────────────────
        actions: [
          CupertinoButton(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            onPressed: _showScanner ? _closeScanner : _openScanner,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: _showScanner
                  ? const Icon(CupertinoIcons.xmark_circle_fill,
                      key: ValueKey('close'), color: Colors.white70, size: 24)
                  : const Icon(CupertinoIcons.camera_viewfinder,
                      key: ValueKey('cam'),
                      color: AppColors.accentYellow,
                      size: 26),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          // ── Main scrollable content ─────────────────────────────────────
          _isLoading
              ? const Center(
                  child: CupertinoActivityIndicator(
                      radius: 14, color: AppColors.accentOrange))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 500),
                      child: Column(
                        children: [
                          // ── No user: show search + camera hint ─────────
                          if (_userId == null) ...[
                            _buildSearchPanel(),
                            const SizedBox(height: 20),
                          ],

                          // ── User found: show info + actions ────────────
                          if (_userId != null) ...[
                            _buildUserCard(),
                            const SizedBox(height: 24),
                            _buildTabControl(),
                            const SizedBox(height: 24),
                            if (_activeTab == 'deduct')
                              _buildDeductForm()
                            else
                              _buildTopUpForm(),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),

          // ── QR Scanner overlay (backup flow) ───────────────────────────
          if (_showScanner) _buildScannerOverlay(),
        ],
      ),
    );
  }

  // ── WIDGETS ───────────────────────────────────────────────────────────────

  Widget _buildSearchPanel() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1C1E),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.accentYellow.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              const Text('💰', style: TextStyle(fontSize: 18)),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'НАЙТИ ГОСТЯ',
                  style: TextStyle(
                    color: AppColors.accentYellow,
                    fontWeight: FontWeight.w900,
                    fontSize: 11,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
              // Camera shortcut
              GestureDetector(
                onTap: _openScanner,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.accentYellow.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: AppColors.accentYellow.withOpacity(0.5)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(CupertinoIcons.camera_fill,
                          color: AppColors.accentYellow, size: 14),
                      SizedBox(width: 5),
                      Text(
                        'Сканировать QR',
                        style: TextStyle(
                          color: AppColors.accentYellow,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Text search
          CupertinoTextField(
            controller: _searchCtrl,
            placeholder: 'Имя, email или UID гостя...',
            placeholderStyle:
                TextStyle(color: Colors.white.withOpacity(0.25)),
            style: const TextStyle(color: Colors.white, fontSize: 16),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.4),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: AppColors.accentYellow.withOpacity(0.3)),
            ),
            clearButtonMode: OverlayVisibilityMode.editing,
            onSubmitted: (val) {
              if (val.trim().isNotEmpty) _loadUserData(val.trim());
            },
          ),
          const SizedBox(height: 12),

          SizedBox(
            width: double.infinity,
            child: CupertinoButton(
              color: AppColors.accentYellow,
              borderRadius: BorderRadius.circular(14),
              onPressed: () {
                final q = _searchCtrl.text.trim();
                if (q.isNotEmpty) _loadUserData(q);
              },
              child: const Text(
                'Найти гостя',
                style: TextStyle(
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                    fontSize: 15),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1C1E),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: AppColors.accentOrange.withOpacity(0.2),
            child: const Icon(CupertinoIcons.person_fill,
                color: AppColors.accentOrange, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_userName,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 18)),
                if (_userEmail.isNotEmpty)
                  Text(_userEmail,
                      style: TextStyle(
                          color: Colors.white.withOpacity(0.5), fontSize: 12)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text('Баланс',
                  style: TextStyle(
                      color: Colors.white70,
                      fontSize: 10,
                      fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Text(
                '${_currentBalance.toStringAsFixed(0)} ₫',
                style: const TextStyle(
                    color: AppColors.accentGreen,
                    fontWeight: FontWeight.w900,
                    fontSize: 20),
              ),
            ],
          ),
          // Change user button
          const SizedBox(width: 12),
          GestureDetector(
            onTap: () => setState(() {
              _userId = null;
              _userName = 'Гость';
              _userEmail = '';
              _currentBalance = 0;
              _searchCtrl.clear();
            }),
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.06),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(CupertinoIcons.arrow_2_circlepath,
                  color: Colors.white38, size: 16),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabControl() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: [
          _buildTab('deduct', '💳 Списать чек', AppColors.accentOrange),
          _buildTab('topup', '➕ Пополнить', AppColors.accentGreen),
        ],
      ),
    );
  }

  Widget _buildTab(String tab, String label, Color activeColor) {
    final isActive = _activeTab == tab;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeTab = tab),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isActive ? activeColor : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              color: isActive ? Colors.black : Colors.white70,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildScannerOverlay() {
    return Container(
      color: Colors.black,
      child: Column(
        children: [
          // Header
          SafeArea(
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '📷 СКАНИРОВАТЬ QR ГОСТЯ',
                          style: TextStyle(
                            color: AppColors.accentYellow,
                            fontWeight: FontWeight.w900,
                            fontSize: 11,
                            letterSpacing: 1.5,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Наведите камеру на QR-код с телефона гостя',
                          style: TextStyle(color: Colors.white54, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: _closeScanner,
                    child: const Icon(CupertinoIcons.xmark_circle_fill,
                        color: Colors.white54, size: 28),
                  ),
                ],
              ),
            ),
          ),

          // Camera view
          Expanded(
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Scanner
                MobileScanner(
                  controller: _scannerCtrl!,
                  onDetect: _onQrDetected,
                ),

                // Viewfinder overlay
                CustomPaint(
                  size: const Size(260, 260),
                  painter: _ScannerFramePainter(),
                ),

                // Hint text
                Positioned(
                  bottom: 40,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Text(
                      'QR с депозитного экрана гостя',
                      style: TextStyle(
                          color: Colors.white70,
                          fontSize: 13,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeductForm() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1C1E),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Сумма чека заведения (к списанию)',
              style: TextStyle(
                  color: Colors.white70,
                  fontSize: 13,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          CupertinoTextField(
            controller: _amountCtrl,
            keyboardType: TextInputType.number,
            placeholder: '0 ₫',
            placeholderStyle:
                TextStyle(color: Colors.white.withOpacity(0.2)),
            style: const TextStyle(
                color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.4),
              borderRadius: BorderRadius.circular(16),
              border:
                  Border.all(color: AppColors.accentOrange.withOpacity(0.5)),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: CupertinoButton(
              color: AppColors.accentOrange,
              borderRadius: BorderRadius.circular(16),
              onPressed: _isProcessing ? null : _performDeduction,
              child: _isProcessing
                  ? const CupertinoActivityIndicator(color: Colors.black)
                  : const Text('Списать с депозита',
                      style: TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopUpForm() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1C1E),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Сумма внесённых средств',
              style: TextStyle(
                  color: Colors.white70,
                  fontSize: 13,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          CupertinoTextField(
            controller: _amountCtrl,
            keyboardType: TextInputType.number,
            placeholder: '0 ₫',
            placeholderStyle:
                TextStyle(color: Colors.white.withOpacity(0.2)),
            style: const TextStyle(
                color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.4),
              borderRadius: BorderRadius.circular(16),
              border:
                  Border.all(color: AppColors.accentGreen.withOpacity(0.5)),
            ),
          ),
          const SizedBox(height: 20),
          const Text('Бонус заведения при пополнении:',
              style: TextStyle(
                  color: Colors.white70,
                  fontSize: 12,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [0, 5, 10, 15, 20].map((bonus) {
              final isSel = _selectedBonusPercent == bonus;
              return GestureDetector(
                onTap: () => setState(() => _selectedBonusPercent = bonus),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSel
                        ? AppColors.accentGreen
                        : Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: isSel
                            ? AppColors.accentGreen
                            : Colors.white.withOpacity(0.1)),
                  ),
                  child: Text(
                    '+$bonus%',
                    style: TextStyle(
                        color: isSel ? Colors.black : Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              CupertinoSwitch(
                value: _hasLockedDiscount,
                activeColor: AppColors.accentGreen,
                onChanged: (val) =>
                    setState(() => _hasLockedDiscount = val),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text('Закрепить вечный VIP-максимум',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: CupertinoButton(
              color: AppColors.accentGreen,
              borderRadius: BorderRadius.circular(16),
              onPressed: _isProcessing ? null : _performTopUp,
              child: _isProcessing
                  ? const CupertinoActivityIndicator(color: Colors.black)
                  : const Text('Пополнить баланс депозита',
                      style: TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }

  // ── B2B PARTNER LEAD FORM FOR NON-STAFF USERS ────────────────────────────

  Widget _buildB2BPartnerLeadScreen() {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.chevron_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'REVOO Business',
          style: TextStyle(
              color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 480),
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: const Color(0xFF1C1C1E),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(
                  color: AppColors.accentYellow.withOpacity(0.3), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: AppColors.accentYellow.withOpacity(0.08),
                  blurRadius: 30,
                  spreadRadius: 2,
                )
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // REVOO Badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.accentYellow.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: AppColors.accentYellow.withOpacity(0.4)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('⚡ ', style: TextStyle(fontSize: 12)),
                      Text(
                        'REVOO BUSINESS',
                        style: TextStyle(
                          color: AppColors.accentYellow,
                          fontWeight: FontWeight.w900,
                          fontSize: 11,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                const Text(
                  'Подключите ваше заведение к REVOO',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 22,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 12),

                const Text(
                  'Начисление депозитов доступно только авторизованному персоналу заведений.\n\nХотите подключить ваше заведение к REVOO, зафиксировать регулярную лояльность и увеличивать выручку? Оставьте заявку ниже!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 28),

                if (_b2bSubmitted) ...[
                  // Success State
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.accentGreen.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: AppColors.accentGreen.withOpacity(0.4)),
                    ),
                    child: const Column(
                      children: [
                        Text('🎉', style: TextStyle(fontSize: 40)),
                        SizedBox(height: 12),
                        Text(
                          'Заявка успешно принята!',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Наш менеджер свяжется с вами в течение 15 минут для подключения вашего заведения.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  // Registration Form
                  CupertinoTextField(
                    controller: _b2bNameCtrl,
                    placeholder: 'Ваше имя...',
                    placeholderStyle:
                        TextStyle(color: Colors.white.withOpacity(0.3)),
                    style: const TextStyle(color: Colors.white, fontSize: 15),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withOpacity(0.15)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  CupertinoTextField(
                    controller: _b2bVenueCtrl,
                    placeholder: 'Название заведения (ресторан, кафе, бар)...',
                    placeholderStyle:
                        TextStyle(color: Colors.white.withOpacity(0.3)),
                    style: const TextStyle(color: Colors.white, fontSize: 15),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withOpacity(0.15)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  CupertinoTextField(
                    controller: _b2bContactCtrl,
                    placeholder: 'Телефон / WhatsApp / Telegram...',
                    placeholderStyle:
                        TextStyle(color: Colors.white.withOpacity(0.3)),
                    style: const TextStyle(color: Colors.white, fontSize: 15),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withOpacity(0.15)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  CupertinoTextField(
                    controller: _b2bCityCtrl,
                    placeholder: 'Город...',
                    placeholderStyle:
                        TextStyle(color: Colors.white.withOpacity(0.3)),
                    style: const TextStyle(color: Colors.white, fontSize: 15),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withOpacity(0.15)),
                    ),
                  ),
                  const SizedBox(height: 20),

                  SizedBox(
                    width: double.infinity,
                    child: CupertinoButton(
                      color: AppColors.accentYellow,
                      borderRadius: BorderRadius.circular(16),
                      onPressed: _isSubmittingB2B ? null : _submitB2BLead,
                      child: _isSubmittingB2B
                          ? const CupertinoActivityIndicator(color: Colors.black)
                          : const Text(
                              'Отправить заявку на подключение',
                              style: TextStyle(
                                color: Colors.black,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                    ),
                  ),
                ],

                const SizedBox(height: 24),

                // Staff Sign-in Button
                GestureDetector(
                  onTap: () async {
                    try {
                      final cred = await AuthService().signInWithGoogle();
                      if (cred != null) {
                        await _checkStaffPermission();
                      }
                    } catch (e) {
                      debugPrint('Staff signin error: $e');
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.06),
                      borderRadius: BorderRadius.circular(14),
                      border:
                          Border.all(color: Colors.white.withOpacity(0.12)),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(CupertinoIcons.lock_fill,
                            color: Colors.white70, size: 14),
                        SizedBox(width: 8),
                        Text(
                          '🔑 Я сотрудник заведения — Войти',
                          style: TextStyle(
                            color: Colors.white70,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submitB2BLead() async {
    final name = _b2bNameCtrl.text.trim();
    final venue = _b2bVenueCtrl.text.trim();
    final contact = _b2bContactCtrl.text.trim();
    final city = _b2bCityCtrl.text.trim();

    if (name.isEmpty || contact.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Пожалуйста, укажите имя и контакты для связи'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isSubmittingB2B = true);
    try {
      await FirebaseFirestore.instance.collection('b2b_leads').add({
        'name': name,
        'venueName': venue,
        'contact': contact,
        'city': city,
        'source': 'deposit_qr_scan',
        'createdAt': FieldValue.serverTimestamp(),
      });

      setState(() {
        _b2bSubmitted = true;
      });
    } catch (e) {
      debugPrint('Error submitting B2B lead: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Ошибка отправки: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmittingB2B = false);
    }
  }
}

// ── Scanner frame painter ─────────────────────────────────────────────────────
class _ScannerFramePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.accentYellow
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const cornerLen = 36.0;
    const r = 16.0;
    final w = size.width;
    final h = size.height;

    // Top-left
    canvas.drawLine(
        Offset(r, 0), Offset(r + cornerLen, 0), paint);
    canvas.drawLine(
        Offset(0, r), Offset(0, r + cornerLen), paint);
    canvas.drawArc(
        Rect.fromLTWH(0, 0, r * 2, r * 2), -3.14, 1.57, false, paint);

    // Top-right
    canvas.drawLine(
        Offset(w - r - cornerLen, 0), Offset(w - r, 0), paint);
    canvas.drawLine(
        Offset(w, r), Offset(w, r + cornerLen), paint);
    canvas.drawArc(
        Rect.fromLTWH(w - r * 2, 0, r * 2, r * 2), -1.57, 1.57, false, paint);

    // Bottom-left
    canvas.drawLine(
        Offset(0, h - r - cornerLen), Offset(0, h - r), paint);
    canvas.drawLine(
        Offset(r, h), Offset(r + cornerLen, h), paint);
    canvas.drawArc(
        Rect.fromLTWH(0, h - r * 2, r * 2, r * 2), 1.57, 1.57, false, paint);

    // Bottom-right
    canvas.drawLine(
        Offset(w, h - r - cornerLen), Offset(w, h - r), paint);
    canvas.drawLine(
        Offset(w - r - cornerLen, h), Offset(w - r, h), paint);
    canvas.drawArc(
        Rect.fromLTWH(w - r * 2, h - r * 2, r * 2, r * 2), 0, 1.57, false,
        paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
