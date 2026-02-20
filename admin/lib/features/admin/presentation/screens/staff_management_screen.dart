
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
  String _searchQuery = "";

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
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   const Text("Staff Management", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.title)),
                   const SizedBox(height: 4),
                   Text("Manage SuperAdmins, Admins, and Managers", style: TextStyle(fontSize: 14, color: AppColors.body.withOpacity(0.7))),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => _showAddStaffDialog(context),
                icon: const Icon(Icons.add),
                label: const Text("Add Staff"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brandOrange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                ),
              ),
            ],
          ),
        ),

        // Search
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: TextField(
            decoration: InputDecoration(
              hintText: "Search by email...",
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              filled: true,
              fillColor: Colors.white,
            ),
            onChanged: (val) => setState(() => _searchQuery = val.toLowerCase()),
          ),
        ),
        const SizedBox(height: 16),

        // List
        Expanded(
          child: StreamBuilder<QuerySnapshot>(
            stream: _firestore.collection('users').where('role', whereIn: ['superAdmin', 'admin', 'manager', 'staff']).snapshots(),
            builder: (context, snapshot) {
              if (snapshot.hasError) return const Center(child: Text("Error loading staff"));
              if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

              final docs = snapshot.data!.docs.where((doc) {
                 final data = doc.data() as Map<String, dynamic>;
                 final email = (data['email'] as String? ?? '').toLowerCase();
                 return email.contains(_searchQuery);
              }).toList();

              return ListView.separated(
                padding: const EdgeInsets.all(24),
                itemCount: docs.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final data = docs[index].data() as Map<String, dynamic>;
                  final uid = docs[index].id;
                  final role = data['role'] ?? 'staff';

                  return Container(
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
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
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
                 if (mounted) Navigator.pop(ctx);
              },
              child: const Text("Save"),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddStaffDialog(BuildContext context) {
      // For now, simpler implementation: Ask for email, find user, assign role.
      // Or create a dummy user logic (requires Cloud Function to create Auth user).
      // Let's just show an info dialog that the user must sign up first.
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text("Add New Staff"),
          content: const Text("To add a new staff member, ask them to sign up / log in to the App/Panel once via Google. \n\nOnce they are in the 'users' list (as 'owner' or 'staff'), you can find them here and Promote them."),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("OK")),
          ],
        ),
      );
  }
}
