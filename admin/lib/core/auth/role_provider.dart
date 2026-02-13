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
        final doc = await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .get()
            .timeout(const Duration(seconds: 5));
        
        if (doc.exists && doc.data() != null) {
          final data = doc.data()!;
          if (data['role'] == 'superAdmin') {
            _currentRole = UserRole.superAdmin;
          } else {
            _currentRole = UserRole.owner;
          }
        } else {
          _currentRole = UserRole.owner;
        }

        // Fetch all venues for this user
        final venuesSnap = await FirebaseFirestore.instance
            .collection('venues')
            .where('ownerId', isEqualTo: user.uid)
            .get()
            .timeout(const Duration(seconds: 5));
        
        if (venuesSnap.docs.isNotEmpty) {
           _venueIds = venuesSnap.docs.map((doc) => doc.id).toList();
        } else if (user.email != null && user.email!.isNotEmpty) {
           // Fallback: Check by email
           final venuesByEmailSnap = await FirebaseFirestore.instance
              .collection('venues')
              .where('ownerEmail', isEqualTo: user.email)
              .get()
              .timeout(const Duration(seconds: 5));
           
           _venueIds = venuesByEmailSnap.docs.map((doc) => doc.id).toList();
        } else {
           _venueIds = [];
        }

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
