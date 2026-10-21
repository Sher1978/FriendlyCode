import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/services/index.dart';
import 'package:friendly_code/core/theme/colors.dart';

class YieldRulesScreen extends StatefulWidget {
  final String venueId;
  const YieldRulesScreen({super.key, required this.venueId});

  @override
  State<YieldRulesScreen> createState() => _YieldRulesScreenState();
}

class _YieldRulesScreenState extends State<YieldRulesScreen> {
  bool _isLoading = true;
  List<ServiceYieldRule> _rules = [];

  @override
  void initState() {
    super.initState();
    _loadRules();
  }

  Future<void> _loadRules() async {
    setState(() => _isLoading = true);
    try {
      final snap = await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('yield_rules')
          .get();

      final list = snap.docs.map((d) => ServiceYieldRule.fromMap(d.data(), d.id)).toList();
      setState(() {
        _rules = list;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _openRuleEditor([ServiceYieldRule? rule]) async {
    final nameCtrl = TextEditingController(text: rule?.name ?? '');
    final valCtrl = TextEditingController(text: rule != null ? rule.discountValue.toStringAsFixed(0) : '20');
    final startCtrl = TextEditingController(text: rule != null ? rule.startHour.toString() : '12');
    final endCtrl = TextEditingController(text: rule != null ? rule.endHour.toString() : '16');
    final capCtrl = TextEditingController(text: rule?.maxDiscountCap != null ? rule!.maxDiscountCap!.toStringAsFixed(0) : '');

    String discountType = rule?.discountType ?? 'percent';
    bool isFlash = rule?.isFlashSlot ?? false;

    await showCupertinoDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => CupertinoAlertDialog(
          title: Text(rule == null ? "Новое правило скидок" : "Редактировать правило"),
          content: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CupertinoTextField(
                  controller: nameCtrl,
                  placeholder: "Название (например: Будни день)",
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                ),
                const SizedBox(height: 10),
                // Type selector: Percent vs Fixed
                CupertinoSegmentedControl<String>(
                  children: const {
                    'percent': Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Text("В процентах (%)")),
                    'fixed': Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Text("В валюте (руб.)")),
                  },
                  groupValue: discountType,
                  onValueChanged: (val) => setDialogState(() => discountType = val),
                ),
                const SizedBox(height: 10),
                CupertinoTextField(
                  controller: valCtrl,
                  keyboardType: TextInputType.number,
                  placeholder: discountType == 'percent' ? "Размер скидки (%)" : "Скидка (например: 500 ₽)",
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: CupertinoTextField(
                        controller: startCtrl,
                        keyboardType: TextInputType.number,
                        placeholder: "С часа (12)",
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: CupertinoTextField(
                        controller: endCtrl,
                        keyboardType: TextInputType.number,
                        placeholder: "До часа (16)",
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                CupertinoTextField(
                  controller: capCtrl,
                  keyboardType: TextInputType.number,
                  placeholder: "Потолок скидки (макс. руб.)",
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Горящий слот (< 3 ч)", style: TextStyle(color: Colors.white70, fontSize: 12)),
                    CupertinoSwitch(
                      value: isFlash,
                      onChanged: (val) => setDialogState(() => isFlash = val),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            CupertinoDialogAction(
              child: const Text("Отмена"),
              onPressed: () => Navigator.pop(ctx),
            ),
            CupertinoDialogAction(
              isDefaultAction: true,
              child: const Text("Сохранить"),
              onPressed: () async {
                final name = nameCtrl.text.trim();
                if (name.isEmpty) return;
                final val = double.tryParse(valCtrl.text) ?? 15.0;
                final start = int.tryParse(startCtrl.text) ?? 11;
                final end = int.tryParse(endCtrl.text) ?? 16;
                final cap = double.tryParse(capCtrl.text);

                Navigator.pop(ctx);
                await _saveRule(
                  id: rule?.id,
                  name: name,
                  discountType: discountType,
                  discountValue: val,
                  startHour: start,
                  endHour: end,
                  maxDiscountCap: cap,
                  isFlashSlot: isFlash,
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _saveRule({
    String? id,
    required String name,
    required String discountType,
    required double discountValue,
    required int startHour,
    required int endHour,
    double? maxDiscountCap,
    required bool isFlashSlot,
  }) async {
    try {
      final col = FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('yield_rules');

      final data = {
        'name': name,
        'discountType': discountType,
        'discountValue': discountValue,
        'startHour': startHour,
        'endHour': endHour,
        'maxDiscountCap': maxDiscountCap,
        'isFlashSlot': isFlashSlot,
        'daysOfWeek': ['mon', 'tue', 'wed', 'thu'],
        'isActive': true,
        'updatedAt': FieldValue.serverTimestamp(),
      };

      if (id != null && id.isNotEmpty) {
        await col.doc(id).set(data, SetOptions(merge: true));
      } else {
        await col.add(data);
      }
      _loadRules();
    } catch (e) {
      debugPrint("Error saving yield rule: $e");
    }
  }

  Future<void> _toggleRule(ServiceYieldRule rule) async {
    try {
      await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('yield_rules')
          .doc(rule.id)
          .update({'isActive': !rule.isActive});
      _loadRules();
    } catch (e) {
      debugPrint("Error toggling rule: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CupertinoNavigationBar(
        backgroundColor: AppColors.surface.withOpacity(0.9),
        middle: const Text("Скидки на слоты (Yield Rules)", style: TextStyle(color: Colors.white, fontSize: 16)),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.plus_circle_fill, color: AppColors.accentOrange),
          onPressed: () => _openRuleEditor(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CupertinoActivityIndicator(color: AppColors.accentOrange))
          : _rules.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(CupertinoIcons.flame, size: 48, color: Colors.white24),
                      const SizedBox(height: 12),
                      const Text("Правила скидок еще не настроены", style: TextStyle(color: Colors.white70, fontSize: 15)),
                      const SizedBox(height: 8),
                      const Text(
                        "Создайте правило для заполнения пустых часов (например, -20% по будням)",
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white38, fontSize: 12),
                      ),
                      const SizedBox(height: 16),
                      CupertinoButton.filled(
                        child: const Text("Создать правило"),
                        onPressed: () => _openRuleEditor(),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                  itemCount: _rules.length,
                  itemBuilder: (context, index) {
                    final rule = _rules[index];
                    final isPercent = rule.discountType == 'percent';
                    final badgeText = isPercent ? "-${rule.discountValue.toStringAsFixed(0)}%" : "-${rule.discountValue.toStringAsFixed(0)} ₽";

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: rule.isActive ? AppColors.accentOrange.withOpacity(0.3) : Colors.white.withOpacity(0.08),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.accentOrange.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              badgeText,
                              style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w800, fontSize: 14),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  rule.name,
                                  style: TextStyle(
                                    color: rule.isActive ? Colors.white : Colors.white38,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  rule.isFlashSlot
                                      ? "🔥 Горящий слот (< 3 часов до окна)"
                                      : "Часы: ${rule.startHour}:00 - ${rule.endHour}:00 (Пн-Чт)",
                                  style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          CupertinoSwitch(
                            value: rule.isActive,
                            onChanged: (_) => _toggleRule(rule),
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
