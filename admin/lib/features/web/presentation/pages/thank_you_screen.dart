import 'dart:async';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ThankYouColors {
  static const Color background = Color(0xFFE8F5E9); // Light Green
  static const Color text = Color(0xFF1B5E20); // Dark Green
  static const Color button = Color(0xFF2E7D32); // Main Green
  static const Color border = Color(0xFFA5D6A7); // Border Green
  static const Color accent = Color(0xFF81C784); // Light Accent
}

class ThankYouScreen extends StatefulWidget {
  final String? venueId;
  final int currentDiscount;
  final String guestName;

  const ThankYouScreen({
    super.key,
    required this.venueId,
    required this.currentDiscount,
    required this.guestName,
  });

  @override
  State<ThankYouScreen> createState() => _ThankYouScreenState();
}

class _ThankYouScreenState extends State<ThankYouScreen> with SingleTickerProviderStateMixin {
  bool _isClaimed = false;
  int _timeLeft = 300; // 5 minutes
  Timer? _timer;
  bool _isLoading = false;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(seconds: 1));
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    // Pulse only when claimed? React says yes.
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  void _startTimer() {
    _pulseController.repeat(reverse: true);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_timeLeft > 0) {
        setState(() => _timeLeft--);
      } else {
        _timer?.cancel();
        _pulseController.stop();
      }
    });
  }

  Future<void> _handleClaim() async {
    setState(() => _isLoading = true);
    try {
      final user = FirebaseAuth.instance.currentUser;
      final uid = user?.uid ?? 'anonymous';

      // 1. Create visit record
      await FirebaseFirestore.instance.collection('visits').add({
        'uid': uid,
        'venueId': widget.venueId,
        'guestName': widget.guestName,
        'discountValue': widget.currentDiscount,
        'timestamp': FieldValue.serverTimestamp(),
        'status': 'pending_validation',
        'is_test': false, // Can be dynamic
      });

      if (mounted) {
        setState(() {
          _isClaimed = true;
          _isLoading = false;
        });
        _startTimer();
      }
    } catch (e) {
      debugPrint("Error creating visit: $e");
      // Still show success state to not block user
      if (mounted) {
        setState(() {
          _isClaimed = true;
          _isLoading = false;
        });
        _startTimer();
      }
    }
  }

  String get _timerString {
    final mins = (_timeLeft / 60).floor();
    final secs = _timeLeft % 60;
    return '$mins:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ThankYouColors.background,
      body: Stack(
        children: [
          // Pulse Background (Heartbeat) - specific to React design
          if (_isClaimed)
            Center(
              child: AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _pulseAnimation.value,
                    child: Opacity(
                      opacity: 0.1, // React uses [0.1, 0.3, 0.1]
                      child: const Icon(FontAwesomeIcons.solidHeart, color: Colors.red, size: 300),
                    ),
                  );
                },
              ),
            ),

          SafeArea(
            child: Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          children: [
                            const Icon(FontAwesomeIcons.user, size: 12, color: ThankYouColors.text),
                            const SizedBox(width: 8),
                            Text(
                              widget.guestName.toUpperCase(),
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: ThankYouColors.text,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                // Main Content
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0),
                  child: Column(
                    children: [
                      // Greeting
                      if (!_isClaimed) ...[
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: ThankYouColors.text.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4))
                            ],
                          ),
                          child: const Center(child: Icon(FontAwesomeIcons.star, color: Color(0xFF4CAF50), size: 32)),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          "Thanks for visiting,\n${widget.guestName}!",
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                            color: ThankYouColors.text,
                            height: 1.1,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "Here is your special treat.",
                          style: TextStyle(
                            fontSize: 18,
                            color: ThankYouColors.text.withValues(alpha: 0.6),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 32),
                      ],

                      // Card
                      Container(
                        padding: const EdgeInsets.all(32),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(32),
                          border: Border.all(color: ThankYouColors.border, width: 2),
                          boxShadow: [
                            BoxShadow(color: ThankYouColors.text.withValues(alpha: 0.05), blurRadius: 20, offset: const Offset(0, 8))
                          ],
                        ),
                        child: Column(
                          children: [
                            const Text(
                              "CURRENT DISCOUNT",
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 2.0,
                                color: ThankYouColors.accent,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              "${widget.currentDiscount}%",
                              style: const TextStyle(
                                fontSize: 80,
                                fontWeight: FontWeight.w900,
                                color: ThankYouColors.button,
                                height: 1.0,
                              ),
                            ),
                            Text(
                              "OFF TOTAL BILL",
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: ThankYouColors.text.withValues(alpha: 0.4),
                                letterSpacing: 1.5,
                              ),
                            ),
                            const SizedBox(height: 32),

                            // Action Button or Timer
                            if (!_isClaimed)
                              SizedBox(
                                width: double.infinity,
                                height: 64,
                                child: ElevatedButton(
                                  onPressed: _isLoading ? null : _handleClaim,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: ThankYouColors.button,
                                    foregroundColor: Colors.white,
                                    elevation: 8,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                  ),
                                  child: _isLoading 
                                    ? const CircularProgressIndicator(color: Colors.white)
                                    : const Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(FontAwesomeIcons.gift, size: 24),
                                          SizedBox(width: 12),
                                          Text("GET MY GIFT", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                                        ],
                                      ),
                                ),
                              )
                            else
                              Container(
                                width: double.infinity,
                                height: 64,
                                decoration: BoxDecoration(
                                  color: ThankYouColors.background,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: ThankYouColors.button, width: 2),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    // Animated Heart Icon
                                    AnimatedBuilder(
                                      animation: _pulseAnimation,
                                      builder: (context, child) => Transform.scale(scale: _pulseAnimation.value, child: child),
                                      child: const Icon(FontAwesomeIcons.heart, color: Colors.red, size: 20),
                                    ),
                                    const SizedBox(width: 16),
                                    Text(
                                      _timerString,
                                      style: const TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.w900,
                                        color: ThankYouColors.button,
                                        fontFamily: 'monospace',
                                        letterSpacing: 2.0,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                // Instructions
                Padding(
                  padding: const EdgeInsets.only(bottom: 32.0),
                  child: Text(
                    _isClaimed 
                      ? "Show this screen to the staff\nwhen paying to apply your discount."
                      : "Tap the button above when\nyou are ready to pay.",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: ThankYouColors.text.withValues(alpha: 0.5),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
