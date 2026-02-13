import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart' as import_firestore;

class VenueConfigurator extends StatefulWidget {
  final VenueModel venue;
  final UserRole userRole;

  const VenueConfigurator({
    super.key,
    required this.venue,
    required this.userRole,
  });

  @override
  State<VenueConfigurator> createState() => _VenueConfiguratorState();
}

class _VenueConfiguratorState extends State<VenueConfigurator> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late TextEditingController _nameCtrl;
  late TextEditingController _categoryCtrl;
  late TextEditingController _addressCtrl;

  // Loyalty Controllers
  late TextEditingController _safetyCooldownCtrl;
  late TextEditingController _vipWindowCtrl;
  late TextEditingController _tier1DecayCtrl;
  late TextEditingController _tier2DecayCtrl;
  
  late TextEditingController _percBaseCtrl;
  late TextEditingController _percVipCtrl;
  late TextEditingController _percDecay1Ctrl;
  late TextEditingController _percDecay2Ctrl;
  
  bool _manualBlock = false;
  DateTime? _subEndDate;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _nameCtrl = TextEditingController(text: widget.venue.name);
    _categoryCtrl = TextEditingController(text: widget.venue.category);
    _addressCtrl = TextEditingController(text: widget.venue.address);
    
    final l = widget.venue.loyaltyConfig;
    _safetyCooldownCtrl = TextEditingController(text: l.safetyCooldownHours.toString());
    _vipWindowCtrl = TextEditingController(text: l.vipWindowHours.toString());
    _tier1DecayCtrl = TextEditingController(text: l.tier1DecayHours.toString());
    _tier2DecayCtrl = TextEditingController(text: l.tier2DecayHours.toString());
    
    _percBaseCtrl = TextEditingController(text: l.percBase.toString());
    _percVipCtrl = TextEditingController(text: l.percVip.toString());
    _percDecay1Ctrl = TextEditingController(text: l.percDecay1.toString());
    _percDecay2Ctrl = TextEditingController(text: l.percDecay2.toString());
    _manualBlock = widget.venue.isManuallyBlocked;
    _subEndDate = widget.venue.subscription.expiryDate;
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameCtrl.dispose();
    _categoryCtrl.dispose();
    _addressCtrl.dispose();

    _safetyCooldownCtrl.dispose();
    _vipWindowCtrl.dispose();
    _tier1DecayCtrl.dispose();
    _tier2DecayCtrl.dispose();
    _percBaseCtrl.dispose();
    _percVipCtrl.dispose();
    _percDecay1Ctrl.dispose();
    _percDecay2Ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        width: 800,
        height: 600,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: AppColors.softShadow,
        ),
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  const Icon(Icons.settings_outlined, color: AppColors.accentTeal),
                  const SizedBox(width: 12),
                  Text(
                    "Configure: ${widget.venue.name}",
                    style: TextStyle(color: AppColors.title, fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            
            // Tab Bar
            TabBar(
              controller: _tabController,
              labelColor: AppColors.accentIndigo,
              unselectedLabelColor: AppColors.body,
              indicatorColor: AppColors.accentIndigo,
              tabs: const [
                Tab(text: "General Info"),
                Tab(text: "Loyalty Logic"),
                Tab(text: "Billing & Control"),
              ],
            ),
            
            // Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildGeneralTab(),
                  _buildLoyaltyTab(),
                  _buildBillingTab(),
                ],
              ),
            ),
            
            // Footer
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text("Cancel"),
                  ),
                  const SizedBox(width: 16),
                  ElevatedButton(
                    onPressed: _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentTeal,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text("Save Changes"),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  void _save() {
      // Create updated LoyaltyConfig
      final updatedLoyalty = LoyaltyConfig(
        safetyCooldownHours: int.tryParse(_safetyCooldownCtrl.text) ?? 12,
        vipWindowHours: int.tryParse(_vipWindowCtrl.text) ?? 48,
        tier1DecayHours: int.tryParse(_tier1DecayCtrl.text) ?? 72,
        tier2DecayHours: int.tryParse(_tier2DecayCtrl.text) ?? 168,
        percBase: int.tryParse(_percBaseCtrl.text) ?? 5,
        percVip: int.tryParse(_percVipCtrl.text) ?? 20,
        percDecay1: int.tryParse(_percDecay1Ctrl.text) ?? 15,
        percDecay2: int.tryParse(_percDecay2Ctrl.text) ?? 10,
      );

      // In a real app, you'd call a BLoC/Provider to update Firestore here.
      // For now, let's assume we pass it back or print it.
      // Since this is a Dialog, proper way is usually to returning the updated object 
      // or calling a service directly.
      // Given I cannot easily inject the repo here without seeing the parent, 
      // I will implement the Firebase update directly for now as "Zero Friction" solution.
      
      try {
        final docRef = import_firestore.FirebaseFirestore.instance.collection('venues').doc(widget.venue.id);
        
        docRef.update({
          'name': _nameCtrl.text,
          'category': _categoryCtrl.text,
          'address': _addressCtrl.text,
          'loyaltyConfig': updatedLoyalty.toMap(),
          'isManuallyBlocked': _manualBlock,
          'subscription.expiryDate': _subEndDate != null ? import_firestore.Timestamp.fromDate(_subEndDate!) : null,
        }).then((_) {
          if (mounted) Navigator.pop(context, true); // Return true to indicate refresh needed
        });
      } catch (e) {
        debugPrint("Error updating venue: $e");
      }
  }

  Widget _buildGeneralTab() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          _buildTextField("Venue Name", _nameCtrl, Icons.storefront),
          const SizedBox(height: 20),
          _buildTextField("Category", _categoryCtrl, Icons.category_outlined),
          const SizedBox(height: 20),
          _buildTextField("Address", _addressCtrl, Icons.location_on_outlined),
        ],
      ),
    );
  }

  Widget _buildLoyaltyTab() {
    return Padding(
      padding: const EdgeInsets.all(32),
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Time Windows (Hours)", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildTextField("Safety Cooldown", _safetyCooldownCtrl, Icons.timer_off)),
              const SizedBox(width: 16),
              Expanded(child: _buildTextField("VIP Window (Max Reward)", _vipWindowCtrl, Icons.verified)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildTextField("Tier 1 Decay Start", _tier1DecayCtrl, Icons.trending_down)),
              const SizedBox(width: 16),
              Expanded(child: _buildTextField("Tier 2 Decay Start", _tier2DecayCtrl, Icons.access_time)),
            ],
          ),
          
          const SizedBox(height: 32),
          const Text("Reward Percentages (%)", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
          const SizedBox(height: 16),
          
          Row(
            children: [
              Expanded(child: _buildTextField("Base (New/Reset)", _percBaseCtrl, Icons.start)),
              const SizedBox(width: 16),
              Expanded(child: _buildTextField("VIP (Max)", _percVipCtrl, Icons.star)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildTextField("Tier 1 (Decay)", _percDecay1Ctrl, Icons.remove_circle_outline)),
              const SizedBox(width: 16),
              Expanded(child: _buildTextField("Tier 2 (Decay)", _percDecay2Ctrl, Icons.battery_alert)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBillingTab() {
    if (widget.userRole != UserRole.superAdmin) {
      return Center(
        child: Text(
          "Access Restricted to Super Admin",
          style: TextStyle(color: AppColors.statusBlockedText, fontWeight: FontWeight.bold),
        ),
      );
    }
    
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Subscription Control", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
          const SizedBox(height: 24),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.calendar_today, color: AppColors.accentIndigo),
            title: const Text("Subscription End Date"),
            subtitle: Text(_subEndDate != null 
              ? "${_subEndDate!.day}.${_subEndDate!.month}.${_subEndDate!.year}"
              : "Not Set"),
            trailing: TextButton(
              onPressed: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _subEndDate ?? DateTime.now(),
                  firstDate: DateTime.now().subtract(const Duration(days: 365)),
                  lastDate: DateTime.now().add(const Duration(days: 3650)),
                );
                if (date != null) setState(() => _subEndDate = date);
              },
              child: const Text("Change"),
            ),
          ),
          const Divider(height: 48),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            activeColor: AppColors.statusBlockedText,
            activeTrackColor: AppColors.statusBlockedBg,
            title: const Text("Force Block Venue", style: TextStyle(fontWeight: FontWeight.bold)),
            subtitle: const Text("Checking this will immediately suspend service regardless of subscription date."),
            value: _manualBlock,
            onChanged: (val) => setState(() => _manualBlock = val),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController ctrl, IconData icon) {
    return TextField(
      controller: ctrl,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.body, fontSize: 14),
        prefixIcon: Icon(icon, color: AppColors.body, size: 20),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.accentTeal)),
      ),
    );
  }
}
