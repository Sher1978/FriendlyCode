class ServiceYieldRule {
  final String id;
  final String name;
  final String discountType; // 'percent' or 'fixed'
  final double discountValue;
  final List<String> daysOfWeek;
  final int startHour;
  final int endHour;
  final bool isFlashSlot;
  final int flashLeadHours;
  final double minServicePrice;
  final double? maxDiscountCap;
  final bool isActive;

  const ServiceYieldRule({
    required this.id,
    required this.name,
    this.discountType = 'percent',
    this.discountValue = 15.0,
    this.daysOfWeek = const ['mon', 'tue', 'wed', 'thu'],
    this.startHour = 11,
    this.endHour = 16,
    this.isFlashSlot = false,
    this.flashLeadHours = 3,
    this.minServicePrice = 0.0,
    this.maxDiscountCap,
    this.isActive = true,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'name': name,
    'discountType': discountType,
    'discountValue': discountValue,
    'daysOfWeek': daysOfWeek,
    'startHour': startHour,
    'endHour': endHour,
    'isFlashSlot': isFlashSlot,
    'flashLeadHours': flashLeadHours,
    'minServicePrice': minServicePrice,
    'maxDiscountCap': maxDiscountCap,
    'isActive': isActive,
  };

  factory ServiceYieldRule.fromMap(Map<String, dynamic> map, [String? docId]) => ServiceYieldRule(
    id: docId ?? map['id'] ?? '',
    name: map['name'] ?? '',
    discountType: map['discountType'] ?? 'percent',
    discountValue: (map['discountValue'] as num?)?.toDouble() ?? 15.0,
    daysOfWeek: (map['daysOfWeek'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const ['mon', 'tue', 'wed', 'thu'],
    startHour: (map['startHour'] as num?)?.toInt() ?? 11,
    endHour: (map['endHour'] as num?)?.toInt() ?? 16,
    isFlashSlot: map['isFlashSlot'] ?? false,
    flashLeadHours: (map['flashLeadHours'] as num?)?.toInt() ?? 3,
    minServicePrice: (map['minServicePrice'] as num?)?.toDouble() ?? 0.0,
    maxDiscountCap: (map['maxDiscountCap'] as num?)?.toDouble(),
    isActive: map['isActive'] ?? true,
  );

  ServiceYieldRule copyWith({
    String? id,
    String? name,
    String? discountType,
    double? discountValue,
    List<String>? daysOfWeek,
    int? startHour,
    int? endHour,
    bool? isFlashSlot,
    int? flashLeadHours,
    double? minServicePrice,
    double? maxDiscountCap,
    bool? isActive,
  }) => ServiceYieldRule(
    id: id ?? this.id,
    name: name ?? this.name,
    discountType: discountType ?? this.discountType,
    discountValue: discountValue ?? this.discountValue,
    daysOfWeek: daysOfWeek ?? this.daysOfWeek,
    startHour: startHour ?? this.startHour,
    endHour: endHour ?? this.endHour,
    isFlashSlot: isFlashSlot ?? this.isFlashSlot,
    flashLeadHours: flashLeadHours ?? this.flashLeadHours,
    minServicePrice: minServicePrice ?? this.minServicePrice,
    maxDiscountCap: maxDiscountCap ?? this.maxDiscountCap,
    isActive: isActive ?? this.isActive,
  );
}
