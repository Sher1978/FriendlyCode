import 'package:flutter/material.dart';
import '../models/venue_model.dart'; // Just for context if needed
import '../auth/auth_service.dart';
import '../../features/web/presentation/layout/admin_shell.dart';

class RoleProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  UserRole _currentRole = UserRole.owner; // Default to owner for safety

  UserRole get currentRole => _currentRole;

  void setRole(UserRole role) {
    _currentRole = role;
    notifyListeners();
  }

  // Logic to determine role based on email or Firestore doc
  Future<void> refreshRole() async {
    final user = _authService.currentUser;
    if (user != null) {
      // For this project, we can hardcode the SuperAdmin email or check a field
      // Let's assume anyone with '@friendlycode.fun' or a specific list is SuperAdmin
      if (user.email == 'admin@friendlycode.fun' || user.email == 'google@friendlycode.fun') {
        _currentRole = UserRole.superAdmin;
      } else {
        _currentRole = UserRole.owner;
      }
    }
    notifyListeners();
  }
}
