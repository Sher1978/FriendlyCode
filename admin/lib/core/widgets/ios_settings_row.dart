import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../theme/colors.dart';

class IOSSettingsRow extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool showChevron;

  const IOSSettingsRow({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
    this.trailing,
    this.onTap,
    this.showChevron = true,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            if (icon != null) ...[
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: (iconColor ?? AppColors.accentBlue).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: iconColor ?? AppColors.accentBlue,
                ),
              ),
              const SizedBox(width: 16),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.body,
                          ),
                    ),
                  ],
                ],
              ),
            ),
            if (trailing != null) ...[
              trailing!,
              if (showChevron) const SizedBox(width: 8),
            ],
            if (showChevron && onTap != null)
              const Icon(
                CupertinoIcons.chevron_forward,
                size: 14,
                color: AppColors.tertiary,
              ),
          ],
        ),
      ),
    );
  }
}
