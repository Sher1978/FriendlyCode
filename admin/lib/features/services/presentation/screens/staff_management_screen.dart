import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/services/index.dart';
import 'package:friendly_code/core/theme/colors.dart';

class StaffManagementScreen extends StatefulWidget {
  final String venueId;
  const StaffManagementScreen({super.key, required this.venueId});

  @override
  State<StaffManagementScreen> createState() => _StaffManagementScreenState();
}

class _StaffManagementScreenState extends State<StaffManagementScreen> {
  bool _isLoading = true;
  List<StaffMember> _staff = [];

  @override
  void initState() {
    super.initState();
    _loadStaff();
  }

  Future<void> _loadStaff() async {
    setState(() => _isLoading = true);
    try {
      final snap = await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('staff')
          .get();

      final list = snap.docs.map((d) => StaffMember.fromMap(d.data(), d.id)).toList();
      setState(() {
        _staff = list;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _openStaffEditor([StaffMember? member]) async {
    final nameCtrl = TextEditingController(text: member?.name ?? '');
    final roleCtrl = TextEditingController(text: member?.role ?? 'Специалист');
    final startCtrl = TextEditingController(text: member?.workStartTime ?? '10:00');
    final endCtrl = TextEditingController(text: member?.workEndTime ?? '20:00');

    await showCupertinoDialog(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: Text(member == null ? "Новый мастер" : "Редактировать мастера"),
        content: Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CupertinoTextField(
                controller: nameCtrl,
                placeholder: "Имя (например: Алексей)",
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
              const SizedBox(height: 8),
              CupertinoTextField(
                controller: roleCtrl,
                placeholder: "Должность (например: Топ-барбер)",
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: CupertinoTextField(
                      controller: startCtrl,
                      placeholder: "С (10:00)",
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: CupertinoTextField(
                      controller: endCtrl,
                      placeholder: "До (20:00)",
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                    ),
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

              Navigator.pop(ctx);
              await _saveStaff(
                id: member?.id,
                name: name,
                role: roleCtrl.text.trim(),
                workStartTime: startCtrl.text.trim(),
                workEndTime: endCtrl.text.trim(),
              );
            },
          ),
        ],
      ),
    );
  }

  Future<void> _saveStaff({
    String? id,
    required String name,
    required String role,
    required String workStartTime,
    required String workEndTime,
  }) async {
    try {
      final col = FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('staff');

      final data = {
        'name': name,
        'role': role.isEmpty ? 'Специалист' : role,
        'workStartTime': workStartTime.isEmpty ? '10:00' : workStartTime,
        'workEndTime': workEndTime.isEmpty ? '20:00' : workEndTime,
        'rating': 5.0,
        'isActive': true,
        'updatedAt': FieldValue.serverTimestamp(),
      };

      if (id != null && id.isNotEmpty) {
        await col.doc(id).set(data, SetOptions(merge: true));
      } else {
        await col.add(data);
      }
      _loadStaff();
    } catch (e) {
      debugPrint("Error saving staff: $e");
    }
  }

  Future<void> _deleteStaff(String id) async {
    try {
      await FirebaseFirestore.instance
          .collection('venues')
          .doc(widget.venueId)
          .collection('staff')
          .doc(id)
          .delete();
      _loadStaff();
    } catch (e) {
      debugPrint("Error deleting staff: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CupertinoNavigationBar(
        backgroundColor: AppColors.surface.withOpacity(0.9),
        middle: const Text("Мастера и расписание", style: TextStyle(color: Colors.white, fontSize: 16)),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.person_badge_plus_fill, color: AppColors.accentBlue),
          onPressed: () => _openStaffEditor(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CupertinoActivityIndicator(color: AppColors.accentGreen))
          : _staff.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(CupertinoIcons.person_2, size: 48, color: Colors.white24),
                      const SizedBox(height: 12),
                      const Text("Мастера еще не добавлены", style: TextStyle(color: Colors.white70, fontSize: 15)),
                      const SizedBox(height: 16),
                      CupertinoButton.filled(
                        child: const Text("Добавить мастера"),
                        onPressed: () => _openStaffEditor(),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                  itemCount: _staff.length,
                  itemBuilder: (context, index) {
                    final member = _staff[index];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.08)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.accentBlue.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(CupertinoIcons.person_fill, color: AppColors.accentBlue, size: 22),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      member.name,
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    const SizedBox(width: 6),
                                    const Icon(CupertinoIcons.star_fill, color: Colors.amber, size: 12),
                                    Text(
                                      " ${member.rating.toStringAsFixed(1)}",
                                      style: const TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  "${member.role} · Смена: ${member.workStartTime} - ${member.workEndTime}",
                                  style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          Row(
                            children: [
                              CupertinoButton(
                                padding: EdgeInsets.zero,
                                minSize: 28,
                                child: const Icon(CupertinoIcons.pencil, size: 16, color: Colors.white54),
                                onPressed: () => _openStaffEditor(member),
                              ),
                              const SizedBox(width: 6),
                              CupertinoButton(
                                padding: EdgeInsets.zero,
                                minSize: 28,
                                child: const Icon(CupertinoIcons.trash, size: 16, color: Colors.redAccent),
                                onPressed: () => _deleteStaff(member.id),
                              ),
                            ],
                          )
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
