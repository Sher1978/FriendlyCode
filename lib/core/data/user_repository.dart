import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import 'package:flutter/foundation.dart';

class UserRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Creates or Updates a User record in Firestore 'users' collection.
  Future<void> syncUser(User user, {String? displayName, String? messenger}) async {
    try {
      final userRef = _firestore.collection('users').doc(user.uid);
      
      final doc = await userRef.get();
      
      if (!doc.exists) {
        // Create New User
        final newUser = UserModel(
          userId: user.uid,
          name: displayName ?? 'Guest',
          messengers: {if (messenger != null) messenger: 'ACTIVE'},
          history: {}, 
        );
        
        await userRef.set({
          'name': newUser.name,
          'messengers': newUser.messengers,
          'history': {},
          'joinDate': DateTime.now().toIso8601String(),
          'lastSeen': DateTime.now().toIso8601String(),
        });
      } else {
        // Update Existing User (Last Seen)
        await userRef.update({
          'lastSeen': DateTime.now().toIso8601String(),
          if (displayName != null) 'name': displayName, // Update name if provided
        });
      }
    } catch (e) {
      debugPrint("Error syncing user to Firestore: $e");
      rethrow;
    }
  }
}
