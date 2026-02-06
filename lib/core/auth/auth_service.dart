import 'package:firebase_auth/firebase_auth.dart';
// import 'package:google_sign_in/google_sign_in.dart'; // REPLACED by conditional import below
import 'google_auth.dart';
import 'package:flutter/foundation.dart'; // for kIsWeb
import '../config/app_config.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  // Use dynamic to bypass compile-time checks on the Web where google_sign_in might be shaky
  late final dynamic _googleSignIn;

  AuthService() {
    if (!kIsWeb) {
      _googleSignIn = GoogleSignIn();
    }
  }

  // Stream of auth changes
  Stream<User?> get authStateChanges => AppConfig.demoMode 
    ? Stream.value(null) 
    : _auth.authStateChanges();

  // Get current user
  User? get currentUser => AppConfig.demoMode ? null : _auth.currentUser;

  /// Sign in Anonymously
  Future<User?> signInAnonymously() async {
    if (AppConfig.demoMode) {
      return null;
    }
    try {
      final UserCredential userCredential = await _auth.signInAnonymously();
      return userCredential.user;
    } catch (e) {
      debugPrint("Error signing in anonymously: $e");
      return null;
    }
  }

  /// Sign in with Google (For Owner/Staff/Returning Guest)
  Future<User?> signInWithGoogle() async {
    if (AppConfig.demoMode) return null;
    try {
      if (kIsWeb) {
        // Web Google Sign In logic (Pure Firebase)
        final GoogleAuthProvider authProvider = GoogleAuthProvider();
        final UserCredential userCredential = await _auth.signInWithPopup(authProvider);
        return userCredential.user;
      } else {
        // Mobile Google Sign In logic
        final dynamic googleUser = await _googleSignIn.signIn();
        if (googleUser == null) return null; // User canceled

        final dynamic googleAuth = await googleUser.authentication;
        final AuthCredential credential = GoogleAuthProvider.credential(
          accessToken: googleAuth.accessToken,
          idToken: googleAuth.idToken,
        );

        final UserCredential userCredential = await _auth.signInWithCredential(credential);
        return userCredential.user;
      }
    } catch (e) {
      debugPrint("Error signing in with Google: $e");
      return null;
    }
  }

  /// Sign Out
  Future<void> signOut() async {
    if (!kIsWeb) {
        await _googleSignIn.signOut();
    }
    await _auth.signOut();
  }
}
