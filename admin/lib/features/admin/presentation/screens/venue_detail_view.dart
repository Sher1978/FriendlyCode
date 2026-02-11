import 'package:flutter/material.dart';
import '../../../../core/models/venue_model.dart';
import '../../../../core/theme/colors.dart';

class VenueDetailView extends StatefulWidget {
  final VenueModel venue;

  const VenueDetailView({super.key, required this.venue});

  @override
  State<VenueDetailView> createState() => _VenueDetailViewState();
}

class _VenueDetailViewState extends State<VenueDetailView> {
  late bool _isActive;
  late bool _isPaid;

  @override
  void initState() {
    super.initState();
    _isActive = widget.venue.isActive;
    _isPaid = widget.venue.subscription.isPaid || (widget.venue.subscription.expiryDate != null && widget.venue.subscription.expiryDate!.isAfter(DateTime.now()));
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
                onChanged: (val) {
                  setState(() => _isActive = val);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Venue ${val ? 'Activated' : 'Frozen'}")));
                },
              ),
              const Divider(color: Colors.white10),
              SwitchListTile(
                title: const Text("Subscription Payment (Paid/Unpaid)", style: TextStyle(color: Colors.white)),
                subtitle: const Text("Manual override for payment status.", style: TextStyle(color: Colors.white54)),
                value: _isPaid,
                activeColor: Colors.blue,
                onChanged: (val) {
                  setState(() => _isPaid = val);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Payment Status: ${val ? 'PAID' : 'UNPAID'}")));
                },
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
                      onPressed: () {},
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
