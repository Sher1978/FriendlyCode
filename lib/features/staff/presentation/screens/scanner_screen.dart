import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../../core/theme/colors.dart';
import 'guest_profile_screen.dart';

class StaffScannerScreen extends StatefulWidget {
  const StaffScannerScreen({super.key});

  @override
  State<StaffScannerScreen> createState() => _StaffScannerScreenState();
}

class _StaffScannerScreenState extends State<StaffScannerScreen> {
  bool _isScanning = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Staff Scanner")),
      body: Stack(
        children: [
          MobileScanner(
            onDetect: (capture) {
              if (!_isScanning) return;
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                if (barcode.rawValue != null) {
                  _onScanSuccess(barcode.rawValue!);
                  break; // Only handle the first code
                }
              }
            },
          ),
          
          // Overlay
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.lime, width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: Text(
                  "Scan Guest QR",
                  style: TextStyle(color: AppColors.lime, backgroundColor: Colors.black54),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _onScanSuccess(String code) {
    setState(() => _isScanning = false);
    // Code format expected: "https://app.friendlycode.com/scan?venue=123" OR just "venue=123&user=456"
    // For MVP/Mock, we assume any code is valid.
    
    // Simulate lookup delay
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const GuestProfileScreen(
              guestName: "Sher (Mock)",
              lastVisitHours: 20, // Should trigger 20%
            ),
          ),
        );
      }
    });
  }
}
