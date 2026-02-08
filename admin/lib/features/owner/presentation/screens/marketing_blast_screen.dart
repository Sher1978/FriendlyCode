import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import '../../../../core/theme/colors.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../../core/data/venue_repository.dart';
import '../../../../core/models/venue_model.dart';

class MarketingBlastScreen extends StatefulWidget {
  final String venueId;
  const MarketingBlastScreen({super.key, required this.venueId});

  @override
  State<MarketingBlastScreen> createState() => _MarketingBlastScreenState();
}

class _MarketingBlastScreenState extends State<MarketingBlastScreen> {
  final _messageController = TextEditingController();
  final VenueRepository _venueRepo = VenueRepository();
  bool _isLoading = true;
  bool _canSend = true;
  String? _cooldownMessage;
  
  // Mock Audience Size 
  final int _curentAudienceSize = 142; 

  @override
  void initState() {
    super.initState();
    _checkEligibility();
  }

  Future<void> _checkEligibility() async {
    final venue = await _venueRepo.getVenueById(widget.venueId);
    if (venue != null && venue.lastBlastDate != null) {
      final diff = DateTime.now().difference(venue.lastBlastDate!).inDays;
      if (diff < 7) {
        if (mounted) {
          setState(() {
            _canSend = false;
            _cooldownMessage = "You can send your next blast in ${7 - diff} days.";
            _isLoading = false;
          });
        }
        return;
      }
    }
    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  } 

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.marketingTitle)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Audience Stat Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.deepSeaBlueLight,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Container(
                     padding: const EdgeInsets.all(12),
                     decoration: const BoxDecoration(
                       color: AppColors.lime,
                       shape: BoxShape.circle,
                     ),
                     child: const Icon(Icons.people, color: AppColors.deepSeaBlue, size: 32),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "REACHABLE GUESTS",
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.white70),
                      ),
                      Text(
                        "$_curentAudienceSize",
                        style: Theme.of(context).textTheme.displayMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            Text(
              "Compose Message",
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "Send a special offer to bring them back. Keep it short & friendly!",
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
            ),
            const SizedBox(height: 16),

            TextField(
              controller: _messageController,
              maxLines: 5,
              decoration: InputDecoration(
                hintText: "Hey! We miss you. Show this message for a free coffee with your next meal! ☕",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Theme.of(context).cardColor,
              ),
            ),

            const SizedBox(height: 32),

            // Frequency Warning
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _canSend ? Colors.orange.withOpacity(0.1) : Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _canSend ? Colors.orange.withOpacity(0.3) : Colors.red.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: _canSend ? Colors.orange : Colors.red),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _cooldownMessage ?? "To prevent spam, you can only send 1 blast per week.",
                      style: TextStyle(color: _canSend ? Colors.orange : Colors.red, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton.icon(
                onPressed: _canSend && !_isLoading ? _sendBlast : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.lime,
                  foregroundColor: AppColors.deepSeaBlueDark,
                  disabledBackgroundColor: Colors.grey.shade300,
                ),
                icon: _isLoading 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) 
                  : const Icon(Icons.send),
                label: Text(_isLoading ? "..." : l10n.sendBlast),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _sendBlast() async {
    if (_messageController.text.isEmpty) return;

    setState(() => _isLoading = true);

    try {
      // 1. Update Venue Last Blast Date
      await _venueRepo.updateVenue(widget.venueId, {
        'lastBlastDate': Timestamp.fromDate(DateTime.now()),
      });

      // 2. Here we would trigger the Cloud Function to actually send messages
      // await CloudFunctions.instance.call("sendBlast", { ... });

      if (mounted) {
        setState(() {
          _isLoading = false;
          _canSend = false;
          _cooldownMessage = "Blast sent! You can send another one in 7 days.";
        });

        showDialog(
          context: context, 
          builder: (context) => AlertDialog(
            title: Text("🚀 ${AppLocalizations.of(context)!.marketingTitle}"),
            content: Text(AppLocalizations.of(context)!.blastSuccess),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context); // Close dialog
                  Navigator.pop(context); // Close screen
                },
                child: const Text("AWESOME"),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error sending blast: $e")));
      }
    }
  }
}
