import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import '../../../../core/theme/colors.dart';

class VenueProfileEditScreen extends StatefulWidget {
  const VenueProfileEditScreen({super.key});

  @override
  State<VenueProfileEditScreen> createState() => _VenueProfileEditScreenState();
}

class _VenueProfileEditScreenState extends State<VenueProfileEditScreen> {
  final _nameCtrl = TextEditingController(text: "Safari Lounge");
  final _descCtrl = TextEditingController(text: "Best cocktails in town.");
  final _hoursCtrl = TextEditingController(text: "10:00 - 02:00");
  final _instaCtrl = TextEditingController(text: "@safari_lounge");

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.editVenueProfile)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Cover Photo Placeholder
            GestureDetector(
              onTap: () {
                // TODO: existing photo upload logic
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(l10n.uploadPhoto)),
                );
              },
              child: Container(
                height: 200,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white24, style: BorderStyle.solid),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.camera_alt, color: Colors.white54, size: 48),
                    const SizedBox(height: 8),
                    Text(l10n.tapToChangeCover, style: const TextStyle(color: Colors.white54)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            _buildInput(l10n.venueName, _nameCtrl, Icons.store),
            const SizedBox(height: 16),
            _buildInput(l10n.description, _descCtrl, Icons.description, maxLines: 3),
            const SizedBox(height: 16),
            _buildInput(l10n.workingHours, _hoursCtrl, Icons.access_time),
            const SizedBox(height: 16),
            _buildInput(l10n.instagram, _instaCtrl, Icons.link),

            const SizedBox(height: 48),

            ElevatedButton(
              onPressed: () {
                // Save Mock
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(l10n.profileUpdated)),
                );
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.lime,
                foregroundColor: AppColors.deepSeaBlueDark,
                minimumSize: const Size(double.infinity, 56),
              ),
              child: Text(l10n.saveChanges),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInput(String label, TextEditingController controller, IconData icon, {int maxLines = 1}) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white70),
        prefixIcon: Icon(icon, color: AppColors.lime),
        filled: true,
        fillColor: Colors.white.withOpacity(0.05),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.white10),
        ),
      ),
    );
  }
}
