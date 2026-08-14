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
  String _searchQuery = '';
  String _selectedTxType = 'ALL'; // ALL, CREDIT, DEBIT

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
            Tab(icon: Icon(CupertinoIcons.doc_text_fill, size: 16), text: 'История'),
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
                  _buildHistoryTab(allTxs),
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

  // ── 1. MONTHLY ANALYTICAL TAB ─────────────────────────────────────────────

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

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // KPI Summary Cards
        GridView.count(
          crossAxisCount: MediaQuery.of(context).size.width > 600 ? 4 : 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.3,
          children: [
            _buildKpiCard(
              title: 'Активный депозит',
              value: '${_formatNum(totalActiveBalance)} ₫',
              icon: CupertinoIcons.creditcard_fill,
              color: AppColors.accentYellow,
            ),
            _buildKpiCard(
              title: 'Гостей с депозитом',
              value: '$depositUsersCount чел',
              icon: CupertinoIcons.person_2_fill,
              color: AppColors.accentBlue,
            ),
            _buildKpiCard(
              title: 'Внесено за всё время',
              value: '+${_formatNum(totalCreditAllTime)} ₫',
              icon: CupertinoIcons.arrow_down_left_square_fill,
              color: AppColors.accentGreen,
            ),
            _buildKpiCard(
              title: 'Списано за всё время',
              value: '-${_formatNum(totalDebitAllTime)} ₫',
              icon: CupertinoIcons.arrow_up_right_square_fill,
              color: Colors.redAccent,
            ),
          ],
        ),

        const SizedBox(height: 24),
        const Text(
          'ПОМЕСЯЧНАЯ ДИНАМИКА ДЕПОЗИТОВ',
          style: TextStyle(
            color: Colors.white54,
            fontWeight: FontWeight.w900,
            fontSize: 11,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 12),

        if (sortedMonths.isEmpty)
          Container(
            padding: const EdgeInsets.all(32),
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

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.macosSurfaceBg,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        monthTitle,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                        ),
                      ),
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
      ],
    );
  }

  // ── 2. USERS STATS TAB ───────────────────────────────────────────────────

  Widget _buildUsersTab(List<Map<String, dynamic>> txs, List<dynamic> users) {
    // Compute per-user totals
    final Map<String, double> userCredits = {};
    final Map<String, double> userDebits = {};

    for (var tx in txs) {
      final uid = (tx['userId'] ?? '').toString();
      if (uid.isEmpty) continue;

      final isCredit = tx['transactionType'] == 'CREDIT' || tx['type'] == 'CREDIT';
      final isDebit = tx['transactionType'] == 'DEBIT' || tx['type'] == 'DEBIT';
      final amount = (tx['amount'] ?? tx['totalCredit'] ?? tx['finalAmount'] ?? 0.0).toDouble();

      if (isCredit) {
        userCredits[uid] = (userCredits[uid] ?? 0.0) + amount;
      } else if (isDebit) {
        userDebits[uid] = (userDebits[uid] ?? 0.0) + amount;
      }
    }

    final filteredUsers = users.where((u) {
      final bal = (u['deposit_balance'] ?? 0.0).toDouble();
      final name = (u['displayName'] ?? u['name'] ?? '').toString().toLowerCase();
      final email = (u['email'] ?? '').toString().toLowerCase();
      final q = _searchQuery.toLowerCase().trim();

      // Keep user if they have balance or transactions, matching search query
      final uid = u['uid'] ?? '';
      final hasTx = (userCredits[uid] ?? 0) > 0 || (userDebits[uid] ?? 0) > 0;

      if (q.isNotEmpty) {
        return name.contains(q) || email.contains(q) || uid.contains(q);
      }
      return bal > 0 || hasTx;
    }).toList();

    // Sort by deposit_balance descending
    filteredUsers.sort((a, b) {
      final bA = (a['deposit_balance'] ?? 0.0).toDouble();
      final bB = (b['deposit_balance'] ?? 0.0).toDouble();
      return bB.compareTo(bA);
    });

    return Column(
      children: [
        // Search Bar
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            onChanged: (val) => setState(() => _searchQuery = val),
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
                    final balance = (u['deposit_balance'] ?? 0.0).toDouble();
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

  // ── 3. TRANSACTION HISTORY TAB ───────────────────────────────────────────

  Widget _buildHistoryTab(List<Map<String, dynamic>> txs) {
    final filteredTxs = txs.where((t) {
      if (_selectedTxType == 'CREDIT') {
        return t['transactionType'] == 'CREDIT' || t['type'] == 'CREDIT';
      } else if (_selectedTxType == 'DEBIT') {
        return t['transactionType'] == 'DEBIT' || t['type'] == 'DEBIT';
      }
      return true;
    }).toList();

    return Column(
      children: [
        // Filter Buttons
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              _buildFilterChip('Все', 'ALL'),
              const SizedBox(width: 8),
              _buildFilterChip('Пополнения', 'CREDIT'),
              const SizedBox(width: 8),
              _buildFilterChip('Списания', 'DEBIT'),
            ],
          ),
        ),

        Expanded(
          child: filteredTxs.isEmpty
              ? const Center(
                  child: Text('История транзакций пуста', style: TextStyle(color: Colors.white38)),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: filteredTxs.length,
                  itemBuilder: (context, idx) {
                    final tx = filteredTxs[idx];
                    final isCredit = tx['transactionType'] == 'CREDIT' || tx['type'] == 'CREDIT';
                    final guestName = tx['guestName'] ?? tx['userName'] ?? 'Гость';
                    final amount = (tx['amount'] ?? tx['totalCredit'] ?? tx['finalAmount'] ?? 0.0).toDouble();
                    final staffName = tx['staffName'] ?? tx['staffTelegramUsername'] ?? 'Персонал';

                    final ts = tx['createdAt'] as Timestamp?;
                    final dateStr = ts != null
                        ? "${ts.toDate().day.toString().padLeft(2, '0')}.${ts.toDate().month.toString().padLeft(2, '0')}.${ts.toDate().year} ${ts.toDate().hour.toString().padLeft(2, '0')}:${ts.toDate().minute.toString().padLeft(2, '0')}"
                        : '—';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.macosSurfaceBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.06)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: isCredit
                                  ? AppColors.accentGreen.withOpacity(0.15)
                                  : Colors.redAccent.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              isCredit ? CupertinoIcons.arrow_down_left : CupertinoIcons.arrow_up_right,
                              color: isCredit ? AppColors.accentGreen : Colors.redAccent,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  guestName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '$dateStr  •  $staffName',
                                  style: const TextStyle(color: Colors.white38, fontSize: 10),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            '${isCredit ? '+' : '-'}${_formatNum(amount)} ₫',
                            style: TextStyle(
                              color: isCredit ? AppColors.accentGreen : Colors.redAccent,
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                            ),
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

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedTxType == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() => _selectedTxType = value),
      selectedColor: AppColors.accentYellow,
      backgroundColor: AppColors.macosSurfaceBg,
      labelStyle: TextStyle(
        color: isSelected ? Colors.black : Colors.white70,
        fontWeight: FontWeight.bold,
        fontSize: 11,
      ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white38,
                  fontWeight: FontWeight.w800,
                  fontSize: 9,
                  letterSpacing: 0.8,
                ),
              ),
              Icon(icon, color: color, size: 18),
            ],
          ),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 18,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatNum(double val) {
    final iVal = val.round();
    final str = iVal.abs().toString();
    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    final formatted = str.replaceAllMapped(reg, (m) => '${m[1]} ');
    return iVal < 0 ? '-$formatted' : formatted;
  }
}
