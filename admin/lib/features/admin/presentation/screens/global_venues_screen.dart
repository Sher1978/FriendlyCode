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
              stream: _venueRepo.getVenuesStream(includeInactive: true),
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
                        headingRowColor: MaterialStateProperty.all(AppColors.background),
                        dataRowColor: MaterialStateProperty.all(Colors.white),
                        headingTextStyle: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.title, letterSpacing: 0.5),
                        dataRowMinHeight: 70,
                        dataRowMaxHeight: 80,
                        border: TableBorder(
                          horizontalInside: BorderSide(color: AppColors.title.withValues(alpha: 0.05), width: 1),
                        ),
                        columns: const [
                          DataColumn(label: Text("VENUE NAME")),
                          DataColumn(label: Text("OWNER")),
                          DataColumn(label: Text("STATUS")),
                          DataColumn(label: Text("SUBSCRIPTION")),
                          DataColumn(label: Text("ACTIONS")),
                        ],
                        rows: venues.map((v) => DataRow(
                          cells: [
                            DataCell(
                              Row(
                                children: [
                                  CircleAvatar(
                                    radius: 18, 
                                    backgroundColor: AppColors.accentOrange.withValues(alpha: 0.1),
                                    child: Text(v.name.isNotEmpty ? v.name[0].toUpperCase() : '?', style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.bold)),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(v.name, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
                                ],
                              ),
                            ),
                            DataCell(Text(v.ownerEmail ?? 'Unclaimed', style: const TextStyle(color: AppColors.body))),
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
                              Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    v.subscription.isPaid ? "PAID (${v.subscription.plan.toUpperCase()})" : "UNPAID",
                                    style: TextStyle(
                                      color: v.subscription.isPaid ? Colors.blue : Colors.orange, 
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12
                                    ),
                                  ),
                                  if (v.subscription.expiryDate != null)
                                    Text(
                                      "Expires: ${v.subscription.expiryDate!.day}/${v.subscription.expiryDate!.month}/${v.subscription.expiryDate!.year}",
                                      style: TextStyle(color: AppColors.body.withValues(alpha: 0.5), fontSize: 10),
                                    ),
                                ],
                              ),
                            ),
                            DataCell(
                              IconButton(
                                icon: const Icon(Icons.settings_outlined, color: AppColors.body),
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
