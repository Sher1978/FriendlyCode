import 'dart:math';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'lead_capture_screen.dart';
import 'thank_you_screen.dart'; // Import ThankYouScreen
import 'package:friendly_code/core/logic/reward_calculator.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/l10n/app_localizations.dart';
import 'package:friendly_code/core/localization/locale_provider.dart';
import 'package:provider/provider.dart';

class B2CHomeScreen extends StatefulWidget {
  final String? venueId;
  const B2CHomeScreen({super.key, this.venueId});

  @override
  State<B2CHomeScreen> createState() => _B2CHomeScreenState();
}

enum VisitStatus { first, recognized, cooldown }

class _B2CHomeScreenState extends State<B2CHomeScreen> with SingleTickerProviderStateMixin {
  VisitStatus _status = VisitStatus.first;
  bool _isLoading = true;
  bool _venueNotFound = false;
  String? _guestName;
  int _currentDiscount = 5;
  VenueModel? _venue;
  bool _isTestMode = false;
  DateTime? _lastVisitDate; // Store for navigation

  // Debug Mode State
  int _debugTapCount = 0;
  Map<String, dynamic> _debugInfo = {};
  
  // Animation for Gauge
  late AnimationController _gaugeController;
  late Animation<double> _gaugeAnimation;
  late AnimationController _trembleController; // New Tremble Controller

  @override
  void initState() {
    super.initState();
    _gaugeController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500));
    _trembleController = AnimationController(vsync: this, duration: const Duration(milliseconds: 150)); // Fast tremble
    _checkVisit();
  }
  
  @override
  void dispose() {
    _gaugeController.dispose();
    _trembleController.dispose();
    super.dispose();
  }

  Future<void> _checkVisit() async {
    // 1. Check Auth & Sign In Anonymously if needed
    final authService = AuthService();
    User? user = authService.currentUser;
    
    if (user == null) {
      try {
        user = await authService.signInAnonymously();
      } catch (e) {
        debugPrint("Auth Error: $e");
        // Fallback or show error? For now, proceed as best effort
      }
    } else {
      // Check if staff/owner (simple check based on email or claims if available)
      // For now, if they have an email, we assume they might be staff/owner or a registered user
      // Refined requirement: "If staff/owner... mark as is_test". 
      // We can check local role or just assume auth'd users (non-anonymous) are "returning"
      if (!user.isAnonymous) {
        // Potentially test mode or just a returning user
      }
    }

    if (widget.venueId == null) {
      if (mounted) setState(() { _isLoading = false; _venueNotFound = true; });
      return;
    }

    try {
      // 2. Fetch Venue & Loyalty Config
      final venueDoc = await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).get();
      if (!venueDoc.exists) {
        if (mounted) setState(() { _isLoading = false; _venueNotFound = true; });
        return;
      }

      _venue = VenueModel.fromMap(venueDoc.id, venueDoc.data()!);
      final prefs = await SharedPreferences.getInstance();
      
      // Store Venue Details
      await prefs.setString('currentVenueId', widget.venueId!);
      await prefs.setString('venueName', _venue!.name);
      
      // 3. Fetch Last Visit (Server-Side) & User Profile
      // Check for user's last visit to THIS venue
      if (user != null) {
        final guestEmail = (prefs.getString('guestEmail') ?? '').toLowerCase();
        
        // 3a. Check User Profile (Persistence)
        if (_guestName == null) {
           try {
             final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
             if (userDoc.exists) {
               final data = userDoc.data();
               if (data != null && data['name'] != null && (data['name'] as String).isNotEmpty) {
                 _guestName = data['name'];
                 await prefs.setString('guestName', _guestName!);
                 // We don't overwrite email from prefs yet, but we use the normalized one for queries
               }
             }
           } catch (e) {
             debugPrint("Error fetching user profile: $e");
           }
        }

        // --- DEBUG INFO CAPTURE ---
        _debugInfo = {
          'email': guestEmail,
          'venueId': widget.venueId,
          'found': false,
          'hours': 0.0,
          'lastVisit': 'none'
        };

        final visitsQuery = await FirebaseFirestore.instance
            .collection('visits')
            .where('guestEmail', isEqualTo: guestEmail) // Use normalized email
            .where('venueId', isEqualTo: widget.venueId)
            .orderBy('timestamp', descending: true)
            .orderBy('timestamp', descending: true)
            .limit(10) // Fetch more to find chain start
            .get();

        if (visitsQuery.docs.isNotEmpty) {
          final latestVisitDoc = visitsQuery.docs.first;
          final latestVisitData = latestVisitDoc.data();
          final Timestamp? ts = latestVisitData['timestamp'];
          
          if (ts != null) {
             DateTime latestVisitDate = ts.toDate();
             DateTime anchorDate = latestVisitDate;
             
             // --- ANCHOR LOGIC ---
             // Walk back to find the "Start" of this interaction chain.
             // If visits are within 12h of each other, they belong to the same sequence.
             // We want the TIMESTAMP of the FIRST visit in the sequence to be the "lastVisitDate" for calculation.
             final docs = visitsQuery.docs;
             for (int i = 0; i < docs.length - 1; i++) {
                final curr = docs[i].data();
                final prev = docs[i+1].data();
                
                final t1 = (curr['timestamp'] as Timestamp).toDate();
                final t2 = (prev['timestamp'] as Timestamp).toDate();
                
                final diffHours = t1.difference(t2).inMinutes / 60.0;
                
                // If linked by cooldown (e.g. < 12h gap), the chain continues.
                // We assume 'Start' is the oldest in this chain.
                // Note: User said "Any scanning in 12h shows count from START".
                if (diffHours < _venue!.loyaltyConfig.safetyCooldownHours) {
                   anchorDate = t2; // Move anchor back
                } else {
                   break; // Chain broken
                }
             }
             
             _lastVisitDate = anchorDate; // Store for navigation (Use ANCHOR as the visit time)
             
             // --- MAINTENANCE LOGIC ---
             // We need the discount of the LATEST visit to know if we are in Maintenance Mode.
             // (e.g. if we got 20% at T=13, and now it's T=14, we need to know T=13 gave 20%).
             final int? previousReward = latestVisitData['discountValue'] as int?;

             // 4. Calculate Dynamic Reward
             final currentTime = DateTime.now();
             debugPrint("Anchor: $anchorDate, Latest: $latestVisitDate, PrevReward: $previousReward");
             
             final rewardState = RewardCalculator.calculate(
               anchorDate, 
               currentTime, 
               _venue!.loyaltyConfig,
               _venue!.tiers,
               previousReward: previousReward
             );

             _debugInfo['found'] = true;
             _debugInfo['hours'] = currentTime.difference(anchorDate).inHours.toDouble();
             _debugInfo['lastVisit'] = anchorDate.toIso8601String();
             _debugInfo['latestReal'] = latestVisitDate.toIso8601String();
             _debugInfo['phase'] = rewardState.phase.toString();

             // Update UI with calculated state
             _currentDiscount = rewardState.currentDiscount;
             
             if (rewardState.phase == RewardPhase.cooldown) {
               _status = VisitStatus.cooldown;
             } else {
               _status = VisitStatus.recognized;
             }
             
             // If we didn't get name from User Profile, try visit
             if (_guestName == null) {
                _guestName = latestVisitData['guestName']; 
                if (_guestName != null) {
                  await prefs.setString('guestName', _guestName!);
                }
             }
          }
        } else {
           // No server-side visits found -> First Visit
           _currentDiscount = _venue!.loyaltyConfig.percBase;
           _status = VisitStatus.first;
        }
      }
      
    } catch (e) {
      debugPrint("Error loading B2C data: $e");
      _currentDiscount = 5;
    }

    if (mounted) {
      setState(() {
        _isLoading = false;
        // Start Animations
        final double targetValue = (_currentDiscount - 5) / 15.0; 
        _gaugeAnimation = Tween<double>(begin: 0.0, end: targetValue.clamp(0.0, 1.0)).animate(CurvedAnimation(parent: _gaugeController, curve: Curves.easeOutBack));
        _gaugeController.forward().then((_) {
          _trembleController.repeat(reverse: true);
        });
      });

      // Record Scan for analytics
      if (!_isTestMode) {
        _recordScan();
      }
    }
  }

  Future<void> _recordScan() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null || widget.venueId == null) return;

      await FirebaseFirestore.instance.collection('visits').add({
        'uid': user.uid,
        'venueId': widget.venueId,
        'guestName': _guestName ?? 'Guest',
        'type': 'scan',
        'status': 'completed',
        'discountValue': _currentDiscount,
        'timestamp': FieldValue.serverTimestamp(),
        'is_test': _isTestMode,
      });
    } catch (e) {
      debugPrint("Error recording scan: $e");
    }
  }

  void _onGetRewardPressed() {
    if (_guestName != null && _guestName!.isNotEmpty) {
      // Guest already known -> Skip to Thank You
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ThankYouScreen(
            venueId: widget.venueId,
            currentDiscount: _currentDiscount,
            guestName: _guestName!,
            tiers: _venue!.tiers,
            config: _venue!.loyaltyConfig,
            lastVisitDate: _lastVisitDate,
          )
        ),
      );
    } else {
      // Guest unknown -> Go to Lead Capture
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => LeadCaptureScreen(
             venueId: widget.venueId,
             currentDiscount: _currentDiscount,
             tiers: _venue!.tiers,
             config: _venue!.loyaltyConfig,
          )
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    
    final l10n = AppLocalizations.of(context)!;

    if (_venueNotFound) {
      return _buildNotFoundView(context);
    }

    // Dynamic UI data
    final String headline;
    final String subhead;


    if (_status == VisitStatus.recognized || _status == VisitStatus.cooldown) {
      headline = l10n.welcomeBackHeadline(_currentDiscount);
      subhead = l10n.welcomeBackSubhead;
    } else {
      headline = l10n.rewardTodayHeadline(_currentDiscount);
      subhead = l10n.rewardTodaySubhead;
    }

    return Scaffold(
      backgroundColor: AppColors.premiumSand,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // 1. Header (Brand/Venue)
              _Header(
                venueName: 'Friendly Code',
                onLogoTap: () {
                  setState(() {
                    _debugTapCount++;
                    if (_debugTapCount == 5) {
                      debugPrint("Debug mode activated");
                    }
                  });
                },
              ), 
              
              const SizedBox(height: 32),

              // 2. Headline
              Text(
                headline,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: AppColors.title,
                      fontWeight: FontWeight.w900,
                      height: 1.1,
                      fontSize: 28,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                subhead,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.body,
                      fontWeight: FontWeight.w500,
                    ),
              ),

              const SizedBox(height: 40),

              // 3. Animated Gauge
              AnimatedBuilder(
                animation: Listenable.merge([_gaugeController, _trembleController]),
                builder: (context, child) {
                  return SizedBox(
                    height: 180, // Increased height for larger labels
                    width: 300,
                    child: CustomPaint(
                      painter: GaugePainter(
                        value: _gaugeAnimation.value, 
                        currentDiscount: _currentDiscount,
                        trembleValue: _gaugeController.isCompleted ? _trembleController.value : 0.0,
                      ),
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 40),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '$_currentDiscount%',
                                style: const TextStyle(
                                  fontSize: 56, // Larger font
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.premiumBurntOrange, // Orange color for value
                                  height: 1.0,
                                ),
                              ),
                             // Text("REWARD", style: TextStyle(fontSize: 12, color: AppColors.body, fontWeight: FontWeight.bold, letterSpacing: 1.5))
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }
              ),

              const SizedBox(height: 40),

              // 4. Timeline
              Container(
                decoration: BoxDecoration(
                  color: AppColors.surface.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.premiumGold.withValues(alpha: 0.2)),
                ),
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    _TimelineItem(
                      label: l10n.timelineItem(l10n.timelineToday, 5),
                      isActive: _currentDiscount == 5,
                      isFuture: false,
                    ),
                    const SizedBox(height: 12),
                    _TimelineItem(
                      label: l10n.timelineItem(l10n.timelineTomorrow, 20),
                      isActive: _currentDiscount == 20,
                      isFuture: _currentDiscount < 20 && _status == VisitStatus.first,
                    ),
                    const SizedBox(height: 12),
                    _TimelineItem(
                      label: l10n.timelineItem(l10n.timelineInDays(3), 15),
                      isActive: _currentDiscount == 15,
                      isFuture: true,
                    ),
                    const SizedBox(height: 12),
                    _TimelineItem(
                      label: l10n.timelineItem(l10n.timelineInDays(7), 10),
                      isActive: _currentDiscount == 10,
                      isFuture: true,
                    ),
                  ],
                ),
              ),

              
              const SizedBox(height: 24),

              // 5. CTA Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _onGetRewardPressed,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.premiumBurntOrange, 
                    foregroundColor: Colors.white,
                    elevation: 8,
                    shadowColor: AppColors.premiumBurntOrange.withValues(alpha: 0.4),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(FontAwesomeIcons.gift, size: 20),
                      const SizedBox(width: 12),
                      Text(
                        l10n.getReward,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 32),
              
              // 6. Footer (Verified + Powered By)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.verified, size: 14, color: AppColors.accentGreen),
                  const SizedBox(width: 4),
                  FutureBuilder<SharedPreferences>(
                    future: SharedPreferences.getInstance(),
                    builder: (context, snapshot) {
                      String venue = 'Verified Venue';
                      if (snapshot.hasData) {
                         venue = snapshot.data!.getString('venueName')?.toUpperCase() ?? 'VERIFIED VENUE';
                      }
                      return Text(
                        venue, 
                        style: const TextStyle(
                          fontSize: 10, 
                          fontWeight: FontWeight.bold, 
                          color: AppColors.body,
                          letterSpacing: 1.0,
                        )
                      );
                    }
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Powered by ", style: TextStyle(color: Colors.grey, fontSize: 10)),
                  const Icon(FontAwesomeIcons.bolt, size: 10, color: AppColors.premiumBurntOrange),
                  Text(
                    " Friendly Code", 
                    style: TextStyle(
                      color: AppColors.title, 
                      fontSize: 10, 
                      fontWeight: FontWeight.w900
                    )
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: _debugTapCount >= 5 ? _buildDebugOverlay() : null,
    );
  }

  Widget _buildDebugOverlay() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.greenAccent),
      ),
      child: Material(
        color: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("DEBUG INFO", style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white, size: 20),
                  onPressed: () => setState(() => _debugTapCount = 0),
                ),
              ],
            ),
            const Divider(color: Colors.white24),
            _debugLine("Email", _debugInfo['email']),
            _debugLine("Venue", _debugInfo['venueId']),
            _debugLine("Found Visit", _debugInfo['found'] == true ? "YES" : "NO"),
            _debugLine("Hours Passed", _debugInfo['hours']?.toString() ?? "0"),
            _debugLine("Last Visit", _debugInfo['lastVisit']),
            const SizedBox(height: 8),
            const Text("(Tap 'X' to close)", style: TextStyle(color: Colors.white54, fontSize: 10)),
          ],
        ),
      ),
    );
  }

  Widget _debugLine(String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 90, child: Text("$label:", style: const TextStyle(color: Colors.white70, fontSize: 12))),
          Expanded(child: Text(value ?? "none", style: const TextStyle(color: Colors.white, fontSize: 12, fontFamily: 'monospace'))),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String venueName;
  final VoidCallback? onLogoTap;
  const _Header({required this.venueName, this.onLogoTap});

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        GestureDetector(
          onTap: onLogoTap,
          behavior: HitTestBehavior.opaque,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min, // Added to prevent full width tap
            children: [
              const Icon(FontAwesomeIcons.leaf, size: 18, color: AppColors.accentGreen),
              const SizedBox(width: 8),
              Text(
                "Friendly\nCode",
                textAlign: TextAlign.left,
                style: TextStyle(
                  color: AppColors.title,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  height: 1.0,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
        ),
        Positioned(
          right: 0,
          child: Consumer<LocaleProvider>(
            builder: (context, provider, child) {
              final isEn = provider.locale.languageCode == 'en';
              return TextButton(
                onPressed: () => provider.toggleLocale(),
                style: TextButton.styleFrom(
                  minimumSize: Size.zero,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  foregroundColor: AppColors.title,
                ),
                child: Text(
                  isEn ? "RU" : "EN",
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final String label;
  final bool isActive;
  final bool isFuture;

  const _TimelineItem({
    required this.label,
    required this.isActive,
    required this.isFuture,
  });

  @override
  Widget build(BuildContext context) {
    final Color bgColor = isActive ? AppColors.statusActiveBg : Colors.white;
    final Color textColor = isActive ? AppColors.statusActiveText : (isFuture ? AppColors.body : Colors.grey);
    final IconData icon = isActive ? Icons.check_circle : (isFuture ? Icons.schedule : Icons.circle_outlined);
    final Color iconColor = isActive ? AppColors.accentGreen : (isFuture ? AppColors.premiumGold : Colors.grey[300]!);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: isActive 
          ? Border.all(color: AppColors.accentGreen.withValues(alpha: 0.3))
          : Border.all(color: Colors.transparent),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: iconColor),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(
              color: textColor,
              fontWeight: isActive ? FontWeight.bold : FontWeight.w600,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }
}


class GaugePainter extends CustomPainter {
  final double value; // 0.0 to 1.0
  final int currentDiscount;
  final double trembleValue; // 0.0 to 1.0

  const GaugePainter({required this.value, required this.currentDiscount, required this.trembleValue});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height - 30); // Adjusted center
    final radius = min(size.width / 2, size.height) - 20;
    const strokeWidth = 28.0;

    // 1. Track (Background)
    final bgPaint = Paint()
      ..color = Colors.grey.withValues(alpha: 0.15)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      pi, // Start 180 deg
      pi, // Sweep 180 deg
      false,
      bgPaint,
    );

    // 2. Gradient Arc (Progress)
    final gradient = const LinearGradient(
      colors: [AppColors.premiumBurntOrange, AppColors.premiumGold, AppColors.accentGreen],
      stops: [0.0, 0.5, 1.0],
    ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final progressPaint = Paint()
      ..shader = gradient
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      pi,
      pi,
      false,
      progressPaint,
    );

    // 3. Labels (Larger 5% and 20%)
    _drawLabel(canvas, center, radius, pi, "5%", isLeft: true);
    _drawLabel(canvas, center, radius, 2 * pi, "20%", isLeft: false);

    // 4. The Needle (with tremble)
    // Angle mapping: 0.0 -> pi (Left), 1.0 -> 2*pi (Right)
    // Tremble logic: Adds a small noise to the angle
    // We want ~ 25 degrees from horizontal. 
    // Actually the value determines the angle.
    // Let's rely on 'value' which is computed from discount.
    
    double baseAngle = pi + (value * pi);
    
    // Add tremble noise (small oscillation)
    // trembleValue goes from 0 to 1 repeatedly. map to -0.05 to +0.05 rad
    final trembleAngle = (trembleValue - 0.5) * 0.1; // Small shake
    
    final finalAngle = baseAngle + trembleAngle;
    
    final needleLen = radius - 20;
    final needlePaint = Paint()
      ..color = AppColors.title
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    final endPoint = Offset(
      center.dx + needleLen * cos(finalAngle),
      center.dy + needleLen * sin(finalAngle),
    );

    canvas.drawLine(center, endPoint, needlePaint);
    
    // Pivot
    canvas.drawCircle(center, 12, Paint()..color = AppColors.title);
    canvas.drawCircle(center, 5, Paint()..color = Colors.white);
  }

  void _drawLabel(Canvas canvas, Offset center, double radius, double angle, String label, {required bool isLeft}) {
    final textPainter = TextPainter(
      text: TextSpan(
        text: label,
        style: const TextStyle(
          color: AppColors.title, 
          fontWeight: FontWeight.w900, 
          fontSize: 20 // Larger Font
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    
    // Position 
    // If Left (PI): x = center.dx - radius - padding. y = center.dy
    // If Right (2PI): x = center.dx + radius + padding.
    
    final offset = Offset(
      center.dx + (radius + 35) * cos(angle) - textPainter.width / 2,
      center.dy + (radius + 35) * sin(angle) - textPainter.height / 2, // Vertically centered on the arc end
    );
    
    textPainter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant GaugePainter oldDelegate) => 
      oldDelegate.value != value || oldDelegate.trembleValue != trembleValue;
}


extension on _B2CHomeScreenState {
  Widget _buildNotFoundView(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppColors.premiumSand,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(40.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(FontAwesomeIcons.circleExclamation, size: 80, color: AppColors.premiumBurntOrange),
              const SizedBox(height: 32),
              Text(
                l10n.venueNotFound,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: AppColors.premiumBurntOrange,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                l10n.venueNotFoundSub,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.body, fontSize: 16),
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pushReplacementNamed('/'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.title,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(l10n.goToHome, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
