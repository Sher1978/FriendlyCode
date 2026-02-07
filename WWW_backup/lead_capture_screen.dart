import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:friendly_code/core/theme/colors.dart';

class LeadCaptureScreen extends StatefulWidget {
  const LeadCaptureScreen({super.key});

  @override
  State<LeadCaptureScreen> createState() => _LeadCaptureScreenState();
}

class _LeadCaptureScreenState extends State<LeadCaptureScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _contactController = TextEditingController();
  bool _agreedToTerms = true;
  bool _isReviewing = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundCream,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 48),
              
              // Header
              Text(
                _isReviewing ? 'Just checking...' : 'Nice to meet you!',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: AppColors.brandBrown,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
               Text(
                _isReviewing 
                    ? 'Does this look correct?' 
                    : 'We just need your name to activate the discount.',
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 16,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 48),

              if (!_isReviewing) ...[
                // Input Form
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      _FriendlyInput(
                        controller: _nameController,
                        label: 'Your Name',
                        hint: 'e.g., Alex',
                        icon: FontAwesomeIcons.user,
                      ),
                      const SizedBox(height: 16),
                      _FriendlyInput(
                        controller: _contactController,
                        label: 'WhatsApp or Email',
                        hint: 'For your receipt',
                        icon: FontAwesomeIcons.envelope,
                      ),
                    ],
                  ),
                ),
                
                const Spacer(),

                // Trust Checkbox
                Row(
                  children: [
                    Checkbox(
                      value: _agreedToTerms, 
                      onChanged: (v) => setState(() => _agreedToTerms = v ?? false),
                      activeColor: AppColors.brandOrange,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    ),
                    const Expanded(
                      child: Text(
                        'I agree to receive secret offers from this venue (Max 1x/week). No spam, we promise.',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 24),
                
                // Continue Button
                ElevatedButton(
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      setState(() => _isReviewing = true);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandOrange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'CONTINUE',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
              ] else ...[
                // Review / Confirmation State
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceCream,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.brandBrown.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(FontAwesomeIcons.user, color: AppColors.brandOrange),
                        title: Text(_nameController.text, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.brandBrown)),
                        subtitle: const Text('Name'),
                      ),
                      const Divider(),
                      ListTile(
                        leading: const Icon(FontAwesomeIcons.envelope, color: AppColors.brandOrange),
                        title: Text(_contactController.text, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.brandBrown)),
                        subtitle: const Text('Contact'),
                      ),
                    ],
                  ),
                ),
                
                const Spacer(),

                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => setState(() => _isReviewing = false),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.brandBrown,
                          side: const BorderSide(color: AppColors.brandBrown),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                        ),
                        child: const Text('Edit'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: () {
                          // TODO: Submit logic
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.brandGreen,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(FontAwesomeIcons.check, size: 18),
                            SizedBox(width: 8),
                            Text(
                              'ACTIVATE', // Confirm & Activate
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
               const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _FriendlyInput extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icon;

  const _FriendlyInput({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.brandBrown,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(icon, color: AppColors.brandOrange.withOpacity(0.7), size: 18),
            filled: true,
            fillColor: AppColors.surfaceCream,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.brandOrange, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
          validator: (value) => value?.isEmpty == true ? 'Required' : null,
        ),
      ],
    );
  }
}
