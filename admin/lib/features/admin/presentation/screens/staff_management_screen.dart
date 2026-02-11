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

  Future<void> _assignRole(String email, UserRole role) async {
    try {
      await _userService.addPersonnelByEmail(
        email: email,
        venueId: widget.venueId,
        role: role,
      );
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("User with email $email assigned as ${role.name}")),
      );
      setState(() => _foundUser = null); // Reset search
      _searchCtrl.clear();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error: $e")),
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
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("STAFF MANAGEMENT"),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline, color: AppColors.accentOrange),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Card
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(24),
                boxShadow: AppColors.softShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   const Text("ADD PERSONNEL", style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1.5)),
                   const SizedBox(height: 16),
                   TextField(
                     controller: _searchCtrl,
                     decoration: InputDecoration(
                       hintText: "Enter email address...",
                       prefixIcon: const Icon(Icons.search, color: AppColors.accentOrange),
                       suffixIcon: IconButton(
                         icon: _isSearching 
                           ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                           : const Icon(Icons.arrow_forward_rounded, color: AppColors.accentOrange),
                         onPressed: _isSearching ? null : _searchUser,
                       ),
                     ),
                     onSubmitted: (_) => _searchUser(),
                   ),
                ],
              ),
            ),
          ),

          // Search Results
          if (_foundUser != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.accentOrange,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_foundUser!['email'] ?? 'Unknown', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                          Text("ROLE: ${(_foundUser!['role'] ?? 'GUEST').toString().toUpperCase()}", style: const TextStyle(color: Colors.white54, fontSize: 11, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () => _assignRole(_foundUser!['email'], UserRole.staff),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentGreen, foregroundColor: Colors.white),
                      child: const Text("ADD STAFF"),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () => _assignRole(_foundUser!['email'], UserRole.owner),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentOrange, foregroundColor: Colors.white),
                      child: const Text("MAKE OWNER"),
                    ),
                  ],
                ),
              ),
            ),

          const Padding(
            padding: EdgeInsets.all(24.0),
            child: Row(
              children: [
                Text("CURRENT PERSONNEL", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.body)),
                Spacer(),
              ],
            ),
          ),

          // Personnel List
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

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.accentOrange.withOpacity(0.05)),
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: (isOwner ? AppColors.accentOrange : AppColors.accentGreen).withOpacity(0.1),
                          child: Icon(isOwner ? Icons.admin_panel_settings_outlined : Icons.badge_outlined, color: isOwner ? AppColors.accentOrange : AppColors.accentGreen, size: 20),
                        ),
                        title: Text(user['email'] ?? 'No Email', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        subtitle: Text(user['role']?.toString().toUpperCase() ?? 'STAFF', style: TextStyle(color: AppColors.body.withValues(alpha: 0.5), fontSize: 11, fontWeight: FontWeight.bold)),
                        trailing: IconButton(
                          icon: const Icon(Icons.remove_circle_outline, color: Colors.redAccent, size: 20),
                          onPressed: () => _removeUser(user['uid']),
                        ),
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
