import 'package:flutter/material.dart';
import 'package:friendly_code/core/models/lead_model.dart';
import 'package:friendly_code/core/services/lead_service.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:intl/intl.dart';

class GuestListScreen extends StatefulWidget {
  final String venueId;
  const GuestListScreen({super.key, required this.venueId});

  @override
  State<GuestListScreen> createState() => _GuestListScreenState();
}

class _GuestListScreenState extends State<GuestListScreen> {
  final LeadsService _leadsService = LeadsService();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("GUEST DATABASE", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.title),
      ),
      body: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "YOUR LOYAL GUESTS",
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title),
            ),
            const SizedBox(height: 8),
            Text(
              "List of guests who have interacted with your venue.",
              style: TextStyle(color: AppColors.body.withOpacity(0.7)),
            ),
            const SizedBox(height: 32),
            Expanded(
              child: StreamBuilder<List<LeadModel>>(
                stream: _leadsService.getLeadsStream(widget.venueId),
                builder: (context, snapshot) {
                  if (snapshot.hasError) {
                    return Center(child: Text("Error loading guests: ${snapshot.error}"));
                  }
                  if (!snapshot.hasData) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final guests = snapshot.data!;
                  if (guests.isEmpty) {
                    return _buildEmptyState();
                  }

                  return _buildGuestTable(guests);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.people_outline, size: 64, color: AppColors.body.withOpacity(0.3)),
          const SizedBox(height: 16),
          Text(
            "No guests found yet",
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.body.withOpacity(0.5)),
          ),
          const SizedBox(height: 8),
          const Text("Guests will appear here once they scan your QR code."),
        ],
      ),
    );
  }

  Widget _buildGuestTable(List<LeadModel> guests) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: AppColors.softShadow,
        ),
        child: SingleChildScrollView(
          child: DataTable(
            headingRowColor: MaterialStateProperty.all(AppColors.background.withOpacity(0.5)),
            dataRowHeight: 72,
            columns: const [
              DataColumn(label: Text("GUEST NAME", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12))),
              DataColumn(label: Text("CONTACT info", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12))),
              DataColumn(label: Text("STATUS", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12))),
              DataColumn(label: Text("JOINED DATE", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12))),
            ],
            rows: guests.map((guest) {
              return DataRow(cells: [
                DataCell(
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: AppColors.accentOrange.withOpacity(0.1),
                        child: Text(
                          guest.guestName.isNotEmpty ? guest.guestName[0].toUpperCase() : '?',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.accentOrange),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(guest.guestName, style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                DataCell(Text(guest.guestContact.isNotEmpty ? guest.guestContact : 'N/A')),
                DataCell(
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _getStatusColor(guest.status).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      guest.status.toUpperCase(),
                      style: TextStyle(
                        color: _getStatusColor(guest.status),
                        fontWeight: FontWeight.bold,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ),
                DataCell(Text(DateFormat('MMM d, yyyy').format(guest.createdAt))),
              ]);
            }).toList(),
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'new':
        return Colors.blue;
      case 'vip':
        return Colors.amber;
      case 'loyal':
        return Colors.green;
      default:
        return AppColors.body;
    }
  }
}
