import 'package:flutter/material.dart';
import 'package:friendly_code/features/web/presentation/pages/b2c_home_screen.dart';
import 'package:friendly_code/features/web/presentation/pages/lead_capture_screen.dart';
import 'package:friendly_code/features/web/presentation/pages/thank_you_screen.dart';
import 'package:friendly_code/features/web/presentation/pages/b2b_landing_screen.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';

class WebPreviewCatalog extends StatefulWidget {
  const WebPreviewCatalog({super.key});

  @override
  State<WebPreviewCatalog> createState() => _WebPreviewCatalogState();
}

class _WebPreviewCatalogState extends State<WebPreviewCatalog> {
  int _currentIndex = 0;

  final List<Map<String, dynamic>> _screens = [
    {'name': '1. B2C Home (The Hook)', 'widget': const B2CHomeScreen()},
    {
      'name': '2. Lead Capture', 
      'widget': const LeadCaptureScreen(
        venueId: 'test_venue_id', 
        currentDiscount: 5,
        tiers: [],
        config: LoyaltyConfig(),
        timezone: 'Etc/GMT-3',
      )
    },
    {
      'name': '3. Thank You', 
      'widget': const ThankYouScreen(
        venueId: 'test_venue_id', 
        currentDiscount: 15, 
        guestName: 'Preview Guest',
        tiers: [],
        config: LoyaltyConfig(),
      )
    },
    {'name': '4. B2B Landing (Desktop/Mobile)', 'widget': const B2BLandingScreen()},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Friendly Code: Web Mockups'),
        backgroundColor: AppColors.brandBrown,
        foregroundColor: Colors.white,
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: DropdownButton<int>(
              value: _currentIndex,
              dropdownColor: AppColors.brandBrown,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              underline: const SizedBox(),
              items: List.generate(_screens.length, (index) {
                return DropdownMenuItem(
                  value: index,
                  child: Text(_screens[index]['name']),
                );
              }),
              onChanged: (value) {
                if (value != null) setState(() => _currentIndex = value);
              },
            ),
          ),
        ],
      ),
      body: _screens[_currentIndex]['widget'],
    );
  }
}
