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
  late TextEditingController _vipWindowCtrl;
  late TextEditingController _degradationIntervalCtrl;
  late TextEditingController _resetIntervalCtrl;
  
  late TextEditingController _percBaseCtrl;
  late TextEditingController _percVipCtrl;
  
  List<LoyaltyDecayStage> _decayStages = [];
  
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
    _vipWindowCtrl = TextEditingController(text: l.vipWindowDays.toString());
    _degradationIntervalCtrl = TextEditingController(text: l.degradationIntervalDays.toString());
    _resetIntervalCtrl = TextEditingController(text: l.resetIntervalDays.toString());
    
    _percBaseCtrl = TextEditingController(text: l.percBase.toString());
    _percVipCtrl = TextEditingController(text: l.percVip.toString());
    _decayStages = List.from(l.decayStages);
    _manualBlock = widget.venue.isManuallyBlocked;
    _subEndDate = widget.venue.subscription.expiryDate;
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameCtrl.dispose();
    _categoryCtrl.dispose();
    _addressCtrl.dispose();

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
      _decayStages.sort((a, b) => a.days.compareTo(b.days));
      final updatedLoyalty = LoyaltyConfig(
        vipWindowDays: int.tryParse(_vipWindowCtrl.text) ?? 2,
        degradationIntervalDays: int.tryParse(_degradationIntervalCtrl.text) ?? 7,
        resetIntervalDays: int.tryParse(_resetIntervalCtrl.text) ?? 30,
        percBase: int.tryParse(_percBaseCtrl.text) ?? 5,
        percVip: int.tryParse(_percVipCtrl.text) ?? 20,
        decayStages: _decayStages,
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
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Time Windows (Days)", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildTextField("VIP Window (Days)", _vipWindowCtrl, Icons.verified)),
              const SizedBox(width: 16),
              Expanded(child: _buildTextField("Base Degradation (Days)", _degradationIntervalCtrl, Icons.access_time)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildTextField("Full Reset (Days)", _resetIntervalCtrl, Icons.restart_alt)),
              const SizedBox(width: 16),
              const Spacer(),
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
          
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Decay Stages", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
              TextButton.icon(
                onPressed: _addDecayStage,
                icon: const Icon(Icons.add, color: AppColors.accentTeal),
                label: const Text("Add Stage", style: TextStyle(color: AppColors.accentTeal)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          
          if (_decayStages.isEmpty)
            const Text("No decay stages added.", style: TextStyle(color: Colors.grey)),
            
          ...List.generate(_decayStages.length, (index) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: TextEditingController(text: _decayStages[index].days.toString()),
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: "Days", isDense: true),
                      onChanged: (val) {
                        final parsed = int.tryParse(val);
                        if (parsed != null) _decayStages[index] = LoyaltyDecayStage(days: parsed, discount: _decayStages[index].discount);
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextField(
                      controller: TextEditingController(text: _decayStages[index].discount.toString()),
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: "Discount %", isDense: true),
                      onChanged: (val) {
                        final parsed = int.tryParse(val);
                        if (parsed != null) _decayStages[index] = LoyaltyDecayStage(days: _decayStages[index].days, discount: parsed);
                      },
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete, color: Colors.red),
                    onPressed: () => _removeDecayStage(index),
                  ),
                ],
              ),
            );
          }),
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
