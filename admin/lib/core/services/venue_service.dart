import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/venue_model.dart';

class VenuesService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'venues';

  // Create or Update Venue
  Future<void> saveVenue(VenueModel venue) async {
    final docRef = venue.id.isEmpty 
        ? _firestore.collection(_collection).doc() 
        : _firestore.collection(_collection).doc(venue.id);
    await docRef.set(venue.toMap(), SetOptions(merge: true));
  }

  // Get Venue by Owner ID
  Future<VenueModel?> getVenueByOwnerId(String ownerId) async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('ownerId', isEqualTo: ownerId)
        .limit(1)
        .get();

    if (snapshot.docs.isNotEmpty) {
      return VenueModel.fromMap(snapshot.docs.first.id, snapshot.docs.first.data());
    }
    return null;
  }

  // Get Venue by ID
  Future<VenueModel?> getVenueById(String id) async {
    final doc = await _firestore.collection(_collection).doc(id).get();
    if (doc.exists) {
      return VenueModel.fromMap(doc.id, doc.data()!);
    }
    return null;
  }

  // Get All Venues (Super Admin)
  Stream<List<VenueModel>> getAllVenues() {
    return _firestore.collection(_collection).snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => VenueModel.fromMap(doc.id, doc.data())).toList();
    });
  }
}
