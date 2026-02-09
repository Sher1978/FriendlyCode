import 'package:cloud_firestore/cloud_firestore.dart';

class DiscountTier {
  final int maxHours; // e.g., 24
  final int discountPercent; // e.g., 20

  DiscountTier({required this.maxHours, required this.discountPercent});

  Map<String, dynamic> toMap() {
    return {
      'maxHours': maxHours,
      'discountPercent': discountPercent,
    };
  }

  factory DiscountTier.fromMap(Map<String, dynamic> map) {
    return DiscountTier(
      maxHours: map['maxHours'] ?? 0,
      discountPercent: map['discountPercent'] ?? 0,
    );
  }
}

class VenueSubscription {
  final String plan; // "free", "pro", "enterprise"
  final bool isPaid;
  final DateTime? expiryDate;

  VenueSubscription({
    required this.plan,
    required this.isPaid,
    this.expiryDate,
  });

  Map<String, dynamic> toMap() {
    return {
      'plan': plan,
      'isPaid': isPaid,
      'expiryDate': expiryDate != null ? Timestamp.fromDate(expiryDate!) : null,
    };
  }

  factory VenueSubscription.fromMap(Map<String, dynamic> map) {
    return VenueSubscription(
      plan: map['plan'] ?? 'free',
      isPaid: map['isPaid'] ?? false,
      expiryDate: map['expiryDate'] != null ? (map['expiryDate'] as Timestamp).toDate() : null,
    );
  }
}

class VenueStats {
  final double avgReturnHours;
  final int totalCheckins;
  final Map<String, int> discountDistribution; // e.g. {"20": 10, "15": 5}

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

class VenueModel {
  final String id;
  final String name;
  final String description;
  final String ownerEmail;
  final String? coverPhotoUrl;
  final String category; // Added per Master Spec
  final String address; // Added per Master Spec
  final bool isActive; // Admin control - general activation
  final bool manualBlock; // Added per Master Spec - strict override
  final List<DiscountTier> tiers;
  final VenueSubscription subscription;
  final VenueStats stats;
  final double latitude;
  final double longitude;
  final DateTime? lastBlastDate;

  VenueModel({
    required this.id,
    required this.name,
    required this.description,
    required this.ownerEmail,
    this.coverPhotoUrl,
    this.category = 'General',
    this.address = '',
    this.isActive = true,
    this.manualBlock = false,
    required this.tiers,
    required this.subscription,
    required this.stats,
    this.latitude = 0.0,
    this.longitude = 0.0,
    this.lastBlastDate,
  });

  bool get isEffectivelyInactive {
    if (manualBlock) return true;
    if (subscription.expiryDate != null &&
        subscription.expiryDate!.isBefore(DateTime.now())) {
      return true;
    }
    return !isActive;
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'description': description,
      'ownerEmail': ownerEmail,
      'category': category,
      'address': address,
      'coverPhotoUrl': coverPhotoUrl,
      'isActive': isActive,
      'manualBlock': manualBlock,
      'tiers': tiers.map((x) => x.toMap()).toList(),
      'subscription': subscription.toMap(),
      'stats': stats.toMap(),
      'latitude': latitude,
      'longitude': longitude,
      'lastBlastDate': lastBlastDate != null ? Timestamp.fromDate(lastBlastDate!) : null,
    };
  }

  factory VenueModel.fromMap(String id, Map<String, dynamic> map) {
    return VenueModel(
      id: id,
      name: map['name'] ?? '',
      description: map['description'] ?? '',
      ownerEmail: map['ownerEmail'] ?? '',
      category: map['category'] ?? 'General',
      address: map['address'] ?? '',
      coverPhotoUrl: map['coverPhotoUrl'],
      isActive: map['isActive'] ?? true,
      manualBlock: map['manualBlock'] ?? false,
      tiers: map['tiers'] != null
          ? List<DiscountTier>.from(map['tiers']?.map((x) => DiscountTier.fromMap(x)))
          : [],
      subscription: map['subscription'] != null
          ? VenueSubscription.fromMap(map['subscription'])
          : VenueSubscription(plan: 'free', isPaid: false),
      stats: map['stats'] != null
          ? VenueStats.fromMap(map['stats'])
          : VenueStats(avgReturnHours: 0, totalCheckins: 0),
      latitude: (map['latitude'] ?? 0.0).toDouble(),
      longitude: (map['longitude'] ?? 0.0).toDouble(),
      lastBlastDate: map['lastBlastDate'] != null ? (map['lastBlastDate'] as Timestamp).toDate() : null,
    );
  }
}
