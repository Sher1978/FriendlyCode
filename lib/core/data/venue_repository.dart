import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/models/venue_model.dart';
import '../../core/config/app_config.dart';
import 'package:flutter/foundation.dart';

class VenueRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Stream of all active venues (for Discovery)
  Stream<List<VenueModel>> getVenuesStream() {
    if (AppConfig.demoMode) {
      return Stream.value([
        VenueModel(
          id: '1',
          name: 'Sushi Palace (DEMO)',
          description: 'Best Sushi in town',
          ownerEmail: 'demo@example.com',
          tiers: [
            DiscountTier(maxHours: 24, discountPercent: 20),
            DiscountTier(maxHours: 48, discountPercent: 15),
          ],
          subscription: VenueSubscription(plan: 'pro', isPaid: true),
          stats: VenueStats(
            avgReturnHours: 12.5, 
            totalCheckins: 142,
            discountDistribution: {"20": 45, "15": 30, "10": 15, "5": 10},
          ),
        ),
        VenueModel(
          id: '2',
          name: 'Hookah Lounge (DEMO)',
          description: 'Premium experience',
          ownerEmail: 'demo2@example.com',
          tiers: [],
          subscription: VenueSubscription(plan: 'free', isPaid: false),
          stats: VenueStats(avgReturnHours: 0, totalCheckins: 0),
        ),
      ]);
    }
    try {
      return _firestore
          .collection('venues')
          .where('isActive', isEqualTo: true) // Only active venues
          .snapshots()
          .map((snapshot) {
            return snapshot.docs.map((doc) {
              return VenueModel.fromMap(doc.id, doc.data());
            }).toList();
          });
    } catch (e) {
      debugPrint("Error fetching venues stream: $e");
      return const Stream.empty();
    }
  }

  /// Get a single venue by ID
  Future<VenueModel?> getVenueById(String id) async {
    try {
      final doc = await _firestore.collection('venues').doc(id).get();
      if (doc.exists) {
        return VenueModel.fromMap(doc.id, doc.data()!);
      }
      return null;
    } catch (e) {
      debugPrint("Error fetching venue by ID: $e");
      return null;
    }
  }

  /// Stream a single venue (for Owner Dashboard)
  Stream<VenueModel?> getVenueStream(String venueId) {
    return _firestore
        .collection('venues')
        .doc(venueId)
        .snapshots()
        .map((doc) => doc.exists ? VenueModel.fromMap(doc.id, doc.data()!) : null);
  }
}
