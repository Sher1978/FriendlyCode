import 'package:cloud_firestore/cloud_firestore.dart';

class VenueModel {
  final String id;
  final String ownerId; // Changed from ownerEmail
  final String name;
  final String address;
  final String? logoUrl; // Changed from coverPhotoUrl to logoUrl per request, or alias? User said logoUrl.
  final String? linkUrl;
  final DateTime? subscriptionEndDate;
  final bool isManuallyBlocked;

  // Discount Levels
  final int level1Discount;
  final int level1Days;
  final int level2Discount;
  final int level2Days;
  final int level3Discount;
  final int level3Days;
  final int level4Discount;
  final int level4Days;

  // Legacy/UI fields that might still be useful but not in strict schema list?
  // User didn't explicitly forbid others, but let's stick to their list + essential UI fields.
  final String description;
  final String category;
  final bool isActive;

  // Restored missing fields for UI compatibility
  final VenueStats stats;
  final DateTime? lastBlastDate;
  final double? latitude;
  final double? longitude;

  VenueModel({
    required this.id,
    required this.ownerId,
    required this.name,
    required this.address,
    this.logoUrl,
    this.linkUrl,
    this.subscriptionEndDate,
    this.isManuallyBlocked = false,
    this.level1Discount = 0,
    this.level1Days = 0,
    this.level2Discount = 0,
    this.level2Days = 0,
    this.level3Discount = 0,
    this.level3Days = 0,
    this.level4Discount = 0,
    this.level4Days = 0,
    this.description = '',
    this.category = 'General',
    this.isActive = true,
    this.lastBlastDate,
    this.latitude,
    this.longitude,
    VenueStats? stats,
  }) : stats = stats ?? VenueStats(avgReturnHours: 0, totalCheckins: 0);

  Map<String, dynamic> toMap() {
    return {
      'ownerId': ownerId,
      'name': name,
      'address': address,
      'logoUrl': logoUrl,
      'linkUrl': linkUrl,
      'subscriptionEndDate': subscriptionEndDate != null ? Timestamp.fromDate(subscriptionEndDate!) : null,
      'isManuallyBlocked': isManuallyBlocked,
      'level1Discount': level1Discount,
      'level1Days': level1Days,
      'level2Discount': level2Discount,
      'level2Days': level2Days,
      'level3Discount': level3Discount,
      'level3Days': level3Days,
      'level4Discount': level4Discount,
      'level4Days': level4Days,
      'description': description,
      'category': category,
      'isActive': isActive,
      'lastBlastDate': lastBlastDate != null ? Timestamp.fromDate(lastBlastDate!) : null,
      'latitude': latitude,
      'longitude': longitude,
      'stats': stats.toMap(),
    };
  }

  factory VenueModel.fromMap(String id, Map<String, dynamic> map) {
    return VenueModel(
      id: id,
      ownerId: map['ownerId'] ?? '',
      name: map['name'] ?? '',
      address: map['address'] ?? '',
      logoUrl: map['logoUrl'],
      linkUrl: map['linkUrl'],
      subscriptionEndDate: map['subscriptionEndDate'] != null ? (map['subscriptionEndDate'] as Timestamp).toDate() : null,
      isManuallyBlocked: map['isManuallyBlocked'] ?? false,
      level1Discount: map['level1Discount'] ?? 0,
      level1Days: map['level1Days'] ?? 0,
      level2Discount: map['level2Discount'] ?? 0,
      level2Days: map['level2Days'] ?? 0,
      level3Discount: map['level3Discount'] ?? 0,
      level3Days: map['level3Days'] ?? 0,
      level4Discount: map['level4Discount'] ?? 0,
      level4Days: map['level4Days'] ?? 0,
      description: map['description'] ?? '',
      category: map['category'] ?? 'General',
      isActive: map['isActive'] ?? true,
      lastBlastDate: map['lastBlastDate'] != null ? (map['lastBlastDate'] as Timestamp).toDate() : null,
      latitude: map['latitude']?.toDouble(),
      longitude: map['longitude']?.toDouble(),
      stats: map['stats'] != null ? VenueStats.fromMap(map['stats']) : null,
    );
  }
}

class VenueStats {
  final double avgReturnHours;
  final int totalCheckins;
  final Map<String, int> discountDistribution;

  VenueStats({
    required this.avgReturnHours,
    required this.totalCheckins,
    this.discountDistribution = const {},
  });

  Map<String, dynamic> toMap() {
    return {
      'avgReturnHours': avgReturnHours,
      'totalCheckins': totalCheckins,
      'discountDistribution': discountDistribution,
    };
  }

  factory VenueStats.fromMap(Map<String, dynamic> map) {
    return VenueStats(
      avgReturnHours: (map['avgReturnHours'] ?? 0).toDouble(),
      totalCheckins: map['totalCheckins'] ?? 0,
      discountDistribution: Map<String, int>.from(map['discountDistribution'] ?? {}),
    );
  }
}
