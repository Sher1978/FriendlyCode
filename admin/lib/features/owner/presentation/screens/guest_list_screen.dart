import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/lead_model.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:intl/intl.dart';

class ScanRecord {
  final String id;
  final String guestId;
  final String guestName;
  final String guestContact;
  final DateTime timestamp;
  final num discount;
  final String source;
  final String venueId;

  ScanRecord({
    required this.id,
    required this.guestId,
    required this.guestName,
    required this.guestContact,
    required this.timestamp,
    required this.discount,
    required this.source,
    required this.venueId,
  });
}

class GuestListScreen extends StatefulWidget {
  final String venueId;
  const GuestListScreen({super.key, required this.venueId});

  @override
  State<GuestListScreen> createState() => _GuestListScreenState();
}

class _GuestListScreenState extends State<GuestListScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = "";

  // Active Tab: 0 = База гостей, 1 = Журнал сканирований
  int _selectedTab = 0;

  // Scan Journal filter: 0 = Все, 1 = Сегодня, 2 = 7 дней, 3 = Этот месяц
  int _scanTimeFilter = 0;

  DateTime _selectedMonth = DateTime(DateTime.now().year, DateTime.now().month);

  int _guestSortColumnIndex = 6;
  bool _guestSortAscending = false;

  int _scanSortColumnIndex = 0;
  bool _scanSortAscending = false;

  @override
  void initState() {
    super.initState();
    try {
      final searchVal = Uri.base.queryParameters['search'] ??
          Uri.base.queryParameters['uid'] ??
          Uri.base.queryParameters['q'];
      final action = Uri.base.queryParameters['action'];
      final tabParam = Uri.base.queryParameters['tab'];

      if (tabParam == 'scans' || tabParam == 'journal') {
        _selectedTab = 1;
      }

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
            // 2. Try searching by email or name in visits for this venue
            final snap = await FirebaseFirestore.instance
                .collection('visits')
                .where('venueId', isEqualTo: widget.venueId)
                .get();

            final matches = snap.docs.where((doc) {
              final data = doc.data();
              final name = (data['guestName'] ?? '').toString().toLowerCase();
              final contact = (data['guestEmail'] ?? data['guestContact'] ?? '').toString().toLowerCase();
              final id = (data['uid'] ?? doc.id).toString().toLowerCase();
              final searchLower = q.toLowerCase();
              return name.contains(searchLower) || contact.contains(searchLower) || id == searchLower;
            }).toList();

            if (matches.isNotEmpty) {
              final visitData = matches.first.data();
              guestId = visitData['uid'] ?? visitData['guestId'] ?? matches.first.id;
              guestName = visitData['guestName'] ?? 'Guest';
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

  // --- AVERAGE DISCOUNT CALCULATION & FORMATTING HELPERS ---
  double _calculateAvgDiscount(String guestId, List<Map<String, dynamic>> visitList, Map<String, dynamic>? uData) {
    num totalDiscount = 0;
    int discountCount = 0;

    for (final v in visitList) {
      final val = v['discountValue'] ?? v['discount'] ?? v['appliedDiscount'];
      if (val != null && val is num && val > 0) {
        totalDiscount += val;
        discountCount++;
      }
    }

    if (discountCount > 0) {
      return totalDiscount / discountCount;
    }

    if (uData != null) {
      final userDiscount = uData['current_discount'] ?? uData['discount'] ?? uData['currentDiscount'];
      if (userDiscount != null && userDiscount is num && userDiscount > 0) {
        return userDiscount.toDouble();
      }
    }

    // Default tiered discount structure if visits exist
    final totalVisits = visitList.length;
    if (totalVisits >= 4) return 20.0;
    if (totalVisits == 3) return 15.0;
    if (totalVisits == 2) return 10.0;
    if (totalVisits == 1) return 5.0;

    return 0.0;
  }

  String _formatDiscount(double discount) {
    if (discount == 0) return "0%";
    if (discount == discount.roundToDouble()) {
      return "${discount.toInt()}%";
    }
    return "${discount.toStringAsFixed(1)}%";
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 768;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          AppLocalizations.of(context)!.guestDatabase,
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.white),
        ),
        backgroundColor: AppColors.background,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.title),
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('visits')
            .where('venueId', isEqualTo: widget.venueId)
            .snapshots(),
        builder: (context, visitSnapshot) {
          final visitDocs = visitSnapshot.data?.docs ?? [];
          final totalScansCount = visitDocs.length;

          // Unique guests count
          final uniqueGuestsSet = <String>{};
          for (var doc in visitDocs) {
            final data = doc.data() as Map<String, dynamic>;
            final uid = (data['uid'] ?? data['guestId'] ?? data['guestEmail'] ?? '').toString();
            if (uid.isNotEmpty && uid != 'anonymous') {
              uniqueGuestsSet.add(uid);
            }
          }
          final totalGuestsCount = uniqueGuestsSet.length;

          return Padding(
            padding: EdgeInsets.symmetric(
              horizontal: isMobile ? 12 : 32,
              vertical: isMobile ? 12 : 20,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header & Mode Switcher
                if (isMobile) ...[
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _selectedTab == 0
                            ? AppLocalizations.of(context)!.yourLoyalGuests
                            : "ЖУРНАЛ СКАНИРОВАНИЙ QR",
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: AppColors.title,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _selectedTab == 0
                            ? AppLocalizations.of(context)!.guestDatabaseSub
                            : "Лента всех сканирований QR в реальном времени",
                        style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
                      ),
                      const SizedBox(height: 12),
                      _buildTabSwitcher(totalGuestsCount, totalScansCount, isMobile: true),
                    ],
                  ),
                ] else ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _selectedTab == 0
                                ? AppLocalizations.of(context)!.yourLoyalGuests
                                : "ЖУРНАЛ СКАНИРОВАНИЙ QR",
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w900,
                              color: AppColors.title,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _selectedTab == 0
                                ? AppLocalizations.of(context)!.guestDatabaseSub
                                : "Лента всех сканирований QR-кодов заведения в реальном времени",
                            style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 13),
                          ),
                        ],
                      ),
                      // Tab Switcher Pill
                      _buildTabSwitcher(totalGuestsCount, totalScansCount, isMobile: false),
                    ],
                  ),
                ],
                SizedBox(height: isMobile ? 14 : 20),

                // Content depending on selected tab
                if (_selectedTab == 0) ...[
                  // --- TAB 0: GUEST DATABASE ---
                  _buildCategoryAnalyticsSection(visitDocs, isMobile: isMobile),
                  SizedBox(height: isMobile ? 12 : 18),
                  _buildSearchBar("Поиск гостей по имени, контакту или ID...", isMobile: isMobile),
                  SizedBox(height: isMobile ? 12 : 18),
                  Expanded(
                    child: _buildGuestListFromVisits(visitDocs, isMobile: isMobile),
                  ),
                ] else ...[
                  // --- TAB 1: SCAN JOURNAL ---
                  _buildScanJournalMetrics(visitDocs, isMobile: isMobile),
                  SizedBox(height: isMobile ? 12 : 18),
                  if (isMobile) ...[
                    _buildSearchBar("Поиск в журнале...", isMobile: true),
                    const SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: _buildScanFilterPills(),
                    ),
                  ] else ...[
                    Row(
                      children: [
                        Expanded(
                          child: _buildSearchBar("Поиск в журнале по имени, email или источнику QR..."),
                        ),
                        const SizedBox(width: 16),
                        _buildScanFilterPills(),
                      ],
                    ),
                  ],
                  SizedBox(height: isMobile ? 12 : 18),
                  Expanded(
                    child: _buildScanJournalTable(visitDocs, isMobile: isMobile),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  // --- MODERN TAB SWITCHER ---
  Widget _buildTabSwitcher(int guestCount, int scanCount, {bool isMobile = false}) {
    return Container(
      width: isMobile ? double.infinity : null,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1C1E),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        mainAxisSize: isMobile ? MainAxisSize.max : MainAxisSize.min,
        children: [
          if (isMobile)
            Expanded(
              child: _buildTabButton(
                index: 0,
                label: "База гостей",
                count: guestCount,
                icon: Icons.people_outline,
                isMobile: true,
              ),
            )
          else
            _buildTabButton(
              index: 0,
              label: "База гостей",
              count: guestCount,
              icon: Icons.people_outline,
            ),
          const SizedBox(width: 4),
          if (isMobile)
            Expanded(
              child: _buildTabButton(
                index: 1,
                label: "Журнал сканов",
                count: scanCount,
                icon: Icons.qr_code_scanner_rounded,
                isLive: true,
                isMobile: true,
              ),
            )
          else
            _buildTabButton(
              index: 1,
              label: "Журнал сканирований",
              count: scanCount,
              icon: Icons.qr_code_scanner_rounded,
              isLive: true,
            ),
        ],
      ),
    );
  }

  Widget _buildTabButton({
    required int index,
    required String label,
    required int count,
    required IconData icon,
    bool isLive = false,
    bool isMobile = false,
  }) {
    final isSelected = _selectedTab == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedTab = index;
          _searchCtrl.clear();
          _searchQuery = "";
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: EdgeInsets.symmetric(
          horizontal: isMobile ? 10 : 16,
          vertical: isMobile ? 8 : 10,
        ),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white.withOpacity(0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: isSelected ? Border.all(color: Colors.white.withOpacity(0.2)) : null,
        ),
        child: Row(
          mainAxisAlignment: isMobile ? MainAxisAlignment.center : MainAxisSize.min == MainAxisSize.min ? MainAxisAlignment.start : MainAxisAlignment.center,
          mainAxisSize: isMobile ? MainAxisSize.max : MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: isMobile ? 14 : 16,
              color: isSelected ? (isLive ? AppColors.accentGreen : AppColors.accentOrange) : Colors.white60,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.white60,
                  fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                  fontSize: isMobile ? 11 : 13,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected
                    ? (isLive ? AppColors.accentGreen.withOpacity(0.2) : AppColors.accentOrange.withOpacity(0.2))
                    : Colors.white.withOpacity(0.06),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isLive && isSelected) ...[
                    Container(
                      width: 5,
                      height: 5,
                      margin: const EdgeInsets.only(right: 3),
                      decoration: const BoxDecoration(
                        color: AppColors.accentGreen,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                  Text(
                    "$count",
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isSelected
                          ? (isLive ? AppColors.accentGreen : AppColors.accentOrange)
                          : Colors.white70,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- SEARCH BAR (DARK OLED STYLING) ---
  Widget _buildSearchBar(String hint, {bool isMobile = false}) {
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: isMobile ? double.infinity : 440),
      child: TextField(
        controller: _searchCtrl,
        onChanged: (val) {
          setState(() {
            _searchQuery = val.trim();
          });
        },
        style: const TextStyle(color: Colors.white, fontSize: 14),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 13),
          prefixIcon: Icon(Icons.search, color: Colors.white.withOpacity(0.5), size: 20),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, color: Colors.white60, size: 18),
                  onPressed: () {
                    _searchCtrl.clear();
                    setState(() => _searchQuery = "");
                  },
                )
              : null,
          filled: true,
          fillColor: const Color(0xFF1C1C1E),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.white.withOpacity(0.12)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.white.withOpacity(0.12)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.accentOrange, width: 1.5),
          ),
        ),
      ),
    );
  }

  // --- CATEGORY ANALYTICS SECTION (ACCURATE & NO DOUBLE-COUNTING) ---
  Widget _buildCategoryAnalyticsSection(List<QueryDocumentSnapshot> docs, {bool isMobile = false}) {
    Map<String, List<Map<String, dynamic>>> guestVisits = {};
    for (var doc in docs) {
      final data = doc.data() as Map<String, dynamic>;
      final uid = (data['uid'] ?? data['guestId'] ?? data['guestEmail'] ?? '').toString();
      if (uid.isEmpty || uid == 'anonymous') continue;
      guestVisits.putIfAbsent(uid, () => []).add(data);
    }

    final startOfMonth = DateTime(_selectedMonth.year, _selectedMonth.month, 1);
    final endOfMonth = DateTime(_selectedMonth.year, _selectedMonth.month + 1, 0, 23, 59, 59);

    int newCount = 0;
    int constantCount = 0;
    int lostCount = 0;
    int didNotArriveCount = 0;
    final now = DateTime.now();

    guestVisits.forEach((uid, visitsData) {
      visitsData.sort((a, b) {
        final tsA = a['timestamp'] != null ? (a['timestamp'] as Timestamp).toDate() : DateTime.now();
        final tsB = b['timestamp'] != null ? (b['timestamp'] as Timestamp).toDate() : DateTime.now();
        return tsA.compareTo(tsB);
      });

      // Filter visits in the selected month
      final visitsInMonth = visitsData.where((v) {
        final ts = v['timestamp'] != null ? (v['timestamp'] as Timestamp).toDate() : DateTime.now();
        return ts.isAfter(startOfMonth.subtract(const Duration(seconds: 1))) &&
            ts.isBefore(endOfMonth.add(const Duration(seconds: 1)));
      }).toList();

      if (visitsInMonth.isEmpty) return;

      final totalCount = visitsData.length;
      final lastVisitData = visitsData.last;
      final lastVisitTs = lastVisitData['timestamp'] != null
          ? (lastVisitData['timestamp'] as Timestamp).toDate()
          : DateTime.now();
      final daysSince = now.difference(lastVisitTs).inDays;

      // Exclusive mutually-exclusive categorization:
      // 1. Google Maps Lead who never returned
      if (totalCount == 1 && lastVisitData['acquisition_source'] == 'google_maps_bonus') {
        didNotArriveCount++;
      }
      // 2. Lost guests (no visit in >14 days)
      else if (daysSince >= 14) {
        lostCount++;
      }
      // 3. New guests (active within 14 days, total visits <= 2)
      else if (totalCount <= 2) {
        newCount++;
      }
      // 4. Constant guests (active within 14 days, total visits >= 3)
      else {
        constantCount++;
      }
    });

    final totalActive = newCount + constantCount + lostCount + didNotArriveCount;
    final newPerc = totalActive > 0 ? (newCount / totalActive * 100).round() : 0;
    final constPerc = totalActive > 0 ? (constantCount / totalActive * 100).round() : 0;
    final lostPerc = totalActive > 0 ? (lostCount / totalActive * 100).round() : 0;
    final didNotArrivePerc = totalActive > 0 ? (didNotArriveCount / totalActive * 100).round() : 0;

    final months = List.generate(12, (i) => DateTime(DateTime.now().year, i + 1));
    final monthFormat = DateFormat('MMMM yyyy');

    return Container(
      padding: EdgeInsets.all(isMobile ? 14 : 20),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1C1E),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isMobile) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "📊 Клиенты заведения",
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.accentOrange.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    "Активных: $totalActive",
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: AppColors.accentOrange,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: DropdownButton<DateTime>(
                value: _selectedMonth,
                dropdownColor: const Color(0xFF2C2C2E),
                style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.bold, fontSize: 12),
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
            ),
          ] else ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Text(
                      "📊 Аналитика категорий клиентов",
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.accentOrange.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        "Всего активных: $totalActive",
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.accentOrange,
                        ),
                      ),
                    ),
                  ],
                ),
                DropdownButton<DateTime>(
                  value: _selectedMonth,
                  dropdownColor: const Color(0xFF2C2C2E),
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
          ],
          const SizedBox(height: 14),
          if (isMobile) ...[
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
                const SizedBox(width: 8),
                Expanded(
                  child: _buildCategoryCard(
                    title: "Постоянные (≥3)",
                    count: constantCount,
                    percent: constPerc,
                    color: Colors.green,
                    icon: Icons.star,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildCategoryCard(
                    title: "Потерянные (>14 дн)",
                    count: lostCount,
                    percent: lostPerc,
                    color: Colors.redAccent,
                    icon: Icons.person_off,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildCategoryCard(
                    title: "Не дошли (Google)",
                    count: didNotArriveCount,
                    percent: didNotArrivePerc,
                    color: Colors.purpleAccent,
                    icon: Icons.location_off,
                  ),
                ),
              ],
            ),
          ] else ...[
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
                const SizedBox(width: 8),
                Expanded(
                  child: _buildCategoryCard(
                    title: "Постоянные (≥3)",
                    count: constantCount,
                    percent: constPerc,
                    color: Colors.green,
                    icon: Icons.star,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildCategoryCard(
                    title: "Потерянные (>14 дн)",
                    count: lostCount,
                    percent: lostPerc,
                    color: Colors.redAccent,
                    icon: Icons.person_off,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildCategoryCard(
                    title: "Не дошли (Google)",
                    count: didNotArriveCount,
                    percent: didNotArrivePerc,
                    color: Colors.purpleAccent,
                    icon: Icons.location_off,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              height: 8,
              child: Row(
                children: [
                  if (newPerc > 0) Expanded(flex: newPerc, child: Container(color: Colors.blue)),
                  if (constPerc > 0) Expanded(flex: constPerc, child: Container(color: Colors.green)),
                  if (lostPerc > 0) Expanded(flex: lostPerc, child: Container(color: Colors.redAccent)),
                  if (didNotArrivePerc > 0) Expanded(flex: didNotArrivePerc, child: Container(color: Colors.purpleAccent)),
                  if (totalActive == 0) Expanded(child: Container(color: Colors.white10)),
                ],
              ),
            ),
          ),
        ],
      ),
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
      padding: const EdgeInsets.all(12),
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
              color: color.withOpacity(0.18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.7)),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text("$count", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
                    Text("$percent%", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: color.withOpacity(0.85))),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- STREAMING GUESTS COMPLETE LIST (ALL GUESTS, NO MISSING RECORDS) ---
  Widget _buildGuestListFromVisits(List<QueryDocumentSnapshot> visitDocs, {bool isMobile = false}) {
    if (visitDocs.isEmpty) {
      return _buildEmptyState();
    }

    // Group visits by guest UID
    Map<String, List<Map<String, dynamic>>> guestVisits = {};
    for (var doc in visitDocs) {
      final data = doc.data() as Map<String, dynamic>;
      final uid = (data['uid'] ?? data['guestId'] ?? data['guestEmail'] ?? '').toString();
      if (uid.isEmpty || uid == 'anonymous') continue;
      guestVisits.putIfAbsent(uid, () => []).add(data);
    }

    final now = DateTime.now();
    final uids = guestVisits.keys.toList();

    return FutureBuilder<Map<String, Map<String, dynamic>>>(
      future: _fetchUserProfiles(uids),
      builder: (context, userProfilesSnap) {
        final userProfiles = userProfilesSnap.data ?? {};

        List<LeadModel> guests = [];

        for (final uid in uids) {
          final visitList = guestVisits[uid]!;
          visitList.sort((a, b) {
            final tsA = a['timestamp'] != null ? (a['timestamp'] as Timestamp).toDate() : DateTime.now();
            final tsB = b['timestamp'] != null ? (b['timestamp'] as Timestamp).toDate() : DateTime.now();
            return tsA.compareTo(tsB);
          });

          final lastVisitData = visitList.last;
          final lastVisit = lastVisitData['timestamp'] != null
              ? (lastVisitData['timestamp'] as Timestamp).toDate()
              : DateTime.now();
          final totalVisits = visitList.length;

          String status = 'new';
          if (totalVisits == 1 && lastVisitData['acquisition_source'] == 'google_maps_bonus') {
            status = 'did_not_arrive';
          } else if (now.difference(lastVisit).inDays >= 14) {
            status = 'lost';
          } else if (totalVisits >= 3) {
            status = 'vip';
          }

          final uData = userProfiles[uid];
          final name = uData?['displayName'] ??
              uData?['name'] ??
              lastVisitData['guestName'] ??
              'Guest';
          final contact = uData?['email'] ??
              uData?['phone'] ??
              lastVisitData['guestEmail'] ??
              lastVisitData['guestContact'] ??
              '';

          guests.add(LeadModel(
            id: uid,
            venueId: widget.venueId,
            guestId: uid,
            guestName: name.toString().trim().isNotEmpty ? name.toString() : 'Гость',
            guestContact: contact.toString().trim(),
            createdAt: lastVisit,
            status: status,
          ));
        }

        // Sort by last visit descending
        guests.sort((a, b) => b.createdAt.compareTo(a.createdAt));

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
                "Ни один гость не соответствует условиям поиска.",
                style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          );
        }

        if (isMobile) {
          return _buildMobileGuestList(filteredGuests, guestVisits, userProfiles);
        }

        return _buildGuestTable(filteredGuests, guestVisits, userProfiles);
      },
    );
  }

  Future<Map<String, Map<String, dynamic>>> _fetchUserProfiles(List<String> uids) async {
    Map<String, Map<String, dynamic>> result = {};
    for (int i = 0; i < uids.length; i += 30) {
      final chunk = uids.sublist(i, i + 30 > uids.length ? uids.length : i + 30);
      try {
        final snap = await FirebaseFirestore.instance
            .collection('users')
            .where(FieldPath.documentId, whereIn: chunk)
            .get();
        for (var doc in snap.docs) {
          result[doc.id] = doc.data();
        }
      } catch (e) {
        debugPrint("Error fetching users chunk: $e");
      }
    }
    return result;
  }

  // --- GUEST TABLE (DESKTOP: DARK OLED STYLING WITH AVERAGE DISCOUNT COLUMN) ---
  Widget _buildGuestTable(
    List<LeadModel> guests,
    Map<String, List<Map<String, dynamic>>> guestVisits,
    Map<String, Map<String, dynamic>> userProfiles,
  ) {
    final sortedGuests = List<LeadModel>.from(guests);
    sortedGuests.sort((a, b) {
      int result = 0;
      final aVisits = guestVisits[a.guestId] ?? [];
      final bVisits = guestVisits[b.guestId] ?? [];
      final aProfile = userProfiles[a.guestId];
      final bProfile = userProfiles[b.guestId];

      switch (_guestSortColumnIndex) {
        case 0:
          result = a.guestName.toLowerCase().compareTo(b.guestName.toLowerCase());
          break;
        case 1:
          result = a.guestContact.toLowerCase().compareTo(b.guestContact.toLowerCase());
          break;
        case 2:
          result = (a.status).compareTo(b.status);
          break;
        case 3:
          result = aVisits.length.compareTo(bVisits.length);
          break;
        case 4:
          final aDisc = _calculateAvgDiscount(a.guestId, aVisits, aProfile);
          final bDisc = _calculateAvgDiscount(b.guestId, bVisits, bProfile);
          result = aDisc.compareTo(bDisc);
          break;
        case 5:
          final aDep = (aProfile?['deposit_balance'] as num?)?.toDouble() ?? (aProfile?['balance'] as num?)?.toDouble() ?? 0.0;
          final bDep = (bProfile?['deposit_balance'] as num?)?.toDouble() ?? (bProfile?['balance'] as num?)?.toDouble() ?? 0.0;
          result = aDep.compareTo(bDep);
          break;
        case 6:
        default:
          result = a.createdAt.compareTo(b.createdAt);
          break;
      }
      return _guestSortAscending ? result : -result;
    });

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF1C1C1E), // Dark OLED Apple Surface
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.vertical,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
                  sortColumnIndex: _guestSortColumnIndex,
                  sortAscending: _guestSortAscending,
                  headingRowColor: WidgetStateProperty.all(const Color(0xFF2C2C2E)),
                  dataRowColor: WidgetStateProperty.all(const Color(0xFF1C1C1E)),
                  border: TableBorder(
                    horizontalInside: BorderSide(color: Colors.white.withOpacity(0.06), width: 1),
                  ),
                  dataRowMinHeight: 68,
                  dataRowMaxHeight: 74,
                  columns: [
                    DataColumn(
                      label: const Text(
                        "ИМЯ ГОСТЯ",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                      onSort: (col, asc) => setState(() {
                        _guestSortColumnIndex = col;
                        _guestSortAscending = asc;
                      }),
                    ),
                    DataColumn(
                      label: const Text(
                        "КОНТАКТЫ",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                      onSort: (col, asc) => setState(() {
                        _guestSortColumnIndex = col;
                        _guestSortAscending = asc;
                      }),
                    ),
                    DataColumn(
                      label: const Text(
                        "СТАТУС",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                      onSort: (col, asc) => setState(() {
                        _guestSortColumnIndex = col;
                        _guestSortAscending = asc;
                      }),
                    ),
                    DataColumn(
                      label: const Text(
                        "ВИЗИТЫ",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                      onSort: (col, asc) => setState(() {
                        _guestSortColumnIndex = col;
                        _guestSortAscending = asc;
                      }),
                    ),
                    DataColumn(
                      label: const Text(
                        "СРЕДНЯЯ СКИДКА",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                      onSort: (col, asc) => setState(() {
                        _guestSortColumnIndex = col;
                        _guestSortAscending = asc;
                      }),
                    ),
                    DataColumn(
                      label: const Text(
                        "ДЕПОЗИТ",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                      onSort: (col, asc) => setState(() {
                        _guestSortColumnIndex = col;
                        _guestSortAscending = asc;
                      }),
                    ),
                    DataColumn(
                      label: const Text(
                        "ПОСЛЕДНИЙ ВИЗИТ",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                      onSort: (col, asc) => setState(() {
                        _guestSortColumnIndex = col;
                        _guestSortAscending = asc;
                      }),
                    ),
                    const DataColumn(
                      label: Text(
                        "ДЕЙСТВИЯ",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                    ),
                  ],
                  rows: sortedGuests.map((guest) {
                final visitList = guestVisits[guest.guestId] ?? [];
                final totalVisits = visitList.length;
                final uData = userProfiles[guest.guestId];
                final avgDiscount = _calculateAvgDiscount(guest.guestId, visitList, uData);

                return DataRow(cells: [
                  // Guest Name + Avatar
                  DataCell(
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: AppColors.accentOrange.withOpacity(0.18),
                          child: Text(
                            guest.guestName.isNotEmpty ? guest.guestName[0].toUpperCase() : '?',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.accentOrange, fontSize: 15),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          guest.guestName,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                  // Contact
                  DataCell(
                    Text(
                      guest.guestContact.isNotEmpty ? guest.guestContact : 'N/A',
                      style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                    ),
                  ),
                  // Status + VIP Lock
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
                                color: _getStatusColor(guest.status).withOpacity(0.15),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: _getStatusColor(guest.status).withOpacity(0.4)),
                              ),
                              child: Text(
                                guest.status == 'did_not_arrive'
                                    ? 'НЕ ДОШЛИ'
                                    : guest.status == 'new'
                                        ? 'НОВЫЙ'
                                        : guest.status == 'lost'
                                            ? 'ПОТЕРЯН'
                                            : guest.status.toUpperCase(),
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
                                  color: Colors.purple.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.purple.withOpacity(0.5)),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.lock, size: 10, color: Colors.purpleAccent),
                                    SizedBox(width: 3),
                                    Text("VIP Lock", style: TextStyle(color: Colors.purpleAccent, fontWeight: FontWeight.bold, fontSize: 9)),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        );
                      },
                    ),
                  ),
                  // Total Visits
                  DataCell(
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        "$totalVisits ${totalVisits == 1 ? 'визит' : (totalVisits >= 2 && totalVisits <= 4) ? 'визита' : 'визитов'}",
                        style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 12),
                      ),
                    ),
                  ),
                  // Average Discount (НОВАЯ КОЛОНКА ПО ТРЕБОВАНИЮ)
                  DataCell(
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppColors.accentOrange.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.accentOrange.withOpacity(0.4)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.percent_rounded, size: 12, color: AppColors.accentOrange),
                          const SizedBox(width: 4),
                          Text(
                            _formatDiscount(avgDiscount),
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              color: AppColors.accentOrange,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Deposit Balance
                  DataCell(
                    StreamBuilder<DocumentSnapshot>(
                      stream: FirebaseFirestore.instance.collection('users').doc(guest.guestId).snapshots(),
                      builder: (context, userSnap) {
                        if (!userSnap.hasData) return const Text("...", style: TextStyle(color: Colors.white54));
                        final data = userSnap.data!.data() as Map<String, dynamic>?;
                        final balance = (data?['deposit_balance'] ?? 0.0).toDouble();
                        return Text(
                          balance.toStringAsFixed(2),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.statusActiveText,
                            fontSize: 14,
                          ),
                        );
                      },
                    ),
                  ),
                  // Last Visit Date
                  DataCell(
                    Text(
                      DateFormat('MMM d, yyyy').format(guest.createdAt),
                      style: TextStyle(color: Colors.white.withOpacity(0.75), fontSize: 13),
                    ),
                  ),
                  // Actions (+ Top Up, - Deduct Bill, VIP Lock)
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
                              color: AppColors.accentOrange.withOpacity(0.2),
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
                              color: Colors.blue.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                              onPressed: () => _showDeductDialog(guest.guestId, guest.guestName, balance),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(CupertinoIcons.minus, size: 12, color: Colors.blueAccent),
                                  SizedBox(width: 4),
                                  Text("Deduct Bill", style: TextStyle(color: Colors.blueAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            CupertinoButton(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                              color: isLocked ? Colors.red.withOpacity(0.15) : Colors.green.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(8),
                              onPressed: () => _toggleLockDiscount(guest.guestId, !isLocked),
                              child: Icon(
                                isLocked ? CupertinoIcons.lock_open : CupertinoIcons.lock,
                                size: 14,
                                color: isLocked ? Colors.redAccent : Colors.greenAccent,
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
      ),
    );
  }

  // --- MOBILE-FIRST GUEST CARDS LIST (RESPONSIVE, TOUCH-FRIENDLY, NO SQUISHED TABLES) ---
  Widget _buildMobileGuestList(
    List<LeadModel> guests,
    Map<String, List<Map<String, dynamic>>> guestVisits,
    Map<String, Map<String, dynamic>> userProfiles,
  ) {
    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 24),
      itemCount: guests.length,
      itemBuilder: (context, index) {
        final guest = guests[index];
        final visitList = guestVisits[guest.guestId] ?? [];
        final totalVisits = visitList.length;
        final uData = userProfiles[guest.guestId];
        final avgDiscount = _calculateAvgDiscount(guest.guestId, visitList, uData);

        return StreamBuilder<DocumentSnapshot>(
          stream: FirebaseFirestore.instance.collection('users').doc(guest.guestId).snapshots(),
          builder: (context, userSnap) {
            final liveUserData = userSnap.data?.data() as Map<String, dynamic>?;
            final balance = (liveUserData?['deposit_balance'] ?? uData?['deposit_balance'] ?? 0.0).toDouble();
            final isLocked = liveUserData?['hasLockedDiscount'] ?? uData?['hasLockedDiscount'] ?? false;

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF1C1C1E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.4),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Row: Avatar + Name + Contact + Status Badge
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: AppColors.accentOrange.withOpacity(0.2),
                        child: Text(
                          guest.guestName.isNotEmpty ? guest.guestName[0].toUpperCase() : '?',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.accentOrange, fontSize: 16),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              guest.guestName,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                fontSize: 15,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (guest.guestContact.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                guest.guestContact,
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.55),
                                  fontSize: 12,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Status Badge + Lock
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _getStatusColor(guest.status).withOpacity(0.18),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: _getStatusColor(guest.status).withOpacity(0.45)),
                            ),
                            child: Text(
                              guest.status == 'did_not_arrive'
                                  ? 'НЕ ДОШЛИ'
                                  : guest.status == 'new'
                                      ? 'НОВЫЙ'
                                      : guest.status == 'lost'
                                          ? 'ПОТЕРЯН'
                                          : guest.status.toUpperCase(),
                              style: TextStyle(
                                color: _getStatusColor(guest.status),
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                              ),
                            ),
                          ),
                          if (isLocked) ...[
                            const SizedBox(width: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.purple.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.purple.withOpacity(0.5)),
                              ),
                              child: const Icon(Icons.lock, size: 11, color: Colors.purpleAccent),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // 3-Column Stats Ribbon: ВИЗИТЫ, СР. СКИДКА, ДЕПОЗИТ
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.04),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.06)),
                    ),
                    child: Row(
                      children: [
                        // 1. Visits
                        Expanded(
                          child: Column(
                            children: [
                              Text(
                                "ВИЗИТЫ",
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white.withOpacity(0.45),
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.repeat_rounded, size: 12, color: Colors.white70),
                                  const SizedBox(width: 4),
                                  Text(
                                    "$totalVisits",
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Container(width: 1, height: 24, color: Colors.white10),
                        // 2. Avg Discount
                        Expanded(
                          child: Column(
                            children: [
                              Text(
                                "СР. СКИДКА",
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.accentOrange.withOpacity(0.85),
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.percent_rounded, size: 12, color: AppColors.accentOrange),
                                  const SizedBox(width: 2),
                                  Text(
                                    _formatDiscount(avgDiscount),
                                    style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.accentOrange, fontSize: 13),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Container(width: 1, height: 24, color: Colors.white10),
                        // 3. Deposit Balance
                        Expanded(
                          child: Column(
                            children: [
                              Text(
                                "ДЕПОЗИТ",
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.statusActiveText.withOpacity(0.85),
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                balance > 0 ? "${balance.toStringAsFixed(0)} ₫" : "0 ₫",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: balance > 0 ? AppColors.statusActiveText : Colors.white38,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 10),

                  // Last visit & Action Buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.access_time_rounded, size: 12, color: Colors.white.withOpacity(0.4)),
                          const SizedBox(width: 4),
                          Text(
                            DateFormat('dd.MM.yy').format(guest.createdAt),
                            style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.5)),
                          ),
                        ],
                      ),
                      // Action Buttons (Touch Friendly)
                      Row(
                        children: [
                          CupertinoButton(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            color: AppColors.accentOrange.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                            minSize: 34,
                            onPressed: () => _showTopUpDialog(guest.guestId, guest.guestName, balance),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(CupertinoIcons.add, size: 12, color: AppColors.accentOrange),
                                SizedBox(width: 3),
                                Text("Пополнить", style: TextStyle(color: AppColors.accentOrange, fontSize: 11, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          CupertinoButton(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            color: Colors.blue.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                            minSize: 34,
                            onPressed: () => _showDeductDialog(guest.guestId, guest.guestName, balance),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(CupertinoIcons.minus, size: 12, color: Colors.blueAccent),
                                SizedBox(width: 3),
                                Text("Списать", style: TextStyle(color: Colors.blueAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          CupertinoButton(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                            color: isLocked ? Colors.red.withOpacity(0.18) : Colors.green.withOpacity(0.18),
                            borderRadius: BorderRadius.circular(8),
                            minSize: 34,
                            onPressed: () => _toggleLockDiscount(guest.guestId, !isLocked),
                            child: Icon(
                              isLocked ? CupertinoIcons.lock_open : CupertinoIcons.lock,
                              size: 13,
                              color: isLocked ? Colors.redAccent : Colors.greenAccent,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // =========================================================================
  // --- TAB 1: ЖУРНАЛ СКАНИРОВАНИЙ (SCAN JOURNAL IMPLEMENTATION) ---
  // =========================================================================

  Widget _buildScanJournalMetrics(List<QueryDocumentSnapshot> docs, {bool isMobile = false}) {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final weekStart = now.subtract(const Duration(days: 7));
    final monthStart = DateTime(now.year, now.month, 1);

    int total = docs.length;
    int todayCount = 0;
    int weekCount = 0;
    int monthCount = 0;
    num totalDiscount = 0;

    for (var doc in docs) {
      final data = doc.data() as Map<String, dynamic>;
      final ts = data['timestamp'] != null ? (data['timestamp'] as Timestamp).toDate() : null;
      if (ts != null) {
        if (ts.isAfter(todayStart)) todayCount++;
        if (ts.isAfter(weekStart)) weekCount++;
        if (ts.isAfter(monthStart)) monthCount++;
      }
      final disc = data['discount'] as num? ?? 0;
      totalDiscount += disc;
    }

    final avgDiscount = total > 0 ? (totalDiscount / total).toStringAsFixed(1) : "0";

    if (isMobile) {
      return Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  title: "Всего сканов",
                  value: "$total",
                  subtitle: "За все время",
                  color: AppColors.accentTeal,
                  icon: Icons.qr_code_2_rounded,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricCard(
                  title: "Сегодня",
                  value: "$todayCount",
                  subtitle: DateFormat('d MMMM').format(now),
                  color: AppColors.accentGreen,
                  icon: Icons.bolt_rounded,
                  badge: "LIVE",
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  title: "За 7 дней",
                  value: "$weekCount",
                  subtitle: "Активность",
                  color: AppColors.accentOrange,
                  icon: Icons.calendar_view_week_rounded,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricCard(
                  title: "За месяц",
                  value: "$monthCount",
                  subtitle: "Ср. скидка: $avgDiscount%",
                  color: Colors.purpleAccent,
                  icon: Icons.discount_outlined,
                ),
              ),
            ],
          ),
        ],
      );
    }

    return Row(
      children: [
        Expanded(
          child: _buildMetricCard(
            title: "Всего сканирований",
            value: "$total",
            subtitle: "За все время",
            color: AppColors.accentTeal,
            icon: Icons.qr_code_2_rounded,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMetricCard(
            title: "Сканирований сегодня",
            value: "$todayCount",
            subtitle: DateFormat('d MMMM').format(now),
            color: AppColors.accentGreen,
            icon: Icons.bolt_rounded,
            badge: "LIVE",
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMetricCard(
            title: "За последние 7 дней",
            value: "$weekCount",
            subtitle: "Недельная активность",
            color: AppColors.accentOrange,
            icon: Icons.calendar_view_week_rounded,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMetricCard(
            title: "За этот месяц",
            value: "$monthCount",
            subtitle: "Средняя скидка: $avgDiscount%",
            color: Colors.purpleAccent,
            icon: Icons.discount_outlined,
          ),
        ),
      ],
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required Color color,
    required IconData icon,
    String? badge,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1C1E),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              if (badge != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: color.withOpacity(0.5)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 5,
                        height: 5,
                        margin: const EdgeInsets.only(right: 4),
                        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                      ),
                      Text(
                        badge,
                        style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 10),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white),
          ),
          const SizedBox(height: 3),
          Text(
            title,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.8)),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            subtitle,
            style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.4)),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildScanFilterPills() {
    final filters = ["Все", "Сегодня", "7 дней", "Этот месяц"];
    return Row(
      children: List.generate(filters.length, (i) {
        final isSelected = _scanTimeFilter == i;
        return Padding(
          padding: const EdgeInsets.only(right: 8),
          child: GestureDetector(
            onTap: () => setState(() => _scanTimeFilter = i),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.accentOrange.withOpacity(0.25) : const Color(0xFF1C1C1E),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? AppColors.accentOrange : Colors.white.withOpacity(0.1),
                ),
              ),
              child: Text(
                filters[i],
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  color: isSelected ? AppColors.accentOrange : Colors.white70,
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildScanJournalTable(List<QueryDocumentSnapshot> docs, {bool isMobile = false}) {
    if (docs.isEmpty) {
      return Center(
        child: Text(
          "В журнале пока нет записей сканирований для этого заведения.",
          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 16),
        ),
      );
    }

    // Convert to ScanRecord list
    List<ScanRecord> scans = docs.map((d) {
      final data = d.data() as Map<String, dynamic>;
      final ts = data['timestamp'] != null
          ? (data['timestamp'] as Timestamp).toDate()
          : DateTime.now();

      return ScanRecord(
        id: d.id,
        guestId: (data['uid'] ?? data['userId'] ?? data['guestId'] ?? '').toString(),
        guestName: (data['guestName'] ?? data['userName'] ?? 'Гость').toString(),
        guestContact: (data['guestEmail'] ?? data['userEmail'] ?? data['guestContact'] ?? '').toString(),
        timestamp: ts,
        discount: (data['discount'] as num?) ?? 0,
        source: (data['source'] ?? data['linkType'] ?? 'qr_scan_auto').toString(),
        venueId: widget.venueId,
      );
    }).toList();

    // Sort latest scans first
    scans.sort((a, b) => b.timestamp.compareTo(a.timestamp));

    // Filter by time
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final weekStart = now.subtract(const Duration(days: 7));
    final monthStart = DateTime(now.year, now.month, 1);

    if (_scanTimeFilter == 1) {
      scans = scans.where((s) => s.timestamp.isAfter(todayStart)).toList();
    } else if (_scanTimeFilter == 2) {
      scans = scans.where((s) => s.timestamp.isAfter(weekStart)).toList();
    } else if (_scanTimeFilter == 3) {
      scans = scans.where((s) => s.timestamp.isAfter(monthStart)).toList();
    }

    // Filter by search query
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      scans = scans.where((s) {
        return s.guestName.toLowerCase().contains(q) ||
            s.guestContact.toLowerCase().contains(q) ||
            s.guestId.toLowerCase().contains(q) ||
            s.source.toLowerCase().contains(q);
      }).toList();
    }

    if (scans.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(
            "Нет сканирований по выбранному фильтру.",
            style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 16, fontWeight: FontWeight.bold),
          ),
        ),
      );
    }

    if (isMobile) {
      return _buildMobileScanList(scans, todayStart);
    }

    final sortedScans = List<ScanRecord>.from(scans);
    sortedScans.sort((a, b) {
      int result = 0;
      switch (_scanSortColumnIndex) {
        case 0:
          result = a.timestamp.compareTo(b.timestamp);
          break;
        case 1:
          result = a.guestName.toLowerCase().compareTo(b.guestName.toLowerCase());
          break;
        case 2:
          result = a.guestContact.toLowerCase().compareTo(b.guestContact.toLowerCase());
          break;
        case 3:
          result = a.source.toLowerCase().compareTo(b.source.toLowerCase());
          break;
        case 4:
          result = a.discount.compareTo(b.discount);
          break;
        default:
          result = a.timestamp.compareTo(b.timestamp);
          break;
      }
      return _scanSortAscending ? result : -result;
    });

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF1C1C1E),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.vertical,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
                  sortColumnIndex: _scanSortColumnIndex,
                  sortAscending: _scanSortAscending,
                  headingRowColor: WidgetStateProperty.all(const Color(0xFF2C2C2E)),
                  dataRowColor: WidgetStateProperty.all(const Color(0xFF1C1C1E)),
                  border: TableBorder(
                    horizontalInside: BorderSide(color: Colors.white.withOpacity(0.06), width: 1),
                  ),
                  dataRowMinHeight: 64,
                  dataRowMaxHeight: 70,
                  columns: [
                    DataColumn(
                      label: const Text(
                        "ВРЕМЯ СКАНИРОВАНИЯ",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                      onSort: (col, asc) => setState(() {
                        _scanSortColumnIndex = col;
                        _scanSortAscending = asc;
                      }),
                    ),
                    DataColumn(
                      label: const Text(
                        "ГОСТЬ",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                      onSort: (col, asc) => setState(() {
                        _scanSortColumnIndex = col;
                        _scanSortAscending = asc;
                      }),
                    ),
                    DataColumn(
                      label: const Text(
                        "КОНТАКТЫ",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                      onSort: (col, asc) => setState(() {
                        _scanSortColumnIndex = col;
                        _scanSortAscending = asc;
                      }),
                    ),
                    DataColumn(
                      label: const Text(
                        "ИСТОЧНИК / QR",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                      onSort: (col, asc) => setState(() {
                        _scanSortColumnIndex = col;
                        _scanSortAscending = asc;
                      }),
                    ),
                    DataColumn(
                      label: const Text(
                        "ВЫДАННАЯ СКИДКА",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                      onSort: (col, asc) => setState(() {
                        _scanSortColumnIndex = col;
                        _scanSortAscending = asc;
                      }),
                    ),
                    const DataColumn(
                      label: Text(
                        "БАЛАНС ДЕПОЗИТА",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                    ),
                    const DataColumn(
                      label: Text(
                        "ДЕЙСТВИЯ",
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Colors.white, letterSpacing: 0.5),
                      ),
                    ),
                  ],
                  rows: sortedScans.map((scan) {
                final isToday = scan.timestamp.isAfter(todayStart);

                return DataRow(cells: [
                  // Time
                  DataCell(
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.access_time_rounded,
                          size: 14,
                          color: isToday ? AppColors.accentGreen : Colors.white38,
                        ),
                        const SizedBox(width: 8),
                        Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              DateFormat('dd.MM.yyyy HH:mm:ss').format(scan.timestamp),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: isToday ? Colors.white : Colors.white.withOpacity(0.8),
                                fontSize: 13,
                              ),
                            ),
                            if (isToday)
                              const Text(
                                "Сегодня",
                                style: TextStyle(
                                  color: AppColors.accentGreen,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Guest
                  DataCell(
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: AppColors.accentGreen.withOpacity(0.15),
                          child: Text(
                            scan.guestName.isNotEmpty ? scan.guestName[0].toUpperCase() : '?',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.accentGreen, fontSize: 13),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          scan.guestName,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  // Contact
                  DataCell(
                    Text(
                      scan.guestContact.isNotEmpty ? scan.guestContact : 'N/A',
                      style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                    ),
                  ),
                  // Source badge
                  DataCell(
                    _buildSourceBadge(scan.source),
                  ),
                  // Discount badge
                  DataCell(
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppColors.accentGreen.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.accentGreen.withOpacity(0.35)),
                      ),
                      child: Text(
                        "${scan.discount}%",
                        style: const TextStyle(
                          color: AppColors.accentGreen,
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                  // Deposit balance
                  DataCell(
                    scan.guestId.isNotEmpty
                        ? StreamBuilder<DocumentSnapshot>(
                            stream: FirebaseFirestore.instance.collection('users').doc(scan.guestId).snapshots(),
                            builder: (context, userSnap) {
                              if (!userSnap.hasData) return const Text("...", style: TextStyle(color: Colors.white54));
                              final data = userSnap.data?.data() as Map<String, dynamic>?;
                              final balance = (data?['deposit_balance'] ?? 0.0).toDouble();
                              return Text(
                                balance.toStringAsFixed(2),
                                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.statusActiveText, fontSize: 13),
                              );
                            },
                          )
                        : const Text("0.00", style: TextStyle(color: Colors.white54, fontSize: 13)),
                  ),
                  // Actions (+ Top Up, - Deduct)
                  DataCell(
                    scan.guestId.isNotEmpty
                        ? StreamBuilder<DocumentSnapshot>(
                            stream: FirebaseFirestore.instance.collection('users').doc(scan.guestId).snapshots(),
                            builder: (context, userSnap) {
                              final data = userSnap.data?.data() as Map<String, dynamic>?;
                              final balance = (data?['deposit_balance'] ?? 0.0).toDouble();

                              return Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  CupertinoButton(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                    color: AppColors.accentOrange.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(8),
                                    onPressed: () => _showTopUpDialog(scan.guestId, scan.guestName, balance),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(CupertinoIcons.add, size: 12, color: AppColors.accentOrange),
                                        SizedBox(width: 4),
                                        Text("Пополнить", style: TextStyle(color: AppColors.accentOrange, fontSize: 11, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  CupertinoButton(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                    color: Colors.blue.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(8),
                                    onPressed: () => _showDeductDialog(scan.guestId, scan.guestName, balance),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(CupertinoIcons.minus, size: 12, color: Colors.blueAccent),
                                        SizedBox(width: 4),
                                        Text("Списать", style: TextStyle(color: Colors.blueAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            },
                          )
                        : const SizedBox.shrink(),
                  ),
                ]);
              }).toList(),
            ),
          ),
        ),
      ),
    );
  }

  // --- MOBILE-FIRST SCAN RECORDS LIST ---
  Widget _buildMobileScanList(List<ScanRecord> scans, DateTime todayStart) {
    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 24),
      itemCount: scans.length,
      itemBuilder: (context, index) {
        final scan = scans[index];
        final isToday = scan.timestamp.isAfter(todayStart);

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF1C1C1E),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.35),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top: Time + Live badge + Source tag
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.access_time_rounded,
                        size: 13,
                        color: isToday ? AppColors.accentGreen : Colors.white38,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        DateFormat('dd.MM.yy HH:mm:ss').format(scan.timestamp),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: isToday ? Colors.white : Colors.white70,
                        ),
                      ),
                      if (isToday) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.accentGreen.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.accentGreen.withOpacity(0.5)),
                          ),
                          child: const Text("СЕГОДНЯ", style: TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold, fontSize: 9)),
                        ),
                      ],
                    ],
                  ),
                  _buildSourceBadge(scan.source),
                ],
              ),

              const SizedBox(height: 10),

              // Middle: Guest Name & Contact + Discount Badge
              Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: AppColors.accentTeal.withOpacity(0.2),
                    child: Text(
                      scan.guestName.isNotEmpty ? scan.guestName[0].toUpperCase() : '?',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.accentTeal, fontSize: 13),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          scan.guestName,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (scan.guestContact.isNotEmpty)
                          Text(
                            scan.guestContact,
                            style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.5)),
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ),
                  // Discount Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.accentOrange.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.accentOrange.withOpacity(0.4)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.percent, size: 11, color: AppColors.accentOrange),
                        const SizedBox(width: 2),
                        Text(
                          "${scan.discount}%",
                          style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w900, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              // Bottom: Realtime Deposit Balance + TopUp/Deduct buttons
              if (scan.guestId.isNotEmpty)
                StreamBuilder<DocumentSnapshot>(
                  stream: FirebaseFirestore.instance.collection('users').doc(scan.guestId).snapshots(),
                  builder: (context, userSnap) {
                    final uData = userSnap.data?.data() as Map<String, dynamic>?;
                    final balance = (uData?['deposit_balance'] ?? 0.0).toDouble();

                    return Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text("Депозит: ", style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.5))),
                            Text(
                              "${balance.toStringAsFixed(0)} ₫",
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: balance > 0 ? AppColors.statusActiveText : Colors.white54,
                              ),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            CupertinoButton(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              color: AppColors.accentOrange.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                              minSize: 30,
                              onPressed: () => _showTopUpDialog(scan.guestId, scan.guestName, balance),
                              child: const Text("Пополнить", style: TextStyle(color: AppColors.accentOrange, fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(width: 6),
                            CupertinoButton(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              color: Colors.blue.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                              minSize: 30,
                              onPressed: () => _showDeductDialog(scan.guestId, scan.guestName, balance),
                              child: const Text("Списать", style: TextStyle(color: Colors.blueAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ],
                    );
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSourceBadge(String source) {
    Color color;
    IconData icon;
    String label;

    switch (source.toLowerCase()) {
      case 'qr_scan_auto':
        color = Colors.cyanAccent;
        icon = Icons.qr_code_2;
        label = "QR стола / меню";
        break;
      case 'qr_reward_claim':
        color = AppColors.accentGreen;
        icon = Icons.check_circle_outline;
        label = "Получение скидки";
        break;
      case 'qr_test_button':
        color = Colors.amber;
        icon = Icons.flash_on;
        label = "Тестовый скан";
        break;
      case 'google_maps_bonus':
      case 'google_maps_auto':
      case 'google_maps':
        color = Colors.purpleAccent;
        icon = Icons.map_outlined;
        label = "Google Maps QR";
        break;
      case 'captive_portal':
        color = Colors.tealAccent;
        icon = Icons.wifi;
        label = "Wi-Fi Авторизация";
        break;
      case 'nfc':
        color = Colors.orangeAccent;
        icon = Icons.nfc;
        label = "NFC метка";
        break;
      default:
        color = Colors.blueAccent;
        icon = Icons.qr_code;
        label = source;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
          ),
        ],
      ),
    );
  }

  // --- EMPTY STATE ---
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.people_outline, size: 64, color: Colors.white.withOpacity(0.3)),
          const SizedBox(height: 16),
          Text(
            AppLocalizations.of(context)!.noGuestsFound,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white.withOpacity(0.6)),
          ),
          const SizedBox(height: 8),
          Text(
            AppLocalizations.of(context)!.noGuestsSub,
            style: TextStyle(color: Colors.white.withOpacity(0.4)),
          ),
        ],
      ),
    );
  }

  // --- DIALOGS & ACTIONS (UNCHANGED CORE LOGIC) ---
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
    double bonusPercent = 10.0;
    bool lockDiscount = true;

    showCupertinoDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => CupertinoAlertDialog(
          title: Text("Пополнение депозита: $guestName"),
          content: Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Текущий баланс: ${currentBalance.toStringAsFixed(2)}",
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 12),
                CupertinoTextField(
                  controller: ctrl,
                  placeholder: "Сумма пополнения...",
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
                    const Text("Бонус: ", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white70)),
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
                            child: Text(
                              "+$p%",
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: bonusPercent == p ? Colors.black : Colors.white,
                              ),
                            ),
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
              child: const Text("Отмена"),
              onPressed: () => Navigator.pop(context),
            ),
            CupertinoDialogAction(
              child: const Text("Подтвердить"),
              onPressed: () async {
                final val = ctrl.text.trim();
                final payAmount = double.tryParse(val);
                if (payAmount == null || payAmount <= 0) return;

                final creditAmount = payAmount * (1 + bonusPercent / 100);
                Navigator.pop(context);
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
                Text(
                  "Баланс клиента: ${currentBalance.toStringAsFixed(2)}",
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.amber),
                ),
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
                if (amount == null || amount <= 0) return;

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
      case 'did_not_arrive':
        return Colors.purpleAccent;
      case 'lost':
        return Colors.redAccent;
      default:
        return AppColors.body;
    }
  }
}
