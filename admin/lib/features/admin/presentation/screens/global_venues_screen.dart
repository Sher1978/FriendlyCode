
import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
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
              fillColor: Colors.white,
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
                                headingRowColor: MaterialStateProperty.all(AppColors.background),
                                dataRowColor: MaterialStateProperty.all(Colors.white),
                                headingTextStyle: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.title, letterSpacing: 0.5),
                                dataRowMinHeight: 70,
                                dataRowMaxHeight: 80,
                                border: TableBorder(
                                  horizontalInside: BorderSide(color: AppColors.title.withOpacity(0.05), width: 1),
                                ),
                                columns: [
                                  const DataColumn(label: Text("VENUE NAME")),
                                  if (roleProvider.isSuperAdmin) const DataColumn(label: Text("OWNER")),
                                  if (roleProvider.isSuperAdmin || roleProvider.isAdmin) const DataColumn(label: Text("ASSIGNED STAFF")),
                                  const DataColumn(label: Text("STATUS")),
                                  const DataColumn(label: Text("ACTIONS")),
                                ],
                                rows: filteredVenues.map((v) => DataRow(
                                  cells: [
                                    DataCell(
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          CircleAvatar(
                                            radius: 18, 
                                            backgroundColor: AppColors.accentOrange.withOpacity(0.1),
                                            child: Text(v.name.isNotEmpty ? v.name[0].toUpperCase() : '?', style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.bold)),
                                          ),
                                          const SizedBox(width: 12),
                                          Text(v.name, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
                                        ],
                                      ),
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
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                        decoration: BoxDecoration(
                                          color: v.isActive ? Colors.green.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          v.isActive ? "ACTIVE" : "INACTIVE",
                                          style: TextStyle(
                                            color: v.isActive ? Colors.green : Colors.grey,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    ),
                                    DataCell(
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            icon: const Icon(Icons.edit_outlined, color: AppColors.body),
                                            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => VenueEditorScreen(venue: v))),
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
