import 'package:flutter/material.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

enum UserRole { superAdmin, admin, manager, owner, staff }

class RoleProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  UserRole _currentRole = UserRole.owner; 
  List<String> _venueIds = [];
  String? _uid;
  String? _activeVenueId;

  UserRole get currentRole => _currentRole;
  List<String> get venueIds => _venueIds;
  String? get venueId => _activeVenueId ?? (_venueIds.isNotEmpty ? _venueIds.first : null);
  String? get uid => _uid;

  // Convenience getters for UI logic
  bool get isSuperAdmin => _currentRole == UserRole.superAdmin;
  bool get isAdmin => _currentRole == UserRole.superAdmin || _currentRole == UserRole.admin;
  bool get canManageStaff => _currentRole == UserRole.superAdmin; // Only SuperAdmin creates Admins/Managers
  bool get canManageVenues => _currentRole == UserRole.superAdmin || _currentRole == UserRole.admin || _currentRole == UserRole.manager;

  void setRole(UserRole role) {
    _currentRole = role;
    notifyListeners();
  }

  void setActiveVenueId(String id) {
    _activeVenueId = id;
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
          final userEmail = user.email?.trim().toLowerCase();
          final roleStr = data['role'] as String? ?? 'owner';

          if (roleStr == 'superAdmin' || userEmail == '0451611@gmail.com') {
            _currentRole = UserRole.superAdmin;
            if (data['role'] != 'superAdmin') {
                await docRef.update({'role': 'superAdmin'});
            }
          } else if (roleStr == 'admin') {
            _currentRole = UserRole.admin;
          } else if (roleStr == 'manager') {
            _currentRole = UserRole.manager;
          } else {
            _currentRole = UserRole.owner;
          }
        } else {
          // DOCUMENT DOES NOT EXIST FOR THIS AUTH UID
          // Check for a pre-existing "stub" account with the same email
          if (user.email != null && user.email!.isNotEmpty) {
             final emailSnap = await FirebaseFirestore.instance
                .collection('users')
                .where('email', isEqualTo: user.email)
                .limit(1)
                .get();

             if (emailSnap.docs.isNotEmpty) {
               // FOUND DUPLICATE / STUB
               final stubDoc = emailSnap.docs.first;
               final stubData = stubDoc.data();
               final stubId = stubDoc.id;
               
               debugPrint("Found existing stub account $stubId for ${user.email}. Merging...");
               
               // FOUNDER CHECK
               String resolvedRole = (stubData['role'] as String?) ?? 'owner';
               if (user.email != null && user.email!.trim().toLowerCase() == '0451611@gmail.com') {
                  resolvedRole = 'superAdmin';
               }

               // 1. Merge Data (Priority to New Google Auth for Profile, Old Stub for Roles/Venues)
               final Map<String, dynamic> mergedData = {
                 ...stubData, // Keep old data (venueId, phone, etc.)
                 'email': user.email, // Ensure email matches auth
                 'name': user.displayName ?? stubData['name'] ?? '', // Priority to latest (Google), fallback to stub
                 'photoUrl': user.photoURL ?? stubData['photoUrl'], // Priority to latest
                 'role': resolvedRole, // Use resolved role
                 'lastLogin': FieldValue.serverTimestamp(),
                 'migratedFrom': stubId, // Audit trail
               };

               // 2. Save to New ID location
               await docRef.set(mergedData);

               // 3. Migrate Venue Ownership
               // Find venues owned by the OLD stub ID and update them to the NEW auth ID
               // Also check assignedAdminId / assignedManagerId if we want deep migration
               final venuesOwnedByStub = await FirebaseFirestore.instance
                   .collection('venues')
                   .where('ownerId', isEqualTo: stubId)
                   .get();
               
               for (var vDoc in venuesOwnedByStub.docs) {
                 await vDoc.reference.update({'ownerId': user.uid});
                 debugPrint("Migrated venue ${vDoc.id} ownership to ${user.uid}");
               }
               
               // Use resolved role for current session
               if (resolvedRole == 'superAdmin') _currentRole = UserRole.superAdmin;
               else if (resolvedRole == 'admin') _currentRole = UserRole.admin;
               else if (resolvedRole == 'manager') _currentRole = UserRole.manager;
               else _currentRole = UserRole.owner;
             }
          }
        }

               // 4. Delete Old Stub (to prevent future confusion/duplicates)
               await stubDoc.reference.delete();
               
               // 5. Update Local State
               if (mergedData['role'] == 'superAdmin') {
                 _currentRole = UserRole.superAdmin;
               } else {
                 _currentRole = UserRole.owner;
               }

             } else {
               // AUTO-CREATE USER RECORD
               debugPrint("User document missing for ${user.email}. Creating default record...");
               
               // SPECIAL CASE: Promote Founder Email to superAdmin
               String initialRole = 'owner';
               if (user.email != null && user.email!.trim().toLowerCase() == '0451611@gmail.com') {
                 initialRole = 'superAdmin';
                 debugPrint("Founder email recognized (Fresh Create). Assigning superAdmin role.");
               }

               await docRef.set({
                 'email': user.email,
                 'name': user.displayName ?? '',
                 'role': initialRole,
                 'joinDate': DateTime.now().toIso8601String(),
                 'createdAt': FieldValue.serverTimestamp(),
               });
               _currentRole = initialRole == 'superAdmin' ? UserRole.superAdmin : UserRole.owner;
             }
          } else {
             // No email? Just create fresh.
             await docRef.set({
                'role': 'owner',
                'createdAt': FieldValue.serverTimestamp(),
             });
             _currentRole = UserRole.owner;
          }
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
