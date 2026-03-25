import 'package:flutter/material.dart';
import '../theme/colors.dart';

class IOSSettingsGroup extends StatelessWidget {
  final String? title;
  final List<Widget> children;
  final EdgeInsets? margin;

  const IOSSettingsGroup({
    super.key,
    this.title,
    required this.children,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null)
          Padding(
            padding: const EdgeInsets.only(left: 16, bottom: 8, top: 16),
            child: Text(
              title!.toUpperCase(),
              style: Theme.of(context).textTheme.labelLarge,
            ),
          ),
        Container(
          margin: margin ?? const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(0.05)),
          ),
          child: Column(
            children: _buildDividedChildren(),
          ),
        ),
      ],
    );
  }

  List<Widget> _buildDividedChildren() {
    List<Widget> divided = [];
    for (int i = 0; i < children.length; i++) {
      divided.add(children[i]);
      if (i < children.length - 1) {
        divided.add(
          Padding(
            padding: const EdgeInsets.only(left: 52),
            child: Divider(
              height: 1,
              color: Colors.white.withOpacity(0.05),
            ),
          ),
        );
      }
    }
    return divided;
  }
}
