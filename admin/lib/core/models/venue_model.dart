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

class LoyaltyDecayStage {
  final int days;
  final int discount;

  const LoyaltyDecayStage({
    required this.days,
    required this.discount,
  });

  Map<String, dynamic> toMap() => {
    'days': days,
    'discount': discount,
  };

  factory LoyaltyDecayStage.fromMap(Map<String, dynamic> map) => LoyaltyDecayStage(
    days: map['days'] ?? 0,
    discount: map['discount'] ?? 0,
  );
}

class LoyaltyConfig {
  final int vipWindowDays;
  final int degradationIntervalDays;
  final int resetIntervalDays;
  
  final int percBase;
  final int percVip;
  final List<LoyaltyDecayStage> decayStages;

  const LoyaltyConfig({
    this.vipWindowDays = 2,
    this.percBase = 5,
    this.percVip = 20,
    this.degradationIntervalDays = 7,
    this.resetIntervalDays = 30,
    List<LoyaltyDecayStage>? decayStages,
  }) : decayStages = decayStages ?? const [
         LoyaltyDecayStage(days: 3, discount: 15),
         LoyaltyDecayStage(days: 10, discount: 10),
       ];

  Map<String, dynamic> toMap() => {
    'vipWindowDays': vipWindowDays,
    'percBase': percBase,
    'percVip': percVip,
    'degradationIntervalDays': degradationIntervalDays,
    'resetIntervalDays': resetIntervalDays,
    'decayStages': decayStages.map((s) => s.toMap()).toList(),
  };

  factory LoyaltyConfig.fromMap(Map<String, dynamic> map) {
    // Handling backwards compatibility
    List<LoyaltyDecayStage> loadedStages = [];
    if (map['decayStages'] != null) {
      loadedStages = (map['decayStages'] as List).map((s) => LoyaltyDecayStage.fromMap(s)).toList();
    } else if (map['percDecay1'] != null || map['tier1DecayHours'] != null) {
      // Legacy conversion
      loadedStages.add(LoyaltyDecayStage(
        days: (map['tier1DecayHours'] ?? 72) ~/ 24,
        discount: map['percDecay1'] ?? 15,
      ));
      if (map['percDecay2'] != null || map['tier2DecayHours'] != null) {
        loadedStages.add(LoyaltyDecayStage(
          days: (map['tier2DecayHours'] ?? 240) ~/ 24,
          discount: map['percDecay2'] ?? 10,
        ));
      }
    }

    if (loadedStages.isEmpty) {
        loadedStages = const [
         LoyaltyDecayStage(days: 3, discount: 15),
         LoyaltyDecayStage(days: 10, discount: 10),
       ];
    }

    return LoyaltyConfig(
      vipWindowDays: map['vipWindowDays'] ?? (map['vipWindowHours'] != null ? (map['vipWindowHours'] as int) ~/ 24 : 2),
      percBase: map['percBase'] ?? 5,
      percVip: map['percVip'] ?? 20,
      degradationIntervalDays: map['degradationIntervalDays'] ?? (map['degradationIntervalHours'] != null ? (map['degradationIntervalHours'] as int) ~/ 24 : 7),
      resetIntervalDays: map['resetIntervalDays'] ?? 30,
      decayStages: loadedStages,
    );
  }
}

class VenueModel {
  final String id;
  final String? ownerEmail; // Optional for unclaimed venues
  final String? ownerId;    // Optional for unclaimed venues
  final String name;
  final String address;
  final String? logoUrl;
  final String? linkUrl;
  final String description;
  final String category;
  final bool isActive;
  final bool isManuallyBlocked;
  
  final String defaultLanguage;
  final String timezone;
  
  final List<VenueTier> tiers;
  final VenueSubscription subscription;
  final LoyaltyConfig loyaltyConfig;
  final VenueStats stats;
  
  final DateTime? lastBlastDate;
  final double? latitude;
  final double? longitude;
  final String? assignedAdminId;
  final String? assignedManagerId;

  VenueModel({
    required this.id,
    this.ownerEmail,
    this.ownerId,
    required this.name,
    required this.address,
    this.logoUrl,
    this.linkUrl,
    this.description = '',
    this.category = 'General',
    this.isActive = true,
    this.isManuallyBlocked = false,
    this.defaultLanguage = 'en',
    this.timezone = 'Etc/GMT-3',
    List<VenueTier>? tiers,
    VenueSubscription? subscription,
    LoyaltyConfig? loyaltyConfig,
    VenueStats? stats,
    this.lastBlastDate,
    this.latitude,
    this.longitude,
    this.assignedAdminId,
    this.assignedManagerId,
  }) : 
    tiers = tiers ?? [],
    subscription = subscription ?? VenueSubscription(),
    loyaltyConfig = loyaltyConfig ?? const LoyaltyConfig(),
    stats = stats ?? VenueStats(
      avgReturnHours: 0, 
      totalCheckins: 0,
      monthlyActiveUsers: 0,
      avgDiscount: 0,
      retentionRate: 0,
    );

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
      'defaultLanguage': defaultLanguage,
      'timezone': timezone,
      'tiers': tiers.map((t) => t.toMap()).toList(),
      'subscription': subscription.toMap(),
      'loyaltyConfig': loyaltyConfig.toMap(),
      'stats': stats.toMap(),
      'lastBlastDate': lastBlastDate != null ? Timestamp.fromDate(lastBlastDate!) : null,
      'latitude': latitude,
      'longitude': longitude,
      'assignedAdminId': assignedAdminId,
      'assignedManagerId': assignedManagerId,
    };
  }

  factory VenueModel.fromMap(String id, Map<String, dynamic> map) {
    return VenueModel(
      id: id,
      ownerEmail: map['ownerEmail'],
      ownerId: map['ownerId'],
      name: map['name'] ?? '',
      address: map['address'] ?? '',
      logoUrl: map['logoUrl'],
      linkUrl: map['linkUrl'],
      description: map['description'] ?? '',
      category: map['category'] ?? 'General',
      isActive: map['isActive'] ?? true,
      isManuallyBlocked: map['isManuallyBlocked'] ?? false,
      defaultLanguage: map['defaultLanguage'] ?? 'en',
      timezone: map['timezone'] ?? 'Etc/GMT-3',
      tiers: (map['tiers'] as List?)?.map((t) => VenueTier.fromMap(t)).toList(),
      subscription: map['subscription'] != null ? VenueSubscription.fromMap(map['subscription']) : null,
      loyaltyConfig: map['loyaltyConfig'] != null ? LoyaltyConfig.fromMap(map['loyaltyConfig']) : null,
      stats: map['stats'] != null ? VenueStats.fromMap(map['stats']) : null,
      lastBlastDate: map['lastBlastDate'] != null ? (map['lastBlastDate'] as Timestamp).toDate() : null,
      latitude: map['latitude']?.toDouble(),
      longitude: map['longitude']?.toDouble(),
      assignedAdminId: map['assignedAdminId'],
      assignedManagerId: map['assignedManagerId'],
    );
  }
}

class VenueStats {
  final double avgReturnHours;
  final int totalCheckins;
  final int monthlyActiveUsers;
  final double avgDiscount;
  final double retentionRate;
  
  // Segmentation Counts
  final int newGuestsCount;
  final int vipGuestsCount;
  final int lostGuestsCount;

  final Map<String, dynamic> extraData; // For extensibility

  VenueStats({
    required this.avgReturnHours,
    required this.totalCheckins,
    this.monthlyActiveUsers = 0,
    this.avgDiscount = 0.0,
    this.retentionRate = 0.0,
    this.newGuestsCount = 0,
    this.vipGuestsCount = 0,
    this.lostGuestsCount = 0,
    this.extraData = const {},
  });

  Map<String, dynamic> toMap() {
    return {
      'avgReturnHours': avgReturnHours,
      'totalCheckins': totalCheckins,
      'monthlyActiveUsers': monthlyActiveUsers,
      'avgDiscount': avgDiscount,
      'retentionRate': retentionRate,
      'newGuestsCount': newGuestsCount,
      'vipGuestsCount': vipGuestsCount,
      'lostGuestsCount': lostGuestsCount,
      ...?extraData,
    };
  }

  factory VenueStats.fromMap(Map<String, dynamic> map) {
    // Helper to safely remove known keys
    final extra = Map<String, dynamic>.from(map);
    [
      'avgReturnHours', 'totalCheckins', 'monthlyActiveUsers', 'avgDiscount', 
      'retentionRate', 'newGuestsCount', 'vipGuestsCount', 'lostGuestsCount'
    ].forEach(extra.remove);

    return VenueStats(
      avgReturnHours: (map['avgReturnHours'] ?? 0).toDouble(),
      totalCheckins: map['totalCheckins'] ?? 0,
      monthlyActiveUsers: map['monthlyActiveUsers'] ?? 0,
      avgDiscount: (map['avgDiscount'] ?? 0).toDouble(),
      retentionRate: (map['retentionRate'] ?? 0).toDouble(),
      newGuestsCount: map['newGuestsCount'] ?? 0,
      vipGuestsCount: map['vipGuestsCount'] ?? 0,
      lostGuestsCount: map['lostGuestsCount'] ?? 0,
      extraData: extra,
    );
  }
}
