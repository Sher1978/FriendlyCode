import 'package:flutter/material.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

enum UserRole { superAdmin, owner, staff }

class RoleProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  UserRole _currentRole = UserRole.owner; 
  List<String> _venueIds = [];
  String? _uid;

  UserRole get currentRole => _currentRole;
  List<String> get venueIds => _venueIds;
  String? get venueId => _venueIds.isNotEmpty ? _venueIds.first : null;
  String? get uid => _uid;

  void setRole(UserRole role) {
    _currentRole = role;
    notifyListeners();
  }

  Future<void> refreshRole() async {
    final user = _authService.currentUser;
    if (user != null) {
      _uid = user.uid;
      try {
        final docRef = FirebaseFirestore.instance.collection('users').doc(user.uid);
        final doc = await docRef.get().timeout(const Duration(seconds: 5));
        
        if (doc.exists && doc.data() != null) {
          final data = doc.data()!;
          if (data['role'] == 'superAdmin') {
            _currentRole = UserRole.superAdmin;
          } else {
            _currentRole = UserRole.owner;
          }
        } else {
          // AUTO-CREATE USER RECORD
          debugPrint("User document missing for ${user.email}. Creating default record...");
          await docRef.set({
            'email': user.email,
            'name': user.displayName ?? '',
            'role': 'owner',
            'joinDate': DateTime.now().toIso8601String(),
            'createdAt': FieldValue.serverTimestamp(),
          });
          _currentRole = UserRole.owner;
        }

        // Fetch all venues for this user
        final venuesSnap = await FirebaseFirestore.instance
            .collection('venues')
            .where('ownerId', isEqualTo: user.uid)
            .get()
            .timeout(const Duration(seconds: 5));
        
        Set<String> venueIdsSet = {};

        // 1. Venues where user is ownerId
        if (venuesSnap.docs.isNotEmpty) {
           venueIdsSet.addAll(venuesSnap.docs.map((doc) => doc.id));
        } 
        
        // 2. Venues where user is ownerEmail (Legacy/Fallback)
        if (user.email != null && user.email!.isNotEmpty) {
           final venuesByEmailSnap = await FirebaseFirestore.instance
              .collection('venues')
              .where('ownerEmail', isEqualTo: user.email)
              .get()
              .timeout(const Duration(seconds: 5));
           
           if (venuesByEmailSnap.docs.isNotEmpty) {
             venueIdsSet.addAll(venuesByEmailSnap.docs.map((doc) => doc.id));
           }
        }

        // 3. Venues assigned via User Document (Staff/Co-Owner)
        if (doc.exists && doc.data() != null) {
          final data = doc.data()!;
          if (data['venueId'] != null && (data['venueId'] as String).isNotEmpty) {
            venueIdsSet.add(data['venueId']);
          }
        }

        _venueIds = venueIdsSet.toList();

      } catch (e) {
        debugPrint("Error fetching role/venues: $e");
        _currentRole = UserRole.owner;
        _venueIds = [];
      }
    } else {
      _uid = null;
      _venueIds = [];
      _currentRole = UserRole.owner;
    }
    notifyListeners();
  }
}
