import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/lead_model.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/services/lead_service.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:intl/intl.dart';

class GuestListScreen extends StatefulWidget {
  final String venueId;
  const GuestListScreen({super.key, required this.venueId});

  @override
  State<GuestListScreen> createState() => _GuestListScreenState();
}

class _GuestListScreenState extends State<GuestListScreen> {
  final LeadsService _leadsService = LeadsService();
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = "";

  @override
  void initState() {
    super.initState();
    try {
      final searchVal = Uri.base.queryParameters['search'] ?? Uri.base.queryParameters['uid'] ?? Uri.base.queryParameters['q'];
      final action = Uri.base.queryParameters['action'];
      if (searchVal != null && searchVal.isNotEmpty) {
        _searchQuery = searchVal;
        _searchCtrl.text = searchVal;

        // Auto open dialog after first frame rendering if guest search parameter is present
        WidgetsBinding.instance.addPostFrameCallback((_) async {
          final q = searchVal.trim();

          // 1. Try finding directly in users collection
          var userDoc = await FirebaseFirestore.instance.collection('users').doc(q).get();
          String guestId = q;
          String guestName = 'Guest';

          if (userDoc.exists) {
            guestId = userDoc.id;
            guestName = userDoc.data()?['displayName'] ?? userDoc.data()?['name'] ?? 'Guest';
          } else {
            // 2. Try searching by email or name in leads
            final snap = await FirebaseFirestore.instance
                .collection('leads')
                .where('venueId', isEqualTo: widget.venueId)
                .get();
            
            final matches = snap.docs.where((doc) {
              final data = doc.data();
              final name = (data['guestName'] ?? '').toString().toLowerCase();
              final contact = (data['guestContact'] ?? '').toString().toLowerCase();
              final id = doc.id.toLowerCase();
              final searchLower = q.toLowerCase();
              return name.contains(searchLower) || contact.contains(searchLower) || id == searchLower;
            }).toList();

            if (matches.isNotEmpty) {
              final leadData = matches.first.data();
              guestId = leadData['guestId'] ?? matches.first.id;
              guestName = leadData['guestName'] ?? 'Guest';
              userDoc = await FirebaseFirestore.instance.collection('users').doc(guestId).get();
            }
          }

          if (mounted) {
            final balance = (userDoc.data()?['deposit_balance'] ?? 0.0).toDouble();
            if (action == 'deduct' || (action != 'topup' && balance > 0)) {
              _showDeductDialog(guestId, guestName, balance);
            } else {
              _showTopUpDialog(guestId, guestName, balance);
            }
          }
        });
      }
    } catch (e) {
      debugPrint("Error parsing search URL param: $e");
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.guestDatabase, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        backgroundColor: AppColors.background,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.title),
      ),
      body: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      AppLocalizations.of(context)!.yourLoyalGuests,
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      AppLocalizations.of(context)!.guestDatabaseSub,
                      style: TextStyle(color: AppColors.body.withOpacity(0.7)),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),
            
            // --- 3 CATEGORIES ANALYTICS WIDGET WITH MONTHLY FILTER ---
            _buildCategoryAnalyticsSection(widget.venueId),
            const SizedBox(height: 24),
            const SizedBox(height: 16),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: TextField(
                controller: _searchCtrl,
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val.trim();
                  });
                },
                decoration: InputDecoration(
                  hintText: "Search guests by name, contact or ID...",
                  prefixIcon: const Icon(Icons.search, color: AppColors.body),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: AppColors.body.withOpacity(0.15)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: AppColors.body.withOpacity(0.15)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.accentOrange),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Expanded(
              child: StreamBuilder<List<LeadModel>>(
                stream: _leadsService.getLeadsStream(widget.venueId),
                builder: (context, snapshot) {
                  if (snapshot.hasError) {
                    return Center(child: Text("Error loading guests: ${snapshot.error}"));
                  }
                  if (!snapshot.hasData) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final guests = snapshot.data!;
                  if (guests.isEmpty) {
                    return _buildEmptyState();
                  }

                  final filteredGuests = _searchQuery.isEmpty
                      ? guests
                      : guests.where((g) {
                          final query = _searchQuery.toLowerCase();
                          return g.guestName.toLowerCase().contains(query) ||
                              g.guestContact.toLowerCase().contains(query) ||
                              g.guestId.toLowerCase() == query;
                        }).toList();

                  if (filteredGuests.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Text(
                          "No guests match your search filter.",
                          style: TextStyle(color: AppColors.body.withOpacity(0.5), fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                    );
                  }

                  return _buildGuestTable(filteredGuests);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.people_outline, size: 64, color: AppColors.body.withOpacity(0.3)),
          const SizedBox(height: 16),
          Text(
            AppLocalizations.of(context)!.noGuestsFound,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.body.withOpacity(0.5)),
          ),
          const SizedBox(height: 8),
          Text(AppLocalizations.of(context)!.noGuestsSub),
        ],
      ),
    );
  }

  Widget _buildGuestTable(List<LeadModel> guests) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: AppColors.softShadow,
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            headingRowColor: MaterialStateProperty.all(AppColors.background.withOpacity(0.5)),
            dataRowHeight: 72,
            columns: [
              DataColumn(label: Text(AppLocalizations.of(context)!.guestNameCol, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12))),
              DataColumn(label: Text(AppLocalizations.of(context)!.contactInfoCol, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12))),
              DataColumn(label: Text(AppLocalizations.of(context)!.statusCol, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12))),
              const DataColumn(label: Text("Deposit Balance", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12))),
              DataColumn(label: Text(AppLocalizations.of(context)!.joinedDateCol, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12))),
              const DataColumn(label: Text("Actions", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12))),
            ],
            rows: guests.map((guest) {
              return DataRow(cells: [
                DataCell(
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: AppColors.accentOrange.withOpacity(0.1),
                        child: Text(
                          guest.guestName.isNotEmpty ? guest.guestName[0].toUpperCase() : '?',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.accentOrange),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(guest.guestName, style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                DataCell(Text(guest.guestContact.isNotEmpty ? guest.guestContact : 'N/A')),
                DataCell(
                  StreamBuilder<DocumentSnapshot>(
                    stream: FirebaseFirestore.instance.collection('users').doc(guest.guestId).snapshots(),
                    builder: (context, userSnap) {
                      final data = userSnap.data?.data() as Map<String, dynamic>?;
                      final isLocked = data?['hasLockedDiscount'] == true;
                      return Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: _getStatusColor(guest.status).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              guest.status.toUpperCase(),
                              style: TextStyle(
                                color: _getStatusColor(guest.status),
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                              ),
                            ),
                          ),
                          if (isLocked) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.purple.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.purple.withOpacity(0.3)),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.lock, size: 10, color: Colors.purple),
                                  SizedBox(width: 3),
                                  Text("VIP Lock", style: TextStyle(color: Colors.purple, fontWeight: FontWeight.bold, fontSize: 9)),
                                ],
                              ),
                            ),
                          ],
                        ],
                      );
                    },
                  ),
                ),
                // Stream Deposit Balance
                DataCell(
                  StreamBuilder<DocumentSnapshot>(
                    stream: FirebaseFirestore.instance.collection('users').doc(guest.guestId).snapshots(),
                    builder: (context, userSnap) {
                      if (!userSnap.hasData) return const Text("...");
                      final data = userSnap.data!.data() as Map<String, dynamic>?;
                      final balance = (data?['deposit_balance'] ?? 0.0).toDouble();
                      return Text(
                        balance.toStringAsFixed(2),
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.statusActiveText),
                      );
                    },
                  ),
                ),
                DataCell(Text(DateFormat('MMM d, yyyy').format(guest.createdAt))),
                // Deposit Top Up Action buttons
                DataCell(
                  StreamBuilder<DocumentSnapshot>(
                    stream: FirebaseFirestore.instance.collection('users').doc(guest.guestId).snapshots(),
                    builder: (context, userSnap) {
                      final data = userSnap.data?.data() as Map<String, dynamic>?;
                      final balance = (data?['deposit_balance'] ?? 0.0).toDouble();
                      final isLocked = data?['hasLockedDiscount'] == true;

                      return Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CupertinoButton(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            color: AppColors.accentOrange.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                            onPressed: () => _showTopUpDialog(guest.guestId, guest.guestName, balance),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(CupertinoIcons.add, size: 12, color: AppColors.accentOrange),
                                SizedBox(width: 4),
                                Text("Top Up", style: TextStyle(color: AppColors.accentOrange, fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          CupertinoButton(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            color: Colors.blue.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                            onPressed: () => _showDeductDialog(guest.guestId, guest.guestName, balance),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(CupertinoIcons.minus, size: 12, color: Colors.blue),
                                SizedBox(width: 4),
                                Text("Deduct Bill", style: TextStyle(color: Colors.blue, fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          CupertinoButton(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                            color: isLocked ? Colors.red.withOpacity(0.1) : Colors.green.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                            onPressed: () => _toggleLockDiscount(guest.guestId, !isLocked),
                            child: Icon(
                              isLocked ? CupertinoIcons.lock_open : CupertinoIcons.lock,
                              size: 14,
                              color: isLocked ? Colors.red : Colors.green,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ]);
            }).toList(),
          ),
        ),
      ),
    );
  }

  Future<void> _toggleLockDiscount(String guestId, bool lockState) async {
    try {
      await FirebaseFirestore.instance.collection('users').doc(guestId).update({
        'hasLockedDiscount': lockState,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(lockState ? "VIP discount locked for guest!" : "VIP discount unlocked."),
            backgroundColor: lockState ? Colors.purple : Colors.orange,
          ),
        );
      }
    } catch (e) {
      debugPrint("Error toggling lock discount: $e");
    }
  }

  Future<void> _showTopUpDialog(String guestId, String guestName, double currentBalance) async {
    final ctrl = TextEditingController();
    double bonusPercent = 10.0; // Default +10% bonus credit for venue deposit
    bool lockDiscount = true;

    showCupertinoDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => CupertinoAlertDialog(
          title: Text("Top Up Deposit: $guestName"),
          content: Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Current Balance: ${currentBalance.toStringAsFixed(2)}", 
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                CupertinoTextField(
                  controller: ctrl,
                  placeholder: "Payment amount (e.g. 1000000)...",
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Text("Deposit Bonus: ", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white70)),
                    const SizedBox(width: 6),
                    ...[0, 5, 10, 15, 20].map((p) => GestureDetector(
                      onTap: () => setDialogState(() => bonusPercent = p.toDouble()),
                      child: Container(
                        margin: const EdgeInsets.only(right: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: bonusPercent == p ? CupertinoColors.activeGreen : Colors.white10,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text("+$p%", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: bonusPercent == p ? Colors.black : Colors.white)),
                      ),
                    )),
                  ],
                ),
                const SizedBox(height: 16),
                GestureDetector(
                  onTap: () => setDialogState(() => lockDiscount = !lockDiscount),
                  child: Row(
                    children: [
                      Icon(
                        lockDiscount ? CupertinoIcons.checkmark_square_fill : CupertinoIcons.square,
                        color: lockDiscount ? CupertinoColors.activeGreen : CupertinoColors.systemGrey,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          "Закрепить VIP-скидку за клиентом",
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          actions: [
            CupertinoDialogAction(
              child: const Text("Cancel"),
              onPressed: () => Navigator.pop(context),
            ),
            CupertinoDialogAction(
              child: const Text("Confirm"),
              onPressed: () async {
                final val = ctrl.text.trim();
                final payAmount = double.tryParse(val);
                if (payAmount == null || payAmount <= 0) {
                  return;
                }

                final creditAmount = payAmount * (1 + bonusPercent / 100);
                Navigator.pop(context); // Close dialog
                _performTopUp(guestId, guestName, creditAmount, lockDiscount);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showDeductDialog(String guestId, String guestName, double currentBalance) async {
    final ctrl = TextEditingController();

    showCupertinoDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => CupertinoAlertDialog(
          title: Text("Списание чека с депозита: $guestName"),
          content: Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Баланс клиента: ${currentBalance.toStringAsFixed(2)}", 
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.amber)),
                const SizedBox(height: 12),
                CupertinoTextField(
                  controller: ctrl,
                  placeholder: "Сумма чека к списанию...",
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            CupertinoDialogAction(
              child: const Text("Отмена"),
              onPressed: () => Navigator.pop(context),
            ),
            CupertinoDialogAction(
              child: const Text("Списать", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
              onPressed: () async {
                final val = ctrl.text.trim();
                final amount = double.tryParse(val);
                if (amount == null || amount <= 0) {
                  return;
                }
                if (amount > currentBalance) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Сумма чека превышает баланс депозита!"), backgroundColor: Colors.red),
                  );
                  return;
                }

                Navigator.pop(context);
                _performDeduction(guestId, guestName, amount);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _performDeduction(String guestId, String guestName, double amount) async {
    final userRef = FirebaseFirestore.instance.collection('users').doc(guestId);
    final venueId = widget.venueId;

    try {
      final venueDoc = await FirebaseFirestore.instance.collection('venues').doc(venueId).get();
      final venueName = venueDoc.data()?['name'] ?? 'Venue';
      final currency = venueDoc.data()?['currency'] ?? 'VND';

      double newBalance = 0;
      await FirebaseFirestore.instance.runTransaction((transaction) async {
        final userSnap = await transaction.get(userRef);
        final currentBalance = (userSnap.data()?['deposit_balance'] ?? 0.0).toDouble();
        newBalance = currentBalance - amount;
        if (newBalance < 0) newBalance = 0;

        transaction.update(userRef, {
          'deposit_balance': newBalance,
        });

        final transactionRef = FirebaseFirestore.instance.collection('deposit_transactions').doc();
        transaction.set(transactionRef, {
          'id': transactionRef.id,
          'userId': guestId,
          'userName': guestName,
          'venueId': venueId,
          'venueName': venueName,
          'staffTelegramUsername': 'merchant_admin',
          'transactionType': 'DEBIT',
          'finalAmount': amount,
          'balanceAfter': newBalance,
          'createdAt': FieldValue.serverTimestamp(),
        });
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Списано $amount $currency с депозита $guestName! Остаток: $newBalance"),
            backgroundColor: Colors.blue,
          ),
        );
      }
    } catch (e) {
      debugPrint("Error performing deduction: $e");
    }
  }

  Future<void> _performTopUp(String guestId, String guestName, double amount, [bool lockDiscount = true]) async {
    final userRef = FirebaseFirestore.instance.collection('users').doc(guestId);
    final venueId = widget.venueId;

    try {
      final venueDoc = await FirebaseFirestore.instance.collection('venues').doc(venueId).get();
      final venueName = venueDoc.data()?['name'] ?? 'Venue';
      final currency = venueDoc.data()?['currency'] ?? 'VND';

      double newBalance = 0;
      await FirebaseFirestore.instance.runTransaction((transaction) async {
        final userSnap = await transaction.get(userRef);
        final currentBalance = (userSnap.data()?['deposit_balance'] ?? 0.0).toDouble();
        newBalance = currentBalance + amount;
        
        final userUpdates = <String, dynamic>{
          'deposit_balance': newBalance,
        };
        if (lockDiscount) {
          userUpdates['hasLockedDiscount'] = true;
        }

        transaction.update(userRef, userUpdates);

        final transactionRef = FirebaseFirestore.instance.collection('deposit_transactions').doc();
        transaction.set(transactionRef, {
          'id': transactionRef.id,
          'userId': guestId,
          'userName': guestName,
          'venueId': venueId,
          'venueName': venueName,
          'staffTelegramUsername': 'merchant_admin',
          'transactionType': 'CREDIT',
          'finalAmount': amount,
          'balanceAfter': newBalance,
          'createdAt': FieldValue.serverTimestamp(),
        });
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Credited $amount $currency to $guestName! ${lockDiscount ? 'VIP discount locked!' : ''}"),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      debugPrint("Error performing manual top up: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Top up failed: $e"),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'new':
        return Colors.blue;
      case 'vip':
        return Colors.amber;
      case 'loyal':
        return Colors.green;
      default:
        return AppColors.body;
    }
  }

  DateTime _selectedMonth = DateTime(DateTime.now().year, DateTime.now().month);

  Widget _buildCategoryAnalyticsSection(String venueId) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance.collection('visits').where('venueId', isEqualTo: venueId).snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();

        final docs = snapshot.data!.docs;
        
        Map<String, List<DateTime>> guestVisits = {};
        for (var doc in docs) {
          final data = doc.data() as Map<String, dynamic>;
          final uid = (data['uid'] ?? data['guestId'] ?? data['guestEmail'] ?? '').toString();
          if (uid.isEmpty) continue;
          final ts = data['timestamp'] != null ? (data['timestamp'] as Timestamp).toDate() : DateTime.now();
          guestVisits.putIfAbsent(uid, () => []).add(ts);
        }

        final startOfMonth = DateTime(_selectedMonth.year, _selectedMonth.month, 1);
        final endOfMonth = DateTime(_selectedMonth.year, _selectedMonth.month + 1, 0, 23, 59, 59);

        int newCount = 0;
        int constantCount = 0;
        int lostCount = 0;
        final now = DateTime.now();

        guestVisits.forEach((uid, visits) {
          visits.sort((a, b) => a.compareTo(b));
          final visitsInMonth = visits.where((v) => v.isAfter(startOfMonth.subtract(const Duration(seconds: 1))) && v.isBefore(endOfMonth.add(const Duration(seconds: 1)))).toList();
          
          if (visitsInMonth.isEmpty) return;

          final totalCount = visits.length;
          final lastVisit = visits.last;
          final daysSince = now.difference(lastVisit).inDays;

          if (daysSince >= 14) {
            lostCount++;
          }
          if (totalCount <= 2) {
            newCount++;
          } else {
            constantCount++;
          }
        });

        final totalActive = newCount + constantCount + lostCount;
        final newPerc = totalActive > 0 ? (newCount / totalActive * 100).round() : 0;
        final constPerc = totalActive > 0 ? (constantCount / totalActive * 100).round() : 0;
        final lostPerc = totalActive > 0 ? (lostCount / totalActive * 100).round() : 0;

        final months = List.generate(12, (i) => DateTime(DateTime.now().year, i + 1));
        final monthFormat = DateFormat('MMMM yyyy');

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "📊 Аналитика категорий клиентов",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  DropdownButton<DateTime>(
                    value: _selectedMonth,
                    dropdownColor: const Color(0xFF1C1C1E),
                    style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.bold, fontSize: 13),
                    underline: Container(height: 1, color: AppColors.accentOrange),
                    items: months.map((m) {
                      return DropdownMenuItem<DateTime>(
                        value: m,
                        child: Text(monthFormat.format(m)),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedMonth = val);
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildCategoryCard(
                      title: "Новые (≤2)",
                      count: newCount,
                      percent: newPerc,
                      color: Colors.blue,
                      icon: Icons.person_add,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildCategoryCard(
                      title: "Постоянные (≥3)",
                      count: constantCount,
                      percent: constPerc,
                      color: Colors.green,
                      icon: Icons.star,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildCategoryCard(
                      title: "Потерянные (>14 дн)",
                      count: lostCount,
                      percent: lostPerc,
                      color: Colors.redAccent,
                      icon: Icons.person_off,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  height: 10,
                  child: Row(
                    children: [
                      if (newPerc > 0) Expanded(flex: newPerc, child: Container(color: Colors.blue)),
                      if (constPerc > 0) Expanded(flex: constPerc, child: Container(color: Colors.green)),
                      if (lostPerc > 0) Expanded(flex: lostPerc, child: Container(color: Colors.redAccent)),
                      if (totalActive == 0) Expanded(child: Container(color: Colors.white10)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCategoryCard({
    required String title,
    required int count,
    required int percent,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.7))),
                const SizedBox(height: 2),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text("$count", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
                    Text("$percent%", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: color.withOpacity(0.8))),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
