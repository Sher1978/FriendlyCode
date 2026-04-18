import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/services/venue_service.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/l10n/app_localizations.dart';

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
  late TextEditingController _categoryCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _descCtrl;
  late TextEditingController _googleMapsUrlCtrl;

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final roleProvider = Provider.of<RoleProvider>(context, listen: false);
    final isSuperAdmin = roleProvider.currentRole == UserRole.superAdmin;
    final currentUser = AuthService().currentUser;

    _nameCtrl = TextEditingController(text: widget.venue?.name ?? '');
    
    String ownerEmail = widget.venue?.ownerEmail ?? '';
    if (widget.venue == null && !isSuperAdmin && currentUser != null) {
      ownerEmail = currentUser.email ?? '';
    }

    _ownerEmailCtrl = TextEditingController(text: ownerEmail);
    _categoryCtrl = TextEditingController(text: widget.venue?.category ?? 'General');
    _addressCtrl = TextEditingController(text: widget.venue?.address ?? '');
    _descCtrl = TextEditingController(text: widget.venue?.description ?? '');
    _googleMapsUrlCtrl = TextEditingController(text: widget.venue?.googleMapsUrl ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _ownerEmailCtrl.dispose();
    _categoryCtrl.dispose();
    _addressCtrl.dispose();
    _descCtrl.dispose();
    _googleMapsUrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    try {
      final updatedVenue = (widget.venue ?? VenueModel(
        id: '',
        name: '',
        ownerId: AuthService().currentUser?.uid ?? '',
        ownerEmail: '',
        address: '',
        description: '',
        category: '',
        isActive: false,
        createdAt: DateTime.now(),
      )).copyWith(
        name: _nameCtrl.text,
        ownerEmail: _ownerEmailCtrl.text,
        category: _categoryCtrl.text,
        address: _addressCtrl.text,
        description: _descCtrl.text,
        googleMapsUrl: _googleMapsUrlCtrl.text,
      );

      if (widget.venue == null) {
        await _venuesService.createVenue(updatedVenue);
      } else {
        await _venuesService.updateVenue(updatedVenue);
      }

      if (mounted) {
        showCupertinoDialog(
          context: context,
          builder: (ctx) => CupertinoAlertDialog(
            title: const Text("Success"),
            content: const Text("Venue details saved successfully."),
            actions: [
              CupertinoDialogAction(
                child: const Text("OK"), 
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context);
                }
              ),
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint("Error saving venue: $e");
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isSaving) return const Center(child: CupertinoActivityIndicator(radius: 12));

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.chevron_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.venue == null ? "Register Venue" : "Edit Venue",
                    style: const TextStyle(
                      color: AppColors.macosTextPrimary,
                      fontSize: 34,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -1.0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "Provide basic information about your establishment.",
                    style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 16),
                  ),
                  const SizedBox(height: 48),

                  _buildGlassSection(
                    title: "IDENTITY",
                    children: [
                      _buildCupertinoField("Venue Name", _nameCtrl, placeholder: "e.g. Skyline Lounge"),
                      _buildCupertinoField("Owner Email", _ownerEmailCtrl, placeholder: "owner@example.com"),
                      _buildCupertinoField("Category", _categoryCtrl, placeholder: "e.g. Bar, Cafe, Restaurant"),
                    ],
                  ),

                  const SizedBox(height: 32),

                  _buildGlassSection(
                    title: "LOCATION & DETAILS",
                    children: [
                      _buildCupertinoField("Physical Address", _addressCtrl, placeholder: "Street, City, Country"),
                      _buildCupertinoField("Google Maps Link", _googleMapsUrlCtrl, placeholder: "https://maps.google.com/..."),
                      _buildCupertinoField("Description", _descCtrl, placeholder: "Briefly describe your venue", maxLines: 3),
                    ],
                  ),

                  const SizedBox(height: 48),

                  SizedBox(
                    width: double.infinity,
                    child: CupertinoButton.filled(
                      onPressed: _save,
                      borderRadius: BorderRadius.circular(10),
                      child: const Text("SUBMIT DETAILS", style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGlassSection({required String title, required List<Widget> children}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 12, bottom: 12),
          child: Text(
            title,
            style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
          ),
        ),
        ClipRRect(
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
              child: Column(children: children),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCupertinoField(String label, TextEditingController controller, {String? placeholder, int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          CupertinoTextField(
            controller: controller,
            placeholder: placeholder,
            placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.2), fontSize: 14),
            style: const TextStyle(color: Colors.white, fontSize: 14),
            padding: const EdgeInsets.all(16),
            maxLines: maxLines,
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.macosDivider),
            ),
          ),
        ],
      ),
    );
  }
}
