import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/theme/colors.dart';

class VenueStaffScreen extends StatefulWidget {
  final String venueId;
  const VenueStaffScreen({super.key, required this.venueId});

  @override
  State<VenueStaffScreen> createState() => _VenueStaffScreenState();
}

class _VenueStaffScreenState extends State<VenueStaffScreen> {
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
          _searchError = "User not found. Ask them to register first.";
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
        _searchError = "Error: $e";
        _isSearching = false;
      });
    }
  }

  Future<void> _addStaff(String uid) async {
    await _firestore.collection('users').doc(uid).update({
      'role': 'staff',
      'venueId': widget.venueId,
    });
    setState(() {
      _searchResult = null;
      _searchResultId = null;
      _searchCtrl.clear();
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Staff added!"), backgroundColor: Colors.green));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Staff Management", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.title),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Manage your venue's staff. Assigned staff can process redemptions.",
              style: TextStyle(fontSize: 14, color: AppColors.body),
            ),
            const SizedBox(height: 20),
            
            // Integrated Search Bar
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: "Add staff by exact email...",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: Colors.white,
                      errorText: _searchError,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    ),
                    onSubmitted: (_) => _performSearch(),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: _isSearching ? null : _performSearch,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandOrange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.all(18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSearching 
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.search),
                ),
              ],
            ),

            // Search Result Card
            if (_searchResult != null) ...[
              const SizedBox(height: 16),
              Container(
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
                          Text(_searchResult!['email'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold)),
                          Text("Current role: ${_searchResult!['role'] ?? 'guest'}", style: const TextStyle(fontSize: 12)),
                        ],
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () => _addStaff(_searchResultId!),
                      icon: const Icon(Icons.add),
                      label: const Text("Assign as Staff"),
                      style: TextButton.styleFrom(foregroundColor: AppColors.brandOrange),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),
            Expanded(
              child: StreamBuilder<QuerySnapshot>(
                stream: _firestore
                    .collection('users')
                    .where('role', isEqualTo: 'staff')
                    .where('venueId', isEqualTo: widget.venueId)
                    .snapshots(),
                builder: (context, snapshot) {
                  if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}"));
                  if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

                  final staff = snapshot.data!.docs;
                  if (staff.isEmpty) {
                    return Center(
                      child: Text("No staff assigned yet.", style: TextStyle(color: AppColors.body.withOpacity(0.5))),
                    );
                  }

                  return ListView.builder(
                    itemCount: staff.length,
                    itemBuilder: (context, index) {
                      final doc = staff[index];
                      final data = doc.data() as Map<String, dynamic>;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: const CircleAvatar(backgroundColor: AppColors.lime, child: Icon(Icons.person, color: Colors.white)),
                          title: Text(data['email'] ?? 'Unknown Email', style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text(data['name'] ?? 'Unnamed User'),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete, color: Colors.red),
                            tooltip: "Remove from staff",
                            onPressed: () async {
                              await _firestore.collection('users').doc(doc.id).update({
                                'role': 'guest',
                                'venueId': FieldValue.delete(),
                              });
                            },
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
      ),
    );
  }


}
