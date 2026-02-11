import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/services/campaign_service.dart';

class MarketingCampaignScreen extends StatefulWidget {
  const MarketingCampaignScreen({super.key});

  @override
  State<MarketingCampaignScreen> createState() => _MarketingCampaignScreenState();
}

class _MarketingCampaignScreenState extends State<MarketingCampaignScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _textCtrl = TextEditingController();
  final _imageCtrl = TextEditingController();
  final _linkCtrl = TextEditingController();
  final _campaignService = CampaignService();
  bool _isLoading = false;

  Future<void> _sendCampaign() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      await _campaignService.sendBulkCampaign(
        title: _titleCtrl.text.trim(),
        text: _textCtrl.text.trim(),
        imageUrl: _imageCtrl.text.trim().isEmpty ? null : _imageCtrl.text.trim(),
        actionLink: _linkCtrl.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Campaign sent successfully!")),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error: $e")),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Create Marketing Campaign", style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.title)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.title),
      ),
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 600),
          margin: const EdgeInsets.all(40),
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(32),
            boxShadow: AppColors.softShadow,
          ),
          child: Form(
            key: _formKey,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("CAMPAIGN DETAILS", style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 2)),
                  const SizedBox(height: 24),
                  
                  _buildField("Campaign Title", _titleCtrl, "e.g. Special Weekend Offer!"),
                  const SizedBox(height: 16),
                  
                  _buildField("Campaign Text", _textCtrl, "Enter the email content...", maxLines: 5),
                  const SizedBox(height: 16),
                  
                  _buildField("Banner Image URL (1200x600)", _imageCtrl, "https://example.com/image.jpg"),
                  const SizedBox(height: 16),
                  
                  _buildField("Action Link", _linkCtrl, "https://friendlycode.fun/promo"),
                  
                  const SizedBox(height: 40),
                  
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _sendCampaign,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.title,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _isLoading 
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text("SEND TO ALL GUESTS", style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Colors.white)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller, String hint, {int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.title)),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: AppColors.background,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.all(16),
          ),
          validator: (v) => v == null || v.isEmpty ? "Required" : null,
        ),
      ],
    );
  }
}
