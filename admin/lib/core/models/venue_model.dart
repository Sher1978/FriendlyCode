import 'package:cloud_firestore/cloud_firestore.dart';

class VenueTier {
  final int maxHours;
  final int percentage;

  VenueTier({required this.maxHours, required this.percentage});

  Map<String, dynamic> toMap() => {
    'maxHours': maxHours,
    'percentage': percentage,
  };

  factory VenueTier.fromMap(Map<String, dynamic> map) => VenueTier(
    maxHours: map['maxHours'] ?? 0,
    percentage: map['percentage'] ?? 0,
  );
}

class VenueSubscription {
  final String plan;
  final bool isPaid;
  final DateTime? expiryDate;

  VenueSubscription({
    this.plan = 'free',
    this.isPaid = false,
    this.expiryDate,
  });

  Map<String, dynamic> toMap() => {
    'plan': plan,
    'isPaid': isPaid,
    'expiryDate': expiryDate != null ? Timestamp.fromDate(expiryDate!) : null,
  };

  factory VenueSubscription.fromMap(Map<String, dynamic> map) => VenueSubscription(
    plan: map['plan'] ?? 'free',
    isPaid: map['isPaid'] ?? false,
    expiryDate: map['expiryDate'] != null ? (map['expiryDate'] as Timestamp).toDate() : null,
  );
}

class VenueModel {
  final String id;
  final String ownerEmail; // Per Bible
  final String ownerId;    // UID for linkage
  final String name;
  final String address;
  final String? logoUrl;
  final String? linkUrl;
  final String description;
  final String category;
  final bool isActive;
  final bool isManuallyBlocked;
  
  final List<VenueTier> tiers;
  final VenueSubscription subscription;
  final VenueStats stats;
  
  final DateTime? lastBlastDate;
  final double? latitude;
  final double? longitude;

  VenueModel({
    required this.id,
    required this.ownerEmail,
    required this.ownerId,
    required this.name,
    required this.address,
    this.logoUrl,
    this.linkUrl,
    this.description = '',
    this.category = 'General',
    this.isActive = true,
    this.isManuallyBlocked = false,
    List<VenueTier>? tiers,
    VenueSubscription? subscription,
    VenueStats? stats,
    this.lastBlastDate,
    this.latitude,
    this.longitude,
  }) : 
    tiers = tiers ?? [],
    subscription = subscription ?? VenueSubscription(),
    stats = stats ?? VenueStats(avgReturnHours: 0, totalCheckins: 0);

  Map<String, dynamic> toMap() {
    return {
      'ownerEmail': ownerEmail,
      'ownerId': ownerId,
      'name': name,
      'address': address,
      'logoUrl': logoUrl,
      'linkUrl': linkUrl,
      'description': description,
      'category': category,
      'isActive': isActive,
      'isManuallyBlocked': isManuallyBlocked,
      'tiers': tiers.map((t) => t.toMap()).toList(),
      'subscription': subscription.toMap(),
      'stats': stats.toMap(),
      'lastBlastDate': lastBlastDate != null ? Timestamp.fromDate(lastBlastDate!) : null,
      'latitude': latitude,
      'longitude': longitude,
    };
  }

  factory VenueModel.fromMap(String id, Map<String, dynamic> map) {
    return VenueModel(
      id: id,
      ownerEmail: map['ownerEmail'] ?? '',
      ownerId: map['ownerId'] ?? '',
      name: map['name'] ?? '',
      address: map['address'] ?? '',
      logoUrl: map['logoUrl'],
      linkUrl: map['linkUrl'],
      description: map['description'] ?? '',
      category: map['category'] ?? 'General',
      isActive: map['isActive'] ?? true,
      isManuallyBlocked: map['isManuallyBlocked'] ?? false,
      tiers: (map['tiers'] as List?)?.map((t) => VenueTier.fromMap(t)).toList(),
      subscription: map['subscription'] != null ? VenueSubscription.fromMap(map['subscription']) : null,
      stats: map['stats'] != null ? VenueStats.fromMap(map['stats']) : null,
      lastBlastDate: map['lastBlastDate'] != null ? (map['lastBlastDate'] as Timestamp).toDate() : null,
      latitude: map['latitude']?.toDouble(),
      longitude: map['longitude']?.toDouble(),
    );
  }
}

class VenueStats {
  final double avgReturnHours;
  final int totalCheckins;
  final Map<String, dynamic> extraData; // For extensibility

  VenueStats({
    required this.avgReturnHours,
    required this.totalCheckins,
    this.extraData = const {},
  });

  Map<String, dynamic> toMap() {
    return {
      'avgReturnHours': avgReturnHours,
      'totalCheckins': totalCheckins,
      ...?extraData,
    };
  }

  factory VenueStats.fromMap(Map<String, dynamic> map) {
    return VenueStats(
      avgReturnHours: (map['avgReturnHours'] ?? 0).toDouble(),
      totalCheckins: map['totalCheckins'] ?? 0,
      extraData: Map<String, dynamic>.from(map)..remove('avgReturnHours')..remove('totalCheckins'),
    );
  }
}
