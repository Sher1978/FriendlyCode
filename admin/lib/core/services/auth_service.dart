import 'package:firebase_auth/firebase_auth.dart';
import '../auth/google_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'fcm_service.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  // Use dynamic to bypass compile-time checks on the Web
  late final dynamic _googleSignIn;

  AuthService() {
    if (!kIsWeb) {
      _googleSignIn = GoogleSignIn();
    }
  }

  // Stream of auth changes
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // Get current user
  User? get currentUser => _auth.currentUser;

  // Sign in with Email and Password
  Future<User?> signInWithEmailAndPassword(String email, String password) async {
    try {
      final UserCredential userCredential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      return userCredential.user;
    } catch (e) {
      print("Error signing in with Email: $e");
      rethrow;
    }
  }

  // Sign in with Google
  Future<User?> signInWithGoogle() async {
    try {
      if (kIsWeb) {
        // Web specific logic
        GoogleAuthProvider authProvider = GoogleAuthProvider();
        // Force account selection prompt
        authProvider.setCustomParameters({'prompt': 'select_account'});
        
        final UserCredential userCredential = await _auth.signInWithPopup(authProvider);
        return userCredential.user;
      } else {
        // Mobile logic (Android/iOS)
        final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
        if (googleUser == null) return null; // User canceled

        final dynamic googleAuth = await googleUser.authentication;

        final OAuthCredential credential = GoogleAuthProvider.credential(
          accessToken: googleAuth.accessToken,
          idToken: googleAuth.idToken,
        );

        final UserCredential userCredential = await _auth.signInWithCredential(credential);
      if (userCredential.user != null) {
        // Save FCM Token
        final token = await FCMService().getToken();
        if (token != null) {
          await FirebaseFirestore.instance
              .collection('users')
              .doc(userCredential.user!.uid)
              .set({'fcmToken': token}, SetOptions(merge: true));
        }
      }
      return userCredential.user;
    } catch (e) {
      print("Error signing in with Google: $e");
      rethrow;
    }
  }

  // Sign out
  Future<void> signOut() async {
    if (!kIsWeb) {
      await _googleSignIn.signOut();
    }
    await _auth.signOut();
  }

  // Update Profile
  Future<void> updateProfile({String? name, String? email}) async {
    try {
      final user = _auth.currentUser;
      if (user == null) throw "No user signed in.";

      if (name != null && name != user.displayName) {
        await user.updateDisplayName(name);
      }

      if (email != null && email != user.email) {
        await user.verifyBeforeUpdateEmail(email);
        // Note: verifyBeforeUpdateEmail sends an email to the new address.
        // The email isn't updated until the user clicks the link.
      }
    } catch (e) {
      print("Error updating profile: $e");
      rethrow;
    }
  }
}
