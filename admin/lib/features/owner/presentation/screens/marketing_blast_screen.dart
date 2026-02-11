import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
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

  final Map<String, bool> _audienceSegments = {
    "New Guests": true,
    "Loyal (>3 visits)": true,
    "Lost (30+ days)": false,
  };

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: Text(l10n.marketingTitle)),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Content Area
          Expanded(
            flex: 2,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionHeader("Audience Selection", "Choose who will receive your message."),
                  const SizedBox(height: 20),
                  Wrap(
                    spacing: 12,
                    children: _audienceSegments.keys.map((segment) {
                      return FilterChip(
                        label: Text(segment),
                        selected: _audienceSegments[segment]!,
                        onSelected: (val) => setState(() => _audienceSegments[segment] = val),
                        selectedColor: AppColors.accentOrange.withValues(alpha: 0.2),
                        checkmarkColor: AppColors.accentOrange,
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 40),

                  _buildSectionHeader("Message Content", "Write a compelling reason for them to return."),
                  const SizedBox(height: 20),
                  TextField(
                    controller: _messageController,
                    maxLines: 6,
                    decoration: InputDecoration(
                      hintText: "Hey! We miss you. Show this message for a free coffee with your next meal! ☕",
                      prefixIcon: const Icon(Icons.edit_note, size: 28),
                      alignLabelWithHint: true,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  _buildSectionHeader("Media Attachment", "Add a photo to catch their eye (max 3MB)."),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: () {}, // Image Picker
                    icon: const Icon(Icons.add_a_photo_outlined),
                    label: const Text("UPLOAD PROMO IMAGE"),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      side: const BorderSide(color: AppColors.accentOrange),
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Frequency Warning
                  _buildFrequencyWarning(),

                  const SizedBox(height: 32),

                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: _canSend && !_isLoading ? _sendBlast : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentOrange,
                        foregroundColor: Colors.white,
                      ),
                      icon: _isLoading 
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) 
                        : const Icon(Icons.rocket_launch),
                      label: Text(_isLoading ? "PREPARING..." : "SEND CAMPAIGN NOW"),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Right Rail: Stats
          Container(
            width: 350,
            decoration: BoxDecoration(
              color: AppColors.surface,
              border: Border.all(color: AppColors.title.withValues(alpha: 0.05)),
            ),
            child: _buildStatsSidebar(),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, String sub) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title.toUpperCase(), style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.5)),
        const SizedBox(height: 4),
        Text(sub, style: TextStyle(color: AppColors.body.withValues(alpha: 0.6), fontSize: 14)),
      ],
    );
  }

  Widget _buildFrequencyWarning() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _canSend ? AppColors.accentOrange.withValues(alpha: 0.05) : Colors.red.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _canSend ? AppColors.accentOrange.withValues(alpha: 0.15) : Colors.red.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: _canSend ? AppColors.accentOrange : Colors.red),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              _cooldownMessage ?? "Campaigns are limited to 1 per week to ensure high deliverability.",
              style: TextStyle(color: _canSend ? AppColors.title : Colors.red, fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsSidebar() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("CAMPAIGN PERFORMANCE", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
          const SizedBox(height: 32),
          _buildStatItem("REACHABLE GUESTS", "$_curentAudienceSize", Icons.people_outline, AppColors.accentOrange),
          const SizedBox(height: 24),
          _buildStatItem("AVG. OPEN RATE", "82%", Icons.remove_red_eye_outlined, Colors.blue),
          const SizedBox(height: 24),
          _buildStatItem("CONVERSION", "14%", Icons.shopping_bag_outlined, Colors.green),
          
          const SizedBox(height: 48),
          const Text("RECENT HISTORY", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: AppColors.body)),
          const SizedBox(height: 16),
          _buildHistoryItem("Weekend Special", "Sent 4 days ago", "142 reach"),
          _buildHistoryItem("New Menu Alert", "Sent 12 days ago", "128 reach"),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon, Color color) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 16),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.body.withValues(alpha: 0.5))),
            Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.title)),
          ],
        ),
      ],
    );
  }

  Widget _buildHistoryItem(String title, String date, String stats) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(date, style: TextStyle(fontSize: 12, color: AppColors.body.withValues(alpha: 0.6))),
              Text(stats, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.accentOrange)),
            ],
          ),
          const Divider(height: 24),
        ],
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
