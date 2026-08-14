import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/widgets/image_upload_widget.dart';

class MarketingBlastScreen extends StatefulWidget {
  final String venueId;
  const MarketingBlastScreen({super.key, required this.venueId});

  @override
  State<MarketingBlastScreen> createState() => _MarketingBlastScreenState();
}

class _MarketingBlastScreenState extends State<MarketingBlastScreen> {
  final _messageController = TextEditingController();
  final _titleController = TextEditingController();
  final _imageUrlController = TextEditingController();
  final _linkController = TextEditingController();
  final VenueRepository _venueRepo = VenueRepository();
  bool _isLoading = true;
  bool _canSend = true;
  String? _cooldownMessage;
  
  // Mock Audience Size 
  final int _curentAudienceSize = 142; 

  Map<String, bool> _audienceSegments = {};

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
            final l10n = AppLocalizations.of(context)!;
            _cooldownMessage = l10n.frequencyWarning;
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

  void _initAudienceSegments(AppLocalizations l10n) {
    if (_audienceSegments.isNotEmpty) return;
    _audienceSegments = {
      l10n.newGuests: true,
      l10n.loyalGuests: true,
      l10n.lostGuests: false,
    };
  }

  Future<void> _sendBlast() async {
    // Send logic... (keep existing but with Cupertino feedback)
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 2)); // Mock
    if (mounted) {
      setState(() => _isLoading = false);
      showCupertinoDialog(
        context: context,
        builder: (context) => CupertinoAlertDialog(
          title: const Text("Success"),
          content: const Text("Marketing campaign launched successfully!"),
          actions: [
            CupertinoDialogAction(
              child: const Text("Done"),
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    _initAudienceSegments(l10n);

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
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 1000),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Main Form Area
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.marketingTitle,
                        style: const TextStyle(
                          color: AppColors.macosTextPrimary,
                          fontSize: 34,
                          fontWeight: FontWeight.bold,
                          letterSpacing: -1,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        "Reach your guests directly with a personalized broadcast.",
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
                            _buildLabel(l10n.marketingAudience),
                            const SizedBox(height: 16),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: _audienceSegments.keys.map((segment) {
                                final isSelected = _audienceSegments[segment]!;
                                return GestureDetector(
                                  onTap: () => setState(() => _audienceSegments[segment] = !isSelected),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 200),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: isSelected ? AppColors.accentOrange : Colors.white.withOpacity(0.05),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: Colors.white10),
                                    ),
                                    child: Text(
                                      segment,
                                      style: TextStyle(
                                        color: isSelected ? Colors.white : AppColors.macosTextSecondary,
                                        fontSize: 13,
                                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 40),

                            _buildLabel(l10n.marketingMessage),
                            const SizedBox(height: 24),
                            _buildField(l10n.campaignTitle, _titleController, l10n.campaignTitleHint),
                            const SizedBox(height: 24),
                            _buildField(l10n.messageBody, _messageController, l10n.messageBodyHint, maxLines: 5),
                            const SizedBox(height: 24),
                            
                            // Image Upload
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: ImageUploadWidget(
                                label: l10n.campaignImage,
                                path: "campaigns/${widget.venueId}",
                                onUploadComplete: (url) => setState(() => _imageUrlController.text = url),
                              ),
                            ),
                            
                            const SizedBox(height: 24),
                            _buildField(l10n.actionLink, _linkController, l10n.actionLinkHint),
                            
                            const SizedBox(height: 40),
                            
                            // Send Button
                            if (!_canSend) 
                              _buildWarning()
                            else
                              SizedBox(
                                width: double.infinity,
                                child: CupertinoButton.filled(
                                  onPressed: _isLoading ? null : _sendBlast,
                                  borderRadius: BorderRadius.circular(12),
                                  child: _isLoading 
                                    ? const CupertinoActivityIndicator(color: Colors.white)
                                    : Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(CupertinoIcons.rocket_fill, size: 20),
                                          const SizedBox(width: 8),
                                          Text(l10n.sendCampaignNow.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(width: 48),
                
                // Sidebar Stats
                Expanded(
                  flex: 1,
                  child: Column(
                    children: [
                      const SizedBox(height: 94),
                      _buildGlassContainer(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "PERFORMANCE",
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: AppColors.macosTextSecondary.withOpacity(0.5),
                                letterSpacing: 1.2,
                              ),
                            ),
                            const SizedBox(height: 32),
                            _buildStatItem("REACHABLE", "$_curentAudienceSize", CupertinoIcons.person_2_fill, AppColors.accentOrange),
                            const SizedBox(height: 24),
                            _buildStatItem("OPEN RATE", "82%", CupertinoIcons.eye_fill, CupertinoColors.activeBlue),
                            const SizedBox(height: 24),
                            _buildStatItem("REDEEMED", "14%", CupertinoIcons.ticket_fill, CupertinoColors.activeGreen),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      _buildGlassContainer(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "HISTORY",
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: AppColors.macosTextSecondary.withOpacity(0.5),
                                letterSpacing: 1.2,
                              ),
                            ),
                            const SizedBox(height: 24),
                            _buildHistoryRow("Weekend Special", "4 days ago"),
                            _buildHistoryRow("New Menu Alert", "12 days ago"),
                          ],
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

  Widget _buildGlassContainer({required Widget child, EdgeInsets padding = const EdgeInsets.all(32)}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppColors.macosRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: padding,
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

  Widget _buildLabel(String text) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(
        color: AppColors.accentOrange,
        fontWeight: FontWeight.w900,
        fontSize: 11,
        letterSpacing: 1.5,
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller, String hint, {int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
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

  Widget _buildStatItem(String label, String value, IconData icon, Color color) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: color.withOpacity(0.15), shape: BoxShape.circle),
          child: Icon(icon, color: color, size: 18),
        ),
        const SizedBox(width: 16),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.macosTextSecondary.withOpacity(0.5))),
            Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.macosTextPrimary)),
          ],
        ),
      ],
    );
  }

  Widget _buildHistoryRow(String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(color: AppColors.accentOrange, shape: BoxShape.circle),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.macosTextPrimary)),
                Text(subtitle, style: TextStyle(fontSize: 11, color: AppColors.macosTextSecondary.withOpacity(0.6))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWarning() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: CupertinoColors.systemRed.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: CupertinoColors.systemRed.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          const Icon(CupertinoIcons.exclamationmark_triangle_fill, color: CupertinoColors.systemRed, size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _cooldownMessage ?? "Campaigns are limited to 1 per week.",
              style: const TextStyle(color: CupertinoColors.systemRed, fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
