import 'package:flutter/material.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/logic/reward_calculator.dart';

class RulesConfigScreen extends StatefulWidget {
  const RulesConfigScreen({super.key});

  @override
  State<RulesConfigScreen> createState() => _RulesConfigScreenState();
}

class _RulesConfigScreenState extends State<RulesConfigScreen> {
  // Configurable Tiers (Max 5)
  // For MVP, we are initializing with 3, but UI supports adding more if we expanded the logic.
  // We'll stick to the Bible's 5-tier cap.
  
  final List<TextEditingController> _hoursControllers = [];
  final List<TextEditingController> _discountControllers = [];
  
  final _baseDiscountCtrl = TextEditingController(text: "5");

  @override
  void initState() {
    super.initState();
    // Initialize with current defaults (mocked for now, would come from VenueModel)
    _addTier(24, 20);
    _addTier(36, 15);
    _addTier(240, 10); // 10 days
  }

  void _addTier(int hours, int discount) {
    if (_hoursControllers.length >= 5) return;
    _hoursControllers.add(TextEditingController(text: hours.toString()));
    _discountControllers.add(TextEditingController(text: discount.toString()));
    setState(() {});
  }

  void _removeTier(int index) {
     _hoursControllers.removeAt(index);
     _discountControllers.removeAt(index);
     setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.rewardLogicConfig)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.configTierLimit,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.white70),
            ),
            const SizedBox(height: 24),

            // Tiers List
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _hoursControllers.length,
              itemBuilder: (context, index) {
                return _buildTierRow(index);
              },
            ),

            // Add Button
            if (_hoursControllers.length < 5)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16.0),
                child: Center(
                  child: TextButton.icon(
                    onPressed: () => _addTier(48, 5),
                    icon: const Icon(Icons.add_circle, color: AppColors.lime),
                    label: Text(l10n.addTier, style: const TextStyle(color: AppColors.lime)),
                  ),
                ),
              ),

            const Divider(color: Colors.white10, height: 48),

            Text(l10n.retentionBase, style: const TextStyle(color: AppColors.lime, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _buildNumInput(l10n.rewardPercent, _baseDiscountCtrl),
            Text(
              l10n.tierHint,
              style: const TextStyle(color: Colors.white38, fontSize: 12),
            ),

            const SizedBox(height: 48),

            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _saveConfig,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.lime,
                  foregroundColor: AppColors.deepSeaBlueDark,
                ),
                child: Text(l10n.saveLogic),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTierRow(int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(AppLocalizations.of(context)!.tierLabel(index + 1), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              if (_hoursControllers.length > 1)
                IconButton(
                  icon: const Icon(Icons.remove_circle_outline, color: Colors.red, size: 20),
                  onPressed: () => _removeTier(index),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _buildNumInput(AppLocalizations.of(context)!.visitWithinHrs, _hoursControllers[index])),
              const SizedBox(width: 16),
              Expanded(child: _buildNumInput(AppLocalizations.of(context)!.rewardPercent, _discountControllers[index])),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNumInput(String label, TextEditingController controller) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white54, fontSize: 12),
        filled: true,
        fillColor: Colors.black12,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
    );
  }

  void _saveConfig() {
    // For MVP validation, we're mostly checking UI logic.
    // In a real app, this would serialize the list and send to Firestore.
    
    // Construct config for local calculator update (to verify visual feedback)
    final tier1Hours = _getHours(0) ?? 24;
    final discount1 = _getDiscount(0) ?? 20;
    
    final tier2Hours = _getHours(1) ?? 36;
    final discount2 = _getDiscount(1) ?? 15;
    
    final tier3Hours = _getHours(2) ?? 240;
    final discount3 = _getDiscount(2) ?? 10;
    
    final base = int.tryParse(_baseDiscountCtrl.text) ?? 5;

    final newConfig = RewardConfig(
      tier1Hours: tier1Hours,
      tier2Hours: tier2Hours,
      tier3Hours: tier3Hours,
      rewardTier1: discount1,
      rewardTier2: discount2,
      rewardTier3: discount3,
      rewardBase: base,
    );

    // Update Global Logic
    RewardCalculator.updateConfig(newConfig);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(AppLocalizations.of(context)!.logicUpdated)),
    );
    Navigator.pop(context);
  }
  
  int? _getHours(int index) {
    if (index >= _hoursControllers.length) return null;
    return int.tryParse(_hoursControllers[index].text);
  }
  
  int? _getDiscount(int index) {
      if (index >= _discountControllers.length) return null;
      return int.tryParse(_discountControllers[index].text);
  }
}
