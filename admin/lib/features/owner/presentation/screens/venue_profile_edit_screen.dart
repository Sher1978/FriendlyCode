import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/widgets/image_upload_widget.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/services/venue_service.dart';
import 'package:friendly_code/core/auth/role_provider.dart';

class VenueProfileEditScreen extends StatefulWidget {
  final VenueModel? venue;
  const VenueProfileEditScreen({super.key, this.venue});

  @override
  State<VenueProfileEditScreen> createState() => _VenueProfileEditScreenState();
}

class _VenueProfileEditScreenState extends State<VenueProfileEditScreen> {
  late TextEditingController _nameCtrl;
  late TextEditingController _descCtrl;
  late TextEditingController _hoursCtrl;
  late TextEditingController _instaCtrl;
  String _selectedLanguage = 'en';
  String? _bannerImageUrl;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.venue?.name ?? "Safari Lounge");
    _descCtrl = TextEditingController(text: widget.venue?.description ?? "Best cocktails in town.");
    _hoursCtrl = TextEditingController(text: "10:00 - 02:00");
    _instaCtrl = TextEditingController(text: "@safari_lounge");
    _selectedLanguage = widget.venue?.defaultLanguage ?? 'en';

    if (widget.venue == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadVenue());
    }
  }

  Future<void> _loadVenue() async {
    final roleProvider = Provider.of<RoleProvider>(context, listen: false);
    if (roleProvider.venueIds.isNotEmpty) {
      final vId = roleProvider.venueIds.first;
      final venue = await VenuesService().getVenueById(vId);
      if (venue != null && mounted) {
        setState(() {
          _nameCtrl.text = venue.name;
          _descCtrl.text = venue.description;
          _selectedLanguage = venue.defaultLanguage;
        });
      }
    }
  }

  Future<void> _saveChanges() async {
    setState(() => _isSaving = true);
    try {
      final roleProvider = Provider.of<RoleProvider>(context, listen: false);
      final vId = widget.venue?.id ?? (roleProvider.venueIds.isNotEmpty ? roleProvider.venueIds.first : null);
      if (vId != null && vId.isNotEmpty) {
        await FirebaseFirestore.instance.collection('venues').doc(vId).set({
          'name': _nameCtrl.text.trim(),
          'description': _descCtrl.text.trim(),
          'defaultLanguage': _selectedLanguage,
        }, SetOptions(merge: true));
      }
      if (mounted) {
        showCupertinoDialog(
          context: context,
          builder: (dialogCtx) => CupertinoAlertDialog(
            title: const Text("Success"),
            content: Text(AppLocalizations.of(context)!.profileUpdated),
            actions: [
              CupertinoDialogAction(
                child: const Text("OK"),
                onPressed: () {
                  Navigator.pop(dialogCtx);
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint("Error saving profile: $e");
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.chevron_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(l10n.editVenueProfile, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 700),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Venue Identity",
                  style: TextStyle(
                    color: AppColors.macosTextPrimary,
                    fontSize: 34,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -1,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  "Customize how your guests see your establishment in the portal.",
                  style: TextStyle(
                    color: AppColors.macosTextSecondary.withOpacity(0.7),
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 48),

                _buildGlassContainer(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Banner Image Upload
                      const Text(
                        "COVER PHOTO",
                        style: TextStyle(
                          color: AppColors.accentOrange,
                          fontWeight: FontWeight.w800,
                          fontSize: 11,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: ImageUploadWidget(
                          label: l10n.tapToChangeCover,
                          path: "venues/covers/safari_lounge",
                          onUploadComplete: (url) => setState(() => _bannerImageUrl = url),
                        ),
                      ),
                      const SizedBox(height: 40),

                      _buildField(l10n.venueName, _nameCtrl, "e.g. My Awesome Bar", icon: CupertinoIcons.shopping_cart),
                      const SizedBox(height: 24),
                      _buildField(l10n.description, _descCtrl, "Tell guests about your place...", icon: CupertinoIcons.text_quote, maxLines: 3),
                      const SizedBox(height: 24),
                      
                      Row(
                        children: [
                          Expanded(child: _buildField(l10n.workingHours, _hoursCtrl, "10:00 - 22:00", icon: CupertinoIcons.clock)),
                          const SizedBox(width: 20),
                          Expanded(child: _buildField("Instagram", _instaCtrl, "@your_handle", icon: CupertinoIcons.link)),
                        ],
                      ),
                      
                      const SizedBox(height: 40),
                      
                      // Language Selector
                      const Text(
                        "PORTAL LANGUAGE / ЯЗЫК ПО УМОЛЧАНИЮ",
                        style: TextStyle(
                          color: AppColors.accentOrange,
                          fontWeight: FontWeight.w800,
                          fontSize: 11,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.macosDivider),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedLanguage,
                            dropdownColor: AppColors.macosSurfaceBg,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            icon: const Icon(CupertinoIcons.chevron_down, color: AppColors.macosTextSecondary, size: 14),
                            onChanged: (val) => setState(() => _selectedLanguage = val!),
                            items: const [
                              DropdownMenuItem(value: 'en', child: Text("English")),
                              DropdownMenuItem(value: 'ru', child: Text("Русский")),
                              DropdownMenuItem(value: 'vi', child: Text("Tiếng Việt")),
                              DropdownMenuItem(value: 'ar', child: Text("العربية")),
                            ],
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 48),

                      SizedBox(
                        width: double.infinity,
                        child: CupertinoButton.filled(
                          onPressed: _isSaving ? null : _saveChanges,
                          borderRadius: BorderRadius.circular(10),
                          child: _isSaving
                              ? const CupertinoActivityIndicator()
                              : Text(l10n.saveChanges.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGlassContainer({required Widget child}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppColors.macosRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: AppColors.macosSurfaceBg,
            borderRadius: BorderRadius.circular(AppColors.macosRadius),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: child,
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller, String hint, {IconData? icon, int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            if (icon != null) ...[Icon(icon, size: 14, color: AppColors.macosTextSecondary), const SizedBox(width: 8)],
            Text(
              label,
              style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        const SizedBox(height: 10),
        CupertinoTextField(
          controller: controller,
          maxLines: maxLines,
          placeholder: hint,
          placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.2), fontSize: 14),
          style: const TextStyle(color: Colors.white, fontSize: 14),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.2),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.macosDivider),
          ),
        ),
      ],
    );
  }
}
