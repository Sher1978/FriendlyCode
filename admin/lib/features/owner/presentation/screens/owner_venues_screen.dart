import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/venue_search_screen.dart';

import 'package:friendly_code/l10n/app_localizations.dart';

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
    final l10n = AppLocalizations.of(context)!;

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
                children: [
                  Text(l10n.myVenues, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title)),
                  Text(l10n.selectVenueToManage, style: const TextStyle(color: AppColors.body)),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen())),
                icon: const Icon(Icons.add),
                label: Text(l10n.registerNewVenue),
              ),
              const SizedBox(width: 16),
              OutlinedButton.icon(
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueSearchScreen())),
                icon: const Icon(Icons.search),
                label: Text(l10n.joinExistingVenue),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.accentOrange),
                  foregroundColor: AppColors.accentOrange,
                ),
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
                  return Center(child: Text(l10n.noVenuesFound));
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
                                columns: [
                                  DataColumn(label: Text(l10n.venueNameCol)),
                                  DataColumn(label: Text(l10n.statusColUpper)),
                                  DataColumn(label: Text(l10n.subscriptionCol)),
                                  DataColumn(label: Text(l10n.actionsCol)),
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
                                                  Text(l10n.currentlyActive, style: const TextStyle(color: AppColors.accentOrange, fontSize: 10, fontWeight: FontWeight.bold)),
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
                                            v.isActive ? l10n.statusActive : l10n.statusFrozen,
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
                                              v.subscription.isPaid ? "${l10n.planPaid} (${v.subscription.plan.toUpperCase()})" : l10n.planUnpaid,
                                              style: TextStyle(
                                                color: v.subscription.isPaid ? Colors.blue : Colors.orange, 
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12
                                              ),
                                            ),
                                            if (v.subscription.expiryDate != null)
                                              Text(
                                                l10n.expiresAt("${v.subscription.expiryDate!.day}/${v.subscription.expiryDate!.month}/${v.subscription.expiryDate!.year}"),
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
                                                    SnackBar(content: Text(l10n.switchedTo(v.name))),
                                                  );
                                                },
                                                icon: const Icon(Icons.swap_horiz, size: 18),
                                                label: Text(l10n.switchBtn),
                                                style: TextButton.styleFrom(foregroundColor: AppColors.accentOrange),
                                              )
                                            else
                                              Text(l10n.statusActive, style: const TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
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
