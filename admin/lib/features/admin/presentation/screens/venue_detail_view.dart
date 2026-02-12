import 'package:flutter/material.dart';
import '../../../../core/models/venue_model.dart';
import '../../../../core/data/venue_repository.dart';
import '../../../../core/theme/colors.dart';

class VenueDetailView extends StatefulWidget {
  final VenueModel venue;

  const VenueDetailView({super.key, required this.venue});

  @override
  State<VenueDetailView> createState() => _VenueDetailViewState();
}

class _VenueDetailViewState extends State<VenueDetailView> {
  final VenueRepository _venueRepo = VenueRepository();
  late bool _isActive;
  late VenueSubscription _subscription;

  @override
  void initState() {
    super.initState();
    _isActive = widget.venue.isActive;
    _subscription = widget.venue.subscription;
  }

  Future<void> _updateStatus(bool val) async {
    setState(() => _isActive = val);
    await _venueRepo.updateVenue(widget.venue.id, {'isActive': val});
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Venue ${val ? 'Activated' : 'Frozen'}")));
  }

  Future<void> _updateSubscription({bool? isPaid, DateTime? expiry}) async {
    final newSub = VenueSubscription(
      plan: _subscription.plan,
      isPaid: isPaid ?? _subscription.isPaid,
      expiryDate: expiry ?? _subscription.expiryDate,
    );
    
    setState(() => _subscription = newSub);
    await _venueRepo.updateVenue(widget.venue.id, {'subscription': newSub.toMap()});
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Subscription Updated")));
  }

  Future<void> _deleteVenue() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Delete Venue?"),
        content: const Text("This action cannot be undone. All data will be lost."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("CANCEL")),
          TextButton(
            onPressed: () => Navigator.pop(context, true), 
            child: const Text("DELETE", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _venueRepo.deleteVenue(widget.venue.id);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Venue Deleted")));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.deepSeaBlueDark,
      appBar: AppBar(
        title: Text("MANAGE: ${widget.venue.name}"),
        backgroundColor: AppColors.deepSeaBlue,
      ),
      body: Center(
        child: Container(
          width: 600, // Constrained width for Desktop look
          padding: const EdgeInsets.all(32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Info Card
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.deepSeaBlue,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const CircleAvatar(radius: 40, child: Icon(Icons.store)),
                    const SizedBox(width: 24),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(widget.venue.name, style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white)),
                        Text(widget.venue.ownerId ?? '', style: const TextStyle(color: Colors.white54)),
                        const SizedBox(height: 8),
                        Chip(
                          label: Text(_isActive ? "ACTIVE" : "FROZEN"),
                          backgroundColor: _isActive ? Colors.green : Colors.red,
                        )
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Controls
              Text("ADMIN CONTROLS", style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.lime)),
              const SizedBox(height: 16),

                SwitchListTile(
                  title: const Text("Venue Status (Active/Frozen)", style: TextStyle(color: Colors.white)),
                  subtitle: const Text("Deactivate venue if payment fails.", style: TextStyle(color: Colors.white54)),
                  value: _isActive,
                  activeColor: AppColors.lime,
                  onChanged: _updateStatus,
                ),
                const Divider(color: Colors.white10),
                SwitchListTile(
                  title: const Text("Subscription Payment (Paid/Unpaid)", style: TextStyle(color: Colors.white)),
                  subtitle: const Text("Manual override for payment status.", style: TextStyle(color: Colors.white54)),
                  value: _subscription.isPaid,
                  activeColor: Colors.blue,
                  onChanged: (val) => _updateSubscription(isPaid: val),
                ),
                const Divider(color: Colors.white10),
                ListTile(
                  title: const Text("Subscription Expiry", style: TextStyle(color: Colors.white)),
                  subtitle: Text(
                    _subscription.expiryDate != null 
                      ? "${_subscription.expiryDate!.toLocal()}".split(' ')[0] 
                      : "No Expiry Set",
                    style: const TextStyle(color: Colors.white54),
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.calendar_today, color: Colors.white54),
                    onPressed: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: _subscription.expiryDate ?? DateTime.now(),
                        firstDate: DateTime.now().subtract(const Duration(days: 365)),
                        lastDate: DateTime.now().add(const Duration(days: 3650)),
                      );
                      if (date != null) _updateSubscription(expiry: date);
                    },
                  ),
                ),

              const Spacer(),
              
              // Dangerous Area
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.red),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning, color: Colors.red),
                    const SizedBox(width: 16),
                    const Text("Danger Zone", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                    const Spacer(),
                    TextButton(
                      onPressed: _deleteVenue,
                      child: const Text("DELETE VENUE", style: TextStyle(color: Colors.red)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
