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

  Future<void> _showAssignVenueDialog(String uid, String email, String displayName) async {
    String? selectedVenueId;
    String? selectedVenueName;
    String selectedRole = 'owner';

    await showCupertinoDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return CupertinoAlertDialog(
            title: const Text("Привязать к заведению"),
            content: Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Пользователь: $displayName\n$email",
                    style: const TextStyle(fontSize: 12, color: CupertinoColors.secondaryLabel),
                  ),
                  const SizedBox(height: 16),
                  const Text("1. Выберите заведение бизнеса:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 6),
                  FutureBuilder<QuerySnapshot>(
                    future: _firestore.collection('venues').get(),
                    builder: (context, snap) {
                      if (!snap.hasData) return const Center(child: CupertinoActivityIndicator());
                      final venues = snap.data!.docs;
                      if (venues.isEmpty) return const Text("Нет созданных заведений");
                      
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: CupertinoColors.systemBackground,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: CupertinoColors.separator),
                        ),
                        child: DropdownButton<String>(
                          isExpanded: true,
                          value: selectedVenueId,
                          hint: const Text("Выберите заведение…", style: TextStyle(fontSize: 13, color: Colors.black54)),
                          underline: const SizedBox(),
                          items: venues.map((v) {
                            final vData = v.data() as Map<String, dynamic>;
                            final name = vData['name'] ?? v.id;
                            return DropdownMenuItem<String>(
                              value: v.id,
                              child: Text(name.toString(), style: const TextStyle(fontSize: 13, color: Colors.black)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val == null) return;
                            final v = venues.firstWhere((x) => x.id == val);
                            final vData = v.data() as Map<String, dynamic>;
                            setDialogState(() {
                              selectedVenueId = val;
                              selectedVenueName = vData['name'] ?? v.id;
                            });
                          },
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 14),
                  const Text("2. Назначаемая роль:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: CupertinoColors.systemBackground,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: CupertinoColors.separator),
                    ),
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: selectedRole,
                      underline: const SizedBox(),
                      items: const [
                        DropdownMenuItem(value: 'owner', child: Text("👑 Оунер (Владелец заведения)", style: TextStyle(fontSize: 13, color: Colors.black))),
                        DropdownMenuItem(value: 'admin', child: Text("🛡️ Администратор заведения", style: TextStyle(fontSize: 13, color: Colors.black))),
                        DropdownMenuItem(value: 'manager', child: Text("💼 Менеджер заведения", style: TextStyle(fontSize: 13, color: Colors.black))),
                      ],
                      onChanged: (val) {
                        if (val != null) setDialogState(() => selectedRole = val);
                      },
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              CupertinoDialogAction(
                child: const Text("Отмена"),
                onPressed: () => Navigator.pop(ctx),
              ),
              CupertinoDialogAction(
                isDefaultAction: true,
                onPressed: selectedVenueId == null
                    ? null
                    : () async {
                        Navigator.pop(ctx);
                        await _performVenueBinding(
                          uid,
                          email,
                          displayName,
                          selectedVenueId!,
                          selectedVenueName ?? selectedVenueId!,
                          selectedRole,
                        );
                      },
                child: const Text("Привязать"),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _performVenueBinding(
    String uid,
    String email,
    String displayName,
    String venueId,
    String venueName,
    String role,
  ) async {
    try {
      await _firestore.collection('users').doc(uid).update({
        'venueId': venueId,
        'role': role,
        'assignedVenueName': venueName,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      final venueUpdates = <String, dynamic>{
        'updatedAt': FieldValue.serverTimestamp(),
      };
      if (role == 'owner') {
        venueUpdates['ownerId'] = uid;
        venueUpdates['ownerEmail'] = email;
      } else if (role == 'admin') {
        venueUpdates['assignedAdminId'] = uid;
      } else if (role == 'manager') {
        venueUpdates['assignedManagerId'] = uid;
      }
      await _firestore.collection('venues').doc(venueId).update(venueUpdates);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("$email успешно назначен как $role для заведения «$venueName»!"),
            backgroundColor: AppColors.accentGreen,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Ошибка привязки: $e"), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        child: Container(
          padding: const EdgeInsets.all(40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
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
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.accentTeal.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.accentTeal.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(CupertinoIcons.building_2_fill, color: AppColors.accentTeal, size: 24),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Нужно привязать Оунера или Админа к заведению?",
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          SizedBox(height: 2),
                          Text(
                            "Используйте кнопку «Привязать к заведению» у кандидата ниже, либо раздел «Role Assignment» в боковом меню.",
                            style: TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 48),
              
              _buildSearchSection(),
              
              const SizedBox(height: 48),
              
              const Text(
                "ADMINISTRATIVE TEAM",
                style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
              ),
              const SizedBox(height: 16),
              
              StreamBuilder<QuerySnapshot>(
                stream: _firestore.collection('users')
                    .where('role', whereIn: ['superadmin', 'admin', 'manager'])
                    .snapshots(),
                builder: (context, snapshot) {
                  if (!snapshot.hasData) return const Center(child: CupertinoActivityIndicator());
                  final staff = snapshot.data!.docs;
                  
                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: staff.length,
                    itemBuilder: (context, index) {
                      final data = staff[index].data() as Map<String, dynamic>;
                      return _buildStaffTile(staff[index].id, data);
                    },
                  );
                },
              ),
              const SizedBox(height: 40),
            ],
          ),
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
            runSpacing: 8,
            children: [
              CupertinoButton(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                color: AppColors.accentOrange,
                borderRadius: BorderRadius.circular(8),
                onPressed: () => _showAssignVenueDialog(
                  _searchResultId!,
                  _searchResult!['email'] ?? '',
                  _searchResult!['displayName'] ?? _searchResult!['name'] ?? 'Candidate',
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(CupertinoIcons.building_2_fill, size: 14, color: Colors.white),
                    SizedBox(width: 6),
                    Text("Привязать к заведению...", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
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
          if (data['assignedVenueName'] != null || data['venueId'] != null)
            Container(
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.accentTeal.withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppColors.accentTeal.withOpacity(0.4)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(CupertinoIcons.building_2_fill, size: 10, color: AppColors.accentTeal),
                  const SizedBox(width: 4),
                  Text(
                    (data['assignedVenueName'] ?? data['venueId']).toString(),
                    style: const TextStyle(color: AppColors.accentTeal, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          CupertinoButton(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            color: AppColors.accentOrange.withOpacity(0.2),
            borderRadius: BorderRadius.circular(8),
            onPressed: () => _showAssignVenueDialog(
              uid,
              data['email'] ?? '',
              data['displayName'] ?? data['name'] ?? 'Staff Member',
            ),
            child: const Text("Привязать к заведению", style: TextStyle(color: AppColors.accentOrange, fontSize: 11, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 8),
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
