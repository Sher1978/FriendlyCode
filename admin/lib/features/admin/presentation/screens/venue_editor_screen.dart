
import 'package:flutter/material.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/services/venue_service.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class VenueEditorScreen extends StatefulWidget {
  final VenueModel? venue;

  const VenueEditorScreen({super.key, this.venue});

  @override
  State<VenueEditorScreen> createState() => _VenueEditorScreenState();
}

class _VenueEditorScreenState extends State<VenueEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  final VenuesService _venuesService = VenuesService();

  late TextEditingController _nameCtrl;
  late TextEditingController _ownerEmailCtrl;
  late TextEditingController _ownerIdCtrl;
  late TextEditingController _categoryCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _descCtrl;
  late TextEditingController _logoUrlCtrl;
  late TextEditingController _linkUrlCtrl;

  List<VenueTier> _tiers = [];
  late VenueSubscription _subscription;
  String _defaultLanguage = 'en';
  bool _isSaving = false;

  // RBAC Fields
  String? _selectedAdminId;
  String? _selectedManagerId;
  List<Map<String, dynamic>> _admins = [];
  List<Map<String, dynamic>> _managers = [];

  @override
  void initState() {
    super.initState();
    final roleProvider = Provider.of<RoleProvider>(context, listen: false);
    final isSuperAdmin = roleProvider.currentRole == UserRole.superAdmin;
    final currentUser = AuthService().currentUser;

    _nameCtrl = TextEditingController(text: widget.venue?.name ?? '');
    
    String ownerEmail = widget.venue?.ownerEmail ?? '';
    String ownerId = widget.venue?.ownerId ?? '';

    if (widget.venue == null && !isSuperAdmin && currentUser != null) {
      ownerEmail = currentUser.email ?? '';
      ownerId = currentUser.uid;
    }

    _ownerEmailCtrl = TextEditingController(text: ownerEmail);
    _ownerIdCtrl = TextEditingController(text: ownerId);
    
    _categoryCtrl = TextEditingController(text: widget.venue?.category ?? 'General');
    _addressCtrl = TextEditingController(text: widget.venue?.address ?? '');
    _descCtrl = TextEditingController(text: widget.venue?.description ?? '');
    _logoUrlCtrl = TextEditingController(text: widget.venue?.logoUrl ?? '');
    _linkUrlCtrl = TextEditingController(text: widget.venue?.linkUrl ?? '');
    _tiers = widget.venue?.tiers != null ? List.from(widget.venue!.tiers) : [
      VenueTier(maxHours: 24, percentage: 20),
      VenueTier(maxHours: 72, percentage: 10),
      VenueTier(maxHours: 168, percentage: 5),
    ];

    _subscription = widget.venue?.subscription ?? VenueSubscription(
      plan: 'pro', 
      isPaid: true, 
      expiryDate: DateTime.now().add(const Duration(days: 365))
    );
    _defaultLanguage = widget.venue?.defaultLanguage ?? 'en';

    // Init RBAC selections
    _selectedAdminId = widget.venue?.assignedAdminId;
    _selectedManagerId = widget.venue?.assignedManagerId;

    if (isSuperAdmin || roleProvider.isAdmin) {
      _fetchStaff();
    }
  }

  Future<void> _fetchStaff() async {
    // Fetch Admins
    final adminSnap = await FirebaseFirestore.instance
        .collection('users')
        .where('role', isEqualTo: 'admin')
        .get();
    
    // Fetch Managers
    final managerSnap = await FirebaseFirestore.instance
        .collection('users')
        .where('role', isEqualTo: 'manager')
        .get();

    if (mounted) {
      setState(() {
        _admins = adminSnap.docs.map((d) => {'id': d.id, 'email': d.data()['email']}).toList();
        _managers = managerSnap.docs.map((d) => {'id': d.id, 'email': d.data()['email']}).toList();
      });
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _ownerEmailCtrl.dispose();
    _ownerIdCtrl.dispose();
    _categoryCtrl.dispose();
    _addressCtrl.dispose();
    _descCtrl.dispose();
    _logoUrlCtrl.dispose();
    _linkUrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final updatedVenue = VenueModel(
        id: widget.venue?.id ?? '', // ID handled by service on create
        name: _nameCtrl.text.trim(),
        ownerEmail: _ownerEmailCtrl.text.trim(),
        ownerId: _ownerIdCtrl.text.trim(),
        category: _categoryCtrl.text.trim(),
        address: _addressCtrl.text.trim(),
        description: _descCtrl.text.trim(),
        logoUrl: _logoUrlCtrl.text.trim(),
        linkUrl: _linkUrlCtrl.text.trim(),
        tiers: _tiers,
        subscription: _subscription,
        defaultLanguage: _defaultLanguage,
        assignedAdminId: _selectedAdminId,
        assignedManagerId: _selectedManagerId,
      );

      if (widget.venue == null) {
        await _venuesService.saveVenue(updatedVenue);
      } else {
        await _venuesService.saveVenue(updatedVenue);
      }

      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
     final roleProvider = Provider.of<RoleProvider>(context);
     final isSuperAdmin = roleProvider.isSuperAdmin;
     final isAdmin = roleProvider.isAdmin;

     // ... existing UI structure ...
     // Re-implementing the body with the new fields
     return Scaffold(
       appBar: AppBar(
         title: Text(widget.venue == null ? "New Venue" : "Edit Venue"),
         backgroundColor: AppColors.surface,
         foregroundColor: AppColors.title,
         elevation: 0,
         actions: [
            if (_isSaving)
              const Center(child: Padding(padding: EdgeInsets.only(right: 16), child: CircularProgressIndicator())),
            if (!_isSaving)
              IconButton(onPressed: _save, icon: const Icon(Icons.check)),
         ],
       ),
       body: DefaultTabController(
         length: 3,
         child: Column(
           children: [
             const TabBar(
               labelColor: AppColors.brandOrange,
               unselectedLabelColor: AppColors.title,
               indicatorColor: AppColors.brandOrange,
               tabs: [
                 Tab(text: "Venue Settings"),
                 Tab(text: "Staff & RBAC"),
                 Tab(text: "Discount Strategy"),
               ],
             ),
             Expanded(
               child: Form(
                 key: _formKey,
                 child: TabBarView(
                   children: [
                     // TAB 1: Venue Settings
                     SingleChildScrollView(
                       padding: const EdgeInsets.all(24),
                       child: Column(
                         crossAxisAlignment: CrossAxisAlignment.start,
                         children: [
                           _buildSectionHeader("Basic Info"),
                           _buildTextField(_nameCtrl, "Venue Name", required: true),
                           const SizedBox(height: 16),
                           _buildTextField(_categoryCtrl, "Category"),
                           const SizedBox(height: 16),
                           _buildTextField(_addressCtrl, "Address"),
                           const SizedBox(height: 24),

                           _buildSectionHeader("Ownership"),
                           _buildTextField(_ownerEmailCtrl, "Owner Email"),
                           const SizedBox(height: 16),
                           _buildTextField(_ownerIdCtrl, "Owner ID (Firebase UID)"),
                           const SizedBox(height: 24),

                           _buildSectionHeader("Media"),
                           _buildTextField(_logoUrlCtrl, "Logo URL"),
                           const SizedBox(height: 16),
                           _buildTextField(_linkUrlCtrl, "External Link / Website"),
                         ],
                       ),
                     ),

                     // TAB 2: Staff Settings
                     SingleChildScrollView(
                       padding: const EdgeInsets.all(24),
                       child: Column(
                         crossAxisAlignment: CrossAxisAlignment.start,
                         children: [
                           if (isSuperAdmin || isAdmin) ...[
                             _buildSectionHeader("Staff Assignment"),
                             if (isSuperAdmin) 
                                DropdownButtonFormField<String>(
                                  decoration: const InputDecoration(labelText: "Assigned Admin", border: OutlineInputBorder()),
                                  initialValue: _selectedAdminId,
                                  items: [
                                   const DropdownMenuItem(value: null, child: Text("None")),
                                   ..._admins.map((a) => DropdownMenuItem(value: a['id'] as String, child: Text(a['email'] ?? 'Unknown'))),
                                 ],
                                 onChanged: (val) => setState(() => _selectedAdminId = val),
                               ),
                             const SizedBox(height: 16),
                              DropdownButtonFormField<String>(
                                decoration: const InputDecoration(labelText: "Assigned Manager", border: OutlineInputBorder()),
                                initialValue: _selectedManagerId,
                                items: [
                                  const DropdownMenuItem(value: null, child: Text("None")),
                                  ..._managers.map((m) => DropdownMenuItem(value: m['id'] as String, child: Text(m['email'] ?? 'Unknown'))),
                               ],
                               onChanged: (val) => setState(() => _selectedManagerId = val),
                             ),
                           ] else ...[
                             const Text("Only SuperAdmins and Admins can assign staff roles from this menu.", style: TextStyle(color: AppColors.body)),
                           ]
                         ],
                       ),
                     ),

                     // TAB 3: Discount Settings
                     SingleChildScrollView(
                       padding: const EdgeInsets.all(24),
                       child: Column(
                         crossAxisAlignment: CrossAxisAlignment.start,
                         children: [
                           _buildSectionHeader("Loyalty Rules (Tiers)"),
                           const Text("Configure the max hours a guest can be gone and the percentage they earn.", style: TextStyle(color: Colors.grey, fontSize: 12)),
                           const SizedBox(height: 8),
                           ...List.generate(_tiers.length, (index) {
                             return Padding(
                               padding: const EdgeInsets.only(bottom: 8.0),
                               child: Row(
                                 children: [
                                   Expanded(
                                     child: TextFormField(
                                       initialValue: _tiers[index].maxHours.toString(),
                                       decoration: InputDecoration(labelText: "Max Hours", border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), filled: true, fillColor: Colors.white),
                                       keyboardType: TextInputType.number,
                                       onChanged: (val) {
                                          _tiers[index] = VenueTier(maxHours: int.tryParse(val) ?? 0, percentage: _tiers[index].percentage);
                                       },
                                     ),
                                   ),
                                   const SizedBox(width: 16),
                                   Expanded(
                                     child: TextFormField(
                                       initialValue: _tiers[index].percentage.toString(),
                                       decoration: InputDecoration(labelText: "Percentage (%)", border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)), filled: true, fillColor: Colors.white),
                                       keyboardType: TextInputType.number,
                                       onChanged: (val) {
                                          _tiers[index] = VenueTier(maxHours: _tiers[index].maxHours, percentage: int.tryParse(val) ?? 0);
                                       },
                                     ),
                                   ),
                                   IconButton(
                                     icon: const Icon(Icons.delete, color: Colors.red),
                                     onPressed: () => setState(() => _tiers.removeAt(index)),
                                   )
                                 ],
                               ),
                             );
                           }),
                           if (_tiers.length < 5)
                             TextButton.icon(
                               onPressed: () => setState(() => _tiers.add(VenueTier(maxHours: 0, percentage: 0))),
                               icon: const Icon(Icons.add),
                               label: const Text("Add Tier"),
                             ),
                           const SizedBox(height: 24),

                           _buildSectionHeader("Subscription & Status"),
                           _buildSubscriptionInfo(isSuperAdmin),
                         ],
                       ),
                     ),
                   ],
                 ),
               ),
             ),
           ],
         ),
       ),
     );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.title)),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, {bool required = false}) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.white,
      ),
      validator: required ? (val) => val == null || val.isEmpty ? "Required" : null : null,
    );
  }

  Widget _buildSubscriptionInfo(bool isSuperAdmin) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Plan:", style: TextStyle(fontWeight: FontWeight.bold)),
              if (!isSuperAdmin) Text(_subscription.plan.toUpperCase(), style: const TextStyle(color: AppColors.brandOrange, fontWeight: FontWeight.bold)),
              if (isSuperAdmin)
                DropdownButton<String>(
                  value: _subscription.plan,
                  items: ['free', 'pro', 'enterprise'].map((e) => DropdownMenuItem(value: e, child: Text(e.toUpperCase()))).toList(),
                  onChanged: (val) => setState(() => _subscription = VenueSubscription(plan: val ?? 'free', isPaid: _subscription.isPaid, expiryDate: _subscription.expiryDate)),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Payment Status:", style: TextStyle(fontWeight: FontWeight.bold)),
              if (!isSuperAdmin) Text(_subscription.isPaid ? "PAID" : "UNPAID", style: TextStyle(color: _subscription.isPaid ? Colors.green : Colors.red, fontWeight: FontWeight.bold)),
              if (isSuperAdmin)
                Switch(
                  value: _subscription.isPaid,
                  onChanged: (val) => setState(() => _subscription = VenueSubscription(plan: _subscription.plan, isPaid: val, expiryDate: _subscription.expiryDate)),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Expiry Date:", style: TextStyle(fontWeight: FontWeight.bold)),
              Text(
                _subscription.expiryDate != null ? "${_subscription.expiryDate!.day}/${_subscription.expiryDate!.month}/${_subscription.expiryDate!.year}" : "N/A",
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.body),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
