import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';

class OwnerVenuesScreen extends StatefulWidget {
  const OwnerVenuesScreen({super.key});

  @override
  State<OwnerVenuesScreen> createState() => _OwnerVenuesScreenState();
}

class _OwnerVenuesScreenState extends State<OwnerVenuesScreen> {
  final VenueRepository _venueRepo = VenueRepository();

  @override
  Widget build(BuildContext context) {
    final roleProvider = Provider.of<RoleProvider>(context);
    final userVenueIds = roleProvider.venueIds;

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
                  Text("MY VENUES", style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title)),
                  Text("Select a venue to manage or edit its profile.", style: TextStyle(color: AppColors.body)),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen())),
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
                
                // Filter venues by roleProvider.venueIds
                final venues = snapshot.data!.where((v) => userVenueIds.contains(v.id)).toList();
                
                if (venues.isEmpty) {
                  return const Center(child: Text("No venues found. Register your first venue to get started!"));
                }

                return ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.title.withOpacity(0.1)),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        return SingleChildScrollView(
                          scrollDirection: Axis.vertical,
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: ConstrainedBox(
                              constraints: BoxConstraints(minWidth: constraints.maxWidth),
                              child: DataTable(
                                headingRowColor: MaterialStateProperty.all(AppColors.background),
                                dataRowColor: MaterialStateProperty.all(Colors.white),
                                headingTextStyle: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.title, letterSpacing: 0.5),
                                dataRowMinHeight: 70,
                                dataRowMaxHeight: 80,
                                border: TableBorder(
                                  horizontalInside: BorderSide(color: AppColors.title.withOpacity(0.05), width: 1),
                                ),
                                columns: const [
                                  DataColumn(label: Text("VENUE NAME")),
                                  DataColumn(label: Text("STATUS")),
                                  DataColumn(label: Text("SUBSCRIPTION")),
                                  DataColumn(label: Text("ACTIONS")),
                                ],
                                rows: venues.map((v) {
                                  final isActiveVenue = roleProvider.venueId == v.id;
                                  return DataRow(
                                    cells: [
                                      DataCell(
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            CircleAvatar(
                                              radius: 18, 
                                              backgroundColor: AppColors.accentOrange.withOpacity(0.1),
                                              backgroundImage: v.logoUrl != null ? NetworkImage(v.logoUrl!) : null,
                                              child: v.logoUrl == null ? Text(v.name.isNotEmpty ? v.name[0].toUpperCase() : '?', style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.bold)) : null,
                                            ),
                                            const SizedBox(width: 12),
                                            Column(
                                              mainAxisAlignment: MainAxisAlignment.center,
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(v.name, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
                                                if (isActiveVenue)
                                                  const Text("Currently Active", style: TextStyle(color: AppColors.accentOrange, fontSize: 10, fontWeight: FontWeight.bold)),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      DataCell(
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: v.isActive ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
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
                                                style: TextStyle(color: AppColors.body.withOpacity(0.5), fontSize: 10),
                                              ),
                                          ],
                                        ),
                                      ),
                                      DataCell(
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            if (!isActiveVenue)
                                              TextButton.icon(
                                                onPressed: () {
                                                  roleProvider.setActiveVenueId(v.id);
                                                  ScaffoldMessenger.of(context).showSnackBar(
                                                    SnackBar(content: Text("Switched to ${v.name}")),
                                                  );
                                                },
                                                icon: const Icon(Icons.swap_horiz, size: 18),
                                                label: const Text("SWITCH"),
                                                style: TextButton.styleFrom(foregroundColor: AppColors.accentOrange),
                                              )
                                            else
                                              const Text("ACTIVE", style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                                            const SizedBox(width: 8),
                                            IconButton(
                                              icon: const Icon(Icons.edit_outlined, color: AppColors.body),
                                              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => VenueEditorScreen(venue: v))),
                                              tooltip: "Edit Profile",
                                            ),
                                          ],
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
