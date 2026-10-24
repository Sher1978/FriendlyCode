import 'scheduled_trip_model.dart';

class ServiceItem {
  final String id;
  final String name;
  final String category;
  final String description;
  final double price;
  final int durationMinutes;
  final List<String> staffIds;
  final String externalServiceId;
  final bool isActive;
  final double? maxDiscountCap;
  final String? photoUrl;
  final String? fleetTemplateId;
  final String? yieldRuleId;
  final List<TripPackageTier> packages;

  const ServiceItem({
    required this.id,
    required this.name,
    this.category = '',
    this.description = '',
    this.price = 0.0,
    this.durationMinutes = 45,
    this.staffIds = const [],
    this.externalServiceId = '',
    this.isActive = true,
    this.maxDiscountCap,
    this.photoUrl,
    this.fleetTemplateId,
    this.yieldRuleId,
    this.packages = const [],
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'name': name,
    'category': category,
    'description': description,
    'price': price,
    'durationMinutes': durationMinutes,
    'staffIds': staffIds,
    'externalServiceId': externalServiceId,
    'isActive': isActive,
    'maxDiscountCap': maxDiscountCap,
    'photoUrl': photoUrl,
    'fleetTemplateId': fleetTemplateId,
    'yieldRuleId': yieldRuleId,
    'packages': packages.map((p) => p.toMap()).toList(),
  };

  factory ServiceItem.fromMap(Map<String, dynamic> map, [String? docId]) {
    final rawPackages = map['packages'] as List<dynamic>? ?? [];

    return ServiceItem(
      id: docId ?? map['id'] ?? '',
      name: map['name'] ?? '',
      category: map['category'] ?? '',
      description: map['description'] ?? '',
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      durationMinutes: (map['durationMinutes'] as num?)?.toInt() ?? 45,
      staffIds: (map['staffIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      externalServiceId: map['externalServiceId'] ?? '',
      isActive: map['isActive'] ?? true,
      maxDiscountCap: (map['maxDiscountCap'] as num?)?.toDouble(),
      photoUrl: map['photoUrl'] as String? ?? map['imageUrl'] as String?,
      fleetTemplateId: map['fleetTemplateId'] as String?,
      yieldRuleId: map['yieldRuleId'] as String?,
      packages: rawPackages.map((e) => TripPackageTier.fromMap(Map<String, dynamic>.from(e))).toList(),
    );
  }

  ServiceItem copyWith({
    String? id,
    String? name,
    String? category,
    String? description,
    double? price,
    int? durationMinutes,
    List<String>? staffIds,
    String? externalServiceId,
    bool? isActive,
    double? maxDiscountCap,
    String? photoUrl,
    String? fleetTemplateId,
    String? yieldRuleId,
    List<TripPackageTier>? packages,
  }) => ServiceItem(
    id: id ?? this.id,
    name: name ?? this.name,
    category: category ?? this.category,
    description: description ?? this.description,
    price: price ?? this.price,
    durationMinutes: durationMinutes ?? this.durationMinutes,
    staffIds: staffIds ?? this.staffIds,
    externalServiceId: externalServiceId ?? this.externalServiceId,
    isActive: isActive ?? this.isActive,
    maxDiscountCap: maxDiscountCap ?? this.maxDiscountCap,
    photoUrl: photoUrl ?? this.photoUrl,
    fleetTemplateId: fleetTemplateId ?? this.fleetTemplateId,
    yieldRuleId: yieldRuleId ?? this.yieldRuleId,
    packages: packages ?? this.packages,
  );
}
