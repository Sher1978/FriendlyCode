import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:qr_flutter/qr_flutter.dart';

class DeliveryLoyaltyScreen extends StatefulWidget {
  final String venueId;
  const DeliveryLoyaltyScreen({super.key, required this.venueId});

  @override
  State<DeliveryLoyaltyScreen> createState() => _DeliveryLoyaltyScreenState();
}

class _DeliveryLoyaltyScreenState extends State<DeliveryLoyaltyScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  VenueModel? _venue;

  bool _useCustomTiers = false;
  final _percBaseCtrl = TextEditingController();
  final _percMediumCtrl = TextEditingController();
  final _mediumDaysCtrl = TextEditingController();
  final _percVipCtrl = TextEditingController();
  final _vipWindowDaysCtrl = TextEditingController();
  final _percDepositCtrl = TextEditingController();
  final _freeDeliveryThresholdCtrl = TextEditingController();
  final _pickupBonusCtrl = TextEditingController();

  List<HappyHourRule> _happyHours = [];

  @override
  void initState() {
    super.initState();
    _loadVenue();
  }

  @override
  void dispose() {
    _percBaseCtrl.dispose();
    _percMediumCtrl.dispose();
    _mediumDaysCtrl.dispose();
    _percVipCtrl.dispose();
    _vipWindowDaysCtrl.dispose();
    _percDepositCtrl.dispose();
    _freeDeliveryThresholdCtrl.dispose();
    _pickupBonusCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadVenue() async {
    try {
      final doc = await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).get();
      if (doc.exists) {
        _venue = VenueModel.fromMap(doc.id, doc.data()!);
        final dLoyalty = _venue!.deliveryLoyaltyConfig;

        _useCustomTiers = dLoyalty.useCustomDeliveryTiers;
        _percBaseCtrl.text = dLoyalty.percBase.toString();
        _percMediumCtrl.text = dLoyalty.percMedium.toString();
        _mediumDaysCtrl.text = dLoyalty.mediumDays.toString();
        _percVipCtrl.text = dLoyalty.percVip.toString();
        _vipWindowDaysCtrl.text = dLoyalty.vipWindowDays.toString();
        _percDepositCtrl.text = dLoyalty.percDeposit.toString();
        _freeDeliveryThresholdCtrl.text = dLoyalty.freeDeliveryThreshold.toStringAsFixed(0);
        _pickupBonusCtrl.text = dLoyalty.pickupBonusPercent.toString();
        _happyHours = List<HappyHourRule>.from(dLoyalty.happyHours);
      }
    } catch (e) {
      debugPrint("Error loading delivery loyalty: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveConfig() async {
    setState(() => _isSaving = true);
    try {
      final updatedDeliveryConfig = DeliveryLoyaltyConfig(
        useCustomDeliveryTiers: _useCustomTiers,
        percBase: int.tryParse(_percBaseCtrl.text) ?? 10,
        percMedium: int.tryParse(_percMediumCtrl.text) ?? 15,
        mediumDays: int.tryParse(_mediumDaysCtrl.text) ?? 7,
        percVip: int.tryParse(_percVipCtrl.text) ?? 20,
        vipWindowDays: int.tryParse(_vipWindowDaysCtrl.text) ?? 1,
        percDeposit: int.tryParse(_percDepositCtrl.text) ?? 25,
        depositThreshold: _venue?.loyaltyConfig.depositThreshold ?? 1000000.0,
        freeDeliveryThreshold: double.tryParse(_freeDeliveryThresholdCtrl.text) ?? 250000.0,
        pickupBonusPercent: int.tryParse(_pickupBonusCtrl.text) ?? 5,
        happyHours: _happyHours,
      );

      await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).set({
        'deliveryLoyaltyConfig': updatedDeliveryConfig.toMap(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      setState(() => _isSaving = false);
      _showToast("Настройки скидок и Happy Hours доставки сохранены!");
    } catch (e) {
      setState(() => _isSaving = false);
      _showToast("Ошибка сохранения: $e");
    }
  }

  void _showToast(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor: AppColors.accentOrange,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CupertinoActivityIndicator(radius: 14));
    }

    final offlineLoyalty = _venue?.loyaltyConfig ?? const LoyaltyConfig();
    final offlineMediumStage = offlineLoyalty.decayStages.isNotEmpty
        ? offlineLoyalty.decayStages[0]
        : const LoyaltyDecayStage(days: 7, discount: 15);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "СКИДКИ ДОСТАВКИ И HAPPY HOURS",
                      style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: -0.5),
                    ),
                    SizedBox(height: 6),
                    Text(
                      "3 регулярных динамических тира + 1 депозитный тир + расписание счастливых часов.",
                      style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13),
                    ),
                  ],
                ),
                CupertinoButton(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  color: AppColors.accentOrange,
                  borderRadius: BorderRadius.circular(10),
                  onPressed: _isSaving ? null : _saveConfig,
                  child: _isSaving
                      ? const CupertinoActivityIndicator(color: Colors.white)
                      : const Text("СОХРАНИТЬ", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Mode Toggle Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.macosSurfaceBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.macosDivider),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Отдельные значения тиров для доставки", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                        SizedBox(height: 4),
                        Text(
                          "Если выключено — онлайн-доставка автоматически повторяет офлайн-скидки заведения. Если включено — можно задать повышенные проценты (например, 20% онлайн vs 15% в зале).",
                          style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  CupertinoSwitch(
                    value: _useCustomTiers,
                    activeColor: AppColors.accentOrange,
                    onChanged: (val) => setState(() => _useCustomTiers = val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            if (!_useCustomTiers)
              _buildInheritedOfflineCard(offlineLoyalty, offlineMediumStage)
            else
              _buildCustomTiersCard(),

            const SizedBox(height: 32),
            _buildHappyHoursSection(),

            const SizedBox(height: 32),
            _buildDeliveryPerksCard(),

            const SizedBox(height: 32),
            _buildScenariosQrCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildScenariosQrCard() {
    final grabBagUrl = "https://www.revoo.win/?utm_source=grab_bag&promo=max_tier&id=${widget.venueId}";
    final googleMapsUrl = "https://www.revoo.win/?utm_source=google_maps&id=${widget.venueId}";

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.greenAccent.withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(CupertinoIcons.qrcode_viewfinder, color: Colors.greenAccent, size: 22),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  "ДВА СЦЕНАРИЯ НАЧИСЛЕНИЯ СКИДКИ (ПЕРЕВОД КЛИЕНТОВ ИЗ GRAB / GLOVO)",
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            "• Сценарий 1 (Переход через Google Карты): Клиент получает сегодня минимальную скидку (Тир 1), а на следующий день после заказа — максимальную (Тир 3).\n"
            "• Сценарий 2 (Сканирование QR-кода в пакете с едой из Grab / Glovo): Сканирование QR в пакете агрегатора приравнивается к сегодняшнему заказу у вас! У клиента нет минимальной скидки сегодня — он СРАЗУ получает максимальную скидку (Тир 3) на заказ прямо сейчас и завтра!",
            style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 18),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: QrImageView(
                  data: grabBagUrl,
                  version: QrVersions.auto,
                  size: 115,
                  backgroundColor: Colors.white,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "QR и ссылка Сценария 2 (В пакет с едой из Grab → Сразу Тир 3):",
                      style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    const SizedBox(height: 6),
                    SelectableText(
                      grabBagUrl,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 10,
                      runSpacing: 8,
                      children: [
                        CupertinoButton(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          color: Colors.green.shade600,
                          borderRadius: BorderRadius.circular(8),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: grabBagUrl));
                            _showToast("Ссылка для QR в пакет Grab (Сценарий 2) скопирована!");
                          },
                          child: const Text("Скопировать ссылку Grab QR (Тир 3)", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                        CupertinoButton(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          color: AppColors.accentOrange,
                          borderRadius: BorderRadius.circular(8),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: googleMapsUrl));
                            _showToast("Ссылка для Google Карт (Сценарий 1) скопирована!");
                          },
                          child: const Text("Скопировать ссылку Google Карт (Тир 1 → Тир 3)", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ],
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

  Widget _buildInheritedOfflineCard(LoyaltyConfig offline, LoyaltyDecayStage mediumStage) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: CupertinoColors.activeBlue.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: CupertinoColors.activeBlue.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(CupertinoIcons.checkmark_seal_fill, color: CupertinoColors.activeBlue, size: 20),
              SizedBox(width: 10),
              Text("Активно наследование из офлайн-программы", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            "• Тир 1 (Базовая): ${offline.percBase}%\n"
            "• Тир 2 (Средняя): ${mediumStage.discount}% (в течение ${mediumStage.days} дн.)\n"
            "• Тир 3 (Максимальная регулярная): ${offline.percVip}% (в окне ${offline.vipWindowDays} дн.)\n"
            "• Депозитный Тир: ${offline.percDeposit}% (константная скидка держателей депозита)",
            style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.6),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomTiersCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.accentOrange.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("НАСТРОЙКА 4 ТИРОВ ОНЛАЙН-ДОСТАВКИ", style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildSimpleNumField("Тир 1: Базовая скидка (%)", _percBaseCtrl)),
              const SizedBox(width: 16),
              Expanded(child: _buildSimpleNumField("Тир 2: Средняя скидка (%)", _percMediumCtrl)),
              const SizedBox(width: 16),
              Expanded(child: _buildSimpleNumField("Тир 2: Окно возврата (дней)", _mediumDaysCtrl)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildSimpleNumField("Тир 3: Макс. регулярная (%)", _percVipCtrl)),
              const SizedBox(width: 16),
              Expanded(child: _buildSimpleNumField("Тир 3: Окно VIP (дней)", _vipWindowDaysCtrl)),
              const SizedBox(width: 16),
              Expanded(child: _buildSimpleNumField("Депозитный Тир (%)", _percDepositCtrl)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHappyHoursSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.macosDivider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(CupertinoIcons.timer, color: Colors.amber, size: 20),
                  SizedBox(width: 10),
                  Text("СЧАСТЛИВЫЕ ЧАСЫ (HAPPY HOURS)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                ],
              ),
              CupertinoButton(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                color: Colors.amber.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
                onPressed: () {
                  setState(() {
                    _happyHours.add(HappyHourRule(
                      id: "hh_${DateTime.now().millisecondsSinceEpoch}",
                      title: "Дневной буст 14:00 - 17:00",
                      discountPercent: 25,
                      freeDelivery: true,
                    ));
                  });
                },
                child: const Row(
                  children: [
                    Icon(CupertinoIcons.add, size: 14, color: Colors.amber),
                    SizedBox(width: 6),
                    Text("Добавить слот", style: TextStyle(color: Colors.amber, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_happyHours.isEmpty)
            const Text("Нет активных слотов Happy Hours. Нажмите «Добавить слот», чтобы активировать скидки в часы низкой загрузки кухни.", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13))
          else
            Column(
              children: List.generate(_happyHours.length, (idx) {
                final hh = _happyHours[idx];
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.04),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.amber.withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(hh.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 4),
                            Text("Скидка: ${hh.discountPercent}% • Время: ${hh.startTime} - ${hh.endTime} • Бесплатная доставка: ${hh.freeDelivery ? 'ДА' : 'НЕТ'}",
                                style: const TextStyle(color: Colors.amber, fontSize: 12)),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(CupertinoIcons.delete, color: Colors.redAccent, size: 18),
                        onPressed: () {
                          setState(() => _happyHours.removeAt(idx));
                        },
                      ),
                    ],
                  ),
                );
              }),
            ),
        ],
      ),
    );
  }

  Widget _buildDeliveryPerksCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.macosSurfaceBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.macosDivider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("ДОПОЛНИТЕЛЬНЫЕ СТИМУЛЫ ДОСТАВКИ", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildSimpleNumField("Сумма заказа для бесплатной доставки", _freeDeliveryThresholdCtrl),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildSimpleNumField("Дополнительная скидка за самовывоз (%)", _pickupBonusCtrl),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSimpleNumField(String label, TextEditingController ctrl) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 11, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        CupertinoTextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.3),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.white12),
          ),
        ),
      ],
    );
  }
}
