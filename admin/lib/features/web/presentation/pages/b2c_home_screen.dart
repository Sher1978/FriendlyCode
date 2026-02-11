import 'dart:math';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'lead_capture_screen.dart';
import 'b2b_landing_screen.dart';
import 'package:friendly_code/core/logic/reward_calculator.dart';

class B2CHomeScreen extends StatefulWidget {
  const B2CHomeScreen({super.key});

  @override
  State<B2CHomeScreen> createState() => _B2CHomeScreenState();
}

enum VisitStatus { first, recognized }

class _B2CHomeScreenState extends State<B2CHomeScreen> {
  VisitStatus _status = VisitStatus.first;
  bool _isLoading = true;
  String? _guestName;
  int _currentDiscount = 5;

  @override
  void initState() {
    super.initState();
    _checkVisit();
  }

  Future<void> _checkVisit() async {
    final prefs = await SharedPreferences.getInstance();
    final firstVisitIso = prefs.getString('firstVisitIso');
    _guestName = prefs.getString('guestName');
    
    if (firstVisitIso == null) {
      await prefs.setString('firstVisitIso', DateTime.now().toIso8601String());
      _currentDiscount = 5;
      _status = VisitStatus.first;
    } else {
      final firstVisit = DateTime.parse(firstVisitIso);
      _currentDiscount = RewardCalculator.calculate(firstVisit, DateTime.now());
      _status = VisitStatus.recognized;
    }
    
    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Scaffold(backgroundColor: AppColors.backgroundCream, body: Center(child: CircularProgressIndicator()));

    // Dynamic UI data
    final String headline;
    final String subhead;
    final String gaugeText = '$_currentDiscount%';
    final bool isHighTier = _currentDiscount >= 15;

    if (_guestName != null && _guestName!.isNotEmpty) {
      headline = '$_guestName, мы рады Вашему визиту 💗\nВаша скидка сегодня $_currentDiscount%🥳';
      subhead = 'The sooner you return, the bigger the reward.';
    } else {
      headline = 'Your Reward\nTODAY: $_currentDiscount%';
      subhead = _currentDiscount > 5 
          ? 'You returned! You earned it.' 
          : 'Want 20%? Come back tomorrow!';
    }

    return Scaffold(
      backgroundColor: AppColors.backgroundCream,
      body: SafeArea(
        child: Column(
          children: [
            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // 1. Header (Logo)
                    const _Header(),
                    const SizedBox(height: 24),

                    // 2. Headline
                    Text(
                      headline,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: AppColors.brandBrown,
                            fontWeight: FontWeight.w900,
                            height: 1.1,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      subhead,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: AppColors.brandBrown.withOpacity(0.8),
                            fontWeight: FontWeight.w500,
                          ),
                    ),

                    const SizedBox(height: 32),

                    // 3. Visual Gauge
                    SizedBox(
                      height: 160,
                      width: 280,
                      child: CustomPaint(
                        painter: GaugePainter(discount: _currentDiscount),
                        child: Center(
                          child: Padding(
                            padding: const EdgeInsets.only(top: 40),
                            child: Text(
                              gaugeText,
                              style: const TextStyle(
                                fontSize: 40,
                                fontWeight: FontWeight.bold,
                                color: AppColors.brandBrown,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // 4. Logic Steps
                    _DiscountStep(
                      label: 'Today: $_currentDiscount%',
                      icon: FontAwesomeIcons.check,
                      isActive: true,
                      isHighlighted: _currentDiscount == 5,
                    ),
                    const SizedBox(height: 12),
                    _DiscountStep(
                      label: 'Tomorrow: 20%',
                      icon: show20Percent ? FontAwesomeIcons.check : FontAwesomeIcons.clock,
                      isActive: true,
                      isHighlighted: show20Percent,
                    ),
                    const SizedBox(height: 12),
                    const _DiscountStep(
                      label: 'In 3 Days: 15%',
                      icon: FontAwesomeIcons.lock,
                      isActive: false, // Future
                      isHighlighted: false,
                    ),
                    const SizedBox(height: 12),
                    const _DiscountStep(
                      label: 'In 7 Days: 10%',
                      icon: FontAwesomeIcons.lock,
                      isActive: false, // Future
                      isHighlighted: false,
                    ),

                    const SizedBox(height: 24),
                    Text(
                      'The sooner you return, the bigger the reward.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.brandBrown.withOpacity(0.7),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 32),
                    OutlinedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const B2BLandingScreen()),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.brandBrown,
                        side: const BorderSide(color: AppColors.brandBrown, width: 1.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      ),
                      child: const Text('Become a Partner', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(height: 100), // Spacing for sticky bottom
                  ],
                ),
              ),
            ),

            // 5. Sticky Bottom CTA
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.backgroundCream,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.brandBrown.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -5),
                  ),
                ],
              ),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const LeadCaptureScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandOrange,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(FontAwesomeIcons.rocket, size: 20),
                      SizedBox(width: 12),
                      Text(
                        'GET MY REWARD',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(FontAwesomeIcons.leaf, color: AppColors.brandGreen, size: 24),
        const SizedBox(width: 8),
        const Text(
          'Friendly\nCode',
          style: TextStyle(
            color: AppColors.brandBrown,
            fontWeight: FontWeight.bold,
            height: 0.9,
            fontSize: 18,
          ),
        )
      ],
    );
  }
}

class _DiscountStep extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isActive;
  final bool isHighlighted;

  const _DiscountStep({
    required this.label,
    required this.icon,
    required this.isActive,
    required this.isHighlighted,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: isActive ? 1.0 : 0.5,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: isHighlighted ? AppColors.surfaceCream : AppColors.surfaceCream.withOpacity(0.6),
          borderRadius: BorderRadius.circular(12),
          border: isHighlighted
              ? Border.all(color: AppColors.brandOrange.withOpacity(0.3), width: 2)
              : Border.all(color: Colors.transparent),
          boxShadow: [
            BoxShadow(
              color: AppColors.brandBrown.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: isHighlighted ? AppColors.brandGreen : Colors.grey, 
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 12, color: Colors.white),
            ),
            const SizedBox(width: 16),
            Text(
              label,
              style: TextStyle(
                color: AppColors.brandBrown,
                fontWeight: isHighlighted ? FontWeight.bold : FontWeight.w600,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class GaugePainter extends CustomPainter {
  final int discount;
  const GaugePainter({required this.discount});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height);
    final radius = min(size.width / 2, size.height) - 20;

    // 1. Draw Background Arc (Track)
    final bgPaint = Paint()
      ..color = Colors.grey.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 20
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      pi, // Start at 180 degrees (left)
      pi, // Sweep 180 degrees (to right)
      false,
      bgPaint,
    );

    // 2. Draw Gradient Arc (Value)
    final gradientPaint = Paint()
      ..shader = const LinearGradient(
        colors: [AppColors.brandOrange, AppColors.brandGreen],
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 20
      ..strokeCap = StrokeCap.round;

    // Draw full gradient arc for visual style (since it's a static "Hook" mostly)
    // Or we can animate it. For now, let's draw the full arc as the implementation
    // of "Potential".
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      pi,
      pi,
      false,
      gradientPaint,
    );

    // 3. Draw Labels (5%, 20%)
    _drawText(canvas, center, radius, '5%', pi + 0.2, alignLeft: true);
    _drawText(canvas, center, radius, '20%', 2 * pi - 0.2, alignLeft: false);

    // 4. Draw Needle 
    // Map discount % to angle
    // 5% -> pi + pi*0.1
    // 20% -> 2*pi - 0.2
    double progress = (discount - 5) / 15.0; // 0.0 to 1.0
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;
    
    final needleAngle = pi + (pi * 0.1) + (progress * (pi * 0.7)); 
    final needleLen = radius - 30;
    final needlePaint = Paint()
      ..color = AppColors.brandBrown
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    final needleEnd = Offset(
      center.dx + needleLen * cos(needleAngle),
      center.dy + needleLen * sin(needleAngle),
    );

    canvas.drawLine(center, needleEnd, needlePaint);
    
    // Needle pivot
    canvas.drawCircle(center, 8, Paint()..color = AppColors.brandBrown);
  }

  void _drawText(Canvas canvas, Offset center, double radius, String text, double angle, {required bool alignLeft}) {
    final textSpan = TextSpan(
      text: text,
      style: const TextStyle(
        color: AppColors.brandBrown,
        fontSize: 14,
        fontWeight: FontWeight.bold,
      ),
    );

    final textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
    );

    textPainter.layout();

    final offset = Offset(
      center.dx + (radius + 25) * cos(angle) - (alignLeft ? 0 : textPainter.width), // Adjust slightly for better padding
      center.dy + (radius + 25) * sin(angle) - textPainter.height / 2,
    );

    textPainter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant GaugePainter oldDelegate) => oldDelegate.discount != discount;
}
