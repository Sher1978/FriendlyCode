import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class FCMService {
  final _firebaseMessaging = FirebaseMessaging.instance;
  
  // Singleton pattern
  static final FCMService _instance = FCMService._internal();
  factory FCMService() => _instance;
  FCMService._internal();

  Future<void> initialize() async {
    // 1. Request Permission
    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      debugPrint('User granted permission');
    } else if (settings.authorizationStatus == AuthorizationStatus.provisional) {
      debugPrint('User granted provisional permission');
    } else {
      debugPrint('User declined or has not accepted permission');
      return;
    }

    // 2. Foreground Message Handling
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('Got a message whilst in the foreground!');
      debugPrint('Message data: ${message.data}');

      if (message.notification != null) {
        debugPrint('Message also contained a notification: ${message.notification}');
        // TODO: Show local notification if needed, or update UI
      }
    });
    
    // 3. Background Message Handling works automatically if top-level handler is set in main.dart
  }

  Future<String?> getToken() async {
    try {
      if (kIsWeb) {
        // VAPID key is required for Web. 
        // Note: You need to generate a key pair in Firebase Console -> Cloud Messaging -> Web Push certificates
        // For now, returning null on web if not configured, or remove this check if not supporting web push yet.
        return await _firebaseMessaging.getToken(vapidKey: "YOUR_VAPID_KEY_HERE"); 
      }
      return await _firebaseMessaging.getToken();
    } catch (e) {
      debugPrint('Error getting FCM token: $e');
      return null;
    }
  }

  Stream<String> get onTokenRefresh => _firebaseMessaging.onTokenRefresh;
}
