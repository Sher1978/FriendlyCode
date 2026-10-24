import 'dart:ui';
import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/features/admin/presentation/dialogs/telegram_staff_connect_dialog.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;

class VenueStaffScreen extends StatefulWidget {
  final String venueId;
  const VenueStaffScreen({super.key, required this.venueId});

  @override
  State<VenueStaffScreen> createState() => _VenueStaffScreenState();
}

class _VenueStaffScreenState extends State<VenueStaffScreen> {
  final _firestore = FirebaseFirestore.instance;
  final TextEditingController _searchCtrl = TextEditingController();
  final TextEditingController _telegramUsernameCtrl = TextEditingController();
  final TextEditingController _manualNameCtrl = TextEditingController();
  
  bool _isSearching = false;
  Map<String, dynamic>? _searchResult;
  String? _searchResultId;
  String? _searchError;
  String _selectedManualRole = 'staff';
  StreamSubscription? _staffReqSub;

  @override
  void initState() {
    super.initState();
    _listenToPendingStaffRequests();
  }

  @override
  void dispose() {
    _staffReqSub?.cancel();
    _searchCtrl.dispose();
    _telegramUsernameCtrl.dispose();
    _manualNameCtrl.dispose();
    super.dispose();
  }

  void _listenToPendingStaffRequests() {
    _staffReqSub = _firestore
        .collection('staff_requests')
        .where('venueId', isEqualTo: widget.venueId)
        .where('status', isEqualTo: 'pending')
        .snapshots()
        .listen((snapshot) {
      if (snapshot.docs.isNotEmpty) {
        final doc = snapshot.docs.first;
        if (mounted) {
          _showOwnerRoleAssignmentDialog(doc.id, doc.data());
        }
      }
    });
  }

  void _showOwnerRoleAssignmentDialog(String reqId, Map<String, dynamic> data) {
    String selectedRole = 'staff';
    showCupertinoDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return CupertinoAlertDialog(
              title: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(CupertinoIcons.qrcode, color: AppColors.accentYellow),
                  SizedBox(width: 8),
                  Text("МОЙ БИЗНЕС"),
                ],
              ),
              content: Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text("Сотрудник отсканировал QR-код!\nВыберите роль для привязки:"),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        children: [
                          Text(data['name'] ?? 'Без имени', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                          Text(data['email'] ?? '', style: const TextStyle(fontSize: 12, color: AppColors.macosTextSecondary)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    CupertinoSegmentedControl<String>(
                      groupValue: selectedRole,
                      children: const {
                        'staff': Text('Стафф', style: TextStyle(fontSize: 11)),
                        'manager': Text('Менеджер', style: TextStyle(fontSize: 11)),
                        'admin': Text('Админ', style: TextStyle(fontSize: 11)),
                      },
                      onValueChanged: (val) {
                        setDialogState(() => selectedRole = val);
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                CupertinoDialogAction(
                  isDestructiveAction: true,
                  child: const Text("Отклонить"),
                  onPressed: () async {
                    await _firestore.collection('staff_requests').doc(reqId).update({'status': 'rejected'});
                    if (context.mounted) Navigator.pop(context);
                  },
                ),
                CupertinoDialogAction(
                  isDefaultAction: true,
                  child: const Text("ПОДТВЕРДИТЬ РОЛЬ"),
                  onPressed: () async {
                    final uid = data['employeeUid'];
                    final email = (data['email'] as String? ?? '').toLowerCase();
                    final venueId = data['venueId'];

                    if (uid != null) {
                      await _firestore.collection('users').doc(uid).set({
                        'role': selectedRole,
                        'venueId': venueId,
                        'displayName': data['name'],
                        'email': email,
                        'updatedAt': FieldValue.serverTimestamp(),
                      }, SetOptions(merge: true));
                    }

                    await _firestore.collection('staff_requests').doc(reqId).update({
                      'status': 'approved',
                      'assignedRole': selectedRole,
                      'approvedAt': FieldValue.serverTimestamp(),
                    });

                    if (context.mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text("Сотрудник ${data['name']} успешно добавлен!"), backgroundColor: Colors.green),
                      );
                    }
                  },
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _performSearch() async {
    final email = _searchCtrl.text.trim().toLowerCase();
    if (email.isEmpty) return;

    setState(() {
      _isSearching = true;
      _searchError = null;
      _searchResult = null;
      _searchResultId = null;
    });

    try {
      final snap = await _firestore.collection('users')
          .where('email', isEqualTo: email)
          .limit(1)
          .get();

      if (snap.docs.isEmpty) {
        setState(() {
          _searchResultId = null;
          _searchResult = {
            'email': email,
            'displayName': '',
            'isNewStub': true,
          };
          _isSearching = false;
        });
      } else {
        setState(() {
          _searchResultId = snap.docs.first.id;
          _searchResult = snap.docs.first.data();
          _isSearching = false;
        });
      }
    } catch (e) {
      setState(() {
        _searchError = "Error: $e";
        _isSearching = false;
      });
    }
  }

  Future<void> _addStaff(String? uid, String telegramUsername, String selectedRole) async {
    final formattedUsername = telegramUsername.replaceAll('@', '').trim().toLowerCase();
    
    try {
      if (uid != null && uid.isNotEmpty) {
        final Map<String, dynamic> updateData = {
          'role': selectedRole,
          'venueId': widget.venueId,
          'updatedAt': FieldValue.serverTimestamp(),
        };
        if (formattedUsername.isNotEmpty) {
          updateData['telegram_username'] = formattedUsername;
          updateData['telegramUsername'] = formattedUsername;
        }
        await _firestore.collection('users').doc(uid).update(updateData);
      } else {
        final email = _searchCtrl.text.trim().toLowerCase();
        final name = _manualNameCtrl.text.trim();
        if (name.isEmpty) {
          setState(() {
            _searchError = "Validation Error: Please enter full name for the new user.";
          });
          return;
        }
        final newUserRef = _firestore.collection('users').doc();
        final Map<String, dynamic> setData = {
          'displayName': name,
          'email': email,
          'role': selectedRole,
          'venueId': widget.venueId,
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        };
        if (formattedUsername.isNotEmpty) {
          setData['telegram_username'] = formattedUsername;
          setData['telegramUsername'] = formattedUsername;
        }
        await newUserRef.set(setData);
      }

      setState(() {
        _searchResult = null;
        _searchResultId = null;
        _searchCtrl.clear();
        _telegramUsernameCtrl.clear();
        _manualNameCtrl.clear();
        _searchError = null;
      });

      if (mounted) {
        showCupertinoDialog(
          context: context,
          builder: (context) => CupertinoAlertDialog(
            title: const Text("Personnel Assigned"),
            content: Text("Role '$selectedRole' has been saved to DB for this venue."),
            actions: [
              CupertinoDialogAction(child: const Text("OK"), onPressed: () => Navigator.pop(context)),
            ],
          ),
        );
      }
    } catch (e) {
      setState(() {
        _searchError = "Error saving role: $e";
      });
    }
  }

  Future<void> _removeStaff(String uid) async {
    await _firestore.collection('users').doc(uid).update({
      'role': 'user',
      'venueId': null,
      'telegram_username': FieldValue.delete(),
      'telegramUsername': FieldValue.delete(),
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Staff removed"), backgroundColor: Colors.orange));
    }
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.chevron_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 900),
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  "Staff Management",
                  style: TextStyle(
                    color: AppColors.macosTextPrimary,
                    fontSize: 34,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -1.0,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Assign users as staff member for this venue to process redemptions.",
                  style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 16),
                ),
                _buildTelegramGuideCard(),

                const SizedBox(height: 32),
                
                _buildAddStaffSection(),
                
                const SizedBox(height: 48),
                
                const Text(
                  "CURRENT STAFF MEMBERS",
                  style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
                ),
                const SizedBox(height: 16),
                
                StreamBuilder<QuerySnapshot>(
                  // Compound queries (venueId + role) require a Firestore composite index.
                  // Filtering by venueId only avoids that requirement; role filtering is done in code.
                  stream: _firestore.collection('users')
                      .where('venueId', isEqualTo: widget.venueId)
                      .snapshots(),
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) return const Center(child: CupertinoActivityIndicator());
                    
                    // Filter in code: exclude superadmin and unrelated roles
                    const superAdminEmail = '0451611@gmail.com';
                    final staff = snapshot.data!.docs.where((doc) {
                      final d = doc.data() as Map<String, dynamic>;
                      final role = (d['role'] as String? ?? '').toLowerCase();
                      final email = (d['email'] as String? ?? '').toLowerCase();
                      return role != 'superadmin'
                          && email != superAdminEmail
                          && (role == 'staff' || role == 'manager' || role == 'admin' || role == 'owner');
                    }).toList();
                    
                    if (staff.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 32),
                        child: Center(
                          child: Text("No staff members assigned.", 
                            style: TextStyle(color: AppColors.macosTextSecondary.withOpacity(0.5))),
                        ),
                      );
                    }

                    return ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: staff.length,
                      itemBuilder: (context, index) {
                        final data = staff[index].data() as Map<String, dynamic>;
                        return _buildStaffTile(staff[index].id, data);
                      },
                    );
                  },
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAddStaffSection() {
    final staffQrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${Uri.encodeComponent('https://bot-lab-21910.web.app/staff-join?venueId=${widget.venueId}')}";
    return Column(
      children: [
        _buildGlassContainer(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(CupertinoIcons.qrcode_viewfinder, color: AppColors.accentYellow, size: 22),
                  SizedBox(width: 8),
                  Text(
                    "МОЙ БИЗНЕС — QR-КОД ДЛЯ ПРИВЯЗКИ СОТРУДНИКА",
                    style: TextStyle(color: AppColors.accentYellow, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                "Дайте отсканировать этот QR-код новому сотруднику. При сканировании сотрудником на вашем экране автоматически откроется окно выбора и подтверждения роли оунером. При подтверждении создается запись нового сотрудника.",
                style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
              ),
              const SizedBox(height: 16),
              Center(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(color: Colors.amber.withOpacity(0.3), blurRadius: 20, spreadRadius: 2),
                    ],
                  ),
                  child: Image.network(
                    staffQrUrl,
                    width: 180,
                    height: 180,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: SelectableText(
                  "https://bot-lab-21910.web.app/staff-join?venueId=${widget.venueId}",
                  style: const TextStyle(color: CupertinoColors.activeBlue, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        _buildGlassContainer(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "ADD NEW STAFF (MANUAL SEARCH)",
                style: TextStyle(color: CupertinoColors.activeBlue, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
              ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: CupertinoSearchTextField(
                  controller: _searchCtrl,
                  placeholder: "Search user by email...",
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  onSubmitted: (_) => _performSearch(),
                ),
              ),
              const SizedBox(width: 12),
              _isSearching 
                ? const CupertinoActivityIndicator()
                : CupertinoButton(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    color: CupertinoColors.activeBlue,
                    borderRadius: BorderRadius.circular(8),
                    onPressed: _performSearch,
                    child: const Text("Search", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  ),
            ],
          ),
          if (_searchError != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(_searchError!, style: const TextStyle(color: CupertinoColors.systemRed, fontSize: 13)),
            ),
          if (_searchResult != null)
            Padding(
              padding: const EdgeInsets.only(top: 24),
              child: _buildSearchResultCard(),
            ),
        ],
      ),
    ),
  ],
);
  }

  Widget _buildSearchResultCard() {
    final isNewStub = _searchResult!['isNewStub'] == true;
    final displayName = _searchResult!['displayName'] as String? ?? '';
    final email = _searchResult!['email'] as String? ?? '';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.macosDivider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isNewStub)
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.accentOrange.withOpacity(0.12),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.accentOrange.withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  Icon(CupertinoIcons.info_circle_fill, color: AppColors.accentOrange, size: 16),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "User profile not found in database — a new profile will be created automatically.",
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          Row(
            children: [
              CircleAvatar(
                backgroundColor: AppColors.brandOrange.withOpacity(0.2),
                child: const Icon(CupertinoIcons.person_fill, color: AppColors.brandOrange),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayName.isNotEmpty ? displayName : (isNewStub ? "New User Profile" : "Unnamed User"), 
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      email, 
                      style: TextStyle(color: AppColors.macosTextSecondary.withOpacity(0.7), fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (isNewStub) ...[
            const SizedBox(height: 14),
            const Text(
              "Full Name (Required for new profile)", 
              style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 11, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            CupertinoTextField(
              controller: _manualNameCtrl,
              placeholder: "e.g. Alex Smith",
              placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.2), fontSize: 13),
              style: const TextStyle(color: Colors.white, fontSize: 13),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.macosDivider),
              ),
            ),
          ],
          const SizedBox(height: 14),
          const Text(
            "Assigned Role", 
            style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 11, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          SizedBox(
            width: double.infinity,
            child: CupertinoSegmentedControl<String>(
              groupValue: _selectedManualRole,
              children: const {
                'staff': Text('STAFF', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                'manager': Text('MANAGER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                'admin': Text('ADMIN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                'owner': Text('OWNER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              },
              onValueChanged: (val) {
                if (val != null) setState(() => _selectedManualRole = val);
              },
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            "Telegram Username (Optional)", 
            style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 11, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          CupertinoTextField(
            controller: _telegramUsernameCtrl,
            placeholder: "e.g. john_doe (without @)",
            placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.2), fontSize: 13),
            style: const TextStyle(color: Colors.white, fontSize: 13),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.macosDivider),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: CupertinoButton(
              color: CupertinoColors.activeGreen,
              borderRadius: BorderRadius.circular(8),
              onPressed: () {
                final username = _telegramUsernameCtrl.text.trim();
                _addStaff(_searchResultId, username, _selectedManualRole);
              },
              child: const Text("SAVE PERSONNEL TO DB", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black)),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _editTelegramUsername(String uid, String currentUsername) async {
    final ctrl = TextEditingController(text: currentUsername);
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text("Edit Telegram Username"),
        content: Padding(
          padding: const EdgeInsets.only(top: 12),
          child: CupertinoTextField(
            controller: ctrl,
            placeholder: "Telegram Username (without @)",
            style: const TextStyle(color: Colors.white, fontSize: 13),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        actions: [
          CupertinoDialogAction(
            child: const Text("Cancel"),
            onPressed: () => Navigator.pop(context),
          ),
          CupertinoDialogAction(
            child: const Text("Save"),
            onPressed: () async {
              final val = ctrl.text.trim();
              if (val.isEmpty) {
                await _firestore.collection('users').doc(uid).update({
                  'telegram_username': FieldValue.delete(),
                  'telegramUsername': FieldValue.delete(),
                });
              } else {
                final formatted = val.replaceAll('@', '').trim().toLowerCase();
                await _firestore.collection('users').doc(uid).update({
                  'telegram_username': formatted,
                  'telegramUsername': formatted,
                });
              }
              if (mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Telegram username updated"), backgroundColor: Colors.green)
                );
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildStaffTile(String uid, Map<String, dynamic> data) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.macosDivider),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundImage: data['photoUrl'] != null ? NetworkImage(data['photoUrl']) : null,
            child: data['photoUrl'] == null ? const Icon(CupertinoIcons.person_fill, size: 20) : null,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(data['displayName'] ?? "Staff Member", 
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                Text(data['email'] ?? "", 
                  style: TextStyle(color: AppColors.macosTextSecondary.withOpacity(0.6), fontSize: 12)),
                const SizedBox(height: 4),
                Text("Telegram: @${data['telegram_username'] ?? data['telegramUsername'] ?? 'None'}", 
                  style: const TextStyle(color: AppColors.accentYellow, fontSize: 11, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          CupertinoButton(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: const Text("Edit", style: TextStyle(color: CupertinoColors.activeBlue, fontSize: 13)),
            onPressed: () => _editTelegramUsername(uid, data['telegram_username'] ?? data['telegramUsername'] ?? ''),
          ),
          CupertinoButton(
            padding: EdgeInsets.zero,
            child: const Text("Remove", style: TextStyle(color: CupertinoColors.systemRed, fontSize: 13)),
            onPressed: () => _removeStaff(uid),
          ),
        ],
      ),
    );
  }


  Widget _buildTelegramGuideCard() {
    final registerCmd = "/register_venue ${widget.venueId}";
    final oneClickUrl = "https://t.me/FriendIycode_bot?startgroup=reg_${widget.venueId}";

    return StreamBuilder<DocumentSnapshot>(
      stream: _firestore.collection('venues').doc(widget.venueId).snapshots(),
      builder: (context, snap) {
        final data = snap.data?.data() as Map<String, dynamic>?;
        final venueName = data?['name']?.toString() ?? 'Заведение';
        final groupId = data?['telegramGroupId']?.toString() ?? data?['telegram_group_id']?.toString() ?? '';
        final isConnected = groupId.trim().isNotEmpty;
        final venueModel = VenueModel(id: widget.venueId, name: venueName, address: data?['address']?.toString() ?? '', telegramStaffChatId: groupId);

        return Container(
          margin: const EdgeInsets.only(top: 24),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isConnected ? const Color(0xFF0F2520) : const Color(0xFF14202B),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isConnected ? AppColors.accentTeal.withValues(alpha: 0.5) : const Color(0xFF0088CC).withValues(alpha: 0.4),
              width: 1.2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isConnected ? AppColors.accentTeal.withValues(alpha: 0.2) : const Color(0xFF0088CC).withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isConnected ? CupertinoIcons.checkmark_seal_fill : CupertinoIcons.paperplane_fill,
                      color: isConnected ? AppColors.accentTeal : const Color(0xFF0088CC),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isConnected ? "Группа команды в Telegram подключена!" : "Подключение Telegram-бота и группы заведения",
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isConnected ? "Чат ID: $groupId • Прием заявок, бронирований и обучение ИИ активны" : "Добавьте бота в чат команды для доставки заявок и мгновенного обучения",
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isConnected ? AppColors.accentTeal.withValues(alpha: 0.25) : const Color(0xFF0088CC),
                      foregroundColor: isConnected ? AppColors.accentTeal : Colors.white,
                      side: isConnected ? const BorderSide(color: AppColors.accentTeal) : BorderSide.none,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => TelegramStaffConnectDialog(venue: venueModel),
                      );
                    },
                    icon: Icon(isConnected ? CupertinoIcons.gear_alt_fill : CupertinoIcons.rocket_fill, size: 14),
                    label: Text(
                      isConnected ? "Управление ботом" : "Запуск бота в 1 клик",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: SelectableText(
                              registerCmd,
                              style: const TextStyle(color: Colors.lightBlueAccent, fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                          InkWell(
                            onTap: () {
                              Clipboard.setData(ClipboardData(text: registerCmd));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text("Команда скопирована! Вставьте в группу в Telegram"), backgroundColor: Color(0xFF1E2024)),
                              );
                            },
                            child: const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                              child: Row(
                                children: [
                                  Icon(CupertinoIcons.doc_on_clipboard, color: Colors.white70, size: 13),
                                  SizedBox(width: 4),
                                  Text("Скопировать", style: TextStyle(color: Colors.white70, fontSize: 11)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF0088CC),
                      side: const BorderSide(color: Color(0xFF0088CC)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () async {
                      final uri = Uri.parse(oneClickUrl);
                      if (await url_launcher.canLaunchUrl(uri)) {
                        await url_launcher.launchUrl(uri, mode: url_launcher.LaunchMode.externalApplication);
                      }
                    },
                    icon: const Icon(CupertinoIcons.plus_circle, size: 14),
                    label: const Text("Добавить в группу ↗", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildGlassContainer({required Widget child}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.macosSurfaceBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: child,
        ),
      ),
    );
  }
}
