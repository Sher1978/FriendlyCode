import 'package:flutter/material.dart';
import 'package:friendly_code/core/services/user_service.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/role_provider.dart';

class StaffManagementScreen extends StatefulWidget {
  final String venueId;

  const StaffManagementScreen({super.key, required this.venueId});

  @override
  State<StaffManagementScreen> createState() => _StaffManagementScreenState();
}

class _StaffManagementScreenState extends State<StaffManagementScreen> {
  final UserService _userService = UserService();
  final TextEditingController _searchCtrl = TextEditingController();
  
  Map<String, dynamic>? _foundUser;
  bool _isSearching = false;

  void _searchUser() async {
    final email = _searchCtrl.text.trim();
    if (email.isEmpty) return;

    setState(() {
      _isSearching = true;
      _foundUser = null;
    });

    try {
      final user = await _userService.getUserByEmail(email);
      setState(() => _foundUser = user);
      if (user == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("User not found")),
        );
      }
    } finally {
      setState(() => _isSearching = false);
    }
  }

  Future<void> _assignRole(String uid, UserRole role) async {
    try {
      await _userService.assignUserToVenue(
        uid: uid,
        venueId: widget.venueId,
        role: role,
      );
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("User assigned as ${role.name}")),
      );
      setState(() => _foundUser = null); // Reset search
      _searchCtrl.clear();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error assigning role: $e")),
      );
    }
  }

  Future<void> _removeUser(String uid) async {
    try {
      await _userService.removeUserFromVenue(uid);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("User removed from personnel")),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error removing user: $e")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Staff & Owners"),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("ADD PERSONNEL", style: TextStyle(color: AppColors.lime, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchCtrl,
                        decoration: InputDecoration(
                          hintText: "Search by email...",
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: _isSearching ? null : _searchUser,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.lime,
                        foregroundColor: AppColors.deepSeaBlueDark,
                        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                      ),
                      child: _isSearching 
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text("FIND"),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Found User Result
          if (_foundUser != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Card(
                color: AppColors.deepSeaBlue,
                child: ListTile(
                  title: Text(_foundUser!['email'] ?? 'Unknown', style: const TextStyle(color: Colors.white)),
                  subtitle: Text("Current Role: ${_foundUser!['role'] ?? 'guest'}", style: const TextStyle(color: Colors.white54)),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextButton(
                        onPressed: () => _assignRole(_foundUser!['uid'], UserRole.staff),
                        child: const Text("ADD STAFF", style: TextStyle(color: AppColors.lime)),
                      ),
                      TextButton(
                        onPressed: () => _assignRole(_foundUser!['uid'], UserRole.owner),
                        child: const Text("MAKE OWNER", style: TextStyle(color: Colors.orange)),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          const Divider(height: 48, color: Colors.white10),

          // Current Staff List
          Expanded(
            child: StreamBuilder<List<Map<String, dynamic>>>(
              stream: _userService.getStaffForVenue(widget.venueId),
              builder: (context, snapshot) {
                if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}"));
                if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

                final personnel = snapshot.data!;
                if (personnel.isEmpty) return const Center(child: Text("No personnel assigned yet."));

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  itemCount: personnel.length,
                  itemBuilder: (context, index) {
                    final user = personnel[index];
                    final isOwner = user['role'] == 'owner';

                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: isOwner ? Colors.orange : AppColors.lime,
                        child: Icon(isOwner ? Icons.admin_panel_settings : Icons.badge, color: AppColors.deepSeaBlueDark),
                      ),
                      title: Text(user['email'] ?? 'No Email', style: const TextStyle(color: Colors.white)),
                      subtitle: Text(user['role']?.toString().toUpperCase() ?? 'STAFF', style: const TextStyle(color: Colors.white54, fontSize: 12)),
                      trailing: IconButton(
                        icon: const Icon(Icons.remove_circle_outline, color: Colors.redAccent),
                        onPressed: () => _removeUser(user['uid']),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
