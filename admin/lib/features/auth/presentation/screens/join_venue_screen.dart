import 'package:flutter/material.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/models/venue_request_model.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:firebase_auth/firebase_auth.dart';

class JoinVenueScreen extends StatefulWidget {
  const JoinVenueScreen({super.key});

  @override
  State<JoinVenueScreen> createState() => _JoinVenueScreenState();
}

class _JoinVenueScreenState extends State<JoinVenueScreen> {
  final _searchController = TextEditingController();
  final _venueRepo = VenueRepository();
  List<VenueModel> _searchResults = [];
  bool _isLoading = false;
  String? _requestedVenueId;

  Future<void> _search() async {
    if (_searchController.text.isEmpty) return;
    
    setState(() => _isLoading = true);
    try {
      final results = await _venueRepo.searchVenues(_searchController.text);
      setState(() => _searchResults = results);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _requestToJoin(VenueModel venue) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    setState(() => _isLoading = true);
    try {
      final request = VenueRequestModel(
        id: '', // Firestore auto-gen
        userId: user.uid,
        userEmail: user.email ?? 'No User Email',
        userName: user.displayName ?? 'Unknown',
        venueId: venue.id,
        venueName: venue.name,
        createdAt: DateTime.now(),
      );

      await _venueRepo.createJoinRequest(request);
      setState(() => _requestedVenueId = venue.id);
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Request sent! The owner will review it shortly.")),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Join a Venue"), backgroundColor: AppColors.deepSeaBlue),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            // Header
            const Text(
              "Find Your Workplace",
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.deepSeaBlue),
            ),
            const SizedBox(height: 8),
            const Text("Search for your venue to join the team."),
            const SizedBox(height: 32),

            // Search Bar
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: "Venue Name (e.g. 'Coffee')",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      prefixIcon: const Icon(Icons.search),
                    ),
                    onSubmitted: (_) => _search(),
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: _isLoading ? null : _search,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isLoading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text("SEARCH"),
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Results
            Expanded(
              child: _searchResults.isEmpty 
                  ? Center(child: Text(_searchController.text.isNotEmpty && !_isLoading ? "No active venues found." : "Search to start."))
                  : ListView.builder(
                      itemCount: _searchResults.length,
                      itemBuilder: (context, index) {
                        final venue = _searchResults[index];
                        final isRequested = _requestedVenueId == venue.id;

                        return Card(
                          margin: const EdgeInsets.only(bottom: 16),
                          child: ListTile(
                            leading: const CircleAvatar(child: Icon(Icons.store)),
                            title: Text(venue.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text(venue.address),
                            trailing: isRequested
                                ? const Chip(label: Text("SENT"), backgroundColor: Colors.greenAccent)
                                : ElevatedButton(
                                    onPressed: _isLoading ? null : () => _requestToJoin(venue),
                                    child: const Text("JOIN"),
                                  ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
