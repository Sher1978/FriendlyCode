import 'package:flutter/material.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/models/scan_model.dart';
import '../../../../core/data/scan_repository.dart';

class ValidatorScreen extends StatefulWidget {
  const ValidatorScreen({super.key});

  @override
  State<ValidatorScreen> createState() => _ValidatorScreenState();
}

class _ValidatorScreenState extends State<ValidatorScreen> {
  final ScanRepository _scanRepo = ScanRepository();
  final String _venueId = "1"; // Demo Venue ID

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.deepSeaBlueDark,
      appBar: AppBar(
        title: const Text("Waiter Validator"),
        backgroundColor: AppColors.deepSeaBlue,
      ),
      body: StreamBuilder<List<ScanModel>>(
        stream: _scanRepo.getPendingScansStream(_venueId),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text("Error: ${snapshot.error}", style: const TextStyle(color: Colors.red)));
          }
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppColors.lime));
          }

          final scans = snapshot.data ?? [];

          if (scans.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.qr_code_2, size: 64, color: Colors.white10),
                  SizedBox(height: 16),
                  Text("No Pending Scans", style: TextStyle(color: Colors.white24)),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: scans.length,
            itemBuilder: (context, index) {
              final scan = scans[index];
              return _buildScanCard(scan);
            },
          );
        },
      ),
    );
  }

  Widget _buildScanCard(ScanModel scan) {
    return Dismissible(
      key: Key(scan.id),
      background: Container(
        color: Colors.red,
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(left: 20),
        child: const Icon(Icons.cancel, color: Colors.white),
      ),
      secondaryBackground: Container(
        color: Colors.green,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.check, color: Colors.white),
      ),
      confirmDismiss: (direction) async {
        if (direction == DismissDirection.startToEnd) {
             await _scanRepo.updateScanStatus(scan.id, 'rejected');
             return true;
        } else {
             await _scanRepo.updateScanStatus(scan.id, 'confirmed');
             return true;
        }
      },
      onDismissed: (direction) {
        String action = direction == DismissDirection.startToEnd ? "Rejected" : "Confirmed";
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Guest $action")));
      },
      child: Card(
        color: AppColors.deepSeaBlueLight,
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              const CircleAvatar(
                backgroundColor: Colors.white10,
                child: Icon(Icons.person, color: Colors.white),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      scan.guestName,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    Text(
                      "Requested now",
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 12),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.lime.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.lime),
                ),
                child: Text(
                  "${scan.applicableDiscount}%",
                  style: const TextStyle(color: AppColors.lime, fontWeight: FontWeight.bold, fontSize: 20),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

