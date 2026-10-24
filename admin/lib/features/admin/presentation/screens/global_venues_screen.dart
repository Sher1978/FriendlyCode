
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/super_admin_venue_detail_screen.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:provider/provider.dart';

class GlobalVenuesScreen extends StatefulWidget {
  const GlobalVenuesScreen({super.key});

  @override
  State<GlobalVenuesScreen> createState() => _GlobalVenuesScreenState();
}

class _GlobalVenuesScreenState extends State<GlobalVenuesScreen> {
  final VenueRepository _venueRepo = VenueRepository();
  String _searchQuery = "";
  int? _sortColumnIndex;
  bool _sortAscending = true;
  String? _sortKey;

  void _onSort(int columnIndex, bool ascending, String sortKey) {
    setState(() {
      _sortColumnIndex = columnIndex;
      _sortAscending = ascending;
      _sortKey = sortKey;
    });
  }

  @override
  Widget build(BuildContext context) {
    final roleProvider = Provider.of<RoleProvider>(context);
    final userUid = roleProvider.uid; 
    
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
                  const Text("VENUES", style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title)),
                  Text(roleProvider.isSuperAdmin ? "Manage all partner venues in the system." : "Manage your assigned venues.", style: const TextStyle(color: AppColors.body)),
                ],
              ),
              if (roleProvider.canManageVenues) // Defined in RoleProvider
                ElevatedButton.icon(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen())), 
                  icon: const Icon(Icons.add), 
                  label: const Text("REGISTER NEW VENUE"),
                ),
            ],
          ),
          const SizedBox(height: 24),

          // Search Bar
          TextField(
            decoration: InputDecoration(
              hintText: "Search venues by name...",
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              filled: true,
              fillColor: AppColors.secondarySurface,
            ),
             onChanged: (val) => setState(() => _searchQuery = val.toLowerCase()),
          ),

          const SizedBox(height: 24),
          
          Expanded(
            child: StreamBuilder<List<VenueModel>>(
              stream: _venueRepo.getVenuesStream(includeInactive: true),
              builder: (context, snapshot) {
                if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}"));
                if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
                
                // FILTER LOGIC
                final allVenues = snapshot.data!;
                final filteredVenues = allVenues.where((v) {
                   // 1. Role Filter
                   bool hasAccess = false;
                   if (roleProvider.isSuperAdmin) {
                     hasAccess = true;
                   } else if (roleProvider.isAdmin) {
                     hasAccess = v.assignedAdminId == userUid || v.ownerId == userUid; 
                   } else if (roleProvider.currentRole == UserRole.manager) {
                     hasAccess = v.assignedManagerId == userUid;
                   } else {
                     // Owner or Staff
                     hasAccess = v.ownerId == userUid;
                   }
                   
                   if (!hasAccess) return false;

                   // 2. Search Filter
                   final nameMatch = v.name.toLowerCase().contains(_searchQuery);
                   // user can also search by owner email if superadmin?
                   final ownerMatch = roleProvider.isSuperAdmin && (v.ownerEmail ?? '').toLowerCase().contains(_searchQuery);
                   
                   return nameMatch || ownerMatch;
                }).toList();

                if (_sortKey != null) {
                  filteredVenues.sort((a, b) {
                    int cmp = 0;
                    switch (_sortKey) {
                      case 'name':
                        cmp = a.name.toLowerCase().compareTo(b.name.toLowerCase());
                        break;
                      case 'owner':
                        final ownerA = (a.ownerEmail ?? '').toLowerCase();
                        final ownerB = (b.ownerEmail ?? '').toLowerCase();
                        cmp = ownerA.compareTo(ownerB);
                        break;
                      case 'staff':
                        final staffA = '${a.assignedAdminId ?? ""}_${a.assignedManagerId ?? ""}';
                        final staffB = '${b.assignedAdminId ?? ""}_${b.assignedManagerId ?? ""}';
                        cmp = staffA.compareTo(staffB);
                        break;
                      case 'status':
                        final statusA = a.isManuallyBlocked ? 0 : (a.isExpired ? 1 : (a.isActive ? 3 : 2));
                        final statusB = b.isManuallyBlocked ? 0 : (b.isExpired ? 1 : (b.isActive ? 3 : 2));
                        cmp = statusA.compareTo(statusB);
                        break;
                    }
                    return _sortAscending ? cmp : -cmp;
                  });
                }
                
                if (filteredVenues.isEmpty) {
                   return const Center(child: Text("No venues found matching your criteria."));
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
                                sortColumnIndex: _sortColumnIndex,
                                sortAscending: _sortAscending,
                                headingRowColor: MaterialStateProperty.all(AppColors.background),
                                dataRowColor: MaterialStateProperty.all(AppColors.background),
                                headingTextStyle: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.title, letterSpacing: 0.5),
                                dataRowMinHeight: 70,
                                dataRowMaxHeight: 80,
                                border: TableBorder(
                                  horizontalInside: BorderSide(color: AppColors.title.withOpacity(0.05), width: 1),
                                ),
                                columns: [
                                  DataColumn(
                                    label: const Text("VENUE NAME"),
                                    onSort: (colIdx, asc) => _onSort(colIdx, asc, 'name'),
                                  ),
                                  if (roleProvider.isSuperAdmin)
                                    DataColumn(
                                      label: const Text("OWNER"),
                                      onSort: (colIdx, asc) => _onSort(colIdx, asc, 'owner'),
                                    ),
                                  if (roleProvider.isSuperAdmin || roleProvider.isAdmin)
                                    DataColumn(
                                      label: const Text("ASSIGNED STAFF"),
                                      onSort: (colIdx, asc) => _onSort(colIdx, asc, 'staff'),
                                    ),
                                  DataColumn(
                                    label: const Text("STATUS"),
                                    onSort: (colIdx, asc) => _onSort(colIdx, asc, 'status'),
                                  ),
                                  const DataColumn(label: Text("ACTIONS")),
                                ],
                                rows: filteredVenues.map((v) => DataRow(
                                  onSelectChanged: (_) => Navigator.push(context, MaterialPageRoute(
                                    builder: (_) => SuperAdminVenueDetailScreen(venue: v),
                                  )),
                                  cells: [
                                    DataCell(
                                      Builder(builder: (context) {
                                        final isServices = v.gmConfig.businessType == 'services';
                                        return Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            CircleAvatar(
                                              radius: 18, 
                                              backgroundColor: (isServices ? AppColors.accentTeal : AppColors.accentOrange).withValues(alpha: 0.15),
                                              child: Text(
                                                v.name.isNotEmpty ? v.name[0].toUpperCase() : '?', 
                                                style: TextStyle(
                                                  color: isServices ? AppColors.accentTeal : AppColors.accentOrange, 
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              mainAxisAlignment: MainAxisAlignment.center,
                                              children: [
                                                Text(v.name, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
                                                const SizedBox(height: 2),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                                  decoration: BoxDecoration(
                                                    color: (isServices ? AppColors.accentTeal : AppColors.accentOrange).withValues(alpha: 0.15),
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  child: Text(
                                                    isServices ? 'SERVICES' : 'HORECA',
                                                    style: TextStyle(
                                                      color: isServices ? AppColors.accentTeal : AppColors.accentOrange,
                                                      fontSize: 9,
                                                      fontWeight: FontWeight.bold,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        );
                                      }),
                                    ),
                                    if (roleProvider.isSuperAdmin)
                                      DataCell(Text(v.ownerEmail ?? 'Unclaimed', style: const TextStyle(color: AppColors.body))),
                                    if (roleProvider.isSuperAdmin || roleProvider.isAdmin)
                                      DataCell(
                                        Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            if (v.assignedAdminId != null) const Text("Admin Assigned", style: TextStyle(fontSize: 10, color: Colors.blue)),
                                            if (v.assignedManagerId != null) const Text("Manager Assigned", style: TextStyle(fontSize: 10, color: Colors.orange)),
                                            if (v.assignedAdminId == null && v.assignedManagerId == null) const Text("-", style: TextStyle(color: Colors.grey)),
                                          ],
                                        )
                                      ),
                                     DataCell(
                                       Builder(builder: (context) {
                                         String statusText = "INACTIVE";
                                         Color statusColor = Colors.grey;

                                         if (v.isManuallyBlocked) {
                                           statusText = "BLOCKED";
                                           statusColor = Colors.red;
                                         } else if (v.isExpired) {
                                           statusText = "EXPIRED";
                                           statusColor = Colors.orange;
                                         } else if (v.isActive) {
                                           statusText = "ACTIVE";
                                           statusColor = Colors.green;
                                         }

                                         return Container(
                                           padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                           decoration: BoxDecoration(
                                             color: statusColor.withOpacity(0.1),
                                             borderRadius: BorderRadius.circular(20),
                                           ),
                                           child: Text(
                                             statusText,
                                             style: TextStyle(
                                               color: statusColor,
                                               fontWeight: FontWeight.bold,
                                               fontSize: 12,
                                             ),
                                           ),
                                         );
                                       }),
                                     ),
                                    DataCell(
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            icon: const Icon(Icons.link, color: AppColors.accentTeal, size: 20),
                                            tooltip: 'Скопировать ссылку на витрину',
                                            onPressed: () {
                                              final origin = Uri.base.origin;
                                              final url = "$origin/?v=${v.id}&source=google_maps";
                                              Clipboard.setData(ClipboardData(text: url));
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                SnackBar(
                                                  content: Text("Ссылка на витрину заведения ${v.name} скопирована!"),
                                                  backgroundColor: AppColors.accentTeal,
                                                  duration: const Duration(seconds: 2),
                                                ),
                                              );
                                            },
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.edit_outlined, color: AppColors.body),
                                            tooltip: 'Manage venue',
                                            onPressed: () => Navigator.push(context, MaterialPageRoute(
                                              builder: (_) => SuperAdminVenueDetailScreen(venue: v),
                                            )),
                                          ),
                                        ],
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
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
