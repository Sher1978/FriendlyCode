import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/theme/colors.dart';

class DeliveryLogisticsPaymentScreen extends StatefulWidget {
  final String venueId;
  const DeliveryLogisticsPaymentScreen({super.key, required this.venueId});

  @override
  State<DeliveryLogisticsPaymentScreen> createState() => _DeliveryLogisticsPaymentScreenState();
}

class _DeliveryLogisticsPaymentScreenState extends State<DeliveryLogisticsPaymentScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  VenueModel? _venue;

  // Payments
  bool _cashOnDelivery = true;
  bool _cardTerminalOnDelivery = false;
  bool _payFromDeposit = true;
  final _vietQrBankBinCtrl = TextEditingController();
  final _vietQrAccountNumCtrl = TextEditingController();
  final _vietQrAccountNameCtrl = TextEditingController();
  final _stripeAccountCtrl = TextEditingController();
  final _ziinaUrlCtrl = TextEditingController();
  final _razorpayKeyCtrl = TextEditingController();
  final _upiIdCtrl = TextEditingController();

  // Logistics
  String _deliveryMode = 'in_house';
  final _radiusKmCtrl = TextEditingController();
  final _baseFeeCtrl = TextEditingController();
  String _preferred3pl = 'lalamove';
  final _telegramChatIdCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadVenue();
  }

  @override
  void dispose() {
    _vietQrBankBinCtrl.dispose();
    _vietQrAccountNumCtrl.dispose();
    _vietQrAccountNameCtrl.dispose();
    _stripeAccountCtrl.dispose();
    _ziinaUrlCtrl.dispose();
    _razorpayKeyCtrl.dispose();
    _upiIdCtrl.dispose();
    _radiusKmCtrl.dispose();
    _baseFeeCtrl.dispose();
    _telegramChatIdCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadVenue() async {
    try {
      final doc = await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).get();
      if (doc.exists) {
        _venue = VenueModel.fromMap(doc.id, doc.data()!);
        final p = _venue!.paymentConfig;
        final l = _venue!.logisticsConfig;

        _cashOnDelivery = p.cashOnDelivery;
        _cardTerminalOnDelivery = p.cardTerminalOnDelivery;
        _payFromDeposit = p.payFromDeposit;
        _vietQrBankBinCtrl.text = p.vietQrBankBin;
        _vietQrAccountNumCtrl.text = p.vietQrAccountNumber;
        _vietQrAccountNameCtrl.text = p.vietQrAccountName;
        _stripeAccountCtrl.text = p.stripeAccountId;
        _ziinaUrlCtrl.text = p.ziinaPaymentUrl;
        _razorpayKeyCtrl.text = p.razorpayKeyId;
        _upiIdCtrl.text = p.upiId;

        _deliveryMode = l.deliveryMode;
        _radiusKmCtrl.text = l.inHouseRadiusKm.toString();
        _baseFeeCtrl.text = l.inHouseBaseFee.toStringAsFixed(0);
        _preferred3pl = l.preferred3plProvider;
        _telegramChatIdCtrl.text = l.telegramDispatchChatId;
      }
    } catch (e) {
      debugPrint("Error loading logistics and payment: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveConfig() async {
    setState(() => _isSaving = true);
    try {
      final updatedPayment = VenuePaymentConfig(
        cashOnDelivery: _cashOnDelivery,
        cardTerminalOnDelivery: _cardTerminalOnDelivery,
        payFromDeposit: _payFromDeposit,
        vietQrBankBin: _vietQrBankBinCtrl.text.trim(),
        vietQrAccountNumber: _vietQrAccountNumCtrl.text.trim(),
        vietQrAccountName: _vietQrAccountNameCtrl.text.trim(),
        stripeAccountId: _stripeAccountCtrl.text.trim(),
        ziinaPaymentUrl: _ziinaUrlCtrl.text.trim(),
        razorpayKeyId: _razorpayKeyCtrl.text.trim(),
        upiId: _upiIdCtrl.text.trim(),
      );

      final updatedLogistics = VenueLogisticsConfig(
        deliveryMode: _deliveryMode,
        inHouseRadiusKm: double.tryParse(_radiusKmCtrl.text) ?? 5.0,
        inHouseBaseFee: double.tryParse(_baseFeeCtrl.text) ?? 25000.0,
        preferred3plProvider: _preferred3pl,
        telegramDispatchChatId: _telegramChatIdCtrl.text.trim(),
      );

      await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).set({
        'paymentConfig': updatedPayment.toMap(),
        'logisticsConfig': updatedLogistics.toMap(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      setState(() => _isSaving = false);
      _showToast("Настройки оплаты и логистики сохранены!");
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
                    Text("ОПЛАТА И СЛУЖБА ДОСТАВКИ", style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                    SizedBox(height: 6),
                    Text("Привязка локальных платежей (VietQR, Stripe, UPI) и диспетчеризация курьеров.", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 13)),
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

            // Payments Card
            _buildPaymentsCard(),

            const SizedBox(height: 32),

            // Logistics Card
            _buildLogisticsCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentsCard() {
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
          const Row(
            children: [
              Icon(CupertinoIcons.creditcard_fill, color: CupertinoColors.activeGreen, size: 20),
              SizedBox(width: 10),
              Text("ПРИВЯЗКА ОПЛАТЫ К ЗАВЕДЕНИЮ", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
            ],
          ),
          const SizedBox(height: 16),

          // Universal Toggles
          _buildToggleRow("Наличными курьеру (COD)", _cashOnDelivery, (v) => setState(() => _cashOnDelivery = v)),
          _buildToggleRow("Оплата картой через терминал курьера", _cardTerminalOnDelivery, (v) => setState(() => _cardTerminalOnDelivery = v)),
          _buildToggleRow("Оплата с баланса Депозита гостя", _payFromDeposit, (v) => setState(() => _payFromDeposit = v)),

          const SizedBox(height: 20),
          const Divider(color: Colors.white12),
          const SizedBox(height: 16),

          // Vietnam Section
          const Text("🇻🇳 ВЬЕТНАМ: МГНОВЕННЫЙ VietQR (Napas247)", style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _buildTextField("БИН Банка (например 970436 для Vietcombank)", _vietQrBankBinCtrl)),
              const SizedBox(width: 14),
              Expanded(child: _buildTextField("Номер расчетного счета", _vietQrAccountNumCtrl)),
              const SizedBox(width: 14),
              Expanded(child: _buildTextField("Имя владельца счета", _vietQrAccountNameCtrl)),
            ],
          ),

          const SizedBox(height: 20),
          const Divider(color: Colors.white12),
          const SizedBox(height: 16),

          // Dubai & India Section
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("🇦🇪 ДУБАЙ: Stripe & Ziina", style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 10),
                    _buildTextField("Stripe Account ID (Apple/Google Pay)", _stripeAccountCtrl),
                    const SizedBox(height: 10),
                    _buildTextField("Ziina Payment URL", _ziinaUrlCtrl),
                  ],
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("🇮🇳 ИНДИЯ: Razorpay & UPI", style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 10),
                    _buildTextField("Razorpay Key ID", _razorpayKeyCtrl),
                    const SizedBox(height: 10),
                    _buildTextField("Direct UPI ID (merchant@upi)", _upiIdCtrl),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLogisticsCard() {
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
          const Row(
            children: [
              Icon(CupertinoIcons.location_fill, color: CupertinoColors.activeBlue, size: 20),
              SizedBox(width: 10),
              Text("СЛУЖБА ДОСТАВКИ И КУРЬЕРЫ", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
            ],
          ),
          const SizedBox(height: 16),

          // Delivery mode choice
          const Text("Режим доставки:", style: TextStyle(color: AppColors.macosTextSecondary, fontSize: 12)),
          const SizedBox(height: 8),
          CupertinoSegmentedControl<String>(
            groupValue: _deliveryMode,
            children: const {
              'in_house': Padding(padding: EdgeInsets.symmetric(horizontal: 14, vertical: 8), child: Text("Собственные курьеры", style: TextStyle(fontSize: 12))),
              'external_3pl': Padding(padding: EdgeInsets.symmetric(horizontal: 14, vertical: 8), child: Text("Службы 3PL (Lalamove/Porter)", style: TextStyle(fontSize: 12))),
              'hybrid': Padding(padding: EdgeInsets.symmetric(horizontal: 14, vertical: 8), child: Text("Гибридный режим", style: TextStyle(fontSize: 12))),
            },
            onValueChanged: (val) => setState(() => _deliveryMode = val),
          ),

          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(child: _buildTextField("Радиус своих курьеров (км)", _radiusKmCtrl)),
              const SizedBox(width: 14),
              Expanded(child: _buildTextField("Базовая цена доставки", _baseFeeCtrl)),
              const SizedBox(width: 14),
              Expanded(child: _buildTextField("Telegram Chat ID для отправки заказов", _telegramChatIdCtrl)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildToggleRow(String title, bool val, ValueChanged<bool> onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
          CupertinoSwitch(
            value: val,
            activeColor: CupertinoColors.activeGreen,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController ctrl) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 11, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        CupertinoTextField(
          controller: ctrl,
          style: const TextStyle(color: Colors.white, fontSize: 13),
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
