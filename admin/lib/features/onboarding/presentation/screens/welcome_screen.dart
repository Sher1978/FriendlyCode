import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/models/venue_request_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/theme/colors.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  final _venueRepo = VenueRepository();
  final _userId = FirebaseAuth.instance.currentUser!.uid;
  bool _isLoading = true;
  List<VenueRequestModel> _pendingRequests = [];
  
  // Search state
  final _searchController = TextEditingController();
  List<VenueModel> _searchResults = [];
  bool _isSearching = false;

  // Create state
  final _venueNameController = TextEditingController();
  final _venueAddressController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  void _loadRequests() {
    _venueRepo.getUserRequestsStream(_userId).listen((requests) {
      if (mounted) {
        setState(() {
          _pendingRequests = requests;
          _isLoading = false;
        });
      }
    });
  }

  Future<void> _search() async {
    if (_searchController.text.isEmpty) return;
    setState(() => _isSearching = true);
    try {
      final results = await _venueRepo.searchVenues(_searchController.text);
      setState(() => _searchResults = results);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    } finally {
      setState(() => _isSearching = false);
    }
  }

  Future<void> _submitJoinRequest(VenueModel venue) async {
    final user = FirebaseAuth.instance.currentUser!;
    final request = VenueRequestModel(
      id: '', // Firestore auto-gen
      type: 'join',
      status: 'pending',
      userId: user.uid,
      userEmail: user.email ?? '',
      userName: user.displayName ?? 'Unknown',
      targetVenueId: venue.id,
      targetVenueName: venue.name,
      createdAt: DateTime.now(),
    );

    await _venueRepo.createVenueRequest(request);
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Join request sent!")));
  }

  Future<void> _submitCreateRequest() async {
    if (_venueNameController.text.isEmpty || _venueAddressController.text.isEmpty) return;

    final user = FirebaseAuth.instance.currentUser!;
    final request = VenueRequestModel(
      id: '',
      type: 'create',
      status: 'pending',
      userId: user.uid,
      userEmail: user.email ?? '',
      userName: user.displayName ?? 'Unknown',
      newVenueDetails: {
        'name': _venueNameController.text,
        'address': _venueAddressController.text,
      },
      createdAt: DateTime.now(),
    );

    await _venueRepo.createVenueRequest(request);
    Navigator.pop(context); // Close dialog
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Venue creation request sent!")));
  }

  void _showCreateDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Create New Venue"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: _venueNameController, decoration: const InputDecoration(labelText: "Venue Name")),
            const SizedBox(height: 16),
            TextField(controller: _venueAddressController, decoration: const InputDecoration(labelText: "Address")),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("CANCEL")),
          ElevatedButton(onPressed: _submitCreateRequest, child: const Text("SUBMIT")),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      appBar: AppBar(
        title: const Text("Welcome to FriendlyCode"),
        backgroundColor: AppColors.deepSeaBlue,
        actions: [
           IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => FirebaseAuth.instance.signOut(),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_pendingRequests.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  border: Border.all(color: Colors.orange),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    const Text("⏳ You have pending requests", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
                    const SizedBox(height: 8),
                    ..._pendingRequests.map((req) => Text(
                      req.type == 'join' 
                          ? "Joining: ${req.targetVenueName}" 
                          : "Creating: ${req.newVenueDetails?['name']}",
                    )),
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],

            const Text(
              "Choose an option to get started:",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),

            // Option 1: Create New Venue
            ElevatedButton.icon(
              onPressed: _pendingRequests.isNotEmpty ? null : _showCreateDialog,
              icon: const Icon(Icons.add_business),
              label: const Text("REGISTER NEW VENUE"),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.all(20),
                backgroundColor: AppColors.deepSeaBlue,
              ),
            ),
            
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 32),

            // Option 2: Join Existing
            const Text("Or join an existing team:", style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      hintText: "Search Venue Name",
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _search(),
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: _isSearching ? null : _search,
                  child: const Text("SEARCH"),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            Expanded(
              child: _searchResults.isEmpty 
                  ? Center(child: Text(_searchController.text.isNotEmpty && !_isSearching ? "No venues found." : "Search to join a team."))
                  : ListView.builder(
                      itemCount: _searchResults.length,
                      itemBuilder: (context, index) {
                        final venue = _searchResults[index];
                        final hasPending = _pendingRequests.any((r) => r.targetVenueId == venue.id);
                        
                        return ListTile(
                          title: Text(venue.name),
                          subtitle: Text(venue.address),
                          trailing: hasPending 
                              ? const Chip(label: Text("PENDING"))
                              : ElevatedButton(
                                  onPressed: () => _submitJoinRequest(venue),
                                  child: const Text("JOIN"),
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
