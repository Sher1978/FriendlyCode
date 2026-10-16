import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:friendly_code/features/owner/presentation/screens/deposit_action_screen.dart';

class DepositAnalyticsScreen extends StatefulWidget {
  final String? venueId;
  const DepositAnalyticsScreen({super.key, this.venueId});

  @override
  State<DepositAnalyticsScreen> createState() => _DepositAnalyticsScreenState();
}

class _DepositAnalyticsScreenState extends State<DepositAnalyticsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Filter states
  String _userTabSearchQuery = '';
  String _journalSearchQuery = '';
  final TextEditingController _journalSearchCtrl = TextEditingController();

  String? _selectedUserId;
  String? _selectedUserName;
  String _selectedTxType = 'ALL'; // ALL, CREDIT, DEBIT
  String _selectedDatePreset = 'ALL'; // ALL, TODAY, WEEK, 30_DAYS, THIS_MONTH, LAST_MONTH, CUSTOM
  DateTimeRange? _customDateRange;
  String? _selectedMonthKey; // "YYYY-MM" e.g. "2026-09"

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _journalSearchCtrl.dispose();
    super.dispose();
  }

  void _resetJournalFilters() {
    setState(() {
      _journalSearchQuery = '';
      _journalSearchCtrl.clear();
      _selectedUserId = null;
      _selectedUserName = null;
      _selectedTxType = 'ALL';
      _selectedDatePreset = 'ALL';
      _customDateRange = null;
      _selectedMonthKey = null;
    });
  }

  void _filterByUser(String uid, String name) {
    setState(() {
      _selectedUserId = uid;
      _selectedUserName = name;
      _journalSearchQuery = '';
      _journalSearchCtrl.clear();
    });
    _tabController.animateTo(2);
  }

  Future<void> _pickCustomDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2023),
      lastDate: DateTime(2030),
      initialDateRange: _customDateRange ??
          DateTimeRange(
            start: DateTime.now().subtract(const Duration(days: 30)),
            end: DateTime.now(),
          ),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.accentYellow,
              onPrimary: Colors.black,
              surface: AppColors.surface,
              onSurface: Colors.white,
            ),
            dialogBackgroundColor: AppColors.macosSurfaceBg,
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _customDateRange = picked;
        _selectedDatePreset = 'CUSTOM';
        _selectedMonthKey = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final roleProvider = Provider.of<RoleProvider>(context);
    final activeVenueId = widget.venueId ?? roleProvider.venueId ?? '';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Аналитика депозитов',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(CupertinoIcons.plus_circle_fill, color: AppColors.accentYellow),
            tooltip: 'Пополнить / Списать',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const DepositActionScreen()),
              );
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.accentYellow,
          labelColor: AppColors.accentYellow,
          unselectedLabelColor: Colors.white54,
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
          tabs: const [
            Tab(icon: Icon(CupertinoIcons.chart_bar_square_fill, size: 16), text: 'Помесячно'),
            Tab(icon: Icon(CupertinoIcons.person_3_fill, size: 16), text: 'По пользователям'),
            Tab(icon: Icon(CupertinoIcons.doc_text_search, size: 16), text: 'Журнал операций'),
          ],
        ),
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: activeVenueId.isNotEmpty
            ? FirebaseFirestore.instance
                .collection('deposit_transactions')
                .where('venueId', isEqualTo: activeVenueId)
                .snapshots()
            : FirebaseFirestore.instance
                .collection('deposit_transactions')
                .snapshots(),
        builder: (context, txSnap) {
          if (txSnap.hasError) {
            return Center(child: Text('Ошибка: ${txSnap.error}', style: const TextStyle(color: Colors.red)));
          }
          if (!txSnap.hasData) {
            return const Center(child: CupertinoActivityIndicator(color: AppColors.accentYellow));
          }

          final allTxs = txSnap.data!.docs.map((d) {
            final data = d.data() as Map<String, dynamic>;
            data['id'] = d.id;
            return data;
          }).toList();

          // Sort descending by timestamp
          allTxs.sort((a, b) {
            final tA = (a['createdAt'] as Timestamp?)?.seconds ?? 0;
            final tB = (b['createdAt'] as Timestamp?)?.seconds ?? 0;
            return tB.compareTo(tA);
          });

          return StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance.collection('users').snapshots(),
            builder: (context, userSnap) {
              final allUsers = userSnap.hasData
                  ? userSnap.data!.docs.map((d) {
                      final data = d.data() as Map<String, dynamic>;
                      data['uid'] = d.id;
                      return data;
                    }).toList()
                  : [];

              return TabBarView(
                controller: _tabController,
                children: [
                  _buildMonthlyTab(allTxs, allUsers),
                  _buildUsersTab(allTxs, allUsers),
                  _buildDedicatedJournalTab(allTxs, allUsers),
                ],
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const DepositActionScreen()),
          );
        },
        backgroundColor: AppColors.accentYellow,
        foregroundColor: Colors.black,
        icon: const Icon(CupertinoIcons.qrcode_viewfinder),
        label: const Text('Сканировать QR', style: TextStyle(fontWeight: FontWeight.w900)),
      ),
    );
  }

  // ── 1. MONTHLY TAB WITH BACKGROUND GRAPHIC TILES & JOURNAL ─────────────────

  Widget _buildMonthlyTab(List<Map<String, dynamic>> txs, List<dynamic> users) {
    double totalActiveBalance = 0;
    int depositUsersCount = 0;

    for (var u in users) {
      final bal = (u['deposit_balance'] ?? 0.0).toDouble();
      if (bal > 0) {
        totalActiveBalance += bal;
        depositUsersCount++;
      }
    }

    double totalCreditAllTime = 0;
    double totalDebitAllTime = 0;

    // Grouping by Month: "2026-08" -> { credit: X, debit: Y, count: N }
    final Map<String, Map<String, dynamic>> monthlyMap = {};

    for (var tx in txs) {
      final isCredit = tx['transactionType'] == 'CREDIT' || tx['type'] == 'CREDIT';
      final isDebit = tx['transactionType'] == 'DEBIT' || tx['type'] == 'DEBIT';
      final amount = (tx['amount'] ?? tx['totalCredit'] ?? tx['finalAmount'] ?? 0.0).toDouble();

      if (isCredit) totalCreditAllTime += amount;
      if (isDebit) totalDebitAllTime += amount;

      final ts = tx['createdAt'] as Timestamp?;
      final dt = ts?.toDate() ?? DateTime.now();
      final monthKey = "${dt.year}-${dt.month.toString().padLeft(2, '0')}";

      if (!monthlyMap.containsKey(monthKey)) {
        monthlyMap[monthKey] = {
          'year': dt.year,
          'month': dt.month,
          'credit': 0.0,
          'debit': 0.0,
          'count': 0,
        };
      }

      monthlyMap[monthKey]!['count'] = (monthlyMap[monthKey]!['count'] as int) + 1;
      if (isCredit) {
        monthlyMap[monthKey]!['credit'] = (monthlyMap[monthKey]!['credit'] as double) + amount;
      } else if (isDebit) {
        monthlyMap[monthKey]!['debit'] = (monthlyMap[monthKey]!['debit'] as double) + amount;
      }
    }

    final sortedMonths = monthlyMap.keys.toList()..sort((a, b) => b.compareTo(a));

    final monthNames = [
      '', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    final screenWidth = MediaQuery.of(context).size.width;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── 4 KPI TILES WITH HIGH-TECH BACKGROUND ARTWORK & WATERMARKS ──
        GridView.count(
          crossAxisCount: screenWidth > 900 ? 4 : (screenWidth > 550 ? 2 : 1),
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: screenWidth > 1200
              ? 1.55
              : (screenWidth > 900 ? 1.35 : (screenWidth > 550 ? 1.35 : 1.7)),
          children: [
            _buildDepositTile(
              title: 'Активный депозит',
              value: '${_formatNum(totalActiveBalance)} ₫',
              subtitle: 'Доступно гостям в баре',
              badge: 'АКТИВНЫЙ БАЛАНС',
              icon: CupertinoIcons.creditcard_fill,
              watermarkIcon: CupertinoIcons.creditcard_fill,
              color: AppColors.accentYellow,
              bgPainter: const LuxuryCardBgPainter(color: AppColors.accentYellow),
            ),
            _buildDepositTile(
              title: 'Гостей с депозитом',
              value: '$depositUsersCount чел',
              subtitle: 'С положительным балансом',
              badge: 'VIP СООБЩЕСТВО',
              icon: CupertinoIcons.person_2_fill,
              watermarkIcon: CupertinoIcons.person_3_fill,
              color: AppColors.accentBlue,
              bgPainter: const UserNetworkBgPainter(color: AppColors.accentBlue),
            ),
            _buildDepositTile(
              title: 'Внесено за всё время',
              value: '+${_formatNum(totalCreditAllTime)} ₫',
              subtitle: 'Все пополнения',
              badge: 'ПРИТОК СРЕДСТВ',
              icon: CupertinoIcons.arrow_down_left_square_fill,
              watermarkIcon: CupertinoIcons.arrow_down_left_square_fill,
              color: AppColors.accentGreen,
              bgPainter: const InflowVaultBgPainter(color: AppColors.accentGreen),
            ),
            _buildDepositTile(
              title: 'Списано за всё время',
              value: '-${_formatNum(totalDebitAllTime)} ₫',
              subtitle: 'Списания по чекам',
              badge: 'СПИСАНИЯ ЧЕКОВ',
              icon: CupertinoIcons.arrow_up_right_square_fill,
              watermarkIcon: CupertinoIcons.arrow_up_right_square_fill,
              color: Colors.redAccent,
              bgPainter: const OutflowTerminalBgPainter(color: Colors.redAccent),
            ),
          ],
        ),

        const SizedBox(height: 28),

        // ── MONTHLY DYNAMICS ──
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'ПОМЕСЯЧНАЯ ДИНАМИКА ДЕПОЗИТОВ',
              style: TextStyle(
                color: Colors.white54,
                fontWeight: FontWeight.w900,
                fontSize: 11,
                letterSpacing: 1.2,
              ),
            ),
            if (sortedMonths.isNotEmpty)
              Text(
                'Всего месяцев: ${sortedMonths.length}',
                style: const TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w600),
              ),
          ],
        ),
        const SizedBox(height: 12),

        if (sortedMonths.isEmpty)
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: AppColors.macosSurfaceBg,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Center(
              child: Text(
                'Транзакций депозитов пока нет',
                style: TextStyle(color: Colors.white38),
              ),
            ),
          )
        else
          ...sortedMonths.map((mKey) {
            final data = monthlyMap[mKey]!;
            final year = data['year'] as int;
            final month = data['month'] as int;
            final credit = data['credit'] as double;
            final debit = data['debit'] as double;
            final count = data['count'] as int;
            final net = credit - debit;
            final monthTitle = "${monthNames[month]} $year";
            final isMonthFiltered = _selectedMonthKey == mKey;

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.macosSurfaceBg,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isMonthFiltered
                      ? AppColors.accentYellow.withOpacity(0.6)
                      : Colors.white.withOpacity(0.08),
                  width: isMonthFiltered ? 1.5 : 1.0,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(
                            monthTitle,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 16,
                            ),
                          ),
                          if (isMonthFiltered) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.accentYellow.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'АКТИВНЫЙ ФИЛЬТР',
                                style: TextStyle(
                                  color: AppColors.accentYellow,
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '$count операций',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: () {
                              setState(() {
                                if (_selectedMonthKey == mKey) {
                                  _selectedMonthKey = null;
                                } else {
                                  _selectedMonthKey = mKey;
                                  _selectedDatePreset = 'ALL';
                                  _customDateRange = null;
                                }
                              });
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isMonthFiltered
                                    ? Colors.redAccent.withOpacity(0.15)
                                    : AppColors.accentYellow.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    isMonthFiltered ? CupertinoIcons.clear : CupertinoIcons.doc_text_search,
                                    size: 12,
                                    color: isMonthFiltered ? Colors.redAccent : AppColors.accentYellow,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    isMonthFiltered ? 'Сбросить' : 'В журнал',
                                    style: TextStyle(
                                      color: isMonthFiltered ? Colors.redAccent : AppColors.accentYellow,
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
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Внесено (Credit)', style: TextStyle(color: Colors.white38, fontSize: 11)),
                            const SizedBox(height: 2),
                            Text(
                              '+${_formatNum(credit)} ₫',
                              style: const TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Списано (Debit)', style: TextStyle(color: Colors.white38, fontSize: 11)),
                            const SizedBox(height: 2),
                            Text(
                              '-${_formatNum(debit)} ₫',
                              style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('Чистый приток', style: TextStyle(color: Colors.white38, fontSize: 11)),
                            const SizedBox(height: 2),
                            Text(
                              '${net >= 0 ? '+' : ''}${_formatNum(net)} ₫',
                              style: TextStyle(
                                color: net >= 0 ? AppColors.accentYellow : Colors.orangeAccent,
                                fontWeight: FontWeight.w900,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }),

        const SizedBox(height: 32),

        // ── DETAILED JOURNAL EMBEDDED DIRECTLY IN THIS SCREEN ──
        _buildJournalSection(txs, users, monthlyMap, isStandaloneTab: false),
      ],
    );
  }

  // ── 2. USERS TAB ─────────────────────────────────────────────────────────

  Widget _buildUsersTab(List<Map<String, dynamic>> txs, List<dynamic> users) {
    final roleProvider = Provider.of<RoleProvider>(context, listen: false);
    final activeVenueId = widget.venueId ?? roleProvider.venueId ?? '';

    final Map<String, double> userCredits = {};
    final Map<String, double> userDebits = {};

    for (var tx in txs) {
      final txUid = (tx['userId'] ?? '').toString().trim();
      final txEmail = (tx['guestEmail'] ?? '').toString().toLowerCase().trim();
      final txName = (tx['guestName'] ?? tx['userName'] ?? '').toString().toLowerCase().trim();

      final isCredit = tx['transactionType'] == 'CREDIT' || tx['type'] == 'CREDIT';
      final isDebit = tx['transactionType'] == 'DEBIT' || tx['type'] == 'DEBIT';
      final amount = (tx['amount'] ?? tx['totalCredit'] ?? tx['finalAmount'] ?? 0.0).toDouble();

      for (var u in users) {
        final uUid = (u['uid'] ?? '').toString().trim();
        final uEmail = (u['email'] ?? '').toString().toLowerCase().trim();
        final uName = (u['displayName'] ?? u['name'] ?? '').toString().toLowerCase().trim();

        bool isMatch = false;
        if (txUid.isNotEmpty && uUid.isNotEmpty && txUid == uUid) {
          isMatch = true;
        } else if (txEmail.isNotEmpty && uEmail.isNotEmpty && txEmail == uEmail) {
          isMatch = true;
        } else if (txName.isNotEmpty && uName.isNotEmpty && txName == uName) {
          isMatch = true;
        }

        if (isMatch) {
          if (isCredit) {
            userCredits[uUid] = (userCredits[uUid] ?? 0.0) + amount;
          } else if (isDebit) {
            userDebits[uUid] = (userDebits[uUid] ?? 0.0) + amount;
          }
        }
      }
    }

    final filteredUsers = users.where((u) {
      final uid = u['uid'] ?? '';
      double bal = (u['deposit_balance'] ?? 0.0).toDouble();
      if (activeVenueId.isNotEmpty && u['deposit_balances'] != null && u['deposit_balances'][activeVenueId] != null) {
        bal = (u['deposit_balances'][activeVenueId] as num).toDouble();
      }
      final name = (u['displayName'] ?? u['name'] ?? '').toString().toLowerCase();
      final email = (u['email'] ?? '').toString().toLowerCase();
      final q = _userTabSearchQuery.toLowerCase().trim();

      final hasTx = (userCredits[uid] ?? 0) > 0 || (userDebits[uid] ?? 0) > 0;

      if (q.isNotEmpty) {
        return name.contains(q) || email.contains(q) || uid.contains(q);
      }
      return bal > 0 || hasTx;
    }).toList();

    double getUserEffectiveBalance(dynamic u) {
      final uid = u['uid'] ?? '';
      double storedBal = 0.0;
      if (activeVenueId.isNotEmpty && u['deposit_balances'] != null && u['deposit_balances'][activeVenueId] != null) {
        storedBal = (u['deposit_balances'][activeVenueId] as num).toDouble();
      } else {
        storedBal = (u['deposit_balance'] ?? 0.0).toDouble();
      }

      final cred = userCredits[uid] ?? 0.0;
      final deb = userDebits[uid] ?? 0.0;
      final calcBal = cred - deb;

      if ((cred > 0 || deb > 0) && calcBal >= 0) {
        return calcBal;
      }
      return storedBal > 0 ? storedBal : (calcBal > 0 ? calcBal : 0.0);
    }

    filteredUsers.sort((a, b) {
      final bA = getUserEffectiveBalance(a);
      final bB = getUserEffectiveBalance(b);
      return bB.compareTo(bA);
    });

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            onChanged: (val) => setState(() => _userTabSearchQuery = val),
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Поиск по имени или email...',
              hintStyle: const TextStyle(color: Colors.white38),
              prefixIcon: const Icon(CupertinoIcons.search, color: AppColors.accentYellow),
              filled: true,
              fillColor: AppColors.macosSurfaceBg,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ),
        Expanded(
          child: filteredUsers.isEmpty
              ? const Center(
                  child: Text(
                    'Пользователи с депозитами не найдены',
                    style: TextStyle(color: Colors.white38),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: filteredUsers.length,
                  itemBuilder: (context, idx) {
                    final u = filteredUsers[idx];
                    final uid = u['uid'] ?? '';
                    final name = u['displayName'] ?? u['name'] ?? 'Гость';
                    final email = u['email'] ?? '';
                    final balance = getUserEffectiveBalance(u);
                    final tier = u['current_discount_tier'] ?? 4;
                    final totalCred = userCredits[uid] ?? 0.0;
                    final totalDeb = userDebits[uid] ?? 0.0;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.macosSurfaceBg,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: balance > 0
                              ? AppColors.accentYellow.withOpacity(0.3)
                              : Colors.white.withOpacity(0.06),
                        ),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                backgroundColor: balance > 0
                                    ? AppColors.accentYellow.withOpacity(0.2)
                                    : Colors.white10,
                                child: Text(
                                  name.isNotEmpty ? name[0].toUpperCase() : 'G',
                                  style: TextStyle(
                                    color: balance > 0 ? AppColors.accentYellow : Colors.white70,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      name,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                      ),
                                    ),
                                    if (email.isNotEmpty)
                                      Text(
                                        email,
                                        style: const TextStyle(color: Colors.white38, fontSize: 11),
                                      ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    '${_formatNum(balance)} ₫',
                                    style: TextStyle(
                                      color: balance > 0 ? AppColors.accentYellow : Colors.white54,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 16,
                                    ),
                                  ),
                                  Text(
                                    'Тир $tier',
                                    style: const TextStyle(color: Colors.white38, fontSize: 10),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Divider(color: Colors.white10, height: 1),
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Внесено: +${_formatNum(totalCred)} ₫  |  Списано: -${_formatNum(totalDeb)} ₫',
                                style: const TextStyle(color: Colors.white54, fontSize: 11),
                              ),
                              Row(
                                children: [
                                  // Jump to Journal for this guest
                                  InkWell(
                                    onTap: () => _filterByUser(uid, name),
                                    borderRadius: BorderRadius.circular(8),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AppColors.accentYellow.withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(CupertinoIcons.doc_text_search, size: 12, color: AppColors.accentYellow),
                                          SizedBox(width: 4),
                                          Text('Журнал', style: TextStyle(color: AppColors.accentYellow, fontSize: 11, fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  IconButton(
                                    icon: const Icon(CupertinoIcons.plus_circle, color: AppColors.accentGreen, size: 20),
                                    tooltip: 'Пополнить',
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => DepositActionScreen(
                                            initialUserId: uid,
                                            initialAction: 'topup',
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                  IconButton(
                                    icon: const Icon(CupertinoIcons.minus_circle, color: Colors.redAccent, size: 20),
                                    tooltip: 'Списать',
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => DepositActionScreen(
                                            initialUserId: uid,
                                            initialAction: 'deduct',
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  // ── 3. DEDICATED FULL-SCREEN JOURNAL TAB ───────────────────────────────────

  Widget _buildDedicatedJournalTab(List<Map<String, dynamic>> txs, List<dynamic> users) {
    final Map<String, Map<String, dynamic>> monthlyMap = {};
    for (var tx in txs) {
      final ts = tx['createdAt'] as Timestamp?;
      final dt = ts?.toDate() ?? DateTime.now();
      final monthKey = "${dt.year}-${dt.month.toString().padLeft(2, '0')}";
      if (!monthlyMap.containsKey(monthKey)) {
        monthlyMap[monthKey] = {
          'year': dt.year,
          'month': dt.month,
        };
      }
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildJournalSection(txs, users, monthlyMap, isStandaloneTab: true),
      ],
    );
  }

  // ── COMPREHENSIVE JOURNAL SECTION (REUSABLE IN TAB 1 & TAB 3) ──────────────

  Widget _buildJournalSection(
    List<Map<String, dynamic>> allTxs,
    List<dynamic> allUsers,
    Map<String, Map<String, dynamic>> monthlyMap, {
    required bool isStandaloneTab,
  }) {
    // 1. Build Users Lookup Map for Filter Dropdown
    final Map<String, String> userNamesMap = {};
    for (var tx in allTxs) {
      final uid = (tx['userId'] ?? '').toString().trim();
      final name = (tx['guestName'] ?? tx['userName'] ?? 'Гость').toString().trim();
      if (uid.isNotEmpty) {
        userNamesMap[uid] = name;
      }
    }
    for (var u in allUsers) {
      final uid = (u['uid'] ?? '').toString().trim();
      final name = (u['displayName'] ?? u['name'] ?? '').toString().trim();
      if (uid.isNotEmpty && name.isNotEmpty) {
        userNamesMap[uid] = name;
      }
    }

    // 2. Filter Transactions based on Date, User, Type, and Search Query
    final filteredTxs = allTxs.where((tx) {
      // ── Date Filtering ──
      final ts = tx['createdAt'] as Timestamp?;
      if (ts != null) {
        final dt = ts.toDate();

        // Month Key Filter (e.g., "2026-09")
        if (_selectedMonthKey != null && _selectedMonthKey!.isNotEmpty) {
          final txMonthKey = "${dt.year}-${dt.month.toString().padLeft(2, '0')}";
          if (txMonthKey != _selectedMonthKey) return false;
        }

        // Custom Date Range Filter
        if (_customDateRange != null) {
          final start = DateTime(_customDateRange!.start.year, _customDateRange!.start.month, _customDateRange!.start.day);
          final end = DateTime(_customDateRange!.end.year, _customDateRange!.end.month, _customDateRange!.end.day, 23, 59, 59);
          if (dt.isBefore(start) || dt.isAfter(end)) return false;
        }

        // Preset Date Filters
        final now = DateTime.now();
        switch (_selectedDatePreset) {
          case 'TODAY':
            if (dt.year != now.year || dt.month != now.month || dt.day != now.day) return false;
            break;
          case 'WEEK':
            final weekAgo = now.subtract(const Duration(days: 7));
            if (dt.isBefore(weekAgo)) return false;
            break;
          case '30_DAYS':
            final monthAgo = now.subtract(const Duration(days: 30));
            if (dt.isBefore(monthAgo)) return false;
            break;
          case 'THIS_MONTH':
            if (dt.year != now.year || dt.month != now.month) return false;
            break;
          case 'LAST_MONTH':
            final lastMonth = DateTime(now.year, now.month - 1, 1);
            if (dt.year != lastMonth.year || dt.month != lastMonth.month) return false;
            break;
          case 'ALL':
          default:
            break;
        }
      }

      // ── Operation Type Filtering ──
      final isCredit = tx['transactionType'] == 'CREDIT' || tx['type'] == 'CREDIT';
      final isDebit = tx['transactionType'] == 'DEBIT' || tx['type'] == 'DEBIT';
      if (_selectedTxType == 'CREDIT' && !isCredit) return false;
      if (_selectedTxType == 'DEBIT' && !isDebit) return false;

      // ── User Filtering (Selected User ID) ──
      final txUid = (tx['userId'] ?? '').toString().trim();
      final txName = (tx['guestName'] ?? tx['userName'] ?? '').toString().toLowerCase().trim();
      final txEmail = (tx['guestEmail'] ?? '').toString().toLowerCase().trim();

      if (_selectedUserId != null && _selectedUserId!.isNotEmpty) {
        bool match = (txUid.isNotEmpty && txUid == _selectedUserId);
        if (!match && _selectedUserName != null && _selectedUserName!.isNotEmpty) {
          match = txName == _selectedUserName!.toLowerCase();
        }
        if (!match) return false;
      }

      // ── Text Search Query (Guest Name, Email, ID) ──
      if (_journalSearchQuery.trim().isNotEmpty) {
        final q = _journalSearchQuery.toLowerCase().trim();
        final matchesSearch = txName.contains(q) || txEmail.contains(q) || txUid.toLowerCase().contains(q);
        if (!matchesSearch) return false;
      }

      return true;
    }).toList();

    // 3. Calculate Summary Figures for the Filtered Set
    double filteredCredit = 0;
    double filteredDebit = 0;
    for (var tx in filteredTxs) {
      final isCredit = tx['transactionType'] == 'CREDIT' || tx['type'] == 'CREDIT';
      final isDebit = tx['transactionType'] == 'DEBIT' || tx['type'] == 'DEBIT';
      final amount = (tx['amount'] ?? tx['totalCredit'] ?? tx['finalAmount'] ?? 0.0).toDouble();
      if (isCredit) filteredCredit += amount;
      if (isDebit) filteredDebit += amount;
    }
    final filteredNet = filteredCredit - filteredDebit;

    final hasActiveFilters = _journalSearchQuery.isNotEmpty ||
        _selectedUserId != null ||
        _selectedTxType != 'ALL' ||
        _selectedDatePreset != 'ALL' ||
        _customDateRange != null ||
        _selectedMonthKey != null;

    final sortedMonthsList = monthlyMap.keys.toList()..sort((a, b) => b.compareTo(a));
    final monthNames = [
      '', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Title
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(CupertinoIcons.doc_text_search, size: 16, color: AppColors.accentYellow),
                const SizedBox(width: 8),
                Text(
                  isStandaloneTab ? 'ДЕТАЛЬНЫЙ ЖУРНАЛ ОПЕРАЦИЙ' : 'ЖУРНАЛ ОПЕРАЦИЙ ПО ДЕПОЗИТАМ',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
            if (!isStandaloneTab)
              TextButton.icon(
                icon: const Icon(CupertinoIcons.fullscreen, size: 13, color: AppColors.accentYellow),
                label: const Text('На весь экран', style: TextStyle(color: AppColors.accentYellow, fontSize: 11, fontWeight: FontWeight.bold)),
                onPressed: () => _tabController.animateTo(2),
              ),
          ],
        ),

        const SizedBox(height: 12),

        // ── FILTER CARD: DATE & USER CONTROLS ──
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.macosSurfaceBg,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Row 1: Search by User & Guest Dropdown Selector
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: TextField(
                      controller: _journalSearchCtrl,
                      onChanged: (val) => setState(() => _journalSearchQuery = val),
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Поиск по гостю, email или ID...',
                        hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                        prefixIcon: const Icon(CupertinoIcons.search, color: AppColors.accentYellow, size: 16),
                        suffixIcon: _journalSearchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(CupertinoIcons.clear_circled_solid, color: Colors.white38, size: 16),
                                onPressed: () {
                                  setState(() {
                                    _journalSearchQuery = '';
                                    _journalSearchCtrl.clear();
                                  });
                                },
                              )
                            : null,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        filled: true,
                        fillColor: Colors.white.withOpacity(0.05),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  // User Picker Dropdown
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.08)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String?>(
                        value: _selectedUserId,
                        dropdownColor: const Color(0xFF242426),
                        icon: const Icon(CupertinoIcons.chevron_down, size: 12, color: AppColors.accentYellow),
                        hint: const Row(
                          children: [
                            Icon(CupertinoIcons.person_crop_circle, size: 14, color: Colors.white70),
                            SizedBox(width: 6),
                            Text('Все гости', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
                          ],
                        ),
                        items: [
                          const DropdownMenuItem<String?>(
                            value: null,
                            child: Text('Все гости', style: TextStyle(color: Colors.white70, fontSize: 12)),
                          ),
                          ...userNamesMap.entries.map((entry) {
                            return DropdownMenuItem<String?>(
                              value: entry.key,
                              child: Text(
                                entry.value.isNotEmpty ? entry.value : entry.key.substring(0, 8),
                                style: const TextStyle(color: Colors.white, fontSize: 12),
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          }),
                        ],
                        onChanged: (val) {
                          setState(() {
                            _selectedUserId = val;
                            _selectedUserName = val != null ? userNamesMap[val] : null;
                          });
                        },
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Row 2: Date Filtering (Pills + Month Dropdown + Date Range Picker)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  _buildDateFilterChip('Все даты', 'ALL'),
                  _buildDateFilterChip('Сегодня', 'TODAY'),
                  _buildDateFilterChip('7 дней', 'WEEK'),
                  _buildDateFilterChip('30 дней', '30_DAYS'),
                  _buildDateFilterChip('Этот месяц', 'THIS_MONTH'),
                  _buildDateFilterChip('Прошлый месяц', 'LAST_MONTH'),

                  // Custom Date Range Picker Button
                  InkWell(
                    onTap: _pickCustomDateRange,
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: _selectedDatePreset == 'CUSTOM'
                            ? AppColors.accentYellow.withOpacity(0.2)
                            : Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _selectedDatePreset == 'CUSTOM'
                              ? AppColors.accentYellow
                              : Colors.white.withOpacity(0.12),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            CupertinoIcons.calendar,
                            size: 13,
                            color: _selectedDatePreset == 'CUSTOM' ? AppColors.accentYellow : Colors.white70,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            _customDateRange != null
                                ? '${_formatDateShort(_customDateRange!.start)} – ${_formatDateShort(_customDateRange!.end)}'
                                : 'Период дат',
                            style: TextStyle(
                              color: _selectedDatePreset == 'CUSTOM' ? AppColors.accentYellow : Colors.white70,
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Month Selector Dropdown
                  if (sortedMonthsList.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: _selectedMonthKey != null
                            ? AppColors.accentYellow.withOpacity(0.15)
                            : Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _selectedMonthKey != null
                              ? AppColors.accentYellow
                              : Colors.white.withOpacity(0.12),
                        ),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String?>(
                          value: _selectedMonthKey,
                          dropdownColor: const Color(0xFF242426),
                          icon: const Icon(CupertinoIcons.chevron_down, size: 10, color: AppColors.accentYellow),
                          hint: const Text('Выбрать месяц', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                          items: [
                            const DropdownMenuItem<String?>(
                              value: null,
                              child: Text('Все месяцы', style: TextStyle(color: Colors.white70, fontSize: 11)),
                            ),
                            ...sortedMonthsList.map((mKey) {
                              final data = monthlyMap[mKey]!;
                              final y = data['year'] as int;
                              final m = data['month'] as int;
                              return DropdownMenuItem<String?>(
                                value: mKey,
                                child: Text("${monthNames[m]} $y", style: const TextStyle(color: Colors.white, fontSize: 11)),
                              );
                            }),
                          ],
                          onChanged: (val) {
                            setState(() {
                              _selectedMonthKey = val;
                              if (val != null) {
                                _selectedDatePreset = 'ALL';
                                _customDateRange = null;
                              }
                            });
                          },
                        ),
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 12),

              // Row 3: Operation Type Chips (All, Credit, Debit)
              Row(
                children: [
                  _buildTxTypeChip('Все операции', 'ALL'),
                  const SizedBox(width: 8),
                  _buildTxTypeChip('Пополнения (+)', 'CREDIT'),
                  const SizedBox(width: 8),
                  _buildTxTypeChip('Списания (-)', 'DEBIT'),
                ],
              ),

              // Active Filters Pill Bar (if any active filter)
              if (hasActiveFilters) ...[
                const SizedBox(height: 12),
                const Divider(color: Colors.white10, height: 1),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    const Text('Активные фильтры:', style: TextStyle(color: Colors.white38, fontSize: 10, fontWeight: FontWeight.bold)),
                    if (_selectedUserId != null)
                      _buildActiveFilterBadge(
                        'Гость: ${_selectedUserName ?? _selectedUserId!.substring(0, 8)}',
                        () => setState(() {
                          _selectedUserId = null;
                          _selectedUserName = null;
                        }),
                      ),
                    if (_journalSearchQuery.isNotEmpty)
                      _buildActiveFilterBadge(
                        'Поиск: "$_journalSearchQuery"',
                        () => setState(() {
                          _journalSearchQuery = '';
                          _journalSearchCtrl.clear();
                        }),
                      ),
                    if (_selectedMonthKey != null)
                      _buildActiveFilterBadge(
                        'Месяц: $_selectedMonthKey',
                        () => setState(() => _selectedMonthKey = null),
                      ),
                    if (_selectedDatePreset == 'CUSTOM' && _customDateRange != null)
                      _buildActiveFilterBadge(
                        '${_formatDateShort(_customDateRange!.start)} – ${_formatDateShort(_customDateRange!.end)}',
                        () => setState(() {
                          _customDateRange = null;
                          _selectedDatePreset = 'ALL';
                        }),
                      ),
                    if (_selectedDatePreset != 'ALL' && _selectedDatePreset != 'CUSTOM')
                      _buildActiveFilterBadge(
                        'Период: $_selectedDatePreset',
                        () => setState(() => _selectedDatePreset = 'ALL'),
                      ),
                    if (_selectedTxType != 'ALL')
                      _buildActiveFilterBadge(
                        _selectedTxType == 'CREDIT' ? 'Только пополнения' : 'Только списания',
                        () => setState(() => _selectedTxType = 'ALL'),
                      ),
                    TextButton(
                      onPressed: _resetJournalFilters,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text('Сбросить всё', style: TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── SUMMARY STATS BANNER FOR FILTERED TRANSACTIONS ──
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.macosSurfaceBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.06)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSummaryPill('Операций', '${filteredTxs.length}', Colors.white),
              _buildSummaryPill('Внесено', '+${_formatNum(filteredCredit)} ₫', AppColors.accentGreen),
              _buildSummaryPill('Списано', '-${_formatNum(filteredDebit)} ₫', Colors.redAccent),
              _buildSummaryPill(
                'Сальдо',
                '${filteredNet >= 0 ? '+' : ''}${_formatNum(filteredNet)} ₫',
                filteredNet >= 0 ? AppColors.accentYellow : Colors.orangeAccent,
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // ── LIST OF DETAILED TRANSACTION CARDS ──
        if (filteredTxs.isEmpty)
          Container(
            padding: const EdgeInsets.all(36),
            decoration: BoxDecoration(
              color: AppColors.macosSurfaceBg,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.06)),
            ),
            child: Center(
              child: Column(
                children: [
                  Icon(CupertinoIcons.doc_text_search, size: 44, color: Colors.white.withOpacity(0.2)),
                  const SizedBox(height: 12),
                  const Text(
                    'Транзакции по выбранным фильтрам не найдены',
                    style: TextStyle(color: Colors.white54, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Попробуйте изменить период дат, выбрать другого гостя или сбросить фильтры',
                    style: TextStyle(color: Colors.white38, fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _resetJournalFilters,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentYellow,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(CupertinoIcons.arrow_counterclockwise, size: 14),
                    label: const Text('Сбросить все фильтры', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),
            ),
          )
        else
          ...filteredTxs.map((tx) => _buildDetailedTransactionCard(tx)),
      ],
    );
  }

  // ── DETAILED TRANSACTION CARD ──────────────────────────────────────────────

  Widget _buildDetailedTransactionCard(Map<String, dynamic> tx) {
    final isCredit = tx['transactionType'] == 'CREDIT' || tx['type'] == 'CREDIT';
    final guestName = (tx['guestName'] ?? tx['userName'] ?? 'Гость').toString();
    final guestEmail = (tx['guestEmail'] ?? '').toString();
    final guestUid = (tx['userId'] ?? '').toString();

    final amount = (tx['amount'] ?? tx['totalCredit'] ?? tx['finalAmount'] ?? 0.0).toDouble();
    final bonusAmount = (tx['bonusAmount'] ?? 0.0).toDouble();
    final bonusPercent = (tx['bonusPercent'] ?? 0).toInt();
    final discountSaved = (tx['discountAmountSaved'] ?? 0.0).toDouble();

    final balanceAfter = (tx['balanceAfter'] ?? tx['newBalance'] ?? tx['balance'] ?? 0.0).toDouble();
    final staffName = (tx['staffName'] ?? tx['staffTelegramUsername'] ?? tx['staffEmail'] ?? 'Персонал').toString();
    final venueName = (tx['venueName'] ?? '').toString();

    final ts = tx['createdAt'] as Timestamp?;
    final dt = ts?.toDate();
    final dateStr = dt != null ? _formatDateTime(dt) : '—';
    final relativeTime = dt != null ? _formatRelativeTime(dt) : '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isCredit
              ? AppColors.accentGreen.withOpacity(0.25)
              : Colors.redAccent.withOpacity(0.22),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: (isCredit ? AppColors.accentGreen : Colors.redAccent).withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Top row: Type Badge + Date + Relative Time
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isCredit
                      ? AppColors.accentGreen.withOpacity(0.18)
                      : Colors.redAccent.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isCredit ? AppColors.accentGreen : Colors.redAccent,
                    width: 0.8,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isCredit ? CupertinoIcons.arrow_down_left_circle_fill : CupertinoIcons.arrow_up_right_circle_fill,
                      color: isCredit ? AppColors.accentGreen : Colors.redAccent,
                      size: 13,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      isCredit ? 'ПОПОЛНЕНИЕ' : 'СПИСАНИЕ ЧЕКА',
                      style: TextStyle(
                        color: isCredit ? AppColors.accentGreen : Colors.redAccent,
                        fontWeight: FontWeight.w900,
                        fontSize: 10,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              const Icon(CupertinoIcons.time, size: 12, color: Colors.white38),
              const SizedBox(width: 4),
              Text(
                dateStr,
                style: const TextStyle(
                  color: Colors.white70,
                  fontWeight: FontWeight.w600,
                  fontSize: 11,
                ),
              ),
              if (relativeTime.isNotEmpty) ...[
                const SizedBox(width: 5),
                Text(
                  '($relativeTime)',
                  style: const TextStyle(
                    color: Colors.white38,
                    fontSize: 10,
                  ),
                ),
              ],
            ],
          ),

          const SizedBox(height: 12),

          // 2. Middle row: User details <---> Transaction Amount & Breakdown
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 19,
                backgroundColor: isCredit
                    ? AppColors.accentGreen.withOpacity(0.15)
                    : AppColors.accentBlue.withOpacity(0.15),
                child: Text(
                  guestName.isNotEmpty ? guestName[0].toUpperCase() : 'G',
                  style: TextStyle(
                    color: isCredit ? AppColors.accentGreen : AppColors.accentBlue,
                    fontWeight: FontWeight.w900,
                    fontSize: 15,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            guestName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (guestUid.isNotEmpty)
                          InkWell(
                            onTap: () => _filterByUser(guestUid, guestName),
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(CupertinoIcons.search, size: 9, color: AppColors.accentYellow),
                                  SizedBox(width: 3),
                                  Text(
                                    'фильтр',
                                    style: TextStyle(color: AppColors.accentYellow, fontSize: 9, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                    if (guestEmail.isNotEmpty)
                      Text(
                        guestEmail,
                        style: const TextStyle(color: Colors.white38, fontSize: 11),
                      ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${isCredit ? '+' : '-'}${_formatNum(amount)} ₫',
                    style: TextStyle(
                      color: isCredit ? AppColors.accentGreen : Colors.redAccent,
                      fontWeight: FontWeight.w900,
                      fontSize: 17,
                      letterSpacing: -0.5,
                    ),
                  ),
                  if (bonusAmount > 0)
                    Text(
                      'Бонус +${bonusPercent > 0 ? '$bonusPercent%: ' : ''}${_formatNum(bonusAmount)} ₫',
                      style: const TextStyle(color: AppColors.accentYellow, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  if (discountSaved > 0)
                    Text(
                      'Сэкономлено: ${_formatNum(discountSaved)} ₫',
                      style: const TextStyle(color: Colors.orangeAccent, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 12),
          const Divider(color: Colors.white10, height: 1),
          const SizedBox(height: 8),

          // 3. Bottom row: Remaining Balance & Staff Member info
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(CupertinoIcons.creditcard, size: 12, color: Colors.white38),
                  const SizedBox(width: 5),
                  Text(
                    'Остаток депозита: ${_formatNum(balanceAfter)} ₫',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  const Icon(CupertinoIcons.person_badge_plus, size: 12, color: Colors.white38),
                  const SizedBox(width: 4),
                  Text(
                    'Сотрудник: $staffName',
                    style: const TextStyle(color: Colors.white38, fontSize: 10),
                  ),
                  if (venueName.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Text('• $venueName', style: const TextStyle(color: Colors.white24, fontSize: 10)),
                  ],
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── LUXURY TILE COMPONENT WITH BACKGROUND ARTWORK & WATERMARKS ─────────────

  Widget _buildDepositTile({
    required String title,
    required String value,
    required String subtitle,
    required String badge,
    required IconData icon,
    required IconData watermarkIcon,
    required Color color,
    required CustomPainter bgPainter,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.macosSurfaceBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withOpacity(0.38), width: 1.2),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              color.withOpacity(0.12),
              AppColors.macosSurfaceBg,
              const Color(0xFF131315),
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.08),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Stack(
          clipBehavior: Clip.antiAlias,
          children: [
            // 1. Ambient Glow Orb
            Positioned(
              top: -25,
              right: -25,
              child: Container(
                width: 130,
                height: 130,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      color.withOpacity(0.24),
                      color.withOpacity(0.05),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),

            // 2. Custom Canvas Background Painter (Artistic Curves, Networks, Waves)
            Positioned.fill(
              child: CustomPaint(
                painter: bgPainter,
              ),
            ),

            // 3. Tilted Translucent Watermark Art
            Positioned(
              bottom: -15,
              right: -15,
              child: Opacity(
                opacity: 0.12,
                child: Transform.rotate(
                  angle: -0.18,
                  child: Icon(
                    watermarkIcon,
                    size: 96,
                    color: color,
                  ),
                ),
              ),
            ),

            // 4. Foreground Content
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Top row: Badge pill + Icon in frosted circle
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.16),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: color.withOpacity(0.3), width: 0.8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: color,
                                boxShadow: [
                                  BoxShadow(color: color.withOpacity(0.6), blurRadius: 4),
                                ],
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              badge,
                              style: TextStyle(
                                color: color,
                                fontWeight: FontWeight.w900,
                                fontSize: 9,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.15),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(icon, color: color, size: 16),
                      ),
                    ],
                  ),

                  // Bottom Content: Title + Scaled Value + Subtitle
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title.toUpperCase(),
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.55),
                          fontWeight: FontWeight.w800,
                          fontSize: 10,
                          letterSpacing: 1.0,
                        ),
                      ),
                      const SizedBox(height: 4),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          value,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 22,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: color.withOpacity(0.7),
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── FILTER HELPERS & PILLS ─────────────────────────────────────────────────

  Widget _buildDateFilterChip(String label, String preset) {
    final isSelected = _selectedDatePreset == preset && _selectedMonthKey == null;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() {
        _selectedDatePreset = preset;
        _customDateRange = null;
        _selectedMonthKey = null;
      }),
      selectedColor: AppColors.accentYellow,
      backgroundColor: Colors.white.withOpacity(0.06),
      labelStyle: TextStyle(
        color: isSelected ? Colors.black : Colors.white70,
        fontWeight: FontWeight.bold,
        fontSize: 11,
      ),
    );
  }

  Widget _buildTxTypeChip(String label, String value) {
    final isSelected = _selectedTxType == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() => _selectedTxType = value),
      selectedColor: AppColors.accentYellow,
      backgroundColor: Colors.white.withOpacity(0.06),
      labelStyle: TextStyle(
        color: isSelected ? Colors.black : Colors.white70,
        fontWeight: FontWeight.bold,
        fontSize: 11,
      ),
    );
  }

  Widget _buildActiveFilterBadge(String label, VoidCallback onRemove) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold)),
          const SizedBox(width: 4),
          InkWell(
            onTap: onRemove,
            child: const Icon(CupertinoIcons.clear, size: 11, color: Colors.white54),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryPill(String label, String value, Color valueColor) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(color: Colors.white38, fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 0.8),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(color: valueColor, fontWeight: FontWeight.w900, fontSize: 13),
        ),
      ],
    );
  }

  // ── FORMATTERS ─────────────────────────────────────────────────────────────

  String _formatNum(double val) {
    final iVal = val.round();
    final str = iVal.abs().toString();
    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    final formatted = str.replaceAllMapped(reg, (m) => '${m[1]} ');
    return iVal < 0 ? '-$formatted' : formatted;
  }

  String _formatDateShort(DateTime dt) {
    return "${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')}";
  }

  String _formatDateTime(DateTime dt) {
    final d = "${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')}.${dt.year}";
    final t = "${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}";
    return "$d $t";
  }

  String _formatRelativeTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inSeconds < 60) return 'только что';
    if (diff.inMinutes < 60) return '${diff.inMinutes} мин назад';
    if (diff.inHours < 24) return '${diff.inHours} ч назад';
    if (diff.inDays == 1) return 'вчера';
    if (diff.inDays < 7) return '${diff.inDays} дн назад';
    if (diff.inDays < 30) return '${(diff.inDays / 7).floor()} нед назад';
    if (diff.inDays < 365) return '${(diff.inDays / 30).floor()} мес назад';
    return '${(diff.inDays / 365).floor()} г назад';
  }
}

// ── CUSTOM BACKGROUND PAINTERS FOR LUXURY TILES ──────────────────────────────

/// 1. Gold Luxury Card & Currency Waves
class LuxuryCardBgPainter extends CustomPainter {
  final Color color;
  const LuxuryCardBgPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final wavePaint = Paint()
      ..color = color.withOpacity(0.09)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    final path1 = Path();
    path1.moveTo(0, size.height * 0.4);
    path1.quadraticBezierTo(size.width * 0.4, size.height * 0.1, size.width, size.height * 0.6);
    canvas.drawPath(path1, wavePaint);

    final path2 = Path();
    path2.moveTo(0, size.height * 0.65);
    path2.quadraticBezierTo(size.width * 0.6, size.height * 0.35, size.width, size.height * 0.85);
    canvas.drawPath(path2, wavePaint);

    // EMV Chip lines
    final chipPaint = Paint()
      ..color = color.withOpacity(0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    final chipRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(size.width * 0.45, size.height * 0.18, 26, 20),
      const Radius.circular(4),
    );
    canvas.drawRRect(chipRect, chipPaint);
    canvas.drawLine(Offset(size.width * 0.45 + 13, size.height * 0.18), Offset(size.width * 0.45 + 13, size.height * 0.18 + 20), chipPaint);
    canvas.drawLine(Offset(size.width * 0.45, size.height * 0.18 + 10), Offset(size.width * 0.45 + 26, size.height * 0.18 + 10), chipPaint);

    // Concentric gold rings
    final ringPaint = Paint()
      ..color = color.withOpacity(0.05)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawCircle(Offset(size.width * 0.85, size.height * 0.3), 35, ringPaint);
    canvas.drawCircle(Offset(size.width * 0.85, size.height * 0.3), 60, ringPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 2. Azure User Constellation & Network
class UserNetworkBgPainter extends CustomPainter {
  final Color color;
  const UserNetworkBgPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = color.withOpacity(0.10)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final dotPaint = Paint()
      ..color = color.withOpacity(0.25)
      ..style = PaintingStyle.fill;

    final points = [
      Offset(size.width * 0.15, size.height * 0.35),
      Offset(size.width * 0.40, size.height * 0.20),
      Offset(size.width * 0.65, size.height * 0.30),
      Offset(size.width * 0.85, size.height * 0.15),
      Offset(size.width * 0.50, size.height * 0.60),
      Offset(size.width * 0.75, size.height * 0.70),
      Offset(size.width * 0.30, size.height * 0.75),
    ];

    final connections = [
      [0, 1], [1, 2], [2, 3],
      [1, 4], [2, 5], [4, 5],
      [0, 6], [4, 6], [5, 3],
    ];

    for (final pair in connections) {
      canvas.drawLine(points[pair[0]], points[pair[1]], linePaint);
    }

    for (final pt in points) {
      canvas.drawCircle(pt, 2.5, dotPaint);
    }

    // Orbit ellipse
    final orbitPaint = Paint()
      ..color = color.withOpacity(0.07)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width * 0.6, size.height * 0.45),
        width: size.width * 0.7,
        height: size.height * 0.5,
      ),
      orbitPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 3. Emerald Vault & Rising Inflow Beams
class InflowVaultBgPainter extends CustomPainter {
  final Color color;
  const InflowVaultBgPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final beamPaint = Paint()
      ..color = color.withOpacity(0.08)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    for (double i = 0; i < 5; i++) {
      final start = Offset(size.width * 0.2 + (i * 22), size.height);
      final end = Offset(size.width * 0.5 + (i * 22), 0);
      canvas.drawLine(start, end, beamPaint);
    }

    final vaultPaint = Paint()
      ..color = color.withOpacity(0.07)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    canvas.drawCircle(Offset(size.width * 0.8, size.height * 0.35), 25, vaultPaint);
    canvas.drawCircle(Offset(size.width * 0.8, size.height * 0.35), 45, vaultPaint);

    final chevronPaint = Paint()
      ..color = color.withOpacity(0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8;
    for (int j = 0; j < 3; j++) {
      final y = size.height * 0.3 + (j * 14);
      final p = Path()
        ..moveTo(size.width * 0.35, y + 6)
        ..lineTo(size.width * 0.40, y)
        ..lineTo(size.width * 0.45, y + 6);
      canvas.drawPath(p, chevronPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 4. Crimson POS Receipt & Outflow Waves
class OutflowTerminalBgPainter extends CustomPainter {
  final Color color;
  const OutflowTerminalBgPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final receiptPaint = Paint()
      ..color = color.withOpacity(0.08)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    final p = Path();
    p.moveTo(size.width * 0.5, 0);
    p.lineTo(size.width * 0.5, size.height * 0.5);
    double rx = size.width * 0.5;
    while (rx < size.width * 0.9) {
      p.lineTo(rx + 5, size.height * 0.5 - 5);
      p.lineTo(rx + 10, size.height * 0.5);
      rx += 10;
    }
    p.lineTo(size.width * 0.9, 0);
    canvas.drawPath(p, receiptPaint);

    final barcodePaint = Paint()
      ..color = color.withOpacity(0.09)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    for (int k = 0; k < 7; k++) {
      canvas.drawLine(
        Offset(size.width * 0.55 + (k * 6), size.height * 0.15),
        Offset(size.width * 0.55 + (k * 6), size.height * 0.35),
        barcodePaint,
      );
    }

    final wavePaint = Paint()
      ..color = color.withOpacity(0.07)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    final wp = Path()
      ..moveTo(0, size.height * 0.7)
      ..cubicTo(
        size.width * 0.3, size.height * 0.5,
        size.width * 0.7, size.height * 0.9,
        size.width, size.height * 0.6,
      );
    canvas.drawPath(wp, wavePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
