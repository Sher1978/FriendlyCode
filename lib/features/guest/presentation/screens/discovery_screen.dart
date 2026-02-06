import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter/foundation.dart'; // for kIsWeb
import '../../../../core/theme/colors.dart';
import '../../../../core/models/venue_model.dart';

import '../../../../core/data/venue_repository.dart'; // Import Repo
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
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.deepSeaBlueDark,
      body: StreamBuilder<List<VenueModel>>(
        stream: _venueRepo.getVenuesStream(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
             return Center(child: Text('Error: ${snapshot.error}', style: const TextStyle(color: Colors.red)));
          }
          
          if (snapshot.connectionState == ConnectionState.waiting) {
             return const Center(child: CircularProgressIndicator(color: AppColors.lime));
          }

          final venues = snapshot.data ?? []; // Use real data

          return Stack(
            children: [
              // Content Layer (Map or List)
              _isMapView ? _buildMap(venues) : _buildList(venues),

              // Top Search Bar
              Positioned(
                top: 50,
                left: 16,
                right: 16,
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 50,
                        decoration: BoxDecoration(
                          color: AppColors.deepSeaBlue.withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(25),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 10, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: TextField(
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            hintText: "Find sushi, hookah...",
                            hintStyle: const TextStyle(color: Colors.white54),
                            prefixIcon: const Icon(Icons.search, color: AppColors.lime),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Toggle Button
                    GestureDetector(
                      onTap: () => setState(() => _isMapView = !_isMapView),
                      child: Container(
                        height: 50,
                        width: 50,
                        decoration: BoxDecoration(
                          color: AppColors.lime,
                          borderRadius: BorderRadius.circular(25),
                          boxShadow: [
                            BoxShadow(color: AppColors.lime.withValues(alpha: 0.4), blurRadius: 10, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: Icon(
                          _isMapView ? Icons.list : Icons.map,
                          color: AppColors.deepSeaBlueDark,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              // Floating Scan Button (Global Action)
              Positioned(
                bottom: 30,
                right: 20,
                left: 20,
                child: SizedBox(
                   height: 60,
                   child: ElevatedButton.icon(
                     onPressed: () {
                        // TODO: Navigate to GuestScanner
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text("Global Scan Initiated")),
                        );
                     },
                     icon: const Icon(Icons.qr_code_scanner, size: 28),
                     label: const Text("I'M HERE - SCAN QR", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                     style: ElevatedButton.styleFrom(
                       backgroundColor: AppColors.lime,
                       foregroundColor: AppColors.deepSeaBlueDark,
                       elevation: 8,
                       shadowColor: AppColors.lime.withValues(alpha: 0.5),
                       shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                     ),
                   ),
                ),
              ),
            ],
          );
        }
      ),
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: AppColors.deepSeaBlue,
        selectedItemColor: AppColors.lime,
        unselectedItemColor: Colors.white54,
        currentIndex: 0,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.explore), label: 'Discover'),
          BottomNavigationBarItem(icon: Icon(Icons.local_offer), label: 'My Wallet'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildMap(List<VenueModel> venues) {
    // Check if running on a platform that supports Google Maps
    // For Windows Desktop runner (debug), we show a placeholder.
    // kIsWeb is true for Web. 
    // defaultTargetPlatform check is needed for Desktop.
    
    // Simple check: If not Web and (Windows/Linux/Mac), show placeholder.
    bool pwaOrMobile = kIsWeb || (defaultTargetPlatform == TargetPlatform.iOS || defaultTargetPlatform == TargetPlatform.android);
    
    if (!pwaOrMobile) {
      return Container(
        color: Colors.grey[900],
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.map, size: 64, color: Colors.white24),
              SizedBox(height: 16),
              Text(
                "Map not supported on Desktop Runner.\nUse Mobile Emulator or Web.",
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white54),
              ),
            ],
          ),
        ),
      );
    }
  
    return GoogleMap(
      initialCameraPosition: const CameraPosition(
        target: LatLng(25.2048, 55.2708), // Dubai Mock
        zoom: 12,
      ),
      style: _darkMapStyle,
      markers: venues.map((v) => Marker(
        markerId: MarkerId(v.id),
        position: const LatLng(25.2048, 55.2708), // All at same spot for mock
        infoWindow: InfoWindow(title: v.name, snippet: v.description),
      )).toSet(),
    );
  }

  Widget _buildList(List<VenueModel> venues) {
    return ListView.builder(
      padding: const EdgeInsets.only(top: 120, bottom: 100, left: 16, right: 16),
      itemCount: venues.length,
      itemBuilder: (context, index) {
         final venue = venues[index];
         return Card(
           color: AppColors.deepSeaBlueLight,
           margin: const EdgeInsets.only(bottom: 16),
           shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
           child: ListTile(
             contentPadding: const EdgeInsets.all(16),
             leading: const CircleAvatar(radius: 24, backgroundColor: Colors.white10, child: Icon(Icons.store, color: Colors.white)),
             title: Text(venue.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
             subtitle: Text(venue.description, style: const TextStyle(color: Colors.white54)),
             trailing: Column(
               mainAxisAlignment: MainAxisAlignment.center,
               children: [
                 const Text("Up to", style: TextStyle(color: Colors.white38, fontSize: 10)),
                 Text("20%", style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppColors.lime, fontWeight: FontWeight.bold)),
               ],
             ),
             onTap: () {
               Navigator.push(
                 context,
                 MaterialPageRoute(builder: (context) => GuestVenueProfileScreen(venue: venue)),
               );
             },
           ),
         );
      },
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
