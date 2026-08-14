
import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_detail_view.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/marketing_campaign_screen.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:friendly_code/core/models/venue_request_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/services/venue_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/core/localization/locale_provider.dart';
import 'package:friendly_code/features/owner/presentation/screens/flyer_generator_screen.dart';
import 'package:friendly_code/features/admin/presentation/screens/global_email_settings_screen.dart';
import 'package:flutter/cupertino.dart' show CupertinoIcons;

class SuperAdminDashboard extends StatefulWidget {
  const SuperAdminDashboard({super.key});

  @override
  State<SuperAdminDashboard> createState() => _SuperAdminDashboardState();
}

class _SuperAdminDashboardState extends State<SuperAdminDashboard> {
  final TextEditingController _searchCtrl = TextEditingController();
  final VenuesService _venuesService = VenuesService();

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 900;
        final horizontalPadding = isWide ? constraints.maxWidth * 0.1 : 16.0;

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: _buildAppBar(context),
          body: SingleChildScrollView(
            padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Phase 1: Network Vitals (JTBD: Monitoring Health)
                _buildSectionHeader("NETWORK VITALS", CupertinoIcons.graph_square_fill),
                const SizedBox(height: 16),
                _buildVitalsGrid(isWide),
                
                const SizedBox(height: 48),

                // Phase 2: Growth Queue (JTBD: Facilitating Onboarding)
                _buildSectionHeader("GROWTH QUEUE", CupertinoIcons.person_add),
                const SizedBox(height: 16),
                _buildRequestsQueue(),

                const SizedBox(height: 48),

                // Phase 3: Strategic Controls (JTBD: Global Management)
                _buildSectionHeader("STRATEGIC CONTROLS", CupertinoIcons.command),
                const SizedBox(height: 16),
                _buildStrategicGrid(isWide),

                const SizedBox(height: 48),

                // Phase 4: Venue Repository (JTBD: Resource Management)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildSectionHeader("VENUE REPOSITORY", CupertinoIcons.building_2_fill),
                    _buildCompactSearch(),
                  ],
                ),
                const SizedBox(height: 16),
                _buildVenueListGrid(isWide),
                
                const SizedBox(height: 40),
              ],
            ),
          ),
        );
      },
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("NETWORK COMMAND", style: TextStyle(color: AppColors.body, fontSize: 12, letterSpacing: 2, fontWeight: FontWeight.bold)),
          Text("SuperAdmin Dashboard", style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900, color: AppColors.title)),
        ],
      ),
      actions: [
        _buildLocaleSwitcher(context),
        const SizedBox(width: 8),
        IconButton(
          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen())),
          icon: const Icon(CupertinoIcons.plus_circle_fill, color: AppColors.accentGreen, size: 28),
        ),
        const SizedBox(width: 16),
      ],
    );
  }

  Widget _buildLocaleSwitcher(BuildContext context) {
    final provider = Provider.of<LocaleProvider>(context);
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: IconButton(
        icon: Text(provider.locale.languageCode.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        onPressed: () => provider.toggleLocale(),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppColors.premiumGold, size: 18),
        const SizedBox(width: 12),
        Text(title, style: const TextStyle(color: AppColors.premiumGold, fontWeight: FontWeight.w800, letterSpacing: 1.5, fontSize: 13)),
      ],
    );
  }

  Widget _buildVitalsGrid(bool isWide) {
    return StreamBuilder<List<VenueModel>>(
      stream: _venuesService.getAllVenues(),
      builder: (context, snapshot) {
        final venues = snapshot.data ?? [];
        final activeCount = venues.where((v) => v.isActive && !v.isManuallyBlocked).length;
        
        return GridView.count(
          crossAxisCount: isWide ? 4 : 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          childAspectRatio: 1.8,
          children: [
            _buildVitalCard("ACTIVE NODES", activeCount.toString(), CupertinoIcons.building_2_fill, AppColors.accentGreen),
            _buildVitalCard("SYSTEM HEALTH", "99.9%", CupertinoIcons.infinite, AppColors.accentBlue),
            _buildVitalCard("PENDING", "...", CupertinoIcons.time, AppColors.accentOrange),
            _buildVitalCard("REVENUE PULSE", "STABLE", CupertinoIcons.chart_bar_fill, AppColors.premiumGold),
          ],
        );
      }
    );
  }

  Widget _buildVitalCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(color: AppColors.body, fontSize: 10, fontWeight: FontWeight.bold)),
              Icon(icon, color: color.withOpacity(0.5), size: 16),
            ],
          ),
          Text(value, style: const TextStyle(color: AppColors.title, fontSize: 24, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  Widget _buildRequestsQueue() {
    return StreamBuilder<List<VenueRequestModel>>(
      stream: VenueRepository().getAllPendingRequestsStream(),
      builder: (context, snapshot) {
        final requests = snapshot.data ?? [];
        if (requests.isEmpty) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.all(40),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.03)),
            ),
            child: const Center(child: Text("All onboarding tickets cleared.", style: TextStyle(color: AppColors.tertiary))),
          );
        }

        return Column(
          children: requests.map((req) => _buildRequestTile(req)).toList(),
        );
      },
    );
  }

  Widget _buildRequestTile(VenueRequestModel req) {
    final title = req.type == 'join' ? "Staff Expansion" : "New Node Creation";
    final sub = "${req.userName} -> ${req.type == 'join' ? req.targetVenueName : req.newVenueDetails?['name']}";
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.accentBlue.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: const Icon(CupertinoIcons.sparkles, color: AppColors.accentBlue, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold)),
                Text(sub, style: const TextStyle(color: AppColors.body, fontSize: 12)),
              ],
            ),
          ),
          Row(
            children: [
              IconButton(onPressed: () => _approveRequest(req), icon: const Icon(CupertinoIcons.check_mark_circled, color: AppColors.accentGreen)),
              IconButton(onPressed: () => _rejectRequest(req), icon: const Icon(CupertinoIcons.xmark_circle, color: AppColors.accentOrange)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStrategicGrid(bool isWide) {
    return GridView.count(
      crossAxisCount: isWide ? 4 : 1,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: isWide ? 2.0 : 3.5,
      children: [
        _buildStrategicCard("Campaign Control", "Global marketing pulse", CupertinoIcons.speaker_2_fill, AppColors.accentBlue, () {
           Navigator.push(context, MaterialPageRoute(builder: (_) => const MarketingCampaignScreen()));
        }),
        _buildStrategicCard("Asset Forge", "Print design generator", CupertinoIcons.doc_plaintext, AppColors.accentOrange, () {
           Navigator.push(context, MaterialPageRoute(builder: (_) => const FlyerGeneratorScreen()));
        }),
        _buildStrategicCard("Ops Config", "Email & Notification hub", CupertinoIcons.gear, AppColors.premiumGold, () {
           Navigator.push(context, MaterialPageRoute(builder: (_) => const GlobalEmailSettingsScreen()));
        }),
        _buildStrategicCard("Role Assignment", "Assign user venue roles", CupertinoIcons.shield_fill, AppColors.accentGreen, () {
           _showRoleAssignmentDialog(context);
        }),
      ],
    );
  }

  Widget _buildStrategicCard(String title, String sub, IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.w900, fontSize: 16)),
                  Text(sub, style: const TextStyle(color: AppColors.body, fontSize: 12)),
                ],
              ),
            ),
            const Icon(CupertinoIcons.chevron_right, color: AppColors.tertiary, size: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildCompactSearch() {
    return Container(
      width: 260,
      height: 36,
      decoration: BoxDecoration(
        color: AppColors.secondarySurface,
        borderRadius: BorderRadius.circular(8),
      ),
      child: TextField(
        controller: _searchCtrl,
        style: const TextStyle(color: AppColors.title, fontSize: 13),
        decoration: const InputDecoration(
          hintText: "Quick node search...",
          hintStyle: TextStyle(color: AppColors.tertiary),
          prefixIcon: Icon(CupertinoIcons.search, color: AppColors.tertiary, size: 14),
          border: InputBorder.none,
          contentPadding: EdgeInsets.only(bottom: 12),
        ),
      ),
    );
  }

  Widget _buildVenueListGrid(bool isWide) {
    return StreamBuilder<List<VenueModel>>(
      stream: _venuesService.getAllVenues(),
      builder: (context, snapshot) {
        final query = _searchCtrl.text.toLowerCase();
        final venues = (snapshot.data ?? []).where((v) {
          return v.name.toLowerCase().contains(query) || v.ownerEmail!.toLowerCase().contains(query);
        }).toList();

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: venues.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: isWide ? 3 : 1,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 3.5,
          ),
          itemBuilder: (context, index) => _buildVenueCard(venues[index]),
        );
      },
    );
  }

  Widget _buildVenueCard(VenueModel venue) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.04)),
      ),
      child: ListTile(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => VenueDetailView(venue: venue))),
        leading: Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: AppColors.secondarySurface, borderRadius: BorderRadius.circular(8)),
          child: const Icon(CupertinoIcons.building_2_fill, color: AppColors.premiumGold, size: 18),
        ),
        title: Text(venue.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(venue.ownerEmail ?? 'UNCLAIMED', style: const TextStyle(color: AppColors.body, fontSize: 11)),
        trailing: const Icon(CupertinoIcons.chevron_right, color: AppColors.tertiary, size: 14),
      ),
    );
  }

  Future<void> _approveRequest(VenueRequestModel req) async {
    try {
      if (req.type == 'join') {
        await FirebaseFirestore.instance.collection('users').doc(req.userId).update({
          'venueId': req.targetVenueId,
          'role': 'staff',
        });
      } else if (req.type == 'create') {
        final venueRef = FirebaseFirestore.instance.collection('venues').doc();
        final venue = VenueModel(
          id: venueRef.id,
          name: req.newVenueDetails?['name'] ?? 'New Venue',
          address: req.newVenueDetails?['address'] ?? 'Unknown Address',
          ownerId: req.userId,
          ownerEmail: req.userEmail,
          subscription: VenueSubscription(plan: 'free', isPaid: false),
          isActive: true,
          isManuallyBlocked: false,
        );
        await venueRef.set(venue.toMap());
        await FirebaseFirestore.instance.collection('users').doc(req.userId).update({
           'venueId': venueRef.id,
           'role': 'owner',
        });
      }
      await VenueRepository().updateRequestStatus(req.id, 'approved');
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Signal processed: Approved")));
    } catch (e) {
       if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  Future<void> _rejectRequest(VenueRequestModel req) async {
    try {
      await VenueRepository().updateRequestStatus(req.id, 'rejected');
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Signal processed: Rejected")));
    } catch (e) {
       if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  void _showRoleAssignmentDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => const _RoleAssignmentDialog(),
    );
  }
}

class _RoleAssignmentDialog extends StatefulWidget {
  const _RoleAssignmentDialog({super.key});

  @override
  State<_RoleAssignmentDialog> createState() => _RoleAssignmentDialogState();
}

class _RoleAssignmentDialogState extends State<_RoleAssignmentDialog> {
  String? _selectedVenueId;
  String? _selectedRole = 'staff';
  final TextEditingController _emailCtrl = TextEditingController();
  final TextEditingController _nameCtrl = TextEditingController();
  
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
      final snap = await FirebaseFirestore.instance
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
        setState(() {
          _userFound = false;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error searching user: $e")),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSearching = false;
          _searched = true;
        });
      }
    }
  }

  Future<void> _saveRole() async {
    if (_selectedVenueId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please select a venue")),
      );
      return;
    }
    final email = _emailCtrl.text.trim().toLowerCase();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please enter user email")),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      if (_userFound && _foundUserId != null) {
        // Update existing user
        await FirebaseFirestore.instance.collection('users').doc(_foundUserId).update({
          'venueId': _selectedVenueId,
          'role': _selectedRole,
          'updatedAt': FieldValue.serverTimestamp(),
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("User role assigned successfully")),
          );
          Navigator.pop(context);
        }
      } else {
        // Create new user profile
        final name = _nameCtrl.text.trim();
        if (name.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Please enter a name for the new user")),
          );
          setState(() => _isSaving = false);
          return;
        }

        final newUserRef = FirebaseFirestore.instance.collection('users').doc();
        await newUserRef.set({
          'displayName': name,
          'email': email,
          'role': _selectedRole,
          'venueId': _selectedVenueId,
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("New user profile created and role assigned")),
          );
          Navigator.pop(context);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error saving role: $e")),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        padding: const EdgeInsets.all(24),
        width: 480,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "USER VENUE ROLE ASSIGNMENT",
                style: TextStyle(
                  color: AppColors.premiumGold,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "Assign User Role",
                style: TextStyle(
                  color: AppColors.title,
                  fontWeight: FontWeight.w900,
                  fontSize: 20,
                ),
              ),
              const SizedBox(height: 20),

              // 1. SELECT VENUE
              const Text("1. Select Venue", style: TextStyle(color: AppColors.title, fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 8),
              StreamBuilder<QuerySnapshot>(
                stream: FirebaseFirestore.instance.collection('venues').snapshots(),
                builder: (context, snapshot) {
                  if (!snapshot.hasData) {
                    return const SizedBox(
                      height: 48,
                      child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                    );
                  }
                  final docs = snapshot.data!.docs;
                  return DropdownButtonFormField<String>(
                    dropdownColor: AppColors.surface,
                    value: _selectedVenueId,
                    hint: const Text("Select venue...", style: TextStyle(color: AppColors.tertiary, fontSize: 13)),
                    style: const TextStyle(color: AppColors.title, fontSize: 13),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: AppColors.secondarySurface,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    ),
                    items: docs.map((doc) {
                      final name = doc['name'] ?? 'Unnamed Venue';
                      return DropdownMenuItem(
                        value: doc.id,
                        child: Text(name, style: const TextStyle(color: AppColors.title)),
                      );
                    }).toList(),
                    onChanged: (val) => setState(() => _selectedVenueId = val),
                  );
                },
              ),
              const SizedBox(height: 20),

              // 2. USER EMAIL SEARCH/CREATE
              const Text("2. User Email", style: TextStyle(color: AppColors.title, fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _emailCtrl,
                      style: const TextStyle(color: AppColors.title, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: "Enter user email...",
                        hintStyle: const TextStyle(color: AppColors.tertiary),
                        filled: true,
                        fillColor: AppColors.secondarySurface,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 44,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentGreen,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                      ),
                      onPressed: _isSearching ? null : _searchUser,
                      child: _isSearching
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text("Search", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ),
                ],
              ),
              if (_searched) ...[
                const SizedBox(height: 12),
                if (_userFound)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.accentGreen.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.accentGreen.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(CupertinoIcons.checkmark_circle_fill, color: AppColors.accentGreen, size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            "Found user: $_foundUserName",
                            style: const TextStyle(color: AppColors.title, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  )
                else ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.accentOrange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.accentOrange.withOpacity(0.2)),
                    ),
                    child: const Row(
                      children: [
                        Icon(CupertinoIcons.info_circle_fill, color: AppColors.accentOrange, size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            "User not found. A new profile will be created.",
                            style: TextStyle(color: AppColors.title, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text("New User Name", style: TextStyle(color: AppColors.title, fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _nameCtrl,
                    style: const TextStyle(color: AppColors.title, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: "Enter full name...",
                      hintStyle: const TextStyle(color: AppColors.tertiary),
                      filled: true,
                      fillColor: AppColors.secondarySurface,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ],
              ],
              const SizedBox(height: 20),

              // 3. SELECT ROLE
              const Text("3. Select User Role", style: TextStyle(color: AppColors.title, fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                dropdownColor: AppColors.surface,
                value: _selectedRole,
                style: const TextStyle(color: AppColors.title, fontSize: 13),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: AppColors.secondarySurface,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
                items: const [
                  DropdownMenuItem(value: 'owner', child: Text("OWNER", style: TextStyle(color: AppColors.title))),
                  DropdownMenuItem(value: 'staff', child: Text("STAFF", style: TextStyle(color: AppColors.title))),
                  DropdownMenuItem(value: 'guest', child: Text("GUEST", style: TextStyle(color: AppColors.title))),
                  DropdownMenuItem(value: 'admin', child: Text("ADMIN", style: TextStyle(color: AppColors.title))),
                ],
                onChanged: (val) => setState(() => _selectedRole = val),
              ),
              const SizedBox(height: 32),

              // ACTIONS
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text("CANCEL", style: TextStyle(color: AppColors.tertiary, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                  const SizedBox(width: 16),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentGreen,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                    onPressed: _isSaving ? null : _saveRole,
                    child: _isSaving
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text("ASSIGN ROLE", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
