import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:intl/intl.dart';

class GlobalGuestsScreen extends StatefulWidget {
  const GlobalGuestsScreen({super.key});

  @override
  State<GlobalGuestsScreen> createState() => _GlobalGuestsScreenState();
}

class _GlobalGuestsScreenState extends State<GlobalGuestsScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = "";

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() {
      setState(() {
        _searchQuery = _searchCtrl.text.trim().toLowerCase();
      });
    });
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
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      "GUEST INTELLIGENCE & LOYALTY",
                      style: TextStyle(color: AppColors.body, fontSize: 12, letterSpacing: 2, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 4),
                    Text(
                      "Guests Overview",
                      style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: AppColors.title),
                    ),
                  ],
                ),
                _buildSearchInput(),
              ],
            ),
            const SizedBox(height: 32),

            // Live Stream Analytics & Breakdown
            StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance.collection('visits').snapshots(),
              builder: (context, visitsSnap) {
                if (visitsSnap.hasError) {
                  return Text("Error loading visits: ${visitsSnap.error}", style: const TextStyle(color: Colors.red));
                }
                if (!visitsSnap.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }

                final visitDocs = visitsSnap.data!.docs;
                return StreamBuilder<QuerySnapshot>(
                  stream: FirebaseFirestore.instance.collection('venues').snapshots(),
                  builder: (context, venuesSnap) {
                    final venueMap = <String, String>{};
                    if (venuesSnap.hasData) {
                      for (var d in venuesSnap.data!.docs) {
                        venueMap[d.id] = (d.data() as Map<String, dynamic>)['name'] ?? 'Venue';
                      }
                    }

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 1. Overall Stats Cards
                        _buildGuestStatsGrid(visitDocs),

                        const SizedBox(height: 40),

                        // 2. Voucher Dispatch Queue
                        _buildSectionHeader("VOUCHER DISPATCH QUEUE (AUTOMATED 24H DISPATCH)", CupertinoIcons.timer),
                        const SizedBox(height: 16),
                        _buildVoucherQueue(),

                        const SizedBox(height: 40),

                        // 3. Repeat Visit Breakdown by Cafe / Venue
                        _buildSectionHeader("REPEAT VISIT BREAKDOWN BY CAFE", CupertinoIcons.building_2_fill),
                        const SizedBox(height: 16),
                        _buildVenueBreakdown(visitDocs, venueMap),

                        const SizedBox(height: 40),

                        // 4. Global Guest Directory
                        _buildSectionHeader("GLOBAL GUEST DIRECTORY", CupertinoIcons.person_3_fill),
                        const SizedBox(height: 16),
                        _buildGuestDirectoryTable(visitDocs, venueMap),
                      ],
                    );
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchInput() {
    return SizedBox(
      width: 300,
      height: 44,
      child: TextField(
        controller: _searchCtrl,
        style: const TextStyle(color: Colors.white, fontSize: 13),
        decoration: InputDecoration(
          hintText: "Search guests by name, email...",
          hintStyle: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 13),
          prefixIcon: Icon(CupertinoIcons.search, color: Colors.white.withOpacity(0.5), size: 18),
          filled: true,
          fillColor: AppColors.surface,
          contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.white10)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.white10)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.accentOrange)),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppColors.premiumGold, size: 18),
        const SizedBox(width: 12),
        Text(title, style: const TextStyle(color: AppColors.premiumGold, fontWeight: FontWeight.w800, letterSpacing: 1.5, fontSize: 13)),
      ],
    );
  }

  Widget _buildGuestStatsGrid(List<QueryDocumentSnapshot> visitDocs) {
    // Process visits metrics
    Map<String, int> guestVisitCounts = {};
    for (var doc in visitDocs) {
      final data = doc.data() as Map<String, dynamic>;
      final uid = (data['uid'] ?? data['guestId'] ?? data['guestEmail'] ?? '').toString();
      if (uid.isEmpty || uid == 'anonymous') continue;
      guestVisitCounts[uid] = (guestVisitCounts[uid] ?? 0) + 1;
    }

    final totalGuests = guestVisitCounts.length;
    final totalVisits = visitDocs.length;
    final repeatGuests = guestVisitCounts.values.where((c) => c > 1).length;
    final repeatVisitsTotal = visitDocs.length - totalGuests > 0 ? visitDocs.length - totalGuests : 0;

    final repeatRate = totalGuests > 0 ? (repeatGuests / totalGuests * 100).toStringAsFixed(1) : "0.0";
    final avgVisitsPerGuest = totalGuests > 0 ? (totalVisits / totalGuests).toStringAsFixed(2) : "0.0";

    return GridView.count(
      crossAxisCount: 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: 1.8,
      children: [
        _buildVitalCard("TOTAL UNIQUE GUESTS", totalGuests.toString(), CupertinoIcons.person_2_fill, AppColors.accentBlue),
        _buildVitalCard("TOTAL VISITS RECORDED", totalVisits.toString(), CupertinoIcons.tickets_fill, AppColors.accentGreen),
        _buildVitalCard("REPEAT GUESTS ($repeatRate%)", "$repeatGuests guests", CupertinoIcons.arrow_2_squarepath, AppColors.premiumGold),
        _buildVitalCard("AVG VISITS / GUEST", "$avgVisitsPerGuest visits", CupertinoIcons.graph_square_fill, AppColors.accentOrange),
      ],
    );
  }

  Widget _buildVitalCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text(label, style: const TextStyle(color: AppColors.body, fontSize: 10, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis)),
              Icon(icon, color: color.withOpacity(0.7), size: 18),
            ],
          ),
          Text(value, style: const TextStyle(color: AppColors.title, fontSize: 22, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  Widget _buildVoucherQueue() {
    final limitTime = DateTime.now().add(const Duration(hours: 48));

    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('scheduled_vouchers')
          .where('status', isEqualTo: 'pending')
          .limit(50)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.accentOrange.withOpacity(0.4)),
            ),
            child: Text(
              "Queue Notice: ${snapshot.error}",
              style: const TextStyle(color: AppColors.accentOrange, fontSize: 13),
            ),
          );
        }

        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        var docs = snapshot.data!.docs.toList();
        
        // Sort by scheduledFor ascending
        docs.sort((a, b) {
          final dataA = a.data() as Map<String, dynamic>;
          final dataB = b.data() as Map<String, dynamic>;
          final Timestamp? tsA = dataA['scheduledFor'];
          final Timestamp? tsB = dataB['scheduledFor'];
          if (tsA == null) return 1;
          if (tsB == null) return -1;
          return tsA.compareTo(tsB);
        });

        // Filter for scheduledFor <= 48h
        docs = docs.where((doc) {
          final data = doc.data() as Map<String, dynamic>;
          final Timestamp? ts = data['scheduledFor'];
          if (ts == null) return true;
          return ts.toDate().isBefore(limitTime);
        }).toList();

        if (docs.isEmpty) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.03)),
            ),
            child: const Center(
              child: Text(
                "No vouchers scheduled in the next 48h. Dispatch queue is clear.",
                style: TextStyle(color: AppColors.tertiary, fontSize: 14),
              ),
            ),
          );
        }

        return Column(
          children: docs.map((doc) {
            final data = doc.data() as Map<String, dynamic>;
            final guestName = data['guestName'] ?? 'Guest';
            final email = data['guestEmail'] ?? data['uid'] ?? 'N/A';
            final venueName = data['venueName'] ?? 'Venue';
            final discount = data['discount'] ?? 20;
            final Timestamp? ts = data['scheduledFor'];

            String timeStr = "Unknown";
            if (ts != null) {
              final d = ts.toDate();
              timeStr = "${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}";
            }

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.premiumGold.withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: AppColors.premiumGold.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(CupertinoIcons.ticket_fill, color: AppColors.premiumGold, size: 20),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("$guestName • $discount% OFF Voucher", style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold, fontSize: 14)),
                        const SizedBox(height: 2),
                        Text("$email  ➜  $venueName", style: const TextStyle(color: AppColors.body, fontSize: 12)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.secondarySurface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.premiumGold.withOpacity(0.3)),
                    ),
                    child: Text(timeStr, style: const TextStyle(color: AppColors.premiumGold, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),
            );
          }).toList(),
        );
      },
    );
  }

  Widget _buildVenueBreakdown(List<QueryDocumentSnapshot> visitDocs, Map<String, String> venueMap) {
    // Group by venueId
    Map<String, Map<String, List<Map<String, dynamic>>>> venueGuestVisits = {};

    for (var doc in visitDocs) {
      final data = doc.data() as Map<String, dynamic>;
      final venueId = (data['venueId'] ?? 'unknown').toString();
      final uid = (data['uid'] ?? data['guestId'] ?? data['guestEmail'] ?? '').toString();
      if (uid.isEmpty || uid == 'anonymous') continue;

      venueGuestVisits.putIfAbsent(venueId, () => {});
      venueGuestVisits[venueId]!.putIfAbsent(uid, () => []).add(data);
    }

    if (venueGuestVisits.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.03)),
        ),
        child: const Center(child: Text("No venue visit data available.", style: TextStyle(color: AppColors.tertiary))),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      padding: const EdgeInsets.all(20),
      child: Table(
        columnWidths: const {
          0: FlexColumnWidth(2.5),
          1: FlexColumnWidth(1.2),
          2: FlexColumnWidth(1.2),
          3: FlexColumnWidth(1.2),
          4: FlexColumnWidth(1.5),
        },
        children: [
          TableRow(
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1)))),
            children: const [
              Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("VENUE NAME", style: TextStyle(color: AppColors.body, fontWeight: FontWeight.bold, fontSize: 11))),
              Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("TOTAL GUESTS", style: TextStyle(color: AppColors.body, fontWeight: FontWeight.bold, fontSize: 11))),
              Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("REPEAT GUESTS", style: TextStyle(color: AppColors.body, fontWeight: FontWeight.bold, fontSize: 11))),
              Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("TOTAL VISITS", style: TextStyle(color: AppColors.body, fontWeight: FontWeight.bold, fontSize: 11))),
              Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("REPEAT RATE %", style: TextStyle(color: AppColors.body, fontWeight: FontWeight.bold, fontSize: 11))),
            ],
          ),
          ...venueGuestVisits.entries.map((entry) {
            final venueId = entry.key;
            final guestsMap = entry.value;
            final venueName = venueMap[venueId] ?? venueId;

            final totalGuests = guestsMap.length;
            final repeatGuests = guestsMap.values.where((visits) => visits.length > 1).length;
            int totalVisits = 0;
            guestsMap.values.forEach((v) => totalVisits += v.length);

            final rate = totalGuests > 0 ? (repeatGuests / totalGuests * 100).toStringAsFixed(1) : "0.0";

            return TableRow(
              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.03)))),
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Text(venueName, style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold, fontSize: 14)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Text("$totalGuests", style: const TextStyle(color: AppColors.title, fontSize: 14)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Text("$repeatGuests", style: const TextStyle(color: AppColors.premiumGold, fontWeight: FontWeight.bold, fontSize: 14)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Text("$totalVisits", style: const TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold, fontSize: 14)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.accentGreen.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text("$rate%", style: const TextStyle(color: AppColors.accentGreen, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
              ],
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildGuestDirectoryTable(List<QueryDocumentSnapshot> visitDocs, Map<String, String> venueMap) {
    // Process guest directory from users collection
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance.collection('users').limit(100).snapshots(),
      builder: (context, userSnap) {
        if (!userSnap.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        // Aggregate visit counts per user
        Map<String, int> userVisits = {};
        Map<String, String> userLastVenue = {};
        for (var doc in visitDocs) {
          final data = doc.data() as Map<String, dynamic>;
          final uid = (data['uid'] ?? data['guestId'] ?? data['guestEmail'] ?? '').toString();
          if (uid.isEmpty) continue;
          userVisits[uid] = (userVisits[uid] ?? 0) + 1;
          if (data['venueId'] != null) {
            userLastVenue[uid] = venueMap[data['venueId']] ?? data['venueId'];
          }
        }

        var users = userSnap.data!.docs.map((d) => d.data() as Map<String, dynamic>..['id'] = d.id).toList();

        // Apply Search Filter
        if (_searchQuery.isNotEmpty) {
          users = users.where((u) {
            final name = (u['displayName'] ?? u['name'] ?? '').toString().toLowerCase();
            final email = (u['email'] ?? '').toString().toLowerCase();
            final phone = (u['phone'] ?? '').toString().toLowerCase();
            return name.contains(_searchQuery) || email.contains(_searchQuery) || phone.contains(_searchQuery);
          }).toList();
        }

        if (users.isEmpty) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.03)),
            ),
            child: const Center(child: Text("No guests matching search filter.", style: TextStyle(color: AppColors.tertiary))),
          );
        }

        return Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.05)),
          ),
          padding: const EdgeInsets.all(20),
          child: Table(
            columnWidths: const {
              0: FlexColumnWidth(2.5),
              1: FlexColumnWidth(2.0),
              2: FlexColumnWidth(1.2),
              3: FlexColumnWidth(1.5),
              4: FlexColumnWidth(1.5),
            },
            children: [
              TableRow(
                decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1)))),
                children: const [
                  Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("GUEST NAME", style: TextStyle(color: AppColors.body, fontWeight: FontWeight.bold, fontSize: 11))),
                  Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("CONTACT", style: TextStyle(color: AppColors.body, fontWeight: FontWeight.bold, fontSize: 11))),
                  Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("VISITS", style: TextStyle(color: AppColors.body, fontWeight: FontWeight.bold, fontSize: 11))),
                  Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("LAST VENUE", style: TextStyle(color: AppColors.body, fontWeight: FontWeight.bold, fontSize: 11))),
                  Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text("STATUS", style: TextStyle(color: AppColors.body, fontWeight: FontWeight.bold, fontSize: 11))),
                ],
              ),
              ...users.take(30).map((u) {
                final uid = u['id'];
                final name = u['displayName'] ?? u['name'] ?? 'Guest';
                final email = u['email'] ?? u['phone'] ?? u['telegram_chat_id'] ?? 'N/A';
                final visitsCount = userVisits[uid] ?? 1;
                final lastVenue = userLastVenue[uid] ?? 'Network';

                String status = 'NEW';
                Color statusColor = AppColors.accentBlue;
                if (visitsCount >= 3) {
                  status = 'VIP';
                  statusColor = AppColors.premiumGold;
                } else if (visitsCount > 1) {
                  status = 'REPEAT';
                  statusColor = AppColors.accentGreen;
                }

                return TableRow(
                  decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.03)))),
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 14,
                            backgroundColor: statusColor.withOpacity(0.15),
                            child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?', style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Text(name, style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold, fontSize: 13), overflow: TextOverflow.ellipsis)),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(email.toString(), style: const TextStyle(color: AppColors.body, fontSize: 12), overflow: TextOverflow.ellipsis),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text("$visitsCount visits", style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold, fontSize: 13)),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(lastVenue, style: const TextStyle(color: AppColors.body, fontSize: 12)),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(status, style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 11)),
                      ),
                    ),
                  ],
                );
              }).toList(),
            ],
          ),
        );
      },
    );
  }
}
