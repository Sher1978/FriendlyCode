import 'package:flutter/material.dart';
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
    return Scaffold(
      appBar: AppBar(title: const Text("Edit Venue Profile")),
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
                  const SnackBar(content: Text("Upload Photo Placeholder")),
                );
              },
              child: Container(
                height: 200,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white24, style: BorderStyle.solid),
                ),
                child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.camera_alt, color: Colors.white54, size: 48),
                    SizedBox(height: 8),
                    Text("Tap to change Cover Photo", style: TextStyle(color: Colors.white54)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            _buildInput("Venue Name", _nameCtrl, Icons.store),
            const SizedBox(height: 16),
            _buildInput("Description", _descCtrl, Icons.description, maxLines: 3),
            const SizedBox(height: 16),
            _buildInput("Working Hours", _hoursCtrl, Icons.access_time),
            const SizedBox(height: 16),
            _buildInput("Instagram", _instaCtrl, Icons.link),

            const SizedBox(height: 48),

            ElevatedButton(
              onPressed: () {
                // Save Mock
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Profile Updated Successfully")),
                );
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.lime,
                foregroundColor: AppColors.deepSeaBlueDark,
                minimumSize: const Size(double.infinity, 56),
              ),
              child: const Text("SAVE CHANGES"),
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
        fillColor: Colors.white.withValues(alpha: 0.05),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.white10),
        ),
      ),
    );
  }
}
