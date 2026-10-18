import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:intl/intl.dart';

class ScanLogsScreen extends StatefulWidget {
  const ScanLogsScreen({super.key});

  @override
  State<ScanLogsScreen> createState() => _ScanLogsScreenState();
}

class _ScanLogsScreenState extends State<ScanLogsScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = "";
  String _filterLinkType = "all"; // "all", "venue_qr", "google_maps"
  int? _sortColumnIndex;
  bool _sortAscending = true;

  void _onSort(int columnIndex, bool ascending) {
    setState(() {
      _sortColumnIndex = columnIndex;
      _sortAscending = ascending;
    });
  }

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
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      "REAL-TIME SCANNING INTELLIGENCE",
                      style: TextStyle(
                        color: AppColors.body,
                        fontSize: 12,
                        letterSpacing: 2,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      "Журнал регистраций",
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: AppColors.title,
                      ),
                    ),
                  ],
                ),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    _buildFilterDropdown(),
                    _buildSearchInput(),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Firestore Live Stream
            StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance
                  .collection('scans_log')
                  .orderBy('timestamp', descending: true)
                  .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.red.withOpacity(0.3)),
                    ),
                    child: Text(
                      "Ошибка загрузки журнала регистраций: ${snapshot.error}",
                      style: const TextStyle(color: Colors.redAccent),
                    ),
                  );
                }

                if (!snapshot.hasData) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(48.0),
                      child: CircularProgressIndicator(color: AppColors.accentOrange),
                    ),
                  );
                }

                final docs = snapshot.data!.docs;

                // Client-side filtering
                final filteredDocs = docs.where((doc) {
                  final data = doc.data() as Map<String, dynamic>;
                  final userName = (data['userName'] ?? '').toString().toLowerCase();
                  final userEmail = (data['userEmail'] ?? '').toString().toLowerCase();
                  final userId = (data['userId'] ?? '').toString().toLowerCase();
                  final venueName = (data['venueName'] ?? '').toString().toLowerCase();
                  final venueId = (data['venueId'] ?? '').toString().toLowerCase();
                  final discountType = (data['discountType'] ?? '').toString().toLowerCase();
                  final fromGoogleMaps = data['fromGoogleMaps'] == true;

                  // 1. Link type filter
                  if (_filterLinkType == 'venue_qr' && fromGoogleMaps) return false;
                  if (_filterLinkType == 'google_maps' && !fromGoogleMaps) return false;

                  // 2. Search query filter
                  if (_searchQuery.isNotEmpty) {
                    final matches = userName.contains(_searchQuery) ||
                        userEmail.contains(_searchQuery) ||
                        userId.contains(_searchQuery) ||
                        venueName.contains(_searchQuery) ||
                        venueId.contains(_searchQuery) ||
                        discountType.contains(_searchQuery);
                    if (!matches) return false;
                  }

                  return true;
                }).toList();

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Statistics Grid
                    _buildStatsGrid(docs),
                    const SizedBox(height: 32),

                    // Section Title
                    Row(
                      children: [
                        const Icon(CupertinoIcons.doc_text_search, color: AppColors.accentOrange, size: 20),
                        const SizedBox(width: 10),
                        Text(
                          "ЖУРНАЛ ЗАХОДОВ В ПРИЛОЖЕНИЕ (${filteredDocs.length})",
                          style: const TextStyle(
                            color: AppColors.title,
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Table container
                    _buildScansTable(filteredDocs),
                  ],
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
      width: 280,
      height: 44,
      child: TextField(
        controller: _searchCtrl,
        style: const TextStyle(color: Colors.white, fontSize: 13),
        decoration: InputDecoration(
          hintText: "Поиск (имя, email, venue)...",
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

  Widget _buildFilterDropdown() {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _filterLinkType,
          dropdownColor: const Color(0xFF1C1C1E),
          icon: Icon(CupertinoIcons.chevron_down, color: Colors.white.withOpacity(0.6), size: 14),
          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
          onChanged: (val) {
            if (val != null) {
              setState(() => _filterLinkType = val);
            }
          },
          items: const [
            DropdownMenuItem(value: "all", child: Text(" Все источники")),
            DropdownMenuItem(value: "venue_qr", child: Text("🏪 QR Заведения")),
            DropdownMenuItem(value: "google_maps", child: Text("🗺️ QR Google Maps")),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsGrid(List<QueryDocumentSnapshot> docs) {
    int totalScans = docs.length;
    int googleMapsScans = 0;
    int venueQrScans = 0;
    double totalDiscount = 0;

    for (var doc in docs) {
      final data = doc.data() as Map<String, dynamic>;
      if (data['fromGoogleMaps'] == true) {
        googleMapsScans++;
      } else {
        venueQrScans++;
      }
      totalDiscount += (data['appliedDiscount'] as num? ?? 0).toDouble();
    }

    double avgDiscount = totalScans > 0 ? (totalDiscount / totalScans) : 0;

    return Row(
      children: [
        Expanded(child: _buildStatCard("Всего заходов", "$totalScans", CupertinoIcons.qrcode, AppColors.accentOrange)),
        const SizedBox(width: 16),
        Expanded(child: _buildStatCard("QR Заведения", "$venueQrScans", CupertinoIcons.building_2_fill, Colors.lightBlueAccent)),
        const SizedBox(width: 16),
        Expanded(child: _buildStatCard("Google Maps QR", "$googleMapsScans", CupertinoIcons.location_fill, Colors.amberAccent)),
        const SizedBox(width: 16),
        Expanded(child: _buildStatCard("Средняя скидка", "${avgDiscount.toStringAsFixed(1)}%", CupertinoIcons.percent, Colors.lightGreenAccent)),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildScansTable(List<QueryDocumentSnapshot> docs) {
    if (docs.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(48),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Column(
          children: [
            Icon(CupertinoIcons.doc_text_search, size: 48, color: Colors.white.withOpacity(0.2)),
            const SizedBox(height: 16),
            Text(
              "Записи не найдены",
              style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      );
    }

    final DateFormat formatter = DateFormat('dd.MM.yyyy HH:mm:ss');

    final sortedDocs = List<QueryDocumentSnapshot>.from(docs);
    if (_sortColumnIndex != null) {
      sortedDocs.sort((a, b) {
        final dataA = a.data() as Map<String, dynamic>;
        final dataB = b.data() as Map<String, dynamic>;
        int cmp = 0;
        switch (_sortColumnIndex) {
          case 0: // ПОЛЬЗОВАТЕЛЬ
            final nameA = (dataA['userName'] ?? dataA['userEmail'] ?? '').toString().toLowerCase();
            final nameB = (dataB['userName'] ?? dataB['userEmail'] ?? '').toString().toLowerCase();
            cmp = nameA.compareTo(nameB);
            break;
          case 1: // ЗАВЕДЕНИЕ
            final venueA = (dataA['venueName'] ?? '').toString().toLowerCase();
            final venueB = (dataB['venueName'] ?? '').toString().toLowerCase();
            cmp = venueA.compareTo(venueB);
            break;
          case 2: // ВИД ССЫЛКИ
            final isMapsA = dataA['fromGoogleMaps'] == true ? 1 : 0;
            final isMapsB = dataB['fromGoogleMaps'] == true ? 1 : 0;
            cmp = isMapsA.compareTo(isMapsB);
            break;
          case 3: // ВРЕМЯ СКАНИРОВАНИЯ
            final tsA = dataA['timestamp'];
            final tsB = dataB['timestamp'];
            if (tsA is Timestamp && tsB is Timestamp) {
              cmp = tsA.compareTo(tsB);
            } else {
              cmp = (tsA?.toString() ?? '').compareTo(tsB?.toString() ?? '');
            }
            break;
          case 4: // ПОСЛЕДНИЙ ВИЗИТ
            final lvA = (dataA['lastSeen'] ?? '').toString();
            final lvB = (dataB['lastSeen'] ?? '').toString();
            cmp = lvA.compareTo(lvB);
            break;
          case 5: // СКИДКА
            final dscA = (dataA['appliedDiscount'] as num? ?? 0).toDouble();
            final dscB = (dataB['appliedDiscount'] as num? ?? 0).toDouble();
            cmp = dscA.compareTo(dscB);
            break;
          case 6: // ДЕПОЗИТ
            final depA = (dataA['depositBalance'] as num? ?? 0).toDouble();
            final depB = (dataB['depositBalance'] as num? ?? 0).toDouble();
            cmp = depA.compareTo(depB);
            break;
        }
        return _sortAscending ? cmp : -cmp;
      });
    }

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            sortColumnIndex: _sortColumnIndex,
            sortAscending: _sortAscending,
            headingRowColor: WidgetStateProperty.all(Colors.white.withOpacity(0.04)),
            dataRowMaxHeight: 72,
            horizontalMargin: 24,
            columnSpacing: 28,
            columns: [
              DataColumn(label: const Text("ПОЛЬЗОВАТЕЛЬ", style: _headerStyle), onSort: _onSort),
              DataColumn(label: const Text("ЗАВЕДЕНИЕ", style: _headerStyle), onSort: _onSort),
              DataColumn(label: const Text("ВИД ССЫЛКИ", style: _headerStyle), onSort: _onSort),
              DataColumn(label: const Text("ВРЕМЯ СКАНИРОВАНИЯ", style: _headerStyle), onSort: _onSort),
              DataColumn(label: const Text("ПОСЛЕДНИЙ ВИЗИТ", style: _headerStyle), onSort: _onSort),
              DataColumn(label: const Text("СКИДКА", style: _headerStyle), onSort: _onSort),
              DataColumn(label: const Text("ДЕПОЗИТ", style: _headerStyle), onSort: _onSort),
              const DataColumn(label: Text("СЫРЫЕ ДАННЫЕ", style: _headerStyle)),
            ],
            rows: sortedDocs.map((doc) {
              final data = doc.data() as Map<String, dynamic>;

              final userName = data['userName'] ?? 'Гость';
              final userEmail = data['userEmail'] ?? '';
              final userId = data['userId'] ?? doc.id;
              final venueName = data['venueName'] ?? 'Заведение';
              final venueId = data['venueId'] ?? '';
              final fromGoogleMaps = data['fromGoogleMaps'] == true;
              final appliedDiscount = data['appliedDiscount'] ?? 0;
              final discountType = data['discountType'] ?? 'Стандартная';
              final depositBalance = data['depositBalance'] ?? 0;
              final lastSeen = data['lastSeen'] ?? '—';
              final rawParams = data['rawParams'] ?? {};

              // Timestamp formatting
              String timeStr = '—';
              if (data['timestamp'] != null) {
                if (data['timestamp'] is Timestamp) {
                  timeStr = formatter.format((data['timestamp'] as Timestamp).toDate());
                } else if (data['timestamp'] is String) {
                  timeStr = data['timestamp'];
                }
              }

              return DataRow(
                cells: [
                  // Пользователь
                  DataCell(
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(userName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                        if (userEmail.isNotEmpty)
                          Text(userEmail, style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11))
                        else
                          Text("ID: ${userId.substring(0, userId.length > 10 ? 10 : userId.length)}...", style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 11)),
                      ],
                    ),
                  ),

                  // Заведение
                  DataCell(
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(venueName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                        if (venueId.isNotEmpty)
                          Text("ID: $venueId", style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 11)),
                      ],
                    ),
                  ),

                  // Вид ссылки
                  DataCell(
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: fromGoogleMaps ? Colors.amber.withOpacity(0.15) : Colors.lightBlue.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: fromGoogleMaps ? Colors.amber.withOpacity(0.4) : Colors.lightBlue.withOpacity(0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            fromGoogleMaps ? CupertinoIcons.location_fill : CupertinoIcons.qrcode,
                            size: 12,
                            color: fromGoogleMaps ? Colors.amberAccent : Colors.lightBlueAccent,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            fromGoogleMaps ? "Google Maps" : "QR Заведения",
                            style: TextStyle(
                              color: fromGoogleMaps ? Colors.amberAccent : Colors.lightBlueAccent,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Время сканирования
                  DataCell(
                    Text(
                      timeStr,
                      style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 12, fontWeight: FontWeight.w500),
                    ),
                  ),

                  // Дата последнего визита
                  DataCell(
                    Text(
                      lastSeen.toString(),
                      style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
                    ),
                  ),

                  // Скидка (Сумма & Тип)
                  DataCell(
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "$appliedDiscount%",
                          style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w900, fontSize: 14),
                        ),
                        Text(
                          discountType,
                          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 10),
                        ),
                      ],
                    ),
                  ),

                  // Депозит
                  DataCell(
                    Text(
                      "$depositBalance",
                      style: TextStyle(
                        color: (depositBalance as num) > 0 ? Colors.greenAccent : Colors.white.withOpacity(0.4),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),

                  // Сырые данные
                  DataCell(
                    IconButton(
                      icon: const Icon(CupertinoIcons.info_circle, color: Colors.white70, size: 18),
                      tooltip: "Просмотреть сырые данные",
                      onPressed: () => _showRawParamsDialog(context, rawParams),
                    ),
                  ),
                ],
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  void _showRawParamsDialog(BuildContext context, Map<String, dynamic> rawParams) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1C1C1E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(CupertinoIcons.gear_alt_fill, color: AppColors.accentOrange, size: 20),
            SizedBox(width: 8),
            Text("Сырые параметры запроса", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Container(
          width: 400,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white10),
          ),
          child: SingleChildScrollView(
            child: SelectableText(
              rawParams.isEmpty ? "Параметры отсутствуют" : rawParams.entries.map((e) => "${e.key}: ${e.value}").join("\n"),
              style: const TextStyle(color: Colors.greenAccent, fontFamily: 'monospace', fontSize: 12),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Закрыть", style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  static const TextStyle _headerStyle = TextStyle(
    color: AppColors.body,
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  );
}
