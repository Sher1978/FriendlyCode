import 'dart:ui';
import 'package:flutter/cupertino.dart';
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
  
  bool _isSearching = false;
  Map<String, dynamic>? _searchResult;
  String? _searchResultId;

  Future<void> _performSearch() async {
    final email = _searchCtrl.text.trim().toLowerCase();
    if (email.isEmpty) return;

    setState(() {
      _isSearching = true;
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
          _isSearching = false;
        });
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User not found. They must sign in first.')));
      } else {
        setState(() {
          _searchResultId = snap.docs.first.id;
          _searchResult = snap.docs.first.data();
          _isSearching = false;
        });
      }
    } catch (e) {
      setState(() => _isSearching = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  void _showRoleExplainer() {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text("Staff Roles"),
        content: const Column(
          children: [
            SizedBox(height: 12),
            Text("• SuperAdmin: Full access to all systems.\n• Admin: Can manage assigned venues.\n• Manager: Can edit venue details.", textAlign: TextAlign.left),
          ],
        ),
        actions: [
          CupertinoDialogAction(child: const Text("OK"), onPressed: () => Navigator.pop(context)),
        ],
      ),
    );
  }

  Future<void> _updateRole(String uid, String newRole) async {
    await _firestore.collection('users').doc(uid).update({'role': newRole});
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Role updated to $newRole"), backgroundColor: CupertinoColors.activeBlue));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Container(
        padding: const EdgeInsets.all(40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Global Staff Management",
                  style: TextStyle(
                    color: AppColors.macosTextPrimary,
                    fontSize: 34,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -1.0,
                  ),
                ),
                CupertinoButton(
                  padding: EdgeInsets.zero,
                  child: const Icon(CupertinoIcons.info_circle, color: CupertinoColors.activeBlue),
                  onPressed: _showRoleExplainer,
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              "Assign high-level administrative roles across the entire platform.",
              style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 16),
            ),
            const SizedBox(height: 48),
            
            _buildSearchSection(),
            
            const SizedBox(height: 48),
            
            const Text(
              "ADMINISTRATIVE TEAM",
              style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
            ),
            const SizedBox(height: 16),
            
            Expanded(
              child: StreamBuilder<QuerySnapshot>(
                stream: _firestore.collection('users')
                    .where('role', whereIn: ['superadmin', 'admin', 'manager'])
                    .snapshots(),
                builder: (context, snapshot) {
                  if (!snapshot.hasData) return const Center(child: CupertinoActivityIndicator());
                  final staff = snapshot.data!.docs;
                  
                  return ListView.builder(
                    itemCount: staff.length,
                    itemBuilder: (context, index) {
                      final data = staff[index].data() as Map<String, dynamic>;
                      return _buildStaffTile(staff[index].id, data);
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

  Widget _buildSearchSection() {
    return _buildGlassContainer(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "PROMOTE USER",
            style: TextStyle(color: CupertinoColors.activeBlue, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: CupertinoSearchTextField(
                  controller: _searchCtrl,
                  placeholder: "Enter user email...",
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  onSubmitted: (_) => _performSearch(),
                ),
              ),
              const SizedBox(width: 12),
              CupertinoButton(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                color: CupertinoColors.activeBlue,
                borderRadius: BorderRadius.circular(8),
                onPressed: _performSearch,
                child: const Text("Find User", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          if (_searchResult != null)
            Padding(
              padding: const EdgeInsets.only(top: 24),
              child: _buildSearchResultCard(),
            ),
        ],
      ),
    );
  }

  Widget _buildSearchResultCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.macosDivider),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: AppColors.brandOrange.withOpacity(0.2),
            child: const Icon(CupertinoIcons.person_fill, color: AppColors.brandOrange),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_searchResult!['displayName'] ?? "New Candidate", 
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                Text(_searchResult!['email'] ?? "", 
                  style: TextStyle(color: AppColors.macosTextSecondary.withOpacity(0.7), fontSize: 13)),
              ],
            ),
          ),
          Wrap(
            spacing: 8,
            children: [
              _buildRoleButton(_searchResultId!, "Admin", CupertinoColors.activeBlue),
              _buildRoleButton(_searchResultId!, "Manager", CupertinoColors.activeGreen),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRoleButton(String uid, String role, Color color) {
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
      color: color.withOpacity(0.2),
      borderRadius: BorderRadius.circular(8),
      onPressed: () => _updateRole(uid, role.toLowerCase()),
      child: Text(role, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildStaffTile(String uid, Map<String, dynamic> data) {
    final role = data['role'] ?? 'user';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.macosDivider),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundImage: data['photoUrl'] != null ? NetworkImage(data['photoUrl']) : null,
            child: data['photoUrl'] == null ? const Icon(CupertinoIcons.person_fill, size: 20) : null,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(data['displayName'] ?? "Staff Member", 
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                Text(data['email'] ?? "", 
                  style: TextStyle(color: AppColors.macosTextSecondary.withOpacity(0.6), fontSize: 12)),
              ],
            ),
          ),
          _buildStatusBadge(role.toUpperCase(), role == 'superadmin' ? CupertinoColors.systemPink : CupertinoColors.activeBlue),
          const SizedBox(width: 16),
          CupertinoButton(
            padding: EdgeInsets.zero,
            child: const Text("Demote", style: TextStyle(color: CupertinoColors.systemRed, fontSize: 13)),
            onPressed: () => _updateRole(uid, 'user'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
    );
  }

  Widget _buildGlassContainer({required Widget child}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.macosSurfaceBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: child,
        ),
      ),
    );
  }
}
