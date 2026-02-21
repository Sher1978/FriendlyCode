
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/theme/colors.dart';

class StaffManagementScreen extends StatefulWidget {
  const StaffManagementScreen({super.key});

  @override
  State<StaffManagementScreen> createState() => _StaffManagementScreenState();
}

class _StaffManagementScreenState extends State<StaffManagementScreen> {
  final _firestore = FirebaseFirestore.instance;
  final TextEditingController _searchCtrl = TextEditingController();
  
  // Search State
  bool _isSearching = false;
  Map<String, dynamic>? _searchResult;
  String? _searchResultId;
  String? _searchError;

  Future<void> _performSearch() async {
    final email = _searchCtrl.text.trim().toLowerCase();
    if (email.isEmpty) return;

    setState(() {
      _isSearching = true;
      _searchError = null;
      _searchResult = null;
      _searchResultId = null;
    });

    try {
      final snap = await _firestore.collection('users')
          .where('email', isEqualTo: email)
          .limit(1)
          .get();

      if (snap.docs.isEmpty) {
        setState(() {
          _searchError = "User not found. They must sign in or scan a QR code first.";
          _isSearching = false;
        });
      } else {
        setState(() {
          _searchResultId = snap.docs.first.id;
          _searchResult = snap.docs.first.data();
          _isSearching = false;
        });
      }
    } catch (e) {
      setState(() {
        _searchError = "Error during search: $e";
        _isSearching = false;
      });
    }
  }

  void _showInfoDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Staff Roles Explained"),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("• SuperAdmin: Full access to all venues, users, and system settings.", style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text("• Admin: Can manage assigned venues and assign Managers. Cannot create/delete users globally.", style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text("• Manager: Can edit details of venues they are assigned to. No access to global analytics.", style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text("• Owner: Venue owners, managed from the Venues page.", style: TextStyle(color: Colors.grey)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Got it"))
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.all(24.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text("Staff Management", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.title)),
                  IconButton(
                    icon: const Icon(Icons.info_outline, color: AppColors.brandOrange),
                    onPressed: _showInfoDialog,
                    tooltip: "Role Information",
                  ),
                ],
              ),
            ],
          ),
        ),

        // Active Search Bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchCtrl,
                  decoration: InputDecoration(
                    hintText: "Search user by exact email to promote...",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: Colors.white,
                    errorText: _searchError,
                  ),
                  onSubmitted: (_) => _performSearch(),
                ),
              ),
              const SizedBox(width: 16),
              ElevatedButton(
                onPressed: _isSearching ? null : _performSearch,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brandOrange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isSearching 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.search),
              ),
            ],
          ),
        ),
        
        // Search Result Card
        if (_searchResult != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.lime.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.lime),
              ),
              child: Row(
                children: [
                  const CircleAvatar(backgroundColor: AppColors.lime, child: Icon(Icons.person, color: Colors.white)),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_searchResult!['email'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text("Current role: ${_searchResult!['role'] ?? 'guest'}", style: const TextStyle(color: Colors.black54)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit, color: AppColors.brandOrange),
                    onPressed: () => _showEditRoleDialog(context, _searchResultId!, _searchResult!['role'] ?? 'guest', _searchResult!['email']),
                    tooltip: "Assign Role",
                  ),
                ],
              ),
            ),
          ),

        const SizedBox(height: 24),

        // List
        Expanded(
          child: StreamBuilder<QuerySnapshot>(
            stream: _firestore.collection('users').where('role', whereIn: ['superAdmin', 'admin', 'manager']).snapshots(),
            builder: (context, snapshot) {
              if (snapshot.hasError) return const Center(child: Text("Error loading staff"));
              if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

              final allDocs = snapshot.data!.docs;
              
              // Group users by role
              final superAdmins = allDocs.where((d) => (d.data() as Map<String, dynamic>)['role'] == 'superAdmin').toList();
              final admins = allDocs.where((d) => (d.data() as Map<String, dynamic>)['role'] == 'admin').toList();
              final managers = allDocs.where((d) => (d.data() as Map<String, dynamic>)['role'] == 'manager').toList();

              return ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  if (superAdmins.isNotEmpty) _buildRoleSection("Super Admins", superAdmins),
                  if (superAdmins.isNotEmpty) const SizedBox(height: 24),
                  if (admins.isNotEmpty) _buildRoleSection("Admins", admins),
                  if (admins.isNotEmpty) const SizedBox(height: 24),
                  if (managers.isNotEmpty) _buildRoleSection("Managers", managers),
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRoleSection(String title, List<DocumentSnapshot> docs) {
     return Column(
       crossAxisAlignment: CrossAxisAlignment.start,
       children: [
         Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.title)),
         const SizedBox(height: 12),
         ...docs.map((doc) => _buildUserCard(doc)).toList(),
       ],
     );
  }

  Widget _buildUserCard(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    final uid = doc.id;
    final role = data['role'] ?? 'guest';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black12),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: _getRoleColor(role).withOpacity(0.1),
            child: Icon(Icons.person, color: _getRoleColor(role)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(data['email'] ?? 'No Email', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: _getRoleColor(role).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(role.toString().toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _getRoleColor(role))),
                ),
              ],
            ),
          ),
          IconButton(
             icon: const Icon(Icons.edit_outlined),
             onPressed: () => _showEditRoleDialog(context, uid, role, data['email']),
             tooltip: "Edit Role",
          ),
          IconButton(
             icon: const Icon(Icons.delete_outline, color: Colors.red),
             onPressed: () => _demoteUser(uid, data['email']),
             tooltip: "Revoke Access",
          ),
        ],
      ),
    );
  }

  Future<void> _demoteUser(String uid, String? email) async {
     final confirm = await showDialog<bool>(
       context: context,
       builder: (ctx) => AlertDialog(
         title: const Text("Revoke Access"),
         content: Text("Are you sure you want to demote $email to a guest? They will lose all administrative rights."),
         actions: [
           TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
           TextButton(
             onPressed: () => Navigator.pop(ctx, true), 
             style: TextButton.styleFrom(foregroundColor: Colors.red),
             child: const Text("Revoke")
           ),
         ],
       ),
     );

     if (confirm == true) {
        await _firestore.collection('users').doc(uid).update({
          'role': 'guest',
          'venueId': FieldValue.delete(),
        });
        if (mounted && _searchResultId == uid) {
          setState(() {
            _searchResult = null;
            _searchResultId = null;
            _searchCtrl.clear();
          });
        }
     }
  }

  Color _getRoleColor(String role) {
    switch (role) {
      case 'superAdmin': return Colors.purple;
      case 'admin': return Colors.blue;
      case 'manager': return Colors.orange;
      default: return Colors.grey;
    }
  }

  void _showEditRoleDialog(BuildContext context, String uid, String currentRole, String? email) {
    String selectedRole = currentRole;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text("Edit Role for $email"),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              RadioListTile(
                title: const Text("Super Admin"), 
                value: 'superAdmin', 
                groupValue: selectedRole, 
                onChanged: (v) => setState(() => selectedRole = v!),
              ),
              RadioListTile(
                title: const Text("Admin"), 
                value: 'admin', 
                groupValue: selectedRole, 
                onChanged: (v) => setState(() => selectedRole = v!),
              ),
              RadioListTile(
                title: const Text("Manager"), 
                value: 'manager', 
                groupValue: selectedRole, 
                onChanged: (v) => setState(() => selectedRole = v!),
              ),
              RadioListTile(
                title: const Text("Staff (No Access)"), 
                value: 'staff', 
                groupValue: selectedRole, 
                onChanged: (v) => setState(() => selectedRole = v!),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
              ElevatedButton(
              onPressed: () async {
                 await _firestore.collection('users').doc(uid).update({'role': selectedRole});
                 if (mounted) {
                   Navigator.pop(ctx);
                   // Reset search result if we just updated them to a list-visible role so they disappear from the search card
                   if (_searchResultId == uid && ['superAdmin', 'admin', 'manager'].contains(selectedRole)) {
                     setState(() {
                       _searchResult = null;
                       _searchResultId = null;
                       _searchCtrl.clear();
                     });
                   }
                 }
              },
              child: const Text("Save"),
            ),
          ],
        ),
      ),
    );
  }
}
