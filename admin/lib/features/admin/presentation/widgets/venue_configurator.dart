import 'package:flutter/material.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/models/venue_model.dart';
import '../../../../features/web/presentation/layout/admin_shell.dart';

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
  
  bool _manualBlock = false;
  DateTime? _subEndDate;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _nameCtrl = TextEditingController(text: widget.venue.name);
    _categoryCtrl = TextEditingController(text: widget.venue.category);
    _addressCtrl = TextEditingController(text: widget.venue.address);
    _manualBlock = widget.venue.manualBlock;
    _subEndDate = widget.venue.subscription.expiryDate;
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameCtrl.dispose();
    _categoryCtrl.dispose();
    _addressCtrl.dispose();
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
                    onPressed: () {
                      // Save Logic
                      Navigator.pop(context);
                    },
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Discount Settings", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(child: _buildTextField("Welcome Gift %", TextEditingController(text: "5"), Icons.card_giftcard)),
              const SizedBox(width: 24),
              Expanded(child: _buildTextField("Max Privilege %", TextEditingController(text: "20"), Icons.stars_outlined)),
            ],
          ),
          const SizedBox(height: 24),
          _buildTextField("Steps to Max", TextEditingController(text: "2"), Icons.directions_walk),
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
