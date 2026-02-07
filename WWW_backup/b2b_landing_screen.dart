import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:friendly_code/core/theme/colors.dart';

class B2BLandingScreen extends StatelessWidget {
  const B2BLandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundCream,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isDesktop = constraints.maxWidth > 800;
          return SingleChildScrollView(
            child: Column(
              children: [
                // 1. Navigation / Header
                _NavBar(isDesktop: isDesktop),

                // 2. Hero Section
                _HeroSection(isDesktop: isDesktop),

                // 3. Problem / Solution
                _ProblemSolutionSection(isDesktop: isDesktop),

                // 4. Mechanics (Time Decay)
                _MechanicsSection(isDesktop: isDesktop),

                // 5. Zero Friction
                _ZeroFrictionSection(isDesktop: isDesktop),

                // 6. Footer
                _Footer(isDesktop: isDesktop),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _NavBar extends StatelessWidget {
  final bool isDesktop;
  const _NavBar({required this.isDesktop});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: isDesktop ? 64 : 24, vertical: 24),
      color: AppColors.backgroundCream,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(FontAwesomeIcons.leaf, color: AppColors.brandGreen, size: 24),
              const SizedBox(width: 8),
              Text(
                'Friendly Code',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: AppColors.brandBrown,
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ],
          ),
          if (isDesktop)
            Row(
              children: [
                TextButton(
                  onPressed: () {},
                  child: const Text('Pricing', style: TextStyle(color: AppColors.brandBrown)),
                ),
                const SizedBox(width: 24),
                TextButton(
                  onPressed: () {},
                  child: const Text('Login', style: TextStyle(color: AppColors.brandBrown)),
                ),
                const SizedBox(width: 24),
                ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandOrange,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Get Started Free'),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  final bool isDesktop;
  const _HeroSection({required this.isDesktop});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: isDesktop ? 64 : 24, vertical: 80),
      child: Flex(
        direction: isDesktop ? Axis.horizontal : Axis.vertical,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Copy
          if (isDesktop)
            Expanded(
              flex: 5,
              child: _HeroCopy(isDesktop: isDesktop),
            )
          else
            _HeroCopy(isDesktop: isDesktop),
          
          if (isDesktop) const Spacer(flex: 1) else const SizedBox(height: 48),

          // Visual
          if (isDesktop)
            Expanded(
              flex: 5,
              child: _HeroVisual(),
            )
          else
            _HeroVisual(),
        ],
      ),
    );
  }
}

class _HeroCopy extends StatelessWidget {
  final bool isDesktop;
  const _HeroCopy({required this.isDesktop});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: isDesktop ? CrossAxisAlignment.start : CrossAxisAlignment.center,
      children: [
        Text(
          'Stop "Buying" Customers.\nStart Befriending Them!',
          textAlign: isDesktop ? TextAlign.start : TextAlign.center,
          style: TextStyle(
            fontSize: isDesktop ? 56 : 36,
            fontWeight: FontWeight.w900,
            color: AppColors.brandBrown,
            height: 1.1,
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Turn random guests into Loyal Regulars. Automatically.\nNo Ad budget required.',
          textAlign: isDesktop ? TextAlign.start : TextAlign.center,
          style: TextStyle(
            fontSize: 20,
            color: AppColors.brandBrown.withOpacity(0.8),
            height: 1.5,
          ),
        ),
        const SizedBox(height: 40),
        ElevatedButton(
          onPressed: () {},
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.brandOrange,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: const Text(
            '🤝 Join Friendly Code Free', // Fixed: Remove newlines in button
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }
}

class _HeroVisual extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 400,
      decoration: BoxDecoration(
        color: AppColors.brandOrange.withOpacity(0.1),
        borderRadius: BorderRadius.circular(24),
      ),
      child: const Center(
        child: Icon(FontAwesomeIcons.handshake, size: 100, color: AppColors.brandOrange),
      ),
    );
  }
}

class _ProblemSolutionSection extends StatelessWidget {
  final bool isDesktop;
  const _ProblemSolutionSection({required this.isDesktop});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: isDesktop ? 64 : 24, vertical: 80),
      color: Colors.white,
      child: Column(
        children: [
          Flex(
            direction: isDesktop ? Axis.horizontal : Axis.vertical,
            children: [
              _Card(
                title: 'Advertising is a Casino 🎰',
                body: 'You pay upfront, hope for clicks, and pray they return. Why pay for a chance when you can pay for results?',
                color: Colors.red.shade50,
                textColor: Colors.red.shade900,
                isDesktop: isDesktop,
              ),
              const SizedBox(width: 32, height: 32),
              _Card(
                title: 'Your Profit is at Table #4',
                body: 'Keeping an old friend is 7x cheaper than finding a new one. We make sure your current guests come back twice as often.',
                color: AppColors.brandGreen.withOpacity(0.1),
                textColor: AppColors.brandBrown,
                isDesktop: isDesktop,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final String title;
  final String body;
  final Color color;
  final Color textColor;
  final bool isDesktop;

  const _Card({
    required this.title,
    required this.body,
    required this.color,
    required this.textColor,
    required this.isDesktop,
  });

  @override
  Widget build(BuildContext context) {
    Widget cardContent = Container(
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            body,
            style: TextStyle(
              fontSize: 18,
              color: textColor.withOpacity(0.8),
              height: 1.5,
            ),
          ),
        ],
      ),
    );

    if (isDesktop) {
      return Expanded(child: cardContent);
    } else {
      return cardContent;
    }
  }
}

class _MechanicsSection extends StatelessWidget {
  final bool isDesktop;
  const _MechanicsSection({required this.isDesktop});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: isDesktop ? 64 : 24, vertical: 80),
      color: AppColors.backgroundCream,
      child: Column(
        children: [
          Text(
            'The Fair Game',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.brandOrange, letterSpacing: 1.5),
          ),
          const SizedBox(height: 16),
          Text(
            'Pay Less for Frequent Flyers',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: AppColors.brandBrown),
          ),
          const SizedBox(height: 48),
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              children: [
                // Minimal graph representation
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _Bar(height: 100, label: 'Today', value: '5%'),
                    _Bar(height: 200, label: 'Tmrw', value: '20%', isActive: true),
                    _Bar(height: 150, label: '3 Days', value: '15%'),
                    _Bar(height: 120, label: '7 Days', value: '10%'),
                  ],
                ),
                const SizedBox(height: 32),
                const Text(
                  'Max discount for quick returns. Low discount for occasional visitors. You never lose margin unnecessarily.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Bar extends StatelessWidget {
  final double height;
  final String label;
  final String value;
  final bool isActive;

  const _Bar({required this.height, required this.label, required this.value, this.isActive = false});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, color: isActive ? AppColors.brandOrange : AppColors.brandBrown)),
        const SizedBox(height: 8),
        Container(
          width: 40,
          height: height,
          decoration: BoxDecoration(
            color: isActive ? AppColors.brandOrange : AppColors.brandOrange.withOpacity(0.3),
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
      ],
    );
  }
}

class _ZeroFrictionSection extends StatelessWidget {
  final bool isDesktop;
  const _ZeroFrictionSection({required this.isDesktop});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: isDesktop ? 64 : 24, vertical: 80),
      color: Colors.white,
      child: Column(
        children: [
          const Icon(FontAwesomeIcons.mobileScreen, size: 48, color: AppColors.brandBrown),
          const SizedBox(height: 24),
          Text(
            'No App Download Required',
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppColors.brandBrown),
          ),
          const SizedBox(height: 16),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: const Text(
              'Guests scan QR -> Get Discount. That\'s it. No registration forms. No friction. 100% Conversion.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 18, color: AppColors.textSecondary, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  final bool isDesktop;
  const _Footer({required this.isDesktop});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: isDesktop ? 64 : 24, vertical: 80),
      color: AppColors.brandBrown,
      child: Column(
        children: [
          const Text(
            'Ready to fill your tables?',
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.brandOrange,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 24),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: const Text(
              'Start My Free Trial',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 80),
          const Text(
            '© 2026 Friendly Code. Built with ❤️ for Hospitality.',
            style: TextStyle(color: Colors.white38),
          ),
        ],
      ),
    );
  }
}
