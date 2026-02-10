import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/models/venue_model.dart';
import '../../core/config/app_config.dart';
import 'package:flutter/foundation.dart';

class VenueRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Stream of all active venues (for Discovery)
  Stream<List<VenueModel>> getVenuesStream() {
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

  /// Update venue data
  Future<void> updateVenue(String venueId, Map<String, dynamic> data) async {
    try {
      await _firestore.collection('venues').doc(venueId).update(data);
    } catch (e) {
      debugPrint("Error updating venue: $e");
      rethrow;
    }
  }
}
