import 'package:flutter/material.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/services/venue_service.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:provider/provider.dart';

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
  late TextEditingController _ownerIdCtrl;
  late TextEditingController _categoryCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _descCtrl;
  late TextEditingController _logoUrlCtrl;
  late TextEditingController _linkUrlCtrl;

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.venue?.name ?? '');
    _ownerIdCtrl = TextEditingController(text: widget.venue?.ownerId ?? '');
    _categoryCtrl = TextEditingController(text: widget.venue?.category ?? 'General');
    _addressCtrl = TextEditingController(text: widget.venue?.address ?? '');
    _descCtrl = TextEditingController(text: widget.venue?.description ?? '');
    _logoUrlCtrl = TextEditingController(text: widget.venue?.logoUrl ?? '');
    _linkUrlCtrl = TextEditingController(text: widget.venue?.linkUrl ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
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
      final roleProvider = Provider.of<RoleProvider>(context, listen: false);
      final isSuperAdmin = roleProvider.currentRole == UserRole.superAdmin;

      // If creating new venue and NOT super admin, ownerId should be current user
      String finalOwnerId = _ownerIdCtrl.text;
      if (widget.venue == null && !isSuperAdmin) {
        // This case might not happen if only SuperAdmin creates, 
        // but if Owner starts onboarding, we use their UID.
        finalOwnerId = roleProvider.venueId ?? ''; // Fallback or handle null
      }

      final newVenue = VenueModel(
        id: widget.venue?.id ?? '', // VenuesService handles auto-id if blank or we can generate one
        ownerId: finalOwnerId,
        name: _nameCtrl.text,
        address: _addressCtrl.text,
        category: _categoryCtrl.text,
        description: _descCtrl.text,
        logoUrl: _logoUrlCtrl.text.isNotEmpty ? _logoUrlCtrl.text : null,
        linkUrl: _linkUrlCtrl.text.isNotEmpty ? _linkUrlCtrl.text : null,
        isActive: widget.venue?.isActive ?? true,
        subscriptionEndDate: widget.venue?.subscriptionEndDate,
        isManuallyBlocked: widget.venue?.isManuallyBlocked ?? false,
        lastBlastDate: widget.venue?.lastBlastDate,
        latitude: widget.venue?.latitude,
        longitude: widget.venue?.longitude,
        stats: widget.venue?.stats,
      );

      await _venuesService.saveVenue(newVenue);

      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Venue saved successfully")),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error saving venue: $e")),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final roleProvider = Provider.of<RoleProvider>(context);
    final isSuperAdmin = roleProvider.currentRole == UserRole.superAdmin;
    final isEditing = widget.venue != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? "Edit Venue" : "Create New Venue"),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildSectionTitle("Basic Information"),
              _buildTextField(
                controller: _nameCtrl,
                label: "Venue Name",
                icon: Icons.store,
                validator: (val) => val == null || val.isEmpty ? "Name is required" : null,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _categoryCtrl,
                label: "Category",
                icon: Icons.category,
              ),
              const SizedBox(height: 16),
              if (isSuperAdmin) ...[
                _buildTextField(
                  controller: _ownerIdCtrl,
                  label: "Owner User ID",
                  icon: Icons.person,
                  hint: "UID from users collection",
                  validator: (val) => val == null || val.isEmpty ? "Owner ID is required" : null,
                ),
                const SizedBox(height: 16),
              ],
              _buildTextField(
                controller: _addressCtrl,
                label: "Address",
                icon: Icons.location_on,
              ),
              const SizedBox(height: 24),
              
              _buildSectionTitle("Content & Branding"),
              _buildTextField(
                controller: _descCtrl,
                label: "Description",
                icon: Icons.description,
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _logoUrlCtrl,
                label: "Logo Image URL",
                icon: Icons.image,
                hint: "https://example.com/logo.png",
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _linkUrlCtrl,
                label: "Website / Social Link",
                icon: Icons.link,
                hint: "https://instagram.com/venue",
              ),
              const SizedBox(height: 48),

              ElevatedButton(
                onPressed: _isSaving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.lime,
                  foregroundColor: AppColors.deepSeaBlueDark,
                  minimumSize: const Size(double.infinity, 56),
                ),
                child: _isSaving 
                  ? const CircularProgressIndicator()
                  : Text(isEditing ? "UPDATE VENUE" : "CREATE VENUE"),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(
        title,
        style: const TextStyle(
          color: AppColors.lime,
          fontWeight: FontWeight.bold,
          fontSize: 16,
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    String? hint,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon, color: AppColors.lime),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
