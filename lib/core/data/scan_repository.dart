import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/scan_model.dart';
import '../config/app_config.dart';

class ScanRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Listen for pending scans for a specific venue
  Stream<List<ScanModel>> getPendingScansStream(String venueId) {
    if (AppConfig.demoMode) {
      return Stream.value([
        ScanModel(
          id: 's1',
          venueId: '1',
          guestId: 'g1',
          guestName: 'Sher (Demo)',
          applicableDiscount: 20,
          timestamp: DateTime.now(),
        ),
      ]);
    }
    return _firestore
        .collection('scans')
        .where('venueId', isEqualTo: venueId)
        .where('status', isEqualTo: 'pending')
        .orderBy('timestamp', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => ScanModel.fromMap(doc.id, doc.data()))
            .toList());
  }

  /// Create a new scan request (Called by Guest)
  Future<void> requestScan(ScanModel scan) async {
    await _firestore.collection('scans').add(scan.toMap());
  }

  /// Update scan status (Confirmed/Rejected by Waiter)
  Future<void> updateScanStatus(String scanId, String newStatus) async {
    await _firestore.collection('scans').doc(scanId).update({
      'status': newStatus,
    });
    
    // TODO: If confirmed, also add to guest history and update venue stats via Cloud Functions
  }
}
