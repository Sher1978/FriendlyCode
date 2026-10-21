class StaffMember {
  final String id;
  final String name;
  final String role;
  final String avatarUrl;
  final double rating;
  final List<String> workingDays;
  final String workStartTime;
  final String workEndTime;
  final List<String> serviceIds;
  final String externalStaffId;
  final bool isActive;

  const StaffMember({
    required this.id,
    required this.name,
    this.role = '',
    this.avatarUrl = '',
    this.rating = 5.0,
    this.workingDays = const ['mon', 'tue', 'wed', 'thu', 'fri'],
    this.workStartTime = '10:00',
    this.workEndTime = '20:00',
    this.serviceIds = const [],
    this.externalStaffId = '',
    this.isActive = true,
  });

  Map<String, dynamic> toMap() => {
    'id': id,
    'name': name,
    'role': role,
    'avatarUrl': avatarUrl,
    'rating': rating,
    'workingDays': workingDays,
    'workStartTime': workStartTime,
    'workEndTime': workEndTime,
    'serviceIds': serviceIds,
    'externalStaffId': externalStaffId,
    'isActive': isActive,
  };

  factory StaffMember.fromMap(Map<String, dynamic> map, [String? docId]) => StaffMember(
    id: docId ?? map['id'] ?? '',
    name: map['name'] ?? '',
    role: map['role'] ?? '',
    avatarUrl: map['avatarUrl'] ?? '',
    rating: (map['rating'] as num?)?.toDouble() ?? 5.0,
    workingDays: (map['workingDays'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const ['mon', 'tue', 'wed', 'thu', 'fri'],
    workStartTime: map['workStartTime'] ?? '10:00',
    workEndTime: map['workEndTime'] ?? '20:00',
    serviceIds: (map['serviceIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
    externalStaffId: map['externalStaffId'] ?? '',
    isActive: map['isActive'] ?? true,
  );

  StaffMember copyWith({
    String? id,
    String? name,
    String? role,
    String? avatarUrl,
    double? rating,
    List<String>? workingDays,
    String? workStartTime,
    String? workEndTime,
    List<String>? serviceIds,
    String? externalStaffId,
    bool? isActive,
  }) => StaffMember(
    id: id ?? this.id,
    name: name ?? this.name,
    role: role ?? this.role,
    avatarUrl: avatarUrl ?? this.avatarUrl,
    rating: rating ?? this.rating,
    workingDays: workingDays ?? this.workingDays,
    workStartTime: workStartTime ?? this.workStartTime,
    workEndTime: workEndTime ?? this.workEndTime,
    serviceIds: serviceIds ?? this.serviceIds,
    externalStaffId: externalStaffId ?? this.externalStaffId,
    isActive: isActive ?? this.isActive,
  );
}
