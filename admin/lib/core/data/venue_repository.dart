import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/models/venue_model.dart';
import '../../core/models/venue_request_model.dart';
import 'package:flutter/foundation.dart';

class VenueRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Stream of venues
  /// [includeInactive] - if true, returns both active and frozen venues (for Admin)
  Stream<List<VenueModel>> getVenuesStream({bool includeInactive = false}) {
    try {
      Query query = _firestore.collection('venues');
      
      if (!includeInactive) {
        query = query.where('isActive', isEqualTo: true);
      }

      return query.snapshots().map((snapshot) {
        return snapshot.docs.map((doc) {
          return VenueModel.fromMap(doc.id, doc.data() as Map<String, dynamic>);
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

  /// Delete a venue
  Future<void> deleteVenue(String venueId) async {
    try {
      await _firestore.collection('venues').doc(venueId).delete();
    } catch (e) {
      debugPrint("Error deleting venue: $e");
      rethrow;
    }
  }

  // --- Request Management ---

  /// Create a new venue request (join or create)
  Future<void> createVenueRequest(VenueRequestModel request) async {
    await _firestore.collection('venue_requests').add(request.toMap());
  }

  /// Get pending requests for a specific user
  Stream<List<VenueRequestModel>> getUserRequestsStream(String userId) {
    return _firestore
        .collection('venue_requests')
        .where('userId', isEqualTo: userId)
        .where('status', isEqualTo: 'pending')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => VenueRequestModel.fromMap(doc.id, doc.data()))
            .toList());
  }
  
  /// Search venues by name (case-insensitive simulation for Join flow)
  Future<List<VenueModel>> searchVenues(String query) async {
     // Note: Firestore doesn't support true case-insensitive search easily without external tools or extra fields.
     // For now, we use the simple range check on the 'name' field.
    final snapshot = await _firestore
        .collection('venues')
        .where('name', isGreaterThanOrEqualTo: query)
        .where('name', isLessThan: query + 'z')
        .where('isActive', isEqualTo: true)
        .limit(10)
        .get();

    return snapshot.docs.map((doc) => VenueModel.fromMap(doc.id, doc.data())).toList();
  }

  /// Get ALL pending requests (For Superadmin)
  Stream<List<VenueRequestModel>> getAllPendingRequestsStream() {
    return _firestore
        .collection('venue_requests')
        .where('status', isEqualTo: 'pending')
        .orderBy('createdAt', descending: false)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => VenueRequestModel.fromMap(doc.id, doc.data()))
            .toList());
  }

  /// Update request status (Approve/Reject)
  Future<void> updateRequestStatus(String requestId, String status) async {
    await _firestore.collection('venue_requests').doc(requestId).update({'status': status});
  }
}
