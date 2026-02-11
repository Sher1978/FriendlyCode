import 'package:cloud_firestore/cloud_firestore.dart';

class DiscountRequest {
  final String id;
  final String venueId;
  final String guestEmail;
  final String guestName;
  final int discountAmount;
  final String status;
  final DateTime timestamp;

  DiscountRequest({
    required this.id,
    required this.venueId,
    required this.guestEmail,
    required this.guestName,
    required this.discountAmount,
    required this.status,
    required this.timestamp,
  });

  factory DiscountRequest.fromFirestore(DocumentSnapshot doc) {
    Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
    return DiscountRequest(
      id: doc.id,
      venueId: data['venueId'] ?? '',
      guestEmail: data['guestEmail'] ?? '',
      guestName: data['guestName'] ?? '',
      discountAmount: data['discountAmount'] ?? 0,
      status: data['status'] ?? 'pending',
      timestamp: (data['timestamp'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }
}

class NotificationService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<DiscountRequest>> getPendingRequests(String venueId) {
    return _firestore
        .collection('discount_requests')
        .where('venueId', isEqualTo: venueId)
        .where('status', isEqualTo: 'pending')
        .orderBy('timestamp', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => DiscountRequest.fromFirestore(doc)).toList());
  }

  Future<void> approveRequest(DiscountRequest request) async {
    // 1. Create Visit record
    await _firestore.collection('visits').add({
      'venueId': request.venueId,
      'guestEmail': request.guestEmail,
      'guestName': request.guestName,
      'discountAmount': request.discountAmount,
      'timestamp': FieldValue.serverTimestamp(),
    });

    // 2. Update stats for venue (Increment scans)
    await _firestore.collection('venues').doc(request.venueId).update({
      'stats.totalScans': FieldValue.increment(1),
    });

    // 3. Mark request as approved (or delete)
    await _firestore.collection('discount_requests').doc(request.id).update({
      'status': 'approved',
    });
  }

  Future<void> rejectRequest(String requestId) async {
    await _firestore.collection('discount_requests').doc(requestId).update({
      'status': 'rejected',
    });
  }
}
