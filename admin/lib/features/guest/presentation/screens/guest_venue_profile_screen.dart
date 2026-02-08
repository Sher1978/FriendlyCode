import 'package:flutter/material.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/models/venue_model.dart';
import 'success_screen.dart'; // Or Validator trigger logic
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class GuestVenueProfileScreen extends StatelessWidget {
  final VenueModel venue;

  const GuestVenueProfileScreen({super.key, required this.venue});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimaryLight),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const CircleAvatar(
               backgroundColor: AppColors.backgroundAltLight,
               radius: 18,
               child: Icon(Icons.person, color: AppColors.textPrimaryLight, size: 20),
            ),
            onPressed: () {
               // Open Settings Bottom Sheet
               _showProfileSettings(context);
            },
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
             // Friendly Header
             Text(
               "Hey, great to have you back at ${venue.name}! ☀️",
               style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                 fontSize: 28,
                 height: 1.2,
                 letterSpacing: -0.5,
               ),
             ),
             const SizedBox(height: 32),

             // Perk Reminder Card
             Container(
               padding: const EdgeInsets.all(24),
               decoration: BoxDecoration(
                 color: AppColors.backgroundAltLight,
                 borderRadius: BorderRadius.circular(24),
               ),
               child: Column(
                 crossAxisAlignment: CrossAxisAlignment.start,
                 children: [
                   Text(
                     "Here’s your loyalty perk reminder :",
                     style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                   ),
                   const SizedBox(height: 20),
                   _buildPerkRow(context, "🔥", "Visit tomorrow", "20% OFF"),
                   const SizedBox(height: 12),
                   _buildPerkRow(context, "✨", "Visit within 3 days", "15% OFF"),
                   const SizedBox(height: 12),
                   _buildPerkRow(context, "🌿", "Visit in next 10 days", "10% OFF"),
                   const SizedBox(height: 12),
                   _buildPerkRow(context, "☕️", "Visit anytime after", "5% OFF"),
                   
                   const SizedBox(height: 24),
                   Text(
                     "(Minimum spend ₹150 per visit applies)",
                     style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 12, color: AppColors.textSecondaryLight),
                   ),
                 ],
               ),
             ),
             
             const SizedBox(height: 32),
             
             // GET DISCOUNT Button
             SizedBox(
               width: double.infinity,
               height: 56,
               child: ElevatedButton(
                 onPressed: () {
                    // Trigger Discount Logic / Navigate to "Gold Ticket"
                    // For now, go to SuccessScreen as demo
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => SuccessScreen(guestName: "Guest", discountPercent: 20)),
                    );
                 },
                 style: ElevatedButton.styleFrom(
                   backgroundColor: AppColors.textPrimaryLight, // #111518
                   foregroundColor: Colors.white,
                   elevation: 0,
                   shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                 ),
                 child: const Text("GET REWARD", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
               ),
             ),

             const SizedBox(height: 32),

             // Footer Message
             Text(
               "Until next time — stay safe, stay happy and have a good life! 😄☕️💛",
               style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                 color: AppColors.textSecondaryLight,
                 height: 1.5,
               ),
               textAlign: TextAlign.center,
             ),
             const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildPerkRow(BuildContext context, String icon, String condition, String offer) {
    return Row(
      children: [
        Text(icon, style: const TextStyle(fontSize: 18)),
        const SizedBox(width: 12),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontSize: 15),
              children: [
                TextSpan(text: "$condition → "),
                TextSpan(text: "$offer your total bill", style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showProfileSettings(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Settings", style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 24),
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: const Text("Edit Name"),
              onTap: () {},
            ),
            ListTile(
              leading: const Icon(Icons.notifications_outlined),
              title: const Text("Notifications"),
              trailing: Switch(value: true, onChanged: (v) {}),
            ),
            ListTile(
              leading: const Icon(Icons.dark_mode_outlined),
              title: const Text("Dark Mode"),
              trailing: Switch(value: false, onChanged: (v) {}),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

