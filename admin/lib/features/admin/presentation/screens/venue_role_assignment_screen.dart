import 'dart:ui';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';

class VenueRoleAssignmentScreen extends StatefulWidget {
  const VenueRoleAssignmentScreen({super.key});

  @override
  State<VenueRoleAssignmentScreen> createState() => _VenueRoleAssignmentScreenState();
}

class _VenueRoleAssignmentScreenState extends State<VenueRoleAssignmentScreen> {
  final _db = FirebaseFirestore.instance;
  final TextEditingController _emailCtrl = TextEditingController();
  final TextEditingController _nameCtrl = TextEditingController();

  String? _selectedVenueId;
  String? _selectedVenueName;
  String _selectedRole = 'staff';

  bool _isSearching = false;
  bool _searched = false;
  bool _userFound = false;
  String? _foundUserId;
  String? _foundUserName;
  bool _isSaving = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _searchUser() async {
    final email = _emailCtrl.text.trim().toLowerCase();
    if (email.isEmpty) return;
    setState(() {
      _isSearching = true;
      _searched = false;
      _userFound = false;
      _foundUserId = null;
      _foundUserName = null;
    });
    try {
      final snap = await _db
          .collection('users')
          .where('email', isEqualTo: email)
          .limit(1)
          .get();
      if (snap.docs.isNotEmpty) {
        final doc = snap.docs.first;
        setState(() {
          _userFound = true;
          _foundUserId = doc.id;
          _foundUserName = doc.data()['displayName'] ?? doc.data()['name'] ?? 'No Name';
        });
      } else {
        setState(() => _userFound = false);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() { _isSearching = false; _searched = true; });
    }
  }

  Future<void> _saveRole() async {
    if (_selectedVenueId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a venue')));
      return;
    }
    final email = _emailCtrl.text.trim().toLowerCase();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter user email')));
      return;
    }
    setState(() => _isSaving = true);
    try {
      if (_userFound && _foundUserId != null) {
        await _db.collection('users').doc(_foundUserId).update({
          'venueId': _selectedVenueId,
          'role': _selectedRole,
          'updatedAt': FieldValue.serverTimestamp(),
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$_foundUserName assigned as $_selectedRole to $_selectedVenueName'),
              backgroundColor: AppColors.accentGreen.withOpacity(0.8),
            ),
          );
          _reset();
        }
      } else {
        final name = _nameCtrl.text.trim();
        if (name.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter full name for new user')));
          setState(() => _isSaving = false);
          return;
        }
        await _db.collection('users').doc().set({
          'displayName': name,
          'email': email,
          'role': _selectedRole,
          'venueId': _selectedVenueId,
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('New user "$name" created as $_selectedRole in $_selectedVenueName'),
              backgroundColor: AppColors.accentGreen.withOpacity(0.8),
            ),
          );
          _reset();
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _reset() {
    setState(() {
      _emailCtrl.clear();
      _nameCtrl.clear();
      _searched = false;
      _userFound = false;
      _foundUserId = null;
      _foundUserName = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 48),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              const Text(
                'Role Assignment',
                style: TextStyle(
                  color: AppColors.macosTextPrimary,
                  fontSize: 34,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -1.0,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Assign users to specific venues with operational roles.',
                style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 15),
              ),
              const SizedBox(height: 40),

              // Step 1 — Select Venue
              _buildSectionLabel('1. SELECT VENUE'),
              const SizedBox(height: 12),
              _buildGlassCard(
                child: StreamBuilder<QuerySnapshot>(
                  stream: _db.collection('venues').snapshots(),
                  builder: (context, snap) {
                    if (!snap.hasData) return const Center(child: CupertinoActivityIndicator());
                    final docs = snap.data!.docs;
                    return DropdownButtonFormField<String>(
                      dropdownColor: AppColors.surface,
                      value: _selectedVenueId,
                      hint: const Text('Select venue…', style: TextStyle(color: AppColors.tertiary, fontSize: 14)),
                      style: const TextStyle(color: AppColors.title, fontSize: 14),
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                      items: docs.map((doc) {
                        final name = doc['name'] ?? 'Unnamed';
                        return DropdownMenuItem(
                          value: doc.id,
                          child: Text(name, style: const TextStyle(color: AppColors.title)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        final name = docs.firstWhere((d) => d.id == val)['name'] ?? '';
                        setState(() { _selectedVenueId = val; _selectedVenueName = name; });
                      },
                    );
                  },
                ),
              ),

              const SizedBox(height: 28),

              // Step 2 — User Email Search
              _buildSectionLabel('2. FIND OR CREATE USER'),
              const SizedBox(height: 12),
              _buildGlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: CupertinoTextField(
                            controller: _emailCtrl,
                            placeholder: 'Enter user email…',
                            placeholderStyle: const TextStyle(color: AppColors.tertiary, fontSize: 14),
                            style: const TextStyle(color: AppColors.title, fontSize: 14),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            keyboardType: TextInputType.emailAddress,
                            decoration: BoxDecoration(
                              color: AppColors.secondarySurface,
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        CupertinoButton(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 0),
                          color: AppColors.accentBlue,
                          borderRadius: BorderRadius.circular(12),
                          onPressed: _isSearching ? null : _searchUser,
                          child: _isSearching
                              ? const CupertinoActivityIndicator(color: Colors.white, radius: 8)
                              : const Text('Search', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                    if (_searched) ...[
                      const SizedBox(height: 16),
                      if (_userFound)
                        _buildStatusBanner(
                          icon: CupertinoIcons.checkmark_circle_fill,
                          color: AppColors.accentGreen,
                          text: 'Found: $_foundUserName',
                        )
                      else ...[
                        _buildStatusBanner(
                          icon: CupertinoIcons.info_circle_fill,
                          color: AppColors.accentOrange,
                          text: 'User not found — a new profile will be created.',
                        ),
                        const SizedBox(height: 14),
                        CupertinoTextField(
                          controller: _nameCtrl,
                          placeholder: 'Full name for new user…',
                          placeholderStyle: const TextStyle(color: AppColors.tertiary, fontSize: 14),
                          style: const TextStyle(color: AppColors.title, fontSize: 14),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          decoration: BoxDecoration(
                            color: AppColors.secondarySurface,
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ],
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Step 3 — Role
              _buildSectionLabel('3. SELECT ROLE'),
              const SizedBox(height: 12),
              _buildGlassCard(
                child: DropdownButtonFormField<String>(
                  dropdownColor: AppColors.surface,
                  value: _selectedRole,
                  style: const TextStyle(color: AppColors.title, fontSize: 14),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                  items: const [
                    DropdownMenuItem(value: 'owner',   child: Text('OWNER — Full venue access', style: TextStyle(color: AppColors.title))),
                    DropdownMenuItem(value: 'staff',   child: Text('STAFF — POS & check-in access', style: TextStyle(color: AppColors.title))),
                    DropdownMenuItem(value: 'manager', child: Text('MANAGER — Edit venue details', style: TextStyle(color: AppColors.title))),
                    DropdownMenuItem(value: 'guest',   child: Text('GUEST — Customer level', style: TextStyle(color: AppColors.title))),
                  ],
                  onChanged: (val) => setState(() => _selectedRole = val ?? 'staff'),
                ),
              ),

              const SizedBox(height: 40),

              // Save button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accentGreen,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  onPressed: _isSaving ? null : _saveRole,
                  child: _isSaving
                      ? const CupertinoActivityIndicator(color: Colors.black, radius: 10)
                      : const Text(
                          'ASSIGN ROLE',
                          style: TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                            letterSpacing: 1.2,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 48),

              // Active Staff List
              _buildSectionLabel('CURRENT VENUE STAFF'),
              const SizedBox(height: 12),
              StreamBuilder<QuerySnapshot>(
                stream: _db.collection('venues').snapshots(),
                builder: (context, venuesSnap) {
                  final venueMap = <String, String>{};
                  if (venuesSnap.hasData) {
                    for (var doc in venuesSnap.data!.docs) {
                      venueMap[doc.id] = (doc.data() as Map<String, dynamic>)['name'] ?? 'Unnamed';
                    }
                  }
                  return StreamBuilder<QuerySnapshot>(
                    stream: _db.collection('users')
                        .where('role', whereIn: ['owner', 'staff', 'manager'])
                        .snapshots(),
                    builder: (context, snap) {
                      if (!snap.hasData) return const Center(child: CupertinoActivityIndicator());
                      final docs = snap.data!.docs;
                      if (docs.isEmpty) {
                        return const Text('No venue staff assigned yet.', style: TextStyle(color: AppColors.tertiary));
                      }
                      return Column(
                        children: docs.map((doc) {
                          final data = doc.data() as Map<String, dynamic>;
                          return _buildStaffRow(doc.id, data, venueMap);
                        }).toList(),
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionLabel(String text) => Text(
    text,
    style: const TextStyle(
      color: AppColors.accentOrange,
      fontWeight: FontWeight.w800,
      fontSize: 11,
      letterSpacing: 1.4,
    ),
  );

  Widget _buildGlassCard({required Widget child}) => ClipRRect(
    borderRadius: BorderRadius.circular(16),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.macosSurfaceBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.macosDivider),
        ),
        child: child,
      ),
    ),
  );

  Widget _buildStatusBanner({required IconData icon, required Color color, required String text}) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: color.withOpacity(0.1),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: color.withOpacity(0.25)),
    ),
    child: Row(
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600))),
      ],
    ),
  );

  Widget _buildStaffRow(String uid, Map<String, dynamic> data, Map<String, String> venueMap) {
    final role = (data['role'] ?? 'staff') as String;
    final venueId = data['venueId'] ?? '—';
    final venueName = venueMap[venueId] ?? venueId;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg.withOpacity(0.6),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.macosDivider),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: AppColors.accentBlue.withOpacity(0.15),
            child: const Icon(CupertinoIcons.person_fill, color: AppColors.accentBlue, size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(data['displayName'] ?? 'Unknown', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
                Text(data['email'] ?? '', style: const TextStyle(color: AppColors.tertiary, fontSize: 12)),
                Text('Venue: $venueName', style: const TextStyle(color: AppColors.tertiary, fontSize: 11)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.accentGreen.withOpacity(0.15),
              borderRadius: BorderRadius.circular(100),
            ),
            child: Text(
              role.toUpperCase(),
              style: const TextStyle(color: AppColors.accentGreen, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5),
            ),
          ),
          const SizedBox(width: 12),
          CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: () async {
              await _db.collection('users').doc(uid).update({'role': 'guest', 'venueId': FieldValue.delete()});
            },
            child: const Text('Remove', style: TextStyle(color: AppColors.accentRed, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
