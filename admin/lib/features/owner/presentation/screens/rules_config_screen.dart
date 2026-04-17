import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/theme/colors.dart';
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

  Future<void> _saveConfig() async {
    if (widget.venueId == null || _venue == null) return;
    
    _decayStages.sort((a, b) => a.days.compareTo(b.days));

    final updatedConfig = LoyaltyConfig(
      vipWindowDays: int.tryParse(_vipWindowCtrl.text) ?? 2,
      degradationIntervalDays: int.tryParse(_degradationIntervalCtrl.text) ?? 7,
      resetIntervalDays: int.tryParse(_resetIntervalCtrl.text) ?? 30,
      percBase: int.tryParse(_percBaseCtrl.text) ?? 10,
      percVip: int.tryParse(_percVipCtrl.text) ?? 20,
      decayStages: _decayStages,
    );

    try {
      await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).update({
        'loyaltyConfig': updatedConfig.toMap(),
      });
      if (mounted) {
        showCupertinoDialog(
          context: context,
          builder: (context) => CupertinoAlertDialog(
            title: const Text("Success"),
            content: const Text("Loyalty rules updated successfully."),
            actions: [
              CupertinoDialogAction(child: const Text("OK"), onPressed: () => Navigator.pop(context)),
            ],
          ),
        );
      }
    } catch (e) {
      debugPrint("Error saving rules: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CupertinoActivityIndicator(radius: 12));
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
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
            constraints: const BoxConstraints(maxWidth: 800),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Loyalty Rules",
                  style: TextStyle(
                    color: AppColors.macosTextPrimary,
                    fontSize: 34,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -1.0,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  "Configure tiers, decay algorithms, and reward percentages.",
                  style: TextStyle(color: AppColors.macosTextSecondary.withOpacity(0.7), fontSize: 15),
                ),
                const SizedBox(height: 48),

                _buildGlassContainer(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "CORE PARAMETERS",
                        style: TextStyle(color: CupertinoColors.activeOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(child: _buildInput("Base Discount %", _percBaseCtrl)),
                          const SizedBox(width: 20),
                          Expanded(child: _buildInput("VIP Discount %", _percVipCtrl)),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(child: _buildInput("VIP Window (Days)", _vipWindowCtrl)),
                          const SizedBox(width: 20),
                          Expanded(child: _buildInput("Reset (Days)", _resetIntervalCtrl)),
                        ],
                      ),
                      
                      const SizedBox(height: 40),
                      
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "DECAY STAGES",
                            style: TextStyle(color: CupertinoColors.activeOrange, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.2),
                          ),
                          CupertinoButton(
                            padding: EdgeInsets.zero,
                            onPressed: _addDecayStage,
                            child: const Row(
                              children: [
                                Icon(CupertinoIcons.plus_circle_fill, size: 16),
                                SizedBox(width: 6),
                                Text("Add Stage", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      ...List.generate(_decayStages.length, (index) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Row(
                            children: [
                              Expanded(
                                child: _buildNumericField(
                                  "After X days", 
                                  _decayStages[index].days.toString(),
                                  (val) => setState(() {
                                    final d = int.tryParse(val) ?? _decayStages[index].days;
                                    _decayStages[index] = LoyaltyDecayStage(days: d, discount: _decayStages[index].discount);
                                  }),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildNumericField(
                                  "Discount drops to %", 
                                  _decayStages[index].discount.toString(),
                                  (val) => setState(() {
                                    final ds = int.tryParse(val) ?? _decayStages[index].discount;
                                    _decayStages[index] = LoyaltyDecayStage(days: _decayStages[index].days, discount: ds);
                                  }),
                                ),
                              ),
                              CupertinoButton(
                                padding: const EdgeInsets.only(left: 12),
                                child: const Icon(CupertinoIcons.trash, color: CupertinoColors.systemRed, size: 20),
                                onPressed: () => _removeDecayStage(index),
                              ),
                            ],
                          ),
                        );
                      }),
                      
                      const SizedBox(height: 48),

                      SizedBox(
                        width: double.infinity,
                        child: CupertinoButton.filled(
                          onPressed: _saveConfig,
                          borderRadius: BorderRadius.circular(10),
                          child: const Text("SAVE CHANGES", style: TextStyle(fontWeight: FontWeight.bold)),
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

  Widget _buildGlassContainer({required Widget child}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppColors.macosRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.all(32),
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

  Widget _buildInput(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(height: 10),
        CupertinoTextField(
          controller: controller,
          keyboardType: TextInputType.number,
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

  Widget _buildNumericField(String hint, String initialValue, ValueChanged<String> onChanged) {
    return CupertinoTextField(
      placeholder: hint,
      placeholderStyle: TextStyle(color: Colors.white.withOpacity(0.2), fontSize: 13),
      onChanged: onChanged,
      controller: TextEditingController(text: initialValue)..selection = TextSelection.collapsed(offset: initialValue.length),
      keyboardType: TextInputType.number,
      style: const TextStyle(color: Colors.white, fontSize: 13),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.macosDivider),
      ),
    );
  }
}
