
import 'package:friendly_code/l10n/app_localizations.dart';
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
      startDate: DateTime.now(),
      expiryDate: DateTime.now().add(const Duration(days: 365))
    );
    _defaultLanguage = widget.venue?.defaultLanguage ?? 'en';
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
        assignedAdminId: widget.venue?.assignedAdminId,
        assignedManagerId: widget.venue?.assignedManagerId,
      );

      if (widget.venue == null) {
        await _venuesService.saveVenue(updatedVenue);
      } else {
        await _venuesService.saveVenue(updatedVenue);
      }

      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("${AppLocalizations.of(context)!.errorLabel} $e")));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
     final roleProvider = Provider.of<RoleProvider>(context);
     final isSuperAdmin = roleProvider.isSuperAdmin;
     final l10n = AppLocalizations.of(context)!;

     // ... existing UI structure ...
     // Re-implementing the body with the new fields
     return Scaffold(
       appBar: AppBar(
         title: Text(widget.venue == null ? l10n.newVenue : l10n.editVenue),
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
       body: Form(
         key: _formKey,
         child: SingleChildScrollView(
           padding: const EdgeInsets.all(24),
           child: Column(
             crossAxisAlignment: CrossAxisAlignment.start,
             children: [
               _buildSectionHeader(l10n.sectionBasicInfo),
               _buildTextField(_nameCtrl, l10n.labelVenueName, required: true),
               const SizedBox(height: 16),
               _buildTextField(_categoryCtrl, l10n.labelCategory),
               const SizedBox(height: 16),
               _buildTextField(_addressCtrl, l10n.labelAddress),
               const SizedBox(height: 24),

               _buildSectionHeader(l10n.sectionOwnership),
               _buildTextField(_ownerEmailCtrl, l10n.labelOwnerEmail),
               const SizedBox(height: 16),
               _buildTextField(_ownerIdCtrl, l10n.labelOwnerId),
               const SizedBox(height: 24),

               _buildSectionHeader(l10n.sectionMedia),
               _buildTextField(_logoUrlCtrl, l10n.labelLogoUrl),
               const SizedBox(height: 16),
               _buildTextField(_linkUrlCtrl, l10n.labelExternalLink),
               const SizedBox(height: 24),

               _buildSectionHeader(l10n.sectionSubscriptionStatus),
               _buildSubscriptionInfo(isSuperAdmin, l10n),
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
      validator: required ? (val) => val == null || val.isEmpty ? AppLocalizations.of(context)!.required : null : null,
    );
  }

  Widget _buildSubscriptionInfo(bool isSuperAdmin, AppLocalizations l10n) {
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
              Text(l10n.labelPlan, style: const TextStyle(fontWeight: FontWeight.bold)),
              if (!isSuperAdmin) Text(_subscription.plan.toUpperCase(), style: const TextStyle(color: AppColors.brandOrange, fontWeight: FontWeight.bold)),
              if (isSuperAdmin)
                DropdownButton<String>(
                  value: _subscription.plan,
                  items: ['free', 'pro', 'enterprise'].map((e) => DropdownMenuItem(value: e, child: Text(e.toUpperCase()))).toList(),
                  onChanged: (val) => setState(() => _subscription = VenueSubscription(plan: val ?? 'free', isPaid: _subscription.isPaid, startDate: _subscription.startDate, expiryDate: _subscription.expiryDate)),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(l10n.labelPaymentStatus, style: const TextStyle(fontWeight: FontWeight.bold)),
              if (!isSuperAdmin) Text(_subscription.isPaid ? l10n.planPaid : l10n.planUnpaid, style: TextStyle(color: _subscription.isPaid ? Colors.green : Colors.red, fontWeight: FontWeight.bold)),
              if (isSuperAdmin)
                Switch(
                  value: _subscription.isPaid,
                  onChanged: (val) => setState(() => _subscription = VenueSubscription(plan: _subscription.plan, isPaid: val, startDate: _subscription.startDate, expiryDate: _subscription.expiryDate)),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(l10n.labelExpiryDate, style: const TextStyle(fontWeight: FontWeight.bold)),
              Text(
                _subscription.expiryDate != null ? "${_subscription.expiryDate!.day}/${_subscription.expiryDate!.month}/${_subscription.expiryDate!.year}" : l10n.notSet,
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.body),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
