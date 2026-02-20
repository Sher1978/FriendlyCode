
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
        await _venuesService.createVenue(updatedVenue);
      } else {
        await _venuesService.updateVenue(updatedVenue);
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
       body: SingleChildScrollView(
         padding: const EdgeInsets.all(24),
         child: Form(
           key: _formKey,
           child: Column(
             crossAxisAlignment: CrossAxisAlignment.start,
             children: [
               // Basic Info Section
               _buildSectionHeader("Basic Info"),
               _buildTextField(_nameCtrl, "Venue Name", required: true),
               const SizedBox(height: 16),
               
               // RBAC ASSIGNMENT (Only for SuperAdmin/Admin)
               if (isSuperAdmin || isAdmin) ...[
                 _buildSectionHeader("Staff Assignment"),
                 if (isSuperAdmin) 
                   DropdownButtonFormField<String>(
                     decoration: const InputDecoration(labelText: "Assigned Admin", border: OutlineInputBorder()),
                     value: _selectedAdminId,
                     items: [
                       const DropdownMenuItem(value: null, child: Text("None")),
                       ..._admins.map((a) => DropdownMenuItem(value: a['id'] as String, child: Text(a['email'] ?? 'Unknown'))),
                     ],
                     onChanged: (val) => setState(() => _selectedAdminId = val),
                   ),
                 const SizedBox(height: 16),
                 DropdownButtonFormField<String>(
                   decoration: const InputDecoration(labelText: "Assigned Manager", border: OutlineInputBorder()),
                   value: _selectedManagerId,
                   items: [
                      const DropdownMenuItem(value: null, child: Text("None")),
                      ..._managers.map((m) => DropdownMenuItem(value: m['id'] as String, child: Text(m['email'] ?? 'Unknown'))),
                   ],
                   onChanged: (val) => setState(() => _selectedManagerId = val),
                 ),
                 const SizedBox(height: 24),
               ],

               _buildTextField(_categoryCtrl, "Category"),
               const SizedBox(height: 16),
               _buildTextField(_addressCtrl, "Address"),
               const SizedBox(height: 24),

               // Owner Info (Read-only for non-SuperAdmin usually, but editable here for flexibility)
               _buildSectionHeader("Ownership"),
               _buildTextField(_ownerEmailCtrl, "Owner Email"),
               const SizedBox(height: 16),
               _buildTextField(_ownerIdCtrl, "Owner ID (Firebase UID)"),
               const SizedBox(height: 24),

               // Links & Media
               _buildSectionHeader("Media"),
               _buildTextField(_logoUrlCtrl, "Logo URL"),
               const SizedBox(height: 16),
               _buildTextField(_linkUrlCtrl, "External Link / Website"),
             ],
           ),
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
}
