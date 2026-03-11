import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import '../../../../core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class RulesConfigScreen extends StatefulWidget {
  final String? venueId;
  const RulesConfigScreen({super.key, this.venueId});

  @override
  State<RulesConfigScreen> createState() => _RulesConfigScreenState();
}

class _RulesConfigScreenState extends State<RulesConfigScreen> {
  bool _isLoading = true;
  VenueModel? _venue;

  final _vipWindowCtrl = TextEditingController();
  final _degradationIntervalCtrl = TextEditingController();
  final _resetIntervalCtrl = TextEditingController();
  final _percBaseCtrl = TextEditingController();
  final _percVipCtrl = TextEditingController();

  List<LoyaltyDecayStage> _decayStages = [];

  @override
  void initState() {
    super.initState();
    _loadVenue();
  }

  Future<void> _loadVenue() async {
    if (widget.venueId == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      final doc = await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).get();
      if (doc.exists) {
        _venue = VenueModel.fromMap(doc.id, doc.data()!);
        final config = _venue!.loyaltyConfig;
        
        _vipWindowCtrl.text = config.vipWindowDays.toString();
        _degradationIntervalCtrl.text = config.degradationIntervalDays.toString();
        _resetIntervalCtrl.text = config.resetIntervalDays.toString();
        _percBaseCtrl.text = config.percBase.toString();
        _percVipCtrl.text = config.percVip.toString();
        
        _decayStages = List.from(config.decayStages);
      }
    } catch (e) {
      debugPrint("Error loading rules: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _vipWindowCtrl.dispose();
    _degradationIntervalCtrl.dispose();
    _resetIntervalCtrl.dispose();
    _percBaseCtrl.dispose();
    _percVipCtrl.dispose();
    super.dispose();
  }

  void _addDecayStage() {
    setState(() {
      _decayStages.add(const LoyaltyDecayStage(days: 7, discount: 10));
    });
  }

  void _removeDecayStage(int index) {
    setState(() {
      _decayStages.removeAt(index);
    });
  }

  void _updateStageDays(int index, String val) {
    final newDays = int.tryParse(val) ?? _decayStages[index].days;
    _decayStages[index] = LoyaltyDecayStage(days: newDays, discount: _decayStages[index].discount);
  }

  void _updateStageDiscount(int index, String val) {
    final newDiscount = int.tryParse(val) ?? _decayStages[index].discount;
    _decayStages[index] = LoyaltyDecayStage(days: _decayStages[index].days, discount: newDiscount);
  }

  Future<void> _saveConfig() async {
    if (widget.venueId == null || _venue == null) return;
    
    // Sort decay stages by days descending so largest window is checked first if needed, 
    // or keep them as defined by user (RewardCalculator iterates through them)
    _decayStages.sort((a, b) => a.days.compareTo(b.days));

    final updatedConfig = LoyaltyConfig(
      vipWindowDays: int.tryParse(_vipWindowCtrl.text) ?? 2,
      degradationIntervalDays: int.tryParse(_degradationIntervalCtrl.text) ?? 7,
      resetIntervalDays: int.tryParse(_resetIntervalCtrl.text) ?? 30,
      percBase: int.tryParse(_percBaseCtrl.text) ?? 5,
      percVip: int.tryParse(_percVipCtrl.text) ?? 20,
      decayStages: _decayStages,
    );

    try {
      await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).update({
        'loyaltyConfig': updatedConfig.toMap(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)?.logicUpdated ?? "Loyalty rules updated"), backgroundColor: Colors.green),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      debugPrint("Error saving rules: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error saving rules: $e"), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: Text(l10n.rewardLogicConfig)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Configure your time-decay loyalty rules. These rules determine how much discount a guest receives based on their return frequency.",
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.body),
            ),
            const SizedBox(height: 24),

            _buildSectionHeader("GLOBAL RULES"),
            _buildTierRow("Base Reward (%)", "Default discount for new guests.", _percBaseCtrl),
            _buildTierRow("VIP Reward (%)", "Maximum discount for frequent visitors.", _percVipCtrl),
            _buildTierRow("VIP Window (Days)", "Return within these days for maximum reward.", _vipWindowCtrl),
            _buildTierRow("Full Reset (Days)", "Guest loses all progress if absent for this long.", _resetIntervalCtrl),
            _buildTierRow("Base Degradation (Days)", "Fallback threshold before dropping to base.", _degradationIntervalCtrl),

            const Divider(height: 48),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildSectionHeader("DECAY STAGES"),
                TextButton.icon(
                  onPressed: _addDecayStage,
                  icon: const Icon(Icons.add, color: AppColors.accentOrange),
                  label: const Text("Add Stage", style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            
            if (_decayStages.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text("No decay stages added. Guests will drop directly to base after the VIP window.", style: TextStyle(color: Colors.grey)),
              ),
              
            ...List.generate(_decayStages.length, (index) {
              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.title.withOpacity(0.1)),
                  boxShadow: AppColors.softShadow,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("Decay Stage ${index + 1}", style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Text("Days:", style: TextStyle(color: AppColors.body, fontSize: 13)),
                              const SizedBox(width: 8),
                              SizedBox(
                                width: 60,
                                child: TextField(
                                  controller: TextEditingController(text: _decayStages[index].days.toString()),
                                  keyboardType: TextInputType.number,
                                  textAlign: TextAlign.center,
                                  onChanged: (val) => _updateStageDays(index, val),
                                  decoration: InputDecoration(
                                    filled: true,
                                    fillColor: AppColors.background.withOpacity(0.5),
                                    contentPadding: const EdgeInsets.all(8),
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              const Text("Discount %:", style: TextStyle(color: AppColors.body, fontSize: 13)),
                              const SizedBox(width: 8),
                              SizedBox(
                                width: 60,
                                child: TextField(
                                  controller: TextEditingController(text: _decayStages[index].discount.toString()),
                                  keyboardType: TextInputType.number,
                                  textAlign: TextAlign.center,
                                  onChanged: (val) => _updateStageDiscount(index, val),
                                  decoration: InputDecoration(
                                    filled: true,
                                    fillColor: AppColors.background.withOpacity(0.5),
                                    contentPadding: const EdgeInsets.all(8),
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      onPressed: () => _removeDecayStage(index),
                    ),
                  ],
                ),
              );
            }),

            const SizedBox(height: 48),

            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _saveConfig,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.accentOrange,
                  foregroundColor: Colors.white,
                ),
                child: Text(l10n.saveLogic),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(
        title,
        style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.bold, letterSpacing: 1.2),
      ),
    );
  }

  Widget _buildTierRow(String label, String sub, TextEditingController controller) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.title.withOpacity(0.1)),
        boxShadow: AppColors.softShadow,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(sub, style: TextStyle(color: AppColors.body.withOpacity(0.6), fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(width: 16),
          SizedBox(
            width: 80,
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.title, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                filled: true,
                fillColor: AppColors.background.withOpacity(0.5),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
