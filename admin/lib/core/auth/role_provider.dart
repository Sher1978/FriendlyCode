import 'package:flutter/material.dart';
import '../models/venue_model.dart'; // Just for context if needed
import '../auth/auth_service.dart';
import '../../features/web/presentation/layout/admin_shell.dart';

import 'package:cloud_firestore/cloud_firestore.dart';

class RoleProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  UserRole _currentRole = UserRole.owner; // Default to owner for safety
  String? _venueId;

  UserRole get currentRole => _currentRole;
  String? get venueId => _venueId;

  void setRole(UserRole role) {
    _currentRole = role;
    notifyListeners();
  }

  // Logic to determine role based on Firestore doc
  Future<void> refreshRole() async {
    final user = _authService.currentUser;
    if (user != null) {
      try {
        final doc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data() != null) {
          final data = doc.data()!;
          if (data['role'] == 'superAdmin') {
            _currentRole = UserRole.superAdmin;
          } else {
             _currentRole = UserRole.owner;
          }
           _venueId = data['venueId'];
        } else {
          _currentRole = UserRole.owner;
          _venueId = null;
        }
      } catch (e) {
        debugPrint("Error fetching role: $e");
        _currentRole = UserRole.owner;
        _venueId = null;
      }
    }
    notifyListeners();
  }
}
