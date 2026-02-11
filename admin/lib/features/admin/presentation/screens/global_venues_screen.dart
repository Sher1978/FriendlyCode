import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_detail_view.dart';

class GlobalVenuesScreen extends StatefulWidget {
  const GlobalVenuesScreen({super.key});

  @override
  State<GlobalVenuesScreen> createState() => _GlobalVenuesScreenState();
}

class _GlobalVenuesScreenState extends State<GlobalVenuesScreen> {
  final VenueRepository _venueRepo = VenueRepository();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text("GLOBAL VENUES", style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title)),
                  Text("Manage all partner venues in the system.", style: TextStyle(color: AppColors.body)),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () {}, 
                icon: const Icon(Icons.add), 
                label: const Text("REGISTER NEW VENUE"),
              ),
            ],
          ),
          const SizedBox(height: 48),
          
          Expanded(
            child: StreamBuilder<List<VenueModel>>(
              stream: _venueRepo.getVenuesStream(),
              builder: (context, snapshot) {
                if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}"));
                if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
                
                final venues = snapshot.data!;
                
                return ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.title.withValues(alpha: 0.1)),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.vertical,
                      child: DataTable(
                        headingRowColor: WidgetStateProperty.all(AppColors.background),
                        dataRowMinHeight: 70,
                        dataRowMaxHeight: 80,
                        columns: const [
                          DataColumn(label: Text("VENUE NAME", style: TextStyle(fontWeight: FontWeight.w900))),
                          DataColumn(label: Text("OWNER", style: TextStyle(fontWeight: FontWeight.w900))),
                          DataColumn(label: Text("STATUS", style: TextStyle(fontWeight: FontWeight.w900))),
                          DataColumn(label: Text("PAYMENT", style: TextStyle(fontWeight: FontWeight.w900))),
                          DataColumn(label: Text("ACTIONS", style: TextStyle(fontWeight: FontWeight.w900))),
                        ],
                        rows: venues.map((v) => DataRow(
                          cells: [
                            DataCell(
                              Row(
                                children: [
                                  CircleAvatar(radius: 18, child: Text(v.name[0])),
                                  const SizedBox(width: 12),
                                  Text(v.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                            DataCell(Text(v.ownerEmail ?? 'Unclaimed')),
                            DataCell(
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                decoration: BoxDecoration(
                                  color: v.isActive ? Colors.green.withValues(alpha: 0.1) : Colors.red.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  v.isActive ? "ACTIVE" : "FROZEN",
                                  style: TextStyle(color: v.isActive ? Colors.green : Colors.red, fontWeight: FontWeight.w900, fontSize: 10),
                                ),
                              ),
                            ),
                            DataCell(
                              Text(v.subscription.isPaid ? "PAID" : "UNPAID",
                                style: TextStyle(color: v.subscription.isPaid ? Colors.blue : Colors.orange, fontWeight: FontWeight.bold),
                              ),
                            ),
                            DataCell(
                              IconButton(
                                icon: const Icon(Icons.settings_outlined),
                                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => VenueDetailView(venue: v))),
                              ),
                            ),
                          ],
                        )).toList(),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
