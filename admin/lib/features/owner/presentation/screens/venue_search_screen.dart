import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/models/venue_request_model.dart';
import 'package:firebase_auth/firebase_auth.dart';

class VenueSearchScreen extends StatefulWidget {
  const VenueSearchScreen({super.key});

  @override
  State<VenueSearchScreen> createState() => _VenueSearchScreenState();
}

class _VenueSearchScreenState extends State<VenueSearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final VenueRepository _venueRepo = VenueRepository();
  
  List<VenueModel> _searchResults = [];
  bool _isLoading = false;
  String? _error;

  Future<void> _performSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await _venueRepo.searchVenues(query);
      setState(() {
        _searchResults = results;
      });
    } catch (e) {
      setState(() {
        _error = "Error searching venues: $e";
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _requestToJoin(VenueModel venue) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      showCupertinoDialog(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: const Text("Error"),
          content: const Text("You must be logged in to join a venue."),
          actions: [CupertinoDialogAction(child: const Text("OK"), onPressed: () => Navigator.pop(ctx))],
        ),
      );
      return;
    }

    try {
      final request = VenueRequestModel(
        id: '', 
        userId: user.uid,
        userEmail: user.email ?? 'Unknown',
        userName: user.displayName ?? 'Unknown',
        type: 'join',
        status: 'pending',
        targetVenueId: venue.id,
        targetVenueName: venue.name,
        createdAt: DateTime.now(),
      );

      await _venueRepo.createVenueRequest(request);

      if (mounted) {
        showCupertinoDialog(
          context: context,
          builder: (ctx) => CupertinoAlertDialog(
            title: const Text("Success"),
            content: Text("Request sent to join ${venue.name}!"),
            actions: [
              CupertinoDialogAction(
                child: const Text("OK"), 
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context);
                }
              )
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e"), backgroundColor: Colors.red));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.chevron_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Center(
        child: Container(
          maxWidth: 800,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Find a Venue",
                style: TextStyle(
                  color: AppColors.macosTextPrimary,
                  fontSize: 34,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -1.0,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "Search and request to join an existing venue within the FriendlyCode network.",
                style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 16),
              ),
              const SizedBox(height: 48),

              _buildSearchInput(),

              const SizedBox(height: 32),

              if (_error != null)
                Text(_error!, style: const TextStyle(color: CupertinoColors.systemRed)),

              Expanded(
                child: _isLoading 
                  ? const Center(child: CupertinoActivityIndicator(radius: 12))
                  : ListView.builder(
                      itemCount: _searchResults.length,
                      itemBuilder: (context, index) {
                        return _buildSearchResultTile(_searchResults[index]);
                      },
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchInput() {
    return _buildGlassContainer(
      child: Row(
        children: [
          Expanded(
            child: CupertinoSearchTextField(
              controller: _searchController,
              placeholder: "Search by venue name or city...",
              style: const TextStyle(color: Colors.white, fontSize: 14),
              onSubmitted: (_) => _performSearch(),
            ),
          ),
          const SizedBox(width: 12),
          CupertinoButton(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            color: CupertinoColors.activeBlue,
            borderRadius: BorderRadius.circular(8),
            onPressed: _performSearch,
            child: const Text("Search", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResultTile(VenueModel venue) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.macosDivider),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              image: DecorationImage(
                image: (venue.photoUrl != null && venue.photoUrl!.isNotEmpty) 
                    ? NetworkImage(venue.photoUrl!) 
                    : const AssetImage('assets/images/venue_placeholder.png') as ImageProvider,
                fit: BoxFit.cover,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(venue.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                Text(venue.address, style: TextStyle(color: AppColors.macosTextSecondary.withOpacity(0.6), fontSize: 12)),
              ],
            ),
          ),
          CupertinoButton(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
            color: CupertinoColors.activeBlue.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            onPressed: () => _requestToJoin(venue),
            child: const Text("Join", style: TextStyle(color: CupertinoColors.activeBlue, fontSize: 13, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildGlassContainer({required Widget child}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.macosSurfaceBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.macosDivider),
          ),
          child: child,
        ),
      ),
    );
  }
}
