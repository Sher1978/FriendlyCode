import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/models/venue_model.dart';

import '../../../../core/data/venue_repository.dart'; // Import Repo
import '../../../../core/theme/colors.dart'; // Import Colors
import 'guest_venue_profile_screen.dart';

class DiscoveryScreen extends StatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  State<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends State<DiscoveryScreen> {
  bool _isMapView = true;
  final VenueRepository _venueRepo = VenueRepository(); // Init Repo

  @override
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Background handled by Theme
      body: StreamBuilder<List<VenueModel>>(
        stream: _venueRepo.getVenuesStream(),
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text('Error: ${snapshot.error}'));
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

          final venues = snapshot.data ?? []; 

          return SafeArea(
            child: _isMapView 
              ? Stack(
                  children: [
                     _buildMap(venues),
                     Positioned(
                       top: 16, right: 16,
                       child: FloatingActionButton(
                         mini: true,
                         backgroundColor: Colors.white,
                         child: const Icon(Icons.list, color: AppColors.textPrimaryLight),
                         onPressed: () => setState(() => _isMapView = false),
                       ),
                     ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Icon(Icons.arrow_back, size: 24, color: AppColors.textPrimaryLight),
                          Text(
                            "Browse", 
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)
                          ),
                          const SizedBox(width: 24), // Balance arrow
                        ],
                      ),
                    ),

                    // Search Bar
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: TextField(
                        style: Theme.of(context).textTheme.bodyLarge,
                        decoration: InputDecoration(
                          hintText: "Search resorts",
                          prefixIcon: const Icon(Icons.search),
                          filled: true,
                          fillColor: AppColors.backgroundAltLight,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                        ),
                      ),
                    ),

                    // Title
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Popular Resorts", style: Theme.of(context).textTheme.headlineMedium), // 22px bold
                          IconButton(
                            icon: const Icon(Icons.map_outlined),
                            onPressed: () => setState(() => _isMapView = true),
                            tooltip: "View Map",
                          )
                        ],
                      ),
                    ),

                    // List
                    Expanded(
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: venues.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12), // Gap between items
                        itemBuilder: (context, index) {
                           final venue = venues[index];
                           return _buildStitchListItem(context, venue);
                        },
                      ),
                    ),
                  ],
                ),
          );
        }
      ),
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: Colors.white,
        selectedItemColor: AppColors.textPrimaryLight,
        unselectedItemColor: AppColors.textSecondaryLight,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        currentIndex: 0,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Browse'), // Active
          BottomNavigationBarItem(icon: Icon(Icons.map_outlined), label: 'Track'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildStitchListItem(BuildContext context, VenueModel venue) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
           context,
           MaterialPageRoute(builder: (context) => GuestVenueProfileScreen(venue: venue)),
        );
      },
      child: Container(
        color: Colors.transparent, // Hit test
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center, // Align center vertical
          children: [
            // Image
            Container(
              width: 80, // h-14 w-fit -> approx aspect video relative to height 56px
              height: 56,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                color: AppColors.backgroundAltLight,
                image: const DecorationImage(
                  image: NetworkImage("https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80"), // Mock
                  fit: BoxFit.cover,
                ),
              ),
            ),
            const SizedBox(width: 16),
            // Text
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    venue.name,
                    style: Theme.of(context).textTheme.titleMedium, // 16px medium
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    venue.description,
                    style: Theme.of(context).textTheme.bodyMedium, // 14px normal #637c88
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMap(List<VenueModel> venues) {
    return GoogleMap(
      initialCameraPosition: const CameraPosition(
        target: LatLng(25.2048, 55.2708), // Dubai
        zoom: 12,
      ),
      markers: venues
          .where((v) => v.latitude != null && v.longitude != null)
          .map((v) => Marker(
            markerId: MarkerId(v.id),
            position: LatLng(v.latitude!, v.longitude!),
            infoWindow: InfoWindow(title: v.name),
          )).toSet(),
      onMapCreated: (GoogleMapController controller) {
        controller.setMapStyle(_darkMapStyle);
      },
      myLocationEnabled: true,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
    );
  }
  
  // Minimal Dark Map Style JSON
  final String _darkMapStyle = '''
  [
    {
      "elementType": "geometry",
      "stylers": [{"color": "#212121"}]
    },
    {
      "elementType": "labels.icon",
      "stylers": [{"visibility": "off"}]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#757575"}]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{"color": "#212121"}]
    },
    {
      "featureType": "administrative",
      "elementType": "geometry",
      "stylers": [{"color": "#757575"}]
    },
    {
      "featureType": "administrative.country",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#9e9e9e"}]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#757575"}]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry",
      "stylers": [{"color": "#181818"}]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#616161"}]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text.stroke",
      "stylers": [{"color": "#1b1b1b"}]
    },
    {
      "featureType": "road",
      "elementType": "geometry.fill",
      "stylers": [{"color": "#2c2c2c"}]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#8a8a8a"}]
    },
    {
      "featureType": "road.arterial",
      "elementType": "geometry",
      "stylers": [{"color": "#373737"}]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{"color": "#3c3c3c"}]
    },
    {
      "featureType": "road.highway.controlled_access",
      "elementType": "geometry",
      "stylers": [{"color": "#4e4e4e"}]
    },
    {
      "featureType": "road.local",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#616161"}]
    },
    {
      "featureType": "transit",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#757575"}]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{"color": "#000000"}]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#3d3d3d"}]
    }
  ]
  ''';
}
