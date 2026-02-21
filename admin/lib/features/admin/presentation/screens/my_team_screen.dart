
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:provider/provider.dart';

class MyTeamScreen extends StatefulWidget {
  const MyTeamScreen({super.key});

  @override
  State<MyTeamScreen> createState() => _MyTeamScreenState();
}

class _MyTeamScreenState extends State<MyTeamScreen> {
  final _firestore = FirebaseFirestore.instance;
  final TextEditingController _searchCtrl = TextEditingController();
  
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

  @override
  Widget build(BuildContext context) {
    final roleProvider = Provider.of<RoleProvider>(context);
    final myVenues = roleProvider.venueIds;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("My Team", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.title)),
              const SizedBox(height: 8),
              Text("Managers and Staff across your ${myVenues.length} assigned venues.", style: const TextStyle(color: AppColors.body)),
            ],
          ),
        ),

        // Search Bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchCtrl,
                  decoration: InputDecoration(
                    hintText: "Add team member by exact email...",
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
                    icon: const Icon(Icons.add_circle_outline, color: AppColors.brandOrange),
                    onPressed: () => _showAssignDialog(context, _searchResultId!, _searchResult!['email'], myVenues),
                    tooltip: "Assign to Venue",
                  ),
                 ],
              ),
            ),
          ),

        const SizedBox(height: 24),

        // Team List
        Expanded(
          child: myVenues.isEmpty 
            ? const Center(child: Text("No venues assigned to you yet."))
            : StreamBuilder<QuerySnapshot>(
                stream: _firestore.collection('users')
                    .where('venueId', whereIn: myVenues)
                    .snapshots(),
                builder: (context, snapshot) {
                  if (snapshot.hasError) return const Center(child: Text("Error loading team members"));
                  if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

                  final members = snapshot.data!.docs;
                  if (members.isEmpty) return const Center(child: Text("No staff or managers assigned to your venues."));

                  return ListView.builder(
                    padding: const EdgeInsets.all(24),
                    itemCount: members.length,
                    itemBuilder: (context, index) => _buildMemberCard(members[index]),
                  );
                },
              ),
        ),
      ],
    );
  }

  Widget _buildMemberCard(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    final role = data['role'] ?? 'staff';
    final venueId = data['venueId'];

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
            backgroundColor: (role == 'manager' ? Colors.orange : Colors.blue).withOpacity(0.1),
            child: Icon(Icons.person, color: role == 'manager' ? Colors.orange : Colors.blue),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(data['email'] ?? 'No Email', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: (role == 'manager' ? Colors.orange : Colors.blue).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(role.toString().toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: role == 'manager' ? Colors.orange : Colors.blue)),
                    ),
                    const SizedBox(width: 8),
                    FutureBuilder<DocumentSnapshot>(
                      future: _firestore.collection('venues').doc(venueId).get(),
                      builder: (context, snap) {
                        if (!snap.hasData) return const SizedBox.shrink();
                        final venueName = (snap.data?.data() as Map?)?['name'] ?? 'Unknown Venue';
                        return Text("at $venueName", style: const TextStyle(fontSize: 12, color: Colors.grey));
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.red),
            onPressed: () => _demoteUser(doc.id, data['email']),
            tooltip: "Remove from team",
          ),
        ],
      ),
    );
  }

  void _showAssignDialog(BuildContext context, String uid, String email, List<String> myVenues) {
    String? selectedVenue = myVenues.isNotEmpty ? myVenues.first : null;
    String selectedRole = 'staff';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text("Assign $email to Venue"),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: selectedVenue,
                decoration: const InputDecoration(labelText: "Target Venue"),
                items: myVenues.map((id) => DropdownMenuItem(
                  value: id,
                  child: FutureBuilder<DocumentSnapshot>(
                    future: _firestore.collection('venues').doc(id).get(),
                    builder: (context, snap) => Text((snap.data?.data() as Map?)?['name'] ?? id),
                  ),
                )).toList(),
                onChanged: (v) => setState(() => selectedVenue = v),
              ),
              const SizedBox(height: 16),
              RadioListTile(
                title: const Text("Manager"),
                value: 'manager',
                groupValue: selectedRole,
                onChanged: (v) => setState(() => selectedRole = v!),
              ),
              RadioListTile(
                title: const Text("Staff"),
                value: 'staff',
                groupValue: selectedRole,
                onChanged: (v) => setState(() => selectedRole = v!),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
            ElevatedButton(
              onPressed: selectedVenue == null ? null : () async {
                await _firestore.collection('users').doc(uid).update({
                  'role': selectedRole,
                  'venueId': selectedVenue,
                });
                if (mounted) {
                  Navigator.pop(ctx);
                  setState(() {
                    _searchResult = null;
                    _searchResultId = null;
                    _searchCtrl.clear();
                  });
                }
              },
              child: const Text("Confirm"),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _demoteUser(String uid, String? email) async {
     final confirm = await showDialog<bool>(
       context: context,
       builder: (ctx) => AlertDialog(
         title: const Text("Revoke Access"),
         content: Text("Remove $email from your team? They will lose venue access."),
         actions: [
           TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
           TextButton(
             onPressed: () => Navigator.pop(ctx, true), 
             style: TextButton.styleFrom(foregroundColor: Colors.red),
             child: const Text("Remove")
           ),
         ],
       ),
     );

     if (confirm == true) {
        await _firestore.collection('users').doc(uid).update({
          'role': 'guest',
          'venueId': FieldValue.delete(),
        });
     }
  }
}
