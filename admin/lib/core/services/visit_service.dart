import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/visit_model.dart';

class VisitsService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'visits';

  // Log a new visit
  Future<void> logVisit(VisitModel visit) async {
    // We let Firestore generate the ID if not provided, or use the one in model if we set it.
    // Usually for logs, auto-gen ID is best.
    await _firestore.collection(_collection).add(visit.toMap());
  }

  // Get visits for a specific venue (for Owner Dashboard)
  Stream<List<VisitModel>> getVisitsForVenue(String venueId) {
    return _firestore
        .collection(_collection)
        .where('venueId', isEqualTo: venueId)
        .orderBy('timestamp', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => VisitModel.fromMap(doc.id, doc.data())).toList();
    });
  }

  // Get visits to a venue by a specific guest (for reward logic)
  Future<List<VisitModel>> getGuestHistoryAtVenue(String guestId, String venueId) async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('guestId', isEqualTo: guestId)
        .where('venueId', isEqualTo: venueId)
        .orderBy('timestamp', descending: true)
        .get();

    return snapshot.docs.map((doc) => VisitModel.fromMap(doc.id, doc.data())).toList();
  }
}
