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
  
  final _safetyCooldownCtrl = TextEditingController(text: "12");
  final _vipWindowCtrl = TextEditingController(text: "48");
  final _tier1DecayCtrl = TextEditingController(text: "72");
  final _tier2DecayCtrl = TextEditingController(text: "168");
  
  final _percBaseCtrl = TextEditingController(text: "5");
  final _percVipCtrl = TextEditingController(text: "20");
  final _percDecay1Ctrl = TextEditingController(text: "15");
  final _percDecay2Ctrl = TextEditingController(text: "10");

  @override
  void initState() {
    super.initState();
    // In a real app, we'd fetch the current LoyaltyConfig from the venue.
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
              "Configure your time-decay loyalty rules. These rules determine how much discount a guest receives based on their return frequency.",
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.white70),
            ),
            const SizedBox(height: 24),

            _buildSectionHeader("TIME WINDOWS (HOURS)"),
            _buildTierRow("Safety Cooldown", "Minimum hours before a new scan can count as a visit.", _safetyCooldownCtrl),
            _buildTierRow("VIP Window", "Return within these hours for maximum reward.", _vipWindowCtrl),
            _buildTierRow("Tier 1 Decay", "Reward drops after this many hours.", _tier1DecayCtrl),
            _buildTierRow("Tier 2 Decay", "Reward drops further after this many hours.", _tier2DecayCtrl),

            const Divider(color: Colors.white10, height: 48),

            _buildSectionHeader("REWARD PERCENTAGES (%)"),
            _buildTierRow("Base Reward", "Default discount for new or inactive guests.", _percBaseCtrl),
            _buildTierRow("VIP Reward", "Maximum discount for frequent visitors.", _percVipCtrl),
            _buildTierRow("Tier 1 Reward", "Intermediate discount tier.", _percDecay1Ctrl),
            _buildTierRow("Tier 2 Reward", "Lower intermediate discount tier.", _percDecay2Ctrl),

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

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(
        title,
        style: const TextStyle(color: AppColors.lime, fontWeight: FontWeight.bold, letterSpacing: 1.2),
      ),
    );
  }

  Widget _buildTierRow(String label, String sub, TextEditingController controller) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(sub, style: const TextStyle(color: Colors.white38, fontSize: 11)),
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
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.black26,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _saveConfig() {
    // Note: This screen is currently a standalone UI. 
    // Configuration is primarily handled via the VenueConfigurator in the Admin panel.
    // In a fully wired-up system, this would update the specific venue's loyaltyConfig.
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(AppLocalizations.of(context)!.logicUpdated)),
    );
    Navigator.pop(context);
  }
}
