import 'package:flutter/material.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/models/venue_model.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class GuestVenueProfileScreen extends StatelessWidget {
  final VenueModel venue;

  const GuestVenueProfileScreen({super.key, required this.venue});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Header with Parallax-like Effect
          SliverAppBar(
            expandedHeight: 250,
            pinned: true,
            backgroundColor: AppColors.deepSeaBlue,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(venue.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Container(color: Colors.grey[800]), // Placeholder for Image
                  const Center(child: Icon(Icons.store, size: 64, color: Colors.white24)),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, AppColors.deepSeaBlueDark.withValues(alpha: 0.9)],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   // My Status Card
                   Container(
                     padding: const EdgeInsets.all(24),
                     decoration: BoxDecoration(
                       gradient: const LinearGradient(
                         colors: [AppColors.lime, Color(0xFFD4FF55)],
                         begin: Alignment.topLeft,
                         end: Alignment.bottomRight,
                       ),
                       borderRadius: BorderRadius.circular(24),
                       boxShadow: [
                         BoxShadow(color: AppColors.lime.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 10)),
                       ],
                     ),
                     child: Column(
                       children: [
                         const Text("YOUR CURRENT STATUS", style: TextStyle(color: AppColors.deepSeaBlueDark, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                         const SizedBox(height: 8),
                         const Text("20%", style: TextStyle(color: AppColors.deepSeaBlueDark, fontSize: 64, fontWeight: FontWeight.w900, height: 1)),
                         const SizedBox(height: 8),
                         Container(
                           padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                           decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(20)),
                           child: const Text("Expires in 12h 30m", style: TextStyle(color: AppColors.deepSeaBlueDark, fontWeight: FontWeight.bold)),
                         ),
                       ],
                     ),
                   ),
                   const SizedBox(height: 32),

                   // Info
                   Text("Description", style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
                   const SizedBox(height: 8),
                   Text(venue.description, style: const TextStyle(color: Colors.white70, height: 1.5)),
                   
                   const SizedBox(height: 24),
                   
                   // Links
                   Row(
                     children: [
                       _buildLinkBtn(Icons.map, "Route"),
                       const SizedBox(width: 16),
                       _buildLinkBtn(FontAwesomeIcons.instagram, "Instagram"),
                     ],
                   ),

                   const SizedBox(height: 48),
                   
                   // Discount Rules Timeline
                   Text("Discount Rules", style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
                   const SizedBox(height: 24),
                   
                   // Mock Tiers Visualization
                   _buildTierItem("0 - 24h", "20%", true),
                   _buildTierConnector(true),
                   _buildTierItem("24 - 48h", "15%", false),
                   _buildTierConnector(false),
                   _buildTierItem("2 - 10 Days", "10%", false),
                   _buildTierConnector(false),
                   _buildTierItem("> 10 Days", "5%", false),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLinkBtn(IconData icon, String label) {
    return Expanded(
      child: OutlinedButton.icon(
        onPressed: () {},
        icon: Icon(icon, size: 18),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: const BorderSide(color: Colors.white24),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }

  Widget _buildTierItem(String time, String discount, bool isActive) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isActive ? AppColors.lime : Colors.white10,
            shape: BoxShape.circle,
            border: Border.all(color: isActive ? AppColors.lime : Colors.transparent, width: 2),
          ),
          child: Center(
            child: isActive 
              ? const Icon(Icons.check, size: 20, color: AppColors.deepSeaBlueDark)
              : Text(discount, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(width: 16),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(discount, style: TextStyle(color: isActive ? AppColors.lime : Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            Text(time, style: const TextStyle(color: Colors.white54, fontSize: 12)),
          ],
        ),
      ],
    );
  }

  Widget _buildTierConnector(bool isActive) {
    return Container(
      margin: const EdgeInsets.only(left: 19),
      height: 30,
      width: 2,
      color: isActive ? AppColors.lime : Colors.white10,
    );
  }
}
