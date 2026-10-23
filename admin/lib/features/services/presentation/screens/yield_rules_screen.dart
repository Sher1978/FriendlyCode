import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/services/index.dart';
import 'package:friendly_code/core/theme/colors.dart';

class YieldRulesScreen extends StatefulWidget {
  final String venueId;
  final String currency;
  final String archetype;

  const YieldRulesScreen({
    super.key,
    required this.venueId,
    this.currency = '฿',
    this.archetype = 'batch',
  });

  @override
  State<YieldRulesScreen> createState() => _YieldRulesScreenState();
}

class _YieldRulesScreenState extends State<YieldRulesScreen> {
  bool _isLoading = true;
  List<ServiceYieldRule> _rules = [];

  bool get _isBatch => widget.archetype == 'batch';

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
    final startCtrl = TextEditingController(text: rule != null ? rule.startHour.toString() : '10');
    final endCtrl = TextEditingController(text: rule != null ? rule.endHour.toString() : '18');
    final capCtrl = TextEditingController(text: rule?.maxDiscountCap != null ? rule!.maxDiscountCap!.toStringAsFixed(0) : '');
    final flashHoursCtrl = TextEditingController(text: rule != null ? rule.flashLeadHours.toString() : '24');
    final emptySeatsCtrl = TextEditingController(text: rule != null ? rule.emptySeatsThreshold.toString() : '3');

    String discountType = rule?.discountType ?? 'percent';
    bool isFlash = rule?.isFlashSlot ?? (_isBatch ? true : false);

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => Dialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: AppColors.accentTeal, width: 1.5),
          ),
          child: Container(
            width: 580,
            constraints: const BoxConstraints(maxHeight: 740),
            padding: const EdgeInsets.all(24),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.accentTeal.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(CupertinoIcons.percent, color: AppColors.accentTeal, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          rule == null ? "Новое Yield-правило скидки" : "Редактировать правило",
                          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(CupertinoIcons.xmark, color: Colors.white54, size: 20),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Rule Name
                  const Text("Название правила", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  CupertinoTextField(
                    controller: nameCtrl,
                    placeholder: _isBatch 
                        ? "e.g. Горящие места в Камбоджу за 24 ч" 
                        : "e.g. Дневная скидка среди недели",
                    placeholderStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 14),
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.macosDivider),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Discount Type Selector
                  const Text("Тип скидки", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  CupertinoSegmentedControl<String>(
                    children: {
                      'percent': const Padding(padding: EdgeInsets.symmetric(horizontal: 14, vertical: 8), child: Text("В процентах (%)")),
                      'fixed': Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8), child: Text("В валюте (${widget.currency})")),
                    },
                    groupValue: discountType,
                    onValueChanged: (val) => setDialogState(() => discountType = val),
                  ),
                  const SizedBox(height: 16),

                  // Value & Max Cap
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              discountType == 'percent' ? "Размер скидки (%)" : "Скидка (${widget.currency})",
                              style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 6),
                            CupertinoTextField(
                              controller: valCtrl,
                              keyboardType: TextInputType.number,
                              placeholder: discountType == 'percent' ? "20" : "300",
                              placeholderStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 14),
                              style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.3),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.macosDivider),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Потолок скидки (макс. ${widget.currency})",
                              style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 6),
                            CupertinoTextField(
                              controller: capCtrl,
                              keyboardType: TextInputType.number,
                              placeholder: "Не ограничено",
                              placeholderStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 14),
                              style: const TextStyle(color: Colors.white, fontSize: 14),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.3),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.macosDivider),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // AUTOMATED HOT DEAL CONDITION BUILDER FOR BATCH_CAPACITY
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isFlash ? AppColors.accentTeal.withValues(alpha: 0.08) : Colors.black.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: isFlash ? AppColors.accentTeal : AppColors.macosDivider),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(CupertinoIcons.bolt_fill, color: AppColors.accentTeal, size: 18),
                                SizedBox(width: 8),
                                Text(
                                  "Автоматический Hot Deal Триггер",
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ],
                            ),
                            CupertinoSwitch(
                              value: isFlash,
                              activeTrackColor: AppColors.accentTeal,
                              onChanged: (val) => setDialogState(() => isFlash = val),
                            ),
                          ],
                        ),
                        if (isFlash) ...[
                          const SizedBox(height: 12),
                          const Text(
                            "Условия автоматической активации скидки и поднятия в карусель «Горящие места»:",
                            style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("До выезда осталось <= (ч)", style: TextStyle(color: Colors.white70, fontSize: 11)),
                                    const SizedBox(height: 4),
                                    CupertinoTextField(
                                      controller: flashHoursCtrl,
                                      keyboardType: TextInputType.number,
                                      placeholder: "24",
                                      style: const TextStyle(color: Colors.white, fontSize: 13),
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: Colors.black.withValues(alpha: 0.3),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: Colors.white24),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("Свободно мест в салоне >=", style: TextStyle(color: Colors.white70, fontSize: 11)),
                                    const SizedBox(height: 4),
                                    CupertinoTextField(
                                      controller: emptySeatsCtrl,
                                      keyboardType: TextInputType.number,
                                      placeholder: "3",
                                      style: const TextStyle(color: Colors.white, fontSize: 13),
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: Colors.black.withValues(alpha: 0.3),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: Colors.white24),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            "💡 Формула SoT: IF hours_to_departure <= X AND unsold_seats >= Y -> автоскидка и публикация в HotDealsScroller.",
                            style: TextStyle(color: AppColors.accentTeal, fontSize: 10, height: 1.3),
                          ),
                        ],
                      ],
                    ),
                  ),

                  if (!isFlash) ...[
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("С часа (00-23)", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12)),
                              const SizedBox(height: 6),
                              CupertinoTextField(
                                controller: startCtrl,
                                keyboardType: TextInputType.number,
                                placeholder: "10",
                                style: const TextStyle(color: Colors.white, fontSize: 13),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.3),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.macosDivider),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("До часа (00-23)", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12)),
                              const SizedBox(height: 6),
                              CupertinoTextField(
                                controller: endCtrl,
                                keyboardType: TextInputType.number,
                                placeholder: "18",
                                style: const TextStyle(color: Colors.white, fontSize: 13),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.3),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.macosDivider),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],

                  const SizedBox(height: 24),

                  // Actions
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      CupertinoButton(
                        child: const Text("Отмена", style: TextStyle(color: Colors.white70)),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accentTeal,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () async {
                          final name = nameCtrl.text.trim();
                          if (name.isEmpty) return;
                          final val = double.tryParse(valCtrl.text) ?? 15.0;
                          final start = int.tryParse(startCtrl.text) ?? 10;
                          final end = int.tryParse(endCtrl.text) ?? 18;
                          final cap = double.tryParse(capCtrl.text);
                          final flashLead = int.tryParse(flashHoursCtrl.text) ?? 24;
                          final emptySeats = int.tryParse(emptySeatsCtrl.text) ?? 3;

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
                            flashLeadHours: flashLead,
                            emptySeatsThreshold: emptySeats,
                          );
                        },
                        child: Text(
                          rule == null ? "Создать правило" : "Сохранить",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
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
    int flashLeadHours = 24,
    int emptySeatsThreshold = 3,
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
        'flashLeadHours': flashLeadHours,
        'emptySeatsThreshold': emptySeatsThreshold,
        'daysOfWeek': ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
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
      body: _isLoading
          ? const Center(child: CupertinoActivityIndicator(color: AppColors.accentTeal))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isBatch ? "Yield Доходность & Горящие места" : "Управление Yield-доходностью",
                            style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _isBatch 
                                ? "Автоматические правила заполнения пустых мест перед отправлением рейса" 
                                : "Динамические правила скидок на непопулярные часы",
                            style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accentTeal,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(CupertinoIcons.plus, size: 16),
                        label: const Text("Создать правило", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        onPressed: () => _openRuleEditor(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  if (_rules.isEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.macosDivider),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            const Icon(CupertinoIcons.flame, size: 48, color: Colors.white30),
                            const SizedBox(height: 16),
                            const Text(
                              "Правила скидок еще не настроены",
                              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _isBatch
                                  ? "Создайте правило: например, за 24 ч до выезда при наличии 3 свободных мест давать скидку -20%."
                                  : "Создайте правило для заполнения пустых часов.",
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
                            ),
                            const SizedBox(height: 18),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.accentTeal,
                                foregroundColor: Colors.black,
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: () => _openRuleEditor(),
                              icon: const Icon(CupertinoIcons.plus, size: 16),
                              label: const Text("Создать Hot Deal правило", style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ] else ...[
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _rules.length,
                      itemBuilder: (context, index) {
                        final rule = _rules[index];
                        final isPercent = rule.discountType == 'percent';
                        final badgeText = isPercent 
                            ? "-${rule.discountValue.toStringAsFixed(0)}%" 
                            : "-${rule.discountValue.toStringAsFixed(0)} ${widget.currency}";

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: rule.isActive ? AppColors.accentTeal.withValues(alpha: 0.3) : Colors.white.withValues(alpha: 0.08),
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: AppColors.accentTeal.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  badgeText,
                                  style: const TextStyle(color: AppColors.accentTeal, fontWeight: FontWeight.w800, fontSize: 15),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      rule.name,
                                      style: TextStyle(
                                        color: rule.isActive ? Colors.white : Colors.white38,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      rule.isFlashSlot
                                          ? "⚡ Горящий триггер: <= ${rule.flashLeadHours}ч до отправления & >= ${rule.emptySeatsThreshold} свободных мест"
                                          : "Окно выезда: ${rule.startHour}:00 - ${rule.endHour}:00",
                                      style: TextStyle(
                                        color: rule.isFlashSlot ? AppColors.accentTeal : Colors.white.withValues(alpha: 0.5),
                                        fontSize: 12,
                                        fontWeight: rule.isFlashSlot ? FontWeight.bold : FontWeight.normal,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              CupertinoSwitch(
                                value: rule.isActive,
                                activeTrackColor: AppColors.accentTeal,
                                onChanged: (_) => _toggleRule(rule),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}
