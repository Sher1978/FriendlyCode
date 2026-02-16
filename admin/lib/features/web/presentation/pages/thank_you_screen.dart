import 'dart:async';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/logic/reward_calculator.dart';
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
  final List<VenueTier> tiers;
  final LoyaltyConfig config;
  final DateTime? lastVisitDate; // The actual visit time if this is a return visit

  const ThankYouScreen({
    super.key,
    required this.venueId,
    required this.currentDiscount,
    required this.guestName,
    required this.tiers,
    required this.config,
    this.lastVisitDate,
  });

  @override
  State<ThankYouScreen> createState() => _ThankYouScreenState();
}

class _ThankYouScreenState extends State<ThankYouScreen> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  Timer? _timer;
  late DateTime _screenLoadTime;
  
  // Timer State
  int _timeLeft = 300; // 5 minutes (for claim validation)
  bool _isClaimed = false; // Actually, if we arrive here, it's effectively claimed/viewed
  bool _isExpired = false;
  
  // Prediction Logic
  int _predSecondsLeft = 43200; // 12 hours initially
  String _predLabel = '20% unlocks in:';
  bool _isLocked = true; 
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _screenLoadTime = DateTime.now();
    _pulseController = AnimationController(vsync: this, duration: const Duration(seconds: 1));
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _startSmartTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  void _startSmartTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          // 1. Claim validity timer (Optional visual for "Active Session")
          if (_timeLeft > 0) {
            _timeLeft--;
          }

          // 2. Prediction Window logic (Unified RewardCalculator)
          // Use the actual last visit time if passed (Return Visit), 
          // otherwise use the time this screen successfully loaded (Fresh Claim).
          final baseTime = widget.lastVisitDate ?? _screenLoadTime;
          final now = DateTime.now();
          
          final rewardState = RewardCalculator.calculate(
            baseTime, 
            now, 
            widget.config,
            widget.tiers
          );

          _predSecondsLeft = rewardState.secondsUntilNextChange;
          
          if (rewardState.statusLabelKey == 'unlocks_in') {
             _predLabel = '20% unlocks in:';
          } else if (rewardState.statusLabelKey == 'valid_for') {
             _predLabel = '${rewardState.currentDiscount}% Discount valid for:';
          } else {
             _predLabel = 'Standard Discount';
          }
          
          _isLocked = rewardState.isLocked;
        });
      }
    });
  }

  void _handleClaim() async {
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
        'type': 'redeem',
        'is_test': false, 
      });

      if (mounted) {
        setState(() {
          _isClaimed = true;
          _isLoading = false;
        });
        _pulseController.repeat(reverse: true);
      }
    } catch (e) {
      debugPrint("Error creating visit: $e");
      if (mounted) {
        setState(() {
          _isClaimed = true;
          _isLoading = false;
        });
        _pulseController.repeat(reverse: true);
      }
    }
  }

  String get _timerString {
    if (_isExpired) return AppLocalizations.of(context)!.expired;
    final mins = (_timeLeft / 60).floor();
    final secs = _timeLeft % 60;
    return '$mins:${secs.toString().padLeft(2, '0')}';
  }

  String _formatHours(int seconds) {
    if (seconds <= 0) return "0:00:00";
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    return '$h:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ThankYouColors.background,
      body: Stack(
        children: [

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
                          color: Colors.white.withAlpha(153), // 0.6 alpha
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
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: ThankYouColors.text.withAlpha(25), blurRadius: 10, offset: const Offset(0, 4)) // 0.1 alpha
                            ],
                          ),
                          child: const Center(child: Icon(FontAwesomeIcons.star, color: Color(0xFF4CAF50), size: 24)),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          AppLocalizations.of(context)!.thanksForVisiting(widget.guestName),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: ThankYouColors.text,
                            height: 1.1,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          AppLocalizations.of(context)!.specialTreat,
                          style: TextStyle(
                            fontSize: 14,
                            color: ThankYouColors.text.withAlpha(153), // 0.6 alpha
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],

                      // Card
                      Container(
                        padding: const EdgeInsets.all(32),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(32),
                          border: Border.all(color: ThankYouColors.border, width: 2),
                          boxShadow: [
                            BoxShadow(color: ThankYouColors.text.withAlpha(12), blurRadius: 20, offset: const Offset(0, 8)) // 0.05 alpha
                          ],
                        ),
                        child: Column(
                          children: [
                            // Smart Timer Info (New)
                            Column(
                              children: [
                                Text(
                                  _predLabel.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: ThankYouColors.text.withAlpha(127), // 0.5 alpha
                                    letterSpacing: 1.2,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: _isLocked ? const Color(0xFFFFF3E0) : ThankYouColors.background, // Orange vs Green
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: _isLocked ? const Color(0xFFFFB74D) : ThankYouColors.border
                                    ),
                                  ),
                                  child: Text(
                                    _formatHours(_predSecondsLeft),
                                    style: TextStyle(
                                      color: _isLocked ? const Color(0xFFE65100) : ThankYouColors.text,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'monospace',
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),

                            Text(
                              AppLocalizations.of(context)!.currentDiscount,
                              style: const TextStyle(
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
                                AppLocalizations.of(context)!.offTotalBill,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: _isExpired ? Colors.grey : ThankYouColors.text.withAlpha(102), // 0.4 alpha
                                letterSpacing: 1.5,
                                decoration: _isExpired ? TextDecoration.lineThrough : null,
                              ),
                            ),
                            const SizedBox(height: 32),

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
                                    : Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(FontAwesomeIcons.gift, size: 24),
                                          const SizedBox(width: 12),
                                          Text(AppLocalizations.of(context)!.getMyGift, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                                        ],
                                      ),
                                ),
                              )
                            else
                              SizedBox(
                                height: 80, // Request space for the popped out heart
                                child: Stack(
                                  clipBehavior: Clip.none,
                                  alignment: Alignment.center,
                                  children: [
                                    Container(
                                      width: double.infinity,
                                      height: 64,
                                      decoration: BoxDecoration(
                                        color: _isExpired ? Colors.grey[200] : ThankYouColors.background,
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(color: _isExpired ? Colors.grey : ThankYouColors.button, width: 2),
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const SizedBox(width: 40), // Spacer for the heart
                                          Text(
                                            _timerString,
                                            style: TextStyle(
                                              fontSize: 24,
                                              fontWeight: FontWeight.w900,
                                              color: _isExpired ? Colors.grey : ThankYouColors.button,
                                              fontFamily: 'monospace',
                                              letterSpacing: 2.0,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    
                                    // Floating Heart
                                    if (!_isExpired)
                                      Positioned(
                                        left: 20,
                                        child: AnimatedBuilder(
                                          animation: _pulseAnimation,
                                          builder: (context, child) => Transform.scale(scale: _pulseAnimation.value, child: child),
                                          child: Container(
                                            decoration: const BoxDecoration(
                                              boxShadow: [
                                                BoxShadow(color: Colors.black12, blurRadius: 10, spreadRadius: 2)
                                              ],
                                              shape: BoxShape.circle,
                                              color: Colors.white 
                                            ),
                                            padding: const EdgeInsets.all(8),
                                            child: const Icon(FontAwesomeIcons.solidHeart, color: Colors.red, size: 40)
                                          ),
                                        ),
                                      ),
                                    
                                    if (_isExpired)
                                      const Positioned(
                                        left: 30,
                                        child: Icon(FontAwesomeIcons.ban, color: Colors.grey, size: 30),
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
                      ? AppLocalizations.of(context)!.showStaff
                      : AppLocalizations.of(context)!.tapWhenReady,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: ThankYouColors.text.withOpacity(0.5),
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
