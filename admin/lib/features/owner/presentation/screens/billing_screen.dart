import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/l10n/app_localizations.dart';

class OwnerBillingScreen extends StatelessWidget {
  const OwnerBillingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.billingTitle, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.title)),
          Text(l10n.billingSub, style: const TextStyle(color: AppColors.body)),
          const SizedBox(height: 48),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Current Plan Card
              Expanded(
                child: _buildBillingCard(
                  title: l10n.currentPlan,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(color: AppColors.accentOrange, borderRadius: BorderRadius.circular(20)),
                        child: Text(l10n.proPlan, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
                      ),
                      const SizedBox(height: 24),
                      const Text("\$49.00 / month", style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: AppColors.title)),
                      Text(l10n.nextBillingDate("March 12, 2026"), style: const TextStyle(color: AppColors.body)),
                      const SizedBox(height: 32),
                      const Divider(),
                      const SizedBox(height: 24),
                      _buildFeatureRow(l10n.unlimitedVenues),
                      _buildFeatureRow(l10n.prioritySupport),
                      _buildFeatureRow(l10n.advancedCrm),
                      _buildFeatureRow(l10n.rawDataExport),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 32),
              // Payment Methods
              Expanded(
                child: Column(
                  children: [
                    _buildBillingCard(
                      title: l10n.paymentMethod,
                      child: Column(
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.credit_card, size: 32, color: AppColors.body),
                              const SizedBox(width: 16),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(l10n.visaEnding("4242"), style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
                                  Text(l10n.expires("12/28"), style: const TextStyle(color: AppColors.body, fontSize: 12)),
                                ],
                              ),
                              const Spacer(),
                              TextButton(onPressed: () {}, child: Text(l10n.editBtn)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    _buildBillingCard(
                      title: l10n.billingHistory,
                      child: Column(
                        children: [
                          _buildHistoryRow("FEB 12, 2026", "\$49.00", "ST-4921-23"),
                          _buildHistoryRow("JAN 12, 2026", "\$49.00", "ST-4921-22"),
                          _buildHistoryRow("DEC 12, 2025", "\$49.00", "ST-4921-21"),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBillingCard({required String title, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.title.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.accentOrange, letterSpacing: 1.5)),
          const SizedBox(height: 32),
          child,
        ],
      ),
    );
  }

  Widget _buildFeatureRow(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          const Icon(Icons.check_circle, color: Colors.green, size: 18),
          const SizedBox(width: 12),
          Text(text, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.title)),
        ],
      ),
    );
  }

  Widget _buildHistoryRow(String date, String amount, String invoice) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Text(date, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.title)),
          const Spacer(),
          Text(amount, style: const TextStyle(color: AppColors.body)),
          const SizedBox(width: 16),
          const Icon(Icons.download_outlined, size: 20, color: AppColors.accentOrange),
        ],
      ),
    );
  }
}
