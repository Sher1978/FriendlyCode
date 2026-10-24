import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:friendly_code/features/owner/presentation/screens/deposit_action_screen.dart';

class OnlineOrdersManagerScreen extends StatefulWidget {
  final String venueId;

  const OnlineOrdersManagerScreen({
    super.key,
    required this.venueId,
  });

  @override
  State<OnlineOrdersManagerScreen> createState() => _OnlineOrdersManagerScreenState();
}

class _OnlineOrdersManagerScreenState extends State<OnlineOrdersManagerScreen> {
  String _activeTab = 'pending'; // 'pending', 'active', 'completed', 'cancelled', 'all'
  bool _isProcessing = false;
  Map<String, dynamic>? _venueData;

  @override
  void initState() {
    super.initState();
    _loadVenueData();
  }

  Future<void> _loadVenueData() async {
    try {
      final doc = await FirebaseFirestore.instance.collection('venues').doc(widget.venueId).get();
      if (doc.exists && mounted) {
        setState(() {
          _venueData = doc.data();
        });
      }
    } catch (e) {
      debugPrint("Error loading venue data in OnlineOrdersManagerScreen: $e");
    }
  }

  String _formatCurrency(num amount, [String currency = '₫']) {
    final str = amount.round().toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]} ',
    );
    return '$str $currency';
  }

  String _formatTimestamp(dynamic ts) {
    if (ts == null) return '';
    DateTime dt;
    if (ts is Timestamp) {
      dt = ts.toDate();
    } else if (ts is DateTime) {
      dt = ts;
    } else {
      return '';
    }
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    final day = dt.day.toString().padLeft(2, '0');
    final month = dt.month.toString().padLeft(2, '0');
    return '$day.$month $hour:$minute';
  }

  // ── DEPOSIT DEDUCTION LOGIC (DUPLICATED FROM DEPOSIT ACTION SCREEN) ───────
  Future<void> _approveAndDeductDeposit({
    required BuildContext context,
    required String orderDocId,
    required Map<String, dynamic> orderData,
  }) async {
    final customer = (orderData['customer'] as Map<String, dynamic>?) ?? {};
    final customerUid = customer['uid']?.toString() ?? '';
    final customerName = customer['name']?.toString() ?? 'Гость';
    final customerEmail = customer['email']?.toString() ?? '';
    final orderId = orderData['orderId']?.toString() ?? orderDocId;
    final depositDeducted = (orderData['depositDeducted'] as num?)?.toDouble() ?? 0.0;

    if (customerUid.isEmpty || customerUid == 'guest') {
      _showToast(context, 'Ошибка: У заказа нет привязанного ID пользователя (гостя)', isError: true);
      return;
    }

    if (depositDeducted <= 0) {
      _showToast(context, 'В этом заказе нет суммы для списания с депозита', isError: true);
      return;
    }

    // Confirm dialog
    final shouldProceed = await showCupertinoDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Подтверждение списания депозита'),
        content: Padding(
          padding: const EdgeInsets.only(top: 8.0),
          child: Text(
            'Списать ${_formatCurrency(depositDeducted)} с баланса гостя $customerName по заказу #$orderId?\n\n'
            'Средства спишутся с баланса гостя в заведении и заказ перейдет в статус "В работе".',
          ),
        ),
        actions: [
          CupertinoDialogAction(
            child: const Text('Отмена'),
            onPressed: () => Navigator.pop(ctx, false),
          ),
          CupertinoDialogAction(
            isDefaultAction: true,
            child: Text('Списать ${_formatCurrency(depositDeducted)}'),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (shouldProceed != true) return;

    setState(() => _isProcessing = true);
    try {
      final userRef = FirebaseFirestore.instance.collection('users').doc(customerUid);
      final userSnap = await userRef.get();

      if (!userSnap.exists) {
        throw Exception('Пользователь $customerUid не найден в базе данных');
      }

      final userData = userSnap.data() ?? {};
      final balances = Map<String, dynamic>.from(userData['deposit_balances'] ?? {});
      
      num currentVenueBalNum = 0;
      if (balances.containsKey(widget.venueId)) {
        final val = balances[widget.venueId];
        if (val is num) currentVenueBalNum = val;
        if (val is Map && val['balance'] is num) currentVenueBalNum = val['balance'];
      } else if (userData['deposit_balance'] is num) {
        currentVenueBalNum = userData['deposit_balance'];
      }

      final currentBalance = currentVenueBalNum.toDouble();

      if (currentBalance < depositDeducted) {
        throw Exception('Недостаточно средств на депозите гостя! Доступно: ${_formatCurrency(currentBalance)}, требуется: ${_formatCurrency(depositDeducted)}');
      }

      final newBalance = (currentBalance - depositDeducted);
      final staffUser = AuthService().currentUser;
      final staffName = staffUser?.displayName ?? staffUser?.email ?? 'Администратор';
      final staffEmail = staffUser?.email ?? '';

      // 1. Update user deposit balance
      balances[widget.venueId] = newBalance;
      await userRef.set({
        'deposit_balances': balances,
        'deposit_balance': newBalance,
        'deposit_venue_id': widget.venueId,
        'hasLockedDiscount': newBalance > 0,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      // 2. Add deposit transaction (Exact duplicate of DepositActionScreen format)
      await FirebaseFirestore.instance.collection('deposit_transactions').add({
        'userId': customerUid,
        'guestName': customerName,
        'guestEmail': customerEmail,
        'venueId': widget.venueId,
        'amount': depositDeducted,
        'finalAmount': depositDeducted,
        'type': 'DEBIT',
        'transactionType': 'DEBIT',
        'orderId': orderId,
        'description': 'Оплата онлайн-заказа #$orderId',
        'previousBalance': currentBalance,
        'newBalance': newBalance,
        'balanceAfter': newBalance,
        'staffName': staffName,
        'staffEmail': staffEmail,
        'source': 'online_order',
        'createdAt': FieldValue.serverTimestamp(),
      });

      // 3. Update order document status
      await FirebaseFirestore.instance.collection('orders').doc(orderDocId).update({
        'depositStatus': 'approved',
        'status': 'confirmed',
        'depositDeductedBy': staffName,
        'depositDeductedAt': FieldValue.serverTimestamp(),
      });

      if (mounted) {
        _showToast(context, '✅ Депозит ${_formatCurrency(depositDeducted)} успешно списан! Заказ принят в работу.');
      }
    } catch (e) {
      debugPrint("Error deducting deposit for online order: $e");
      if (mounted) {
        _showToast(context, 'Ошибка списания: $e', isError: true);
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  // ── REFUND / CANCEL DEDUCTION ─────────────────────────────────────────────
  Future<void> _refundDeductedDeposit({
    required BuildContext context,
    required String orderDocId,
    required Map<String, dynamic> orderData,
  }) async {
    final customer = (orderData['customer'] as Map<String, dynamic>?) ?? {};
    final customerUid = customer['uid']?.toString() ?? '';
    final customerName = customer['name']?.toString() ?? 'Гость';
    final customerEmail = customer['email']?.toString() ?? '';
    final orderId = orderData['orderId']?.toString() ?? orderDocId;
    final depositDeducted = (orderData['depositDeducted'] as num?)?.toDouble() ?? 0.0;

    if (customerUid.isEmpty || depositDeducted <= 0) return;

    final shouldRefund = await showCupertinoDialog<bool>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Возврат списанного депозита'),
        content: Text('Вернуть ${_formatCurrency(depositDeducted)} на баланс гостя $customerName и отменить заказ?'),
        actions: [
          CupertinoDialogAction(
            child: const Text('Отмена'),
            onPressed: () => Navigator.pop(ctx, false),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            child: const Text('Вернуть депозит'),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (shouldRefund != true) return;

    setState(() => _isProcessing = true);
    try {
      final userRef = FirebaseFirestore.instance.collection('users').doc(customerUid);
      final userSnap = await userRef.get();
      final userData = userSnap.data() ?? {};
      final balances = Map<String, dynamic>.from(userData['deposit_balances'] ?? {});

      num currentVenueBalNum = 0;
      if (balances.containsKey(widget.venueId)) {
        final val = balances[widget.venueId];
        if (val is num) currentVenueBalNum = val;
      } else if (userData['deposit_balance'] is num) {
        currentVenueBalNum = userData['deposit_balance'];
      }

      final currentBalance = currentVenueBalNum.toDouble();
      final newBalance = currentBalance + depositDeducted;
      final staffUser = AuthService().currentUser;
      final staffName = staffUser?.displayName ?? staffUser?.email ?? 'Администратор';

      balances[widget.venueId] = newBalance;
      await userRef.set({
        'deposit_balances': balances,
        'deposit_balance': newBalance,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      // Add Credit refund transaction
      await FirebaseFirestore.instance.collection('deposit_transactions').add({
        'userId': customerUid,
        'guestName': customerName,
        'guestEmail': customerEmail,
        'venueId': widget.venueId,
        'amount': depositDeducted,
        'finalAmount': depositDeducted,
        'type': 'CREDIT',
        'transactionType': 'CREDIT',
        'orderId': orderId,
        'description': 'Возврат списания по отмененному онлайн-заказу #$orderId',
        'previousBalance': currentBalance,
        'newBalance': newBalance,
        'balanceAfter': newBalance,
        'staffName': staffName,
        'source': 'online_order_refund',
        'createdAt': FieldValue.serverTimestamp(),
      });

      await FirebaseFirestore.instance.collection('orders').doc(orderDocId).update({
        'depositStatus': 'refunded',
        'status': 'cancelled',
        'depositRefundedBy': staffName,
        'depositRefundedAt': FieldValue.serverTimestamp(),
      });

      if (mounted) {
        _showToast(context, 'Депозит ${_formatCurrency(depositDeducted)} возвращен гостю. Заказ отменен.');
      }
    } catch (e) {
      if (mounted) _showToast(context, 'Ошибка возврата: $e', isError: true);
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  // ── UPDATE ORDER STATUS ──────────────────────────────────────────────────
  Future<void> _updateOrderStatus(String orderDocId, String newStatus, [String? toastMsg]) async {
    setState(() => _isProcessing = true);
    try {
      await FirebaseFirestore.instance.collection('orders').doc(orderDocId).update({
        'status': newStatus,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      if (mounted && toastMsg != null) {
        _showToast(context, toastMsg);
      }
    } catch (e) {
      if (mounted) _showToast(context, 'Ошибка обновления статуса: $e', isError: true);
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  // ── TELEGRAM DISPATCH FORMATTING ─────────────────────────────────────────
  void _shareToTelegram(Map<String, dynamic> order) {
    final customer = (order['customer'] as Map<String, dynamic>?) ?? {};
    final guestLoc = (order['guestLocation'] as Map<String, dynamic>?) ?? {};
    final locationUrl = guestLoc['googleMapsUrl']?.toString() ??
        customer['locationUrl']?.toString() ??
        '';
    final orderId = order['orderId'] ?? 'REV';
    final name = customer['name'] ?? 'Гость';
    final phone = customer['phone'] ?? '-';
    final address = customer['address'] ?? 'Самовывоз';
    final comment = customer['comment'] ?? '';
    final items = (order['items'] as List<dynamic>?) ?? [];
    final depositDeducted = (order['depositDeducted'] as num?)?.toDouble() ?? 0.0;
    final totalPayable = (order['totalPayable'] as num?)?.toDouble() ?? 0.0;

    final StringBuffer sb = StringBuffer();
    sb.writeln('🛎 НОВЫЙ ОНЛАЙН-ЗАКАЗ #$orderId');
    sb.writeln('👤 Гость: $name ($phone)');
    sb.writeln('📍 Адрес: $address');
    if (locationUrl.isNotEmpty) {
      sb.writeln('🗺 Навигация для курьера (Google Maps): $locationUrl');
    }
    if (comment.isNotEmpty) sb.writeln('💬 Комментарий: $comment');
    sb.writeln('🍽 Состав:');
    for (var it in items) {
      if (it is Map) {
        sb.writeln(' • ${it['name']} x${it['count']} (${_formatCurrency(it['price'] ?? 0)})');
      }
    }
    if (depositDeducted > 0) {
      sb.writeln('💰 ОПЛАТА С ДЕПОЗИТА: ${_formatCurrency(depositDeducted)}');
    }
    if (totalPayable > 0) {
      sb.writeln('💵 К оплате при получении: ${_formatCurrency(totalPayable)}');
    } else {
      sb.writeln('✨ ПОЛНОСТЬЮ ОПЛАЧЕНО ДЕПОЗИТОМ');
    }

    final text = sb.toString();
    Clipboard.setData(ClipboardData(text: text));
    _showToast(context, 'Текст заказа скопирован в буфер обмена!');

    final encoded = Uri.encodeComponent(text);
    final tgUrl = Uri.parse('https://t.me/share/url?url=&text=$encoded');
    url_launcher.launchUrl(tgUrl, mode: url_launcher.LaunchMode.externalApplication);
  }

  void _showToast(BuildContext context, String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: isError ? Colors.redAccent : AppColors.accentGreen,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Онлайн-заказы и списание депозитов',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 16,
              ),
            ),
            Text(
              _venueData?['name'] ?? 'Управление заказами доставки',
              style: const TextStyle(
                color: Colors.white54,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        leading: IconButton(
          icon: const Icon(CupertinoIcons.back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            tooltip: 'Ручное управление депозитом',
            icon: const Icon(CupertinoIcons.money_dollar_circle_fill, color: AppColors.accentYellow),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const DepositActionScreen(initialAction: 'deduct'),
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // ── FILTER TABS ──
          _buildFilterTabs(),

          // ── ORDERS STREAM ──
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance
                  .collection('orders')
                  .where('venueId', isEqualTo: widget.venueId)
                  .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CupertinoActivityIndicator(radius: 14));
                }

                if (snapshot.hasError) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Text(
                        'Ошибка загрузки заказов: ${snapshot.error}',
                        style: const TextStyle(color: Colors.redAccent),
                      ),
                    ),
                  );
                }

                final docs = snapshot.data?.docs ?? [];
                if (docs.isEmpty) {
                  return _buildEmptyState();
                }

                // Client-side sort by createdAt desc
                final sortedDocs = List<QueryDocumentSnapshot>.from(docs);
                sortedDocs.sort((a, b) {
                  final aData = a.data() as Map<String, dynamic>;
                  final bData = b.data() as Map<String, dynamic>;
                  final aTs = aData['createdAt'] as Timestamp?;
                  final bTs = bData['createdAt'] as Timestamp?;
                  if (aTs == null && bTs == null) return 0;
                  if (aTs == null) return 1;
                  if (bTs == null) return -1;
                  return bTs.compareTo(aTs);
                });

                // Apply active tab filter
                final filteredDocs = sortedDocs.where((doc) {
                  final data = doc.data() as Map<String, dynamic>;
                  final status = (data['status'] ?? 'new').toString().toLowerCase();
                  final depStatus = (data['depositStatus'] ?? '').toString().toLowerCase();

                  if (_activeTab == 'pending') {
                    return status == 'new' || depStatus == 'pending_approval' || (data['depositDeducted'] != null && (data['depositDeducted'] as num) > 0 && depStatus != 'approved');
                  } else if (_activeTab == 'active') {
                    return status == 'confirmed' || status == 'preparing' || status == 'in_delivery';
                  } else if (_activeTab == 'completed') {
                    return status == 'completed';
                  } else if (_activeTab == 'cancelled') {
                    return status == 'cancelled';
                  }
                  return true; // 'all'
                }).toList();

                if (filteredDocs.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(CupertinoIcons.tray, size: 48, color: Colors.white24),
                        const SizedBox(height: 12),
                        Text(
                          _getEmptyFilterMessage(),
                          style: const TextStyle(color: Colors.white54, fontSize: 14),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filteredDocs.length,
                  itemBuilder: (context, index) {
                    final doc = filteredDocs[index];
                    final data = doc.data() as Map<String, dynamic>;
                    return _buildOrderCard(doc.id, data);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ── FILTER TABS BAR ──────────────────────────────────────────────────────
  Widget _buildFilterTabs() {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildTabChip('pending', 'К списанию / Новые', CupertinoIcons.sparkles),
            const SizedBox(width: 8),
            _buildTabChip('active', 'В работе', CupertinoIcons.flame_fill),
            const SizedBox(width: 8),
            _buildTabChip('completed', 'Выполненные', CupertinoIcons.checkmark_seal_fill),
            const SizedBox(width: 8),
            _buildTabChip('cancelled', 'Отмененные', CupertinoIcons.xmark_circle_fill),
            const SizedBox(width: 8),
            _buildTabChip('all', 'Все заказы', CupertinoIcons.layers_fill),
          ],
        ),
      ),
    );
  }

  Widget _buildTabChip(String tabKey, String label, IconData icon) {
    final isSelected = _activeTab == tabKey;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = tabKey),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.accentYellow : AppColors.secondarySurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.accentYellow : Colors.white12,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected ? Colors.black : Colors.white70,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.black : Colors.white70,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── ORDER CARD ───────────────────────────────────────────────────────────
  Widget _buildOrderCard(String docId, Map<String, dynamic> order) {
    final orderId = order['orderId'] ?? docId;
    final status = (order['status'] ?? 'new').toString();
    final depositStatus = (order['depositStatus'] ?? '').toString();
    final depositDeducted = (order['depositDeducted'] as num?)?.toDouble() ?? 0.0;
    final totalPayable = (order['totalPayable'] as num?)?.toDouble() ?? 0.0;
    final subtotal = (order['subtotal'] as num?)?.toDouble() ?? 0.0;
    final discountAmount = (order['discountAmount'] as num?)?.toDouble() ?? 0.0;
    final discountPercentage = (order['discountPercentage'] as num?)?.toInt() ?? 0;
    final deliveryFee = (order['deliveryFee'] as num?)?.toDouble() ?? 0.0;
    final deliveryType = (order['deliveryType'] ?? 'delivery').toString();
    final currency = (order['currency'] ?? '₫').toString();

    final customer = (order['customer'] as Map<String, dynamic>?) ?? {};
    final guestLoc = (order['guestLocation'] as Map<String, dynamic>?) ?? {};
    final locationUrl = guestLoc['googleMapsUrl']?.toString() ??
        customer['locationUrl']?.toString() ??
        '';
    final locationAccuracy = guestLoc['accuracy'];
    final customerUid = customer['uid']?.toString() ?? '';
    final customerName = customer['name']?.toString() ?? 'Гость';
    final customerPhone = customer['phone']?.toString() ?? '';
    final customerAddress = customer['address']?.toString() ?? (deliveryType == 'delivery' ? 'Не указан' : 'Самовывоз');
    final customerComment = customer['comment']?.toString() ?? '';
    final items = (order['items'] as List<dynamic>?) ?? [];

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: (depositDeducted > 0 && depositStatus != 'approved' && status != 'cancelled')
              ? AppColors.accentYellow.withOpacity(0.6)
              : Colors.white10,
          width: (depositDeducted > 0 && depositStatus != 'approved' && status != 'cancelled') ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── TOP BAR: Order ID, Timestamp & Status Pill ──
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.secondarySurface.withOpacity(0.5),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white10,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '#$orderId',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatTimestamp(order['createdAt']),
                      style: const TextStyle(color: Colors.white54, fontSize: 11),
                    ),
                  ],
                ),
                _buildStatusBadge(status),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── CUSTOMER & DELIVERY INFO ──
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: deliveryType == 'delivery' ? Colors.blue.withOpacity(0.15) : Colors.purple.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        deliveryType == 'delivery' ? CupertinoIcons.car_detailed : CupertinoIcons.bag_fill,
                        color: deliveryType == 'delivery' ? Colors.blueAccent : Colors.purpleAccent,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                customerName,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
                              if (customerPhone.isNotEmpty)
                                GestureDetector(
                                  onTap: () => url_launcher.launchUrl(Uri.parse('tel:$customerPhone')),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppColors.accentGreen.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: AppColors.accentGreen.withOpacity(0.3)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(CupertinoIcons.phone_fill, size: 12, color: AppColors.accentGreen),
                                        const SizedBox(width: 4),
                                        Text(
                                          customerPhone,
                                          style: const TextStyle(
                                            color: AppColors.accentGreen,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            customerAddress,
                            style: const TextStyle(color: Colors.white70, fontSize: 13),
                          ),
                          if (locationUrl.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            InkWell(
                              onTap: () async {
                                final uri = Uri.parse(locationUrl);
                                if (await url_launcher.canLaunchUrl(uri)) {
                                  await url_launcher.launchUrl(uri, mode: url_launcher.LaunchMode.externalApplication);
                                }
                              },
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: AppColors.accentTeal.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.accentTeal.withOpacity(0.4)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(CupertinoIcons.location_fill, size: 13, color: AppColors.accentTeal),
                                    const SizedBox(width: 6),
                                    Text(
                                      locationAccuracy != null
                                          ? 'Навигация курьеру (GPS ±$locationAccuracyм)'
                                          : 'Навигация для курьера (Google Карты)',
                                      style: const TextStyle(
                                        color: AppColors.accentTeal,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 11,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(CupertinoIcons.arrow_up_right, size: 10, color: AppColors.accentTeal),
                                  ],
                                ),
                              ),
                            ),
                          ],
                          if (customerComment.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.04),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(CupertinoIcons.chat_bubble_text_fill, size: 12, color: Colors.white38),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      customerComment,
                                      style: const TextStyle(color: Colors.white60, fontSize: 11, fontStyle: FontStyle.italic),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),
                const Divider(color: Colors.white10, height: 1),
                const SizedBox(height: 12),

                // ── ITEMS LIST ──
                const Text(
                  'СОСТАВ ЗАКАЗА',
                  style: TextStyle(
                    color: Colors.white38,
                    fontWeight: FontWeight.w800,
                    fontSize: 10,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 8),
                ...items.map((it) {
                  if (it is! Map) return const SizedBox.shrink();
                  final name = it['name'] ?? 'Блюдо';
                  final count = it['count'] ?? 1;
                  final price = (it['price'] as num?)?.toDouble() ?? 0.0;
                  final lineTotal = price * count;

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            '$name × $count',
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                        ),
                        Text(
                          _formatCurrency(lineTotal, currency),
                          style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  );
                }),

                const SizedBox(height: 12),
                const Divider(color: Colors.white10, height: 1),
                const SizedBox(height: 10),

                // ── FINANCIAL SUMMARY ──
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Подытог:', style: TextStyle(color: Colors.white54, fontSize: 12)),
                    Text(_formatCurrency(subtotal, currency), style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  ],
                ),
                if (discountAmount > 0) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Скидка визитов ($discountPercentage%):', style: const TextStyle(color: AppColors.accentGreen, fontSize: 12)),
                      Text('-${_formatCurrency(discountAmount, currency)}', style: const TextStyle(color: AppColors.accentGreen, fontSize: 12, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ],
                if (deliveryFee > 0) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Доставка:', style: TextStyle(color: Colors.white54, fontSize: 12)),
                      Text(_formatCurrency(deliveryFee, currency), style: const TextStyle(color: Colors.white70, fontSize: 12)),
                    ],
                  ),
                ],

                const SizedBox(height: 16),

                // ── ⭐ GOLDEN DEPOSIT DEDUCTION BOX (STAFF WORKFLOW) ──
                if (depositDeducted > 0 || order['paymentMethod'] == 'deposit')
                  _buildDepositWorkflowBox(docId, order, customerUid, depositDeducted, currency),

                const SizedBox(height: 14),

                // ── TOTAL & STATUS PIPELINE BUTTONS ──
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('К оплате гостем:', style: TextStyle(color: Colors.white54, fontSize: 11)),
                        Text(
                          totalPayable <= 0 ? 'ОПЛАЧЕНО ДЕПОЗИТОМ' : _formatCurrency(totalPayable, currency),
                          style: TextStyle(
                            color: totalPayable <= 0 ? AppColors.accentYellow : Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        if (locationUrl.isNotEmpty) ...[
                          IconButton(
                            tooltip: 'Открыть точку на карте в Google Maps для курьера',
                            icon: const Icon(CupertinoIcons.location_circle_fill, color: AppColors.accentTeal, size: 22),
                            onPressed: () async {
                              final uri = Uri.parse(locationUrl);
                              if (await url_launcher.canLaunchUrl(uri)) {
                                await url_launcher.launchUrl(uri, mode: url_launcher.LaunchMode.externalApplication);
                              }
                            },
                          ),
                          const SizedBox(width: 4),
                        ],
                        // Telegram share
                        IconButton(
                          tooltip: 'Отправить чек в Telegram',
                          icon: const Icon(CupertinoIcons.paperplane_fill, color: Colors.blueAccent, size: 20),
                          onPressed: () => _shareToTelegram(order),
                        ),
                        const SizedBox(width: 6),
                        // Status Pipeline Actions
                        _buildStatusActions(docId, order, status, depositStatus, depositDeducted),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── GOLDEN DEPOSIT DEDUCTION CARD ─────────────────────────────────────────
  Widget _buildDepositWorkflowBox(
    String orderDocId,
    Map<String, dynamic> order,
    String customerUid,
    double depositDeducted,
    String currency,
  ) {
    final depositStatus = (order['depositStatus'] ?? '').toString();
    final isApproved = depositStatus == 'approved';
    final isRefunded = depositStatus == 'refunded';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isApproved
            ? AppColors.accentGreen.withOpacity(0.08)
            : AppColors.accentYellow.withOpacity(0.12),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isApproved
              ? AppColors.accentGreen.withOpacity(0.4)
              : AppColors.accentYellow.withOpacity(0.6),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    isApproved ? '✅' : '💰',
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isApproved ? 'ДЕПОЗИТ СПИСАН' : 'СПИСАНИЕ С ДЕПОЗИТА',
                    style: TextStyle(
                      color: isApproved ? AppColors.accentGreen : AppColors.accentYellow,
                      fontWeight: FontWeight.w900,
                      fontSize: 12,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isApproved
                      ? AppColors.accentGreen.withOpacity(0.2)
                      : (isRefunded ? Colors.red.withOpacity(0.2) : Colors.orange.withOpacity(0.2)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isApproved
                      ? 'ПОДТВЕРЖДЕНО'
                      : (isRefunded ? 'ВОЗВРАЩЕНО' : 'ОЖИДАЕТ СПИСАНИЯ'),
                  style: TextStyle(
                    color: isApproved
                      ? AppColors.accentGreen
                      : (isRefunded ? Colors.redAccent : Colors.orangeAccent),
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Requested deduction amount
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Сумма к списанию:', style: TextStyle(color: Colors.white70, fontSize: 13)),
              Text(
                _formatCurrency(depositDeducted, currency),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
              ),
            ],
          ),

          const SizedBox(height: 6),

          // Live balance check of guest
          if (customerUid.isNotEmpty && customerUid != 'guest')
            StreamBuilder<DocumentSnapshot>(
              stream: FirebaseFirestore.instance.collection('users').doc(customerUid).snapshots(),
              builder: (context, userSnap) {
                if (!userSnap.hasData || !userSnap.data!.exists) {
                  return const Text('Баланс гостя: неизвестен', style: TextStyle(color: Colors.white38, fontSize: 11));
                }
                final uData = userSnap.data!.data() as Map<String, dynamic>?;
                final balances = uData?['deposit_balances'] as Map<String, dynamic>?;
                num bal = 0;
                if (balances != null && balances.containsKey(widget.venueId)) {
                  final v = balances[widget.venueId];
                  if (v is num) bal = v;
                } else if (uData?['deposit_balance'] is num) {
                  bal = uData!['deposit_balance'];
                }

                final hasEnough = bal >= depositDeducted;

                return Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Текущий депозит гостя:', style: TextStyle(color: Colors.white54, fontSize: 11)),
                    Text(
                      _formatCurrency(bal, currency),
                      style: TextStyle(
                        color: hasEnough ? AppColors.accentGreen : Colors.redAccent,
                        fontWeight: FontWeight.w700,
                        fontSize: 11,
                      ),
                    ),
                  ],
                );
              },
            ),

          if (isApproved && order['depositDeductedBy'] != null) ...[
            const SizedBox(height: 6),
            Text(
              'Списано сотрудником: ${order['depositDeductedBy']}',
              style: const TextStyle(color: Colors.white38, fontSize: 10, fontStyle: FontStyle.italic),
            ),
          ],

          const SizedBox(height: 10),

          // Action buttons inside Golden Card
          if (!isApproved && !isRefunded)
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentGreen,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      elevation: 0,
                    ),
                    icon: const Icon(CupertinoIcons.bolt_fill, size: 16),
                    label: Text(
                      'Списать ${_formatCurrency(depositDeducted, currency)}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                    ),
                    onPressed: _isProcessing
                        ? null
                        : () => _approveAndDeductDeposit(
                              context: context,
                              orderDocId: orderDocId,
                              orderData: order,
                            ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  tooltip: 'Открыть меню депозита (ручное управление)',
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white10,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(CupertinoIcons.slider_horizontal_3, color: Colors.white, size: 18),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => DepositActionScreen(
                          initialUserId: customerUid,
                          initialAction: 'deduct',
                        ),
                      ),
                    );
                  },
                ),
              ],
            )
          else if (isApproved && order['status'] != 'cancelled')
            TextButton.icon(
              style: TextButton.styleFrom(
                foregroundColor: Colors.redAccent,
                padding: EdgeInsets.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              icon: const Icon(CupertinoIcons.arrow_counterclockwise, size: 13),
              label: const Text('Вернуть списанный депозит гостю', style: TextStyle(fontSize: 11)),
              onPressed: _isProcessing
                  ? null
                  : () => _refundDeductedDeposit(
                        context: context,
                        orderDocId: orderDocId,
                        orderData: order,
                      ),
            ),
        ],
      ),
    );
  }

  // ── ORDER STATUS ACTIONS ──────────────────────────────────────────────────
  Widget _buildStatusActions(
    String docId,
    Map<String, dynamic> order,
    String status,
    String depositStatus,
    double depositDeducted,
  ) {
    if (status == 'new') {
      return Row(
        children: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.secondarySurface,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              elevation: 0,
            ),
            onPressed: _isProcessing
                ? null
                : () => _updateOrderStatus(docId, 'confirmed', 'Заказ переведен в работу'),
            child: const Text('В работу', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(width: 6),
          IconButton(
            tooltip: 'Отклонить заказ',
            icon: const Icon(CupertinoIcons.xmark_circle, color: Colors.redAccent, size: 20),
            onPressed: _isProcessing
                ? null
                : () => _updateOrderStatus(docId, 'cancelled', 'Заказ отклонен'),
          ),
        ],
      );
    } else if (status == 'confirmed' || status == 'preparing') {
      return ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blueAccent,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          elevation: 0,
        ),
        icon: const Icon(CupertinoIcons.car_detailed, size: 14),
        label: const Text('Курьеру', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
        onPressed: _isProcessing
            ? null
            : () => _updateOrderStatus(docId, 'in_delivery', 'Заказ передан курьеру'),
      );
    } else if (status == 'in_delivery') {
      return ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accentGreen,
          foregroundColor: Colors.black,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          elevation: 0,
        ),
        icon: const Icon(CupertinoIcons.checkmark_alt, size: 14),
        label: const Text('Доставлен', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
        onPressed: _isProcessing
            ? null
            : () => _updateOrderStatus(docId, 'completed', 'Заказ успешно доставлен!'),
      );
    }

    return const SizedBox.shrink();
  }

  // ── STATUS BADGE ─────────────────────────────────────────────────────────
  Widget _buildStatusBadge(String status) {
    Color bg;
    Color fg;
    String label;

    switch (status.toLowerCase()) {
      case 'new':
        bg = Colors.orange.withOpacity(0.2);
        fg = Colors.orangeAccent;
        label = 'НОВЫЙ';
        break;
      case 'confirmed':
      case 'preparing':
        bg = Colors.blue.withOpacity(0.2);
        fg = Colors.blueAccent;
        label = 'В РАБОТЕ';
        break;
      case 'in_delivery':
        bg = Colors.purple.withOpacity(0.2);
        fg = Colors.purpleAccent;
        label = 'ДОСТАВЛЯЕТСЯ';
        break;
      case 'completed':
        bg = AppColors.accentGreen.withOpacity(0.2);
        fg = AppColors.accentGreen;
        label = 'ВЫПОЛНЕН';
        break;
      case 'cancelled':
        bg = Colors.red.withOpacity(0.2);
        fg = Colors.redAccent;
        label = 'ОТМЕНЕН';
        break;
      default:
        bg = Colors.white10;
        fg = Colors.white70;
        label = status.toUpperCase();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontWeight: FontWeight.w900,
          fontSize: 10,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(CupertinoIcons.bag_badge_plus, size: 60, color: Colors.white24),
          const SizedBox(height: 16),
          const Text(
            'Онлайн-заказов пока нет',
            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'Когда гости будут заказывать меню доставки или списывать депозиты онлайн, заказы появятся здесь в реальном времени.',
              style: TextStyle(color: Colors.white54, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  String _getEmptyFilterMessage() {
    switch (_activeTab) {
      case 'pending':
        return 'Нет новых заказов, ожидающих списания депозита';
      case 'active':
        return 'Нет активных заказов в работе';
      case 'completed':
        return 'Нет завершенных заказов';
      case 'cancelled':
        return 'Нет отмененных заказов';
      default:
        return 'Список заказов пуст';
    }
  }
}
