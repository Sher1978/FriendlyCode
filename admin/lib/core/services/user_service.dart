import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/auth/role_provider.dart';

class UserService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'users';

  // Get User by Email
  Future<Map<String, dynamic>?> getUserByEmail(String email) async {
    try {
      final snapshot = await _firestore
          .collection(_collection)
          .where('email', isEqualTo: email)
          .limit(1)
          .get();

      if (snapshot.docs.isNotEmpty) {
        // Return data + uid
        final data = snapshot.docs.first.data();
        data['uid'] = snapshot.docs.first.id;
        return data;
      }
      return null;
    } catch (e) {
      print("Error fetching user by email: $e");
      return null;
    }
  }

  // Get Staff for Venue
  Stream<List<Map<String, dynamic>>> getStaffForVenue(String venueId) {
    return _firestore
        .collection(_collection)
        .where('venueId', isEqualTo: venueId)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        final data = doc.data();
        data['uid'] = doc.id;
        return data;
      }).toList();
    });
  }

  // Assign User to Venue (Owner or Staff)
  Future<void> assignUserToVenue({
    required String uid,
    required String venueId,
    required UserRole role,
  }) async {
    String roleString = role == UserRole.owner ? 'owner' : 'staff';
    
    await _firestore.collection(_collection).doc(uid).update({
      'venueId': venueId,
      'role': roleString,
    });
  }

  // Add Personnel (Owner/Staff) by Email
  Future<void> addPersonnelByEmail({
    required String email,
    required String venueId,
    required UserRole role,
  }) async {
    final user = await getUserByEmail(email);
    if (user == null) {
      throw "User with email $email not found. They must sign in at least once or be added manually.";
    }
    
    await assignUserToVenue(
      uid: user['uid'],
      venueId: venueId,
      role: role,
    );
  }

  // Remove User from Venue
  Future<void> removeUserFromVenue(String uid) async {
    await _firestore.collection(_collection).doc(uid).update({
      'venueId': FieldValue.delete(),
      'role': FieldValue.delete(), // Or set to 'game' or 'guest'
    });
  }
  // Create User Stub (for adding new staff)
  Future<void> createUserStub({
    required String email,
    required String name,
    required String venueId,
    required UserRole role,
  }) async {
    final existingUser = await getUserByEmail(email);
    if (existingUser != null) {
      throw "User with email $email already exists.";
    }

    final newDoc = _firestore.collection(_collection).doc(); // Auto-ID
    await newDoc.set({
      'email': email,
      'name': name,
      'venueId': venueId,
      'role': role == UserRole.owner ? 'owner' : 'staff',
      'joinDate': DateTime.now().toIso8601String(),
    });
  }

  // Update User Profile
  Future<void> updateUser(String uid, Map<String, dynamic> data) async {
    await _firestore.collection(_collection).doc(uid).update(data);
  }
}
