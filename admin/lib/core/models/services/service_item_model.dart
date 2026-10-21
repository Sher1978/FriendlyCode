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
  };

  factory ServiceItem.fromMap(Map<String, dynamic> map, [String? docId]) => ServiceItem(
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
  );

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
  );
}
