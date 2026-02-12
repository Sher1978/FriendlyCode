import 'package:flutter/material.dart';
import 'package:friendly_code/core/services/user_service.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class StaffManagementScreen extends StatefulWidget {
  final String venueId;

  const StaffManagementScreen({super.key, required this.venueId});

  @override
  State<StaffManagementScreen> createState() => _StaffManagementScreenState();
}

class _StaffManagementScreenState extends State<StaffManagementScreen> with SingleTickerProviderStateMixin {
  final UserService _userService = UserService();
  final TextEditingController _searchCtrl = TextEditingController();
  late TabController _tabController;
  
  Map<String, dynamic>? _foundUser;
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  // ... (Keep existing _searchUser, _assignRole, _createUser, _showCreateUserDialog, _removeUser)

  // Fetch Requests
  Stream<QuerySnapshot> _getRequestsStream() {
    return FirebaseFirestore.instance
        .collection('venue_requests')
        .where('venueId', isEqualTo: widget.venueId)
        .where('status', isEqualTo: 'pending')
        .snapshots();
  }

  Future<void> _approveRequest(DocumentSnapshot doc) async {
    final data = doc.data() as Map<String, dynamic>;
    final userId = data['userId'];
    final email = data['userEmail'];
    
    try {
      // 1. Assign Role
      await _userService.addPersonnelByEmail(email: email, venueId: widget.venueId, role: UserRole.staff);
      
      // 2. Delete Request
      await doc.reference.delete();
      
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Approved $email!")));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  Future<void> _rejectRequest(DocumentSnapshot doc) async {
    try {
      await doc.reference.delete();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Request rejected")));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

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

  Future<void> _createUser(String name, String email) async {
    try {
      await _userService.createUserStub(
        email: email, 
        name: name, 
        venueId: widget.venueId, 
        role: UserRole.staff
      );
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("User created and assigned!")));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  void _showCreateUserDialog() {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Create New User"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text("This creates a placeholder account. The user can claim it by signing up with this email."),
            const SizedBox(height: 16),
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: "Full Name", filled: true)),
            const SizedBox(height: 8),
            TextField(controller: emailCtrl, decoration: const InputDecoration(labelText: "Email Address", filled: true)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("CANCEL")),
          TextButton(
            onPressed: () {
              if (nameCtrl.text.isEmpty || emailCtrl.text.isEmpty) return;
              Navigator.pop(context);
              _createUser(nameCtrl.text.trim(), emailCtrl.text.trim());
            },
            child: const Text("CREATE & ASSIGN", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Future<void> _removeUser(String uid) async {
    try {
      await _userService.removeUserFromVenue(uid);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("User removed from personnel")),
      );
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
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
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: "Current Staff"),
            Tab(text: "Pending Requests"),
          ],
          indicatorColor: AppColors.accentOrange,
          labelColor: AppColors.accentOrange,
          unselectedLabelColor: Colors.grey,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline, color: AppColors.accentOrange),
            onPressed: () {},
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Current Staff (Original UI)
          Column(
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
                       const SizedBox(height: 12),
                       Align(
                         alignment: Alignment.centerRight,
                         child: TextButton.icon(
                           onPressed: _showCreateUserDialog,
                           icon: const Icon(Icons.person_add, size: 16),
                           label: const Text("OR CREATE NEW USER", style: TextStyle(fontWeight: FontWeight.bold)),
                           style: TextButton.styleFrom(foregroundColor: AppColors.accentOrange),
                         ),
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

          // Tab 2: Pending Requests
          StreamBuilder<QuerySnapshot>(
            stream: _getRequestsStream(),
            builder: (context, snapshot) {
              if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}"));
              if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());

              final requests = snapshot.data!.docs;
              if (requests.isEmpty) return const Center(child: Text("No pending requests.", style: TextStyle(color: Colors.grey)));

              return ListView.builder(
                padding: const EdgeInsets.all(24),
                itemCount: requests.length,
                itemBuilder: (context, index) {
                  final req = requests[index];
                  final data = req.data() as Map<String, dynamic>;

                  return Card(
                    elevation: 0,
                    color: AppColors.surface,
                     shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      leading: const CircleAvatar(child: Icon(Icons.person_outline)),
                      title: Text(data['userName'] ?? 'Unknown User', style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text(data['userEmail'] ?? 'No Email'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.check_circle, color: Colors.green),
                            onPressed: () => _approveRequest(req),
                            tooltip: "Approve",
                          ),
                          IconButton(
                            icon: const Icon(Icons.cancel, color: Colors.red),
                            onPressed: () => _rejectRequest(req),
                            tooltip: "Reject",
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}
