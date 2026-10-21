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
  final DateTime? startDate;
  final DateTime? expiryDate;

  VenueSubscription({
    this.plan = 'free',
    this.isPaid = false,
    this.startDate,
    this.expiryDate,
  });

  Map<String, dynamic> toMap() => {
    'plan': plan,
    'isPaid': isPaid,
    'startDate': startDate != null ? Timestamp.fromDate(startDate!) : null,
    'expiryDate': expiryDate != null ? Timestamp.fromDate(expiryDate!) : null,
  };

  factory VenueSubscription.fromMap(Map<String, dynamic> map) => VenueSubscription(
    plan: map['plan'] ?? 'free',
    isPaid: map['isPaid'] ?? false,
    startDate: map['startDate'] != null ? (map['startDate'] as Timestamp).toDate() : null,
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
  final int googleReviewRewardDays;
  
  final int percBase;
  final int percVip;
  final List<LoyaltyDecayStage> decayStages;

  final int percDeposit;
  final double depositThreshold;

  const LoyaltyConfig({
    this.vipWindowDays = 1,
    this.percBase = 5,
    this.percVip = 20,
    this.degradationIntervalDays = 7,
    this.resetIntervalDays = 30,
    this.googleReviewRewardDays = 7,
    List<LoyaltyDecayStage>? decayStages,
    this.percDeposit = 25,
    this.depositThreshold = 1000000.0,
  }) : decayStages = decayStages ?? const [
         LoyaltyDecayStage(days: 7, discount: 15),
       ];

  Map<String, dynamic> toMap() => {
    'vipWindowDays': vipWindowDays,
    'percBase': percBase,
    'percVip': percVip,
    'degradationIntervalDays': degradationIntervalDays,
    'resetIntervalDays': resetIntervalDays,
    'googleReviewRewardDays': googleReviewRewardDays,
    'decayStages': decayStages.map((s) => s.toMap()).toList(),
    'percDeposit': percDeposit,
    'depositThreshold': depositThreshold,
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
         LoyaltyDecayStage(days: 7, discount: 15),
       ];
    }

    return LoyaltyConfig(
      vipWindowDays: map['vipWindowDays'] ?? (map['vipWindowHours'] != null ? (map['vipWindowHours'] as int) ~/ 24 : 1),
      percBase: map['percBase'] ?? 5,
      percVip: map['percVip'] ?? 20,
      degradationIntervalDays: map['degradationIntervalDays'] ?? (map['degradationIntervalHours'] != null ? (map['degradationIntervalHours'] as int) ~/ 24 : 7),
      resetIntervalDays: map['resetIntervalDays'] ?? 30,
      googleReviewRewardDays: map['googleReviewRewardDays'] ?? 7,
      decayStages: loadedStages,
      percDeposit: map['percDeposit'] ?? 25,
      depositThreshold: (map['depositThreshold'] ?? 1000000.0).toDouble(),
    );
  }
}

class DaySchedule {
  final bool isOpen;
  final String openTime;  // "10:00"
  final String closeTime; // "23:00"

  const DaySchedule({
    this.isOpen = true,
    this.openTime = "10:00",
    this.closeTime = "23:00",
  });

  Map<String, dynamic> toMap() => {
    'isOpen': isOpen,
    'openTime': openTime,
    'closeTime': closeTime,
  };

  factory DaySchedule.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const DaySchedule();
    return DaySchedule(
      isOpen: map['isOpen'] as bool? ?? true,
      openTime: (map['openTime'] as String?) ?? "10:00",
      closeTime: (map['closeTime'] as String?) ?? "23:00",
    );
  }

  DaySchedule copyWith({bool? isOpen, String? openTime, String? closeTime}) {
    return DaySchedule(
      isOpen: isOpen ?? this.isOpen,
      openTime: openTime ?? this.openTime,
      closeTime: closeTime ?? this.closeTime,
    );
  }
}

class VenueOperatingHours {
  final DaySchedule monday;
  final DaySchedule tuesday;
  final DaySchedule wednesday;
  final DaySchedule thursday;
  final DaySchedule friday;
  final DaySchedule saturday;
  final DaySchedule sunday;

  const VenueOperatingHours({
    this.monday = const DaySchedule(),
    this.tuesday = const DaySchedule(),
    this.wednesday = const DaySchedule(),
    this.thursday = const DaySchedule(),
    this.friday = const DaySchedule(),
    this.saturday = const DaySchedule(),
    this.sunday = const DaySchedule(),
  });

  Map<String, dynamic> toMap() => {
    'monday': monday.toMap(),
    'tuesday': tuesday.toMap(),
    'wednesday': wednesday.toMap(),
    'thursday': thursday.toMap(),
    'friday': friday.toMap(),
    'saturday': saturday.toMap(),
    'sunday': sunday.toMap(),
  };

  factory VenueOperatingHours.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const VenueOperatingHours();
    return VenueOperatingHours(
      monday: DaySchedule.fromMap(map['monday'] as Map<String, dynamic>?),
      tuesday: DaySchedule.fromMap(map['tuesday'] as Map<String, dynamic>?),
      wednesday: DaySchedule.fromMap(map['wednesday'] as Map<String, dynamic>?),
      thursday: DaySchedule.fromMap(map['thursday'] as Map<String, dynamic>?),
      friday: DaySchedule.fromMap(map['friday'] as Map<String, dynamic>?),
      saturday: DaySchedule.fromMap(map['saturday'] as Map<String, dynamic>?),
      sunday: DaySchedule.fromMap(map['sunday'] as Map<String, dynamic>?),
    );
  }

  DaySchedule getForWeekday(int weekday) {
    switch (weekday) {
      case DateTime.monday: return monday;
      case DateTime.tuesday: return tuesday;
      case DateTime.wednesday: return wednesday;
      case DateTime.thursday: return thursday;
      case DateTime.friday: return friday;
      case DateTime.saturday: return saturday;
      case DateTime.sunday: return sunday;
      default: return monday;
    }
  }

  bool isCurrentlyOpen([DateTime? now]) {
    final current = now ?? DateTime.now();
    final schedule = getForWeekday(current.weekday);
    if (!schedule.isOpen) return false;

    try {
      final openParts = schedule.openTime.split(':').map(int.parse).toList();
      final closeParts = schedule.closeTime.split(':').map(int.parse).toList();
      final currentMinutes = current.hour * 60 + current.minute;
      final openMinutes = openParts[0] * 60 + openParts[1];
      final closeMinutes = closeParts[0] * 60 + closeParts[1];

      if (closeMinutes >= openMinutes) {
        return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
      } else {
        return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
      }
    } catch (_) {
      return true;
    }
  }

  VenueOperatingHours copyWith({
    DaySchedule? monday,
    DaySchedule? tuesday,
    DaySchedule? wednesday,
    DaySchedule? thursday,
    DaySchedule? friday,
    DaySchedule? saturday,
    DaySchedule? sunday,
  }) {
    return VenueOperatingHours(
      monday: monday ?? this.monday,
      tuesday: tuesday ?? this.tuesday,
      wednesday: wednesday ?? this.wednesday,
      thursday: thursday ?? this.thursday,
      friday: friday ?? this.friday,
      saturday: saturday ?? this.saturday,
      sunday: sunday ?? this.sunday,
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
  final DateTime? createdAt;
  final double? latitude;
  final double? longitude;
  final String? assignedAdminId;
  final String? assignedManagerId;
  final bool emailReportsActive;
  final String? googleMapsUrl;
  final bool hasCaptiveWifi;
  final String wifiSsid;
  final int wifiSpeedMbps;
  final bool isHybridEnabled;
  final String? giftxUrl;
  final GoogleMapsConfig gmConfig;
  final DeliveryLoyaltyConfig deliveryLoyaltyConfig;
  final VenuePaymentConfig paymentConfig;
  final VenueLogisticsConfig logisticsConfig;
  final String countryCode;
  final String currency;
  final String phone;
  final String? placeId;
  final String? googleReviewUrl;
  final String currencyPosition;
  final VenueOperatingHours operatingHours;

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
    this.createdAt,
    this.latitude,
    this.longitude,
    this.assignedAdminId,
    this.assignedManagerId,
    this.emailReportsActive = false,
    this.googleMapsUrl,
    this.hasCaptiveWifi = false,
    this.wifiSsid = 'Revo_Free_WiFi',
    this.wifiSpeedMbps = 100,
    this.isHybridEnabled = false,
    this.giftxUrl,
    GoogleMapsConfig? gmConfig,
    DeliveryLoyaltyConfig? deliveryLoyaltyConfig,
    VenuePaymentConfig? paymentConfig,
    VenueLogisticsConfig? logisticsConfig,
    this.countryCode = 'VN',
    this.currency = 'VND',
    this.phone = '',
    this.placeId,
    this.googleReviewUrl,
    this.currencyPosition = 'suffix',
    VenueOperatingHours? operatingHours,
  }) : operatingHours = operatingHours ?? const VenueOperatingHours(), 
    tiers = tiers ?? [],
    subscription = subscription ?? VenueSubscription(),
    loyaltyConfig = loyaltyConfig ?? const LoyaltyConfig(),
    gmConfig = gmConfig ?? GoogleMapsConfig(),
    deliveryLoyaltyConfig = deliveryLoyaltyConfig ?? DeliveryLoyaltyConfig.fromLoyalty(loyaltyConfig ?? const LoyaltyConfig()),
    paymentConfig = paymentConfig ?? const VenuePaymentConfig(),
    logisticsConfig = logisticsConfig ?? const VenueLogisticsConfig(),
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
      'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
      'latitude': latitude,
      'longitude': longitude,
      'assignedAdminId': assignedAdminId,
      'assignedManagerId': assignedManagerId,
      'emailReportsActive': emailReportsActive,
      'googleMapsUrl': googleMapsUrl,
      'has_captive_wifi': hasCaptiveWifi,
      'wifi_ssid': wifiSsid,
      'wifi_speed_mbps': wifiSpeedMbps,
      'isHybridEnabled': isHybridEnabled,
      'giftxUrl': giftxUrl,
      'gmConfig': gmConfig.toMap(),
      'deliveryLoyaltyConfig': deliveryLoyaltyConfig.toMap(),
      'paymentConfig': paymentConfig.toMap(),
      'logisticsConfig': logisticsConfig.toMap(),
      'countryCode': countryCode,
      'currency': currency,
      'phone': phone,
      'placeId': placeId,
      'googleReviewUrl': googleReviewUrl,
      'currencyPosition': currencyPosition,
      'operatingHours': operatingHours.toMap(),
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
      createdAt: map['createdAt'] != null ? (map['createdAt'] as Timestamp).toDate() : null,
      latitude: map['latitude']?.toDouble(),
      longitude: map['longitude']?.toDouble(),
      assignedAdminId: map['assignedAdminId'],
      assignedManagerId: map['assignedManagerId'],
      emailReportsActive: map['emailReportsActive'] ?? false,
      googleMapsUrl: map['googleMapsUrl'],
      hasCaptiveWifi: map['has_captive_wifi'] ?? false,
      wifiSsid: map['wifi_ssid'] ?? 'Revo_Free_WiFi',
      wifiSpeedMbps: map['wifi_speed_mbps'] ?? 100,
      isHybridEnabled: map['isHybridEnabled'] ?? false,
      giftxUrl: map['giftxUrl'],
      gmConfig: GoogleMapsConfig.fromMap(map['gmConfig'] as Map<String, dynamic>?),
      deliveryLoyaltyConfig: DeliveryLoyaltyConfig.fromMap(
        map['deliveryLoyaltyConfig'] as Map<String, dynamic>?,
        fallbackLoyalty: map['loyaltyConfig'] != null ? LoyaltyConfig.fromMap(map['loyaltyConfig']) : const LoyaltyConfig(),
      ),
      paymentConfig: VenuePaymentConfig.fromMap(map['paymentConfig'] as Map<String, dynamic>?),
      logisticsConfig: VenueLogisticsConfig.fromMap(map['logisticsConfig'] as Map<String, dynamic>?),
      countryCode: map['countryCode'] ?? ((map['address'] != null && map['address'].toString().toLowerCase().contains('dubai')) ? 'AE' : 'VN'),
      currency: map['currency'] ?? (map['countryCode'] == 'AE' ? 'AED' : map['countryCode'] == 'IN' ? 'INR' : 'VND'),
      phone: map['phone'] ?? '',
      placeId: map['placeId'],
      googleReviewUrl: map['googleReviewUrl'],
      currencyPosition: map['currencyPosition'] ?? (map['currency'] == 'USD' || map['currency'] == 'INR' ? 'prefix' : 'suffix'),
      operatingHours: VenueOperatingHours.fromMap(map['operatingHours'] as Map<String, dynamic>?),
    );
  }
  VenueModel copyWith({
    String? id,
    String? ownerEmail,
    String? ownerId,
    String? name,
    String? address,
    String? logoUrl,
    String? linkUrl,
    String? description,
    String? category,
    bool? isActive,
    bool? isManuallyBlocked,
    String? defaultLanguage,
    String? timezone,
    List<VenueTier>? tiers,
    VenueSubscription? subscription,
    LoyaltyConfig? loyaltyConfig,
    VenueStats? stats,
    DateTime? lastBlastDate,
    DateTime? createdAt,
    double? latitude,
    double? longitude,
    String? assignedAdminId,
    String? assignedManagerId,
    bool? emailReportsActive,
    String? googleMapsUrl,
    bool? hasCaptiveWifi,
    String? wifiSsid,
    int? wifiSpeedMbps,
    bool? isHybridEnabled,
    String? giftxUrl,
    GoogleMapsConfig? gmConfig,
    DeliveryLoyaltyConfig? deliveryLoyaltyConfig,
    VenuePaymentConfig? paymentConfig,
    VenueLogisticsConfig? logisticsConfig,
    String? countryCode,
    String? currency,
    String? phone,
    String? placeId,
    String? googleReviewUrl,
    String? currencyPosition,
    VenueOperatingHours? operatingHours,
  }) {
    return VenueModel(
      id: id ?? this.id,
      ownerEmail: ownerEmail ?? this.ownerEmail,
      ownerId: ownerId ?? this.ownerId,
      name: name ?? this.name,
      address: address ?? this.address,
      logoUrl: logoUrl ?? this.logoUrl,
      linkUrl: linkUrl ?? this.linkUrl,
      description: description ?? this.description,
      category: category ?? this.category,
      isActive: isActive ?? this.isActive,
      isManuallyBlocked: isManuallyBlocked ?? this.isManuallyBlocked,
      defaultLanguage: defaultLanguage ?? this.defaultLanguage,
      timezone: timezone ?? this.timezone,
      tiers: tiers ?? this.tiers,
      subscription: subscription ?? this.subscription,
      loyaltyConfig: loyaltyConfig ?? this.loyaltyConfig,
      stats: stats ?? this.stats,
      lastBlastDate: lastBlastDate ?? this.lastBlastDate,
      createdAt: createdAt ?? this.createdAt,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      assignedAdminId: assignedAdminId ?? this.assignedAdminId,
      assignedManagerId: assignedManagerId ?? this.assignedManagerId,
      emailReportsActive: emailReportsActive ?? this.emailReportsActive,
      googleMapsUrl: googleMapsUrl ?? this.googleMapsUrl,
      hasCaptiveWifi: hasCaptiveWifi ?? this.hasCaptiveWifi,
      wifiSsid: wifiSsid ?? this.wifiSsid,
      wifiSpeedMbps: wifiSpeedMbps ?? this.wifiSpeedMbps,
      isHybridEnabled: isHybridEnabled ?? this.isHybridEnabled,
      giftxUrl: giftxUrl ?? this.giftxUrl,
      gmConfig: gmConfig ?? this.gmConfig,
      deliveryLoyaltyConfig: deliveryLoyaltyConfig ?? this.deliveryLoyaltyConfig,
      paymentConfig: paymentConfig ?? this.paymentConfig,
      logisticsConfig: logisticsConfig ?? this.logisticsConfig,
      countryCode: countryCode ?? this.countryCode,
      currency: currency ?? this.currency,
      phone: phone ?? this.phone,
      placeId: placeId ?? this.placeId,
      googleReviewUrl: googleReviewUrl ?? this.googleReviewUrl,
      currencyPosition: currencyPosition ?? this.currencyPosition,
      operatingHours: operatingHours ?? this.operatingHours,
    );
  }

  // UI Helpers
  String? get photoUrl => logoUrl;
  int? get totalUsers => stats.monthlyActiveUsers;
  int? get totalRedemptions => stats.totalCheckins;

  bool get isExpired => subscription.expiryDate != null && subscription.expiryDate!.isBefore(DateTime.now());
  bool get isEffectiveActive => isActive && !isManuallyBlocked && !isExpired;
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
  
  // Google Maps Integration Stats
  final int googleMapsNewGuestsCount;
  final int googleMapsReturningGuestsCount;

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
    this.googleMapsNewGuestsCount = 0,
    this.googleMapsReturningGuestsCount = 0,
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
      'googleMapsNewGuestsCount': googleMapsNewGuestsCount,
      'googleMapsReturningGuestsCount': googleMapsReturningGuestsCount,
      ...extraData,
    };
  }

  factory VenueStats.fromMap(Map<String, dynamic> map) {
    // Helper to safely remove known keys
    final extra = Map<String, dynamic>.from(map);
    [
      'avgReturnHours', 'totalCheckins', 'monthlyActiveUsers', 'avgDiscount', 
      'retentionRate', 'newGuestsCount', 'vipGuestsCount', 'lostGuestsCount',
      'googleMapsNewGuestsCount', 'googleMapsReturningGuestsCount'
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
      googleMapsNewGuestsCount: map['googleMapsNewGuestsCount'] ?? 0,
      googleMapsReturningGuestsCount: map['googleMapsReturningGuestsCount'] ?? 0,
      extraData: extra,
    );
  }
}


class GoogleMapsConfig {
  final String businessType; // 'horeca' or 'services'
  final String dailyOfferText;
  final String dailyOfferImageUrl;
  final String phone;
  final String instagram;
  final String tiktok;
  final String youtube;
  final String telegram;
  final String whatsapp;
  final bool usePhotoMenu;
  final bool usePdfMenu;
  final String menuPdfUrl;
  final String photoAspectRatio; // '1:1', '3:4', '16:9'
  final String photoFit; // 'cover', 'contain'
  final List<String> menuPhotos;
  final List<GmMenuItem> menuItems;
  final List<GmServiceItem> services;

  GoogleMapsConfig({
    this.businessType = 'horeca',
    this.dailyOfferText = '',
    this.dailyOfferImageUrl = '',
    this.phone = '',
    this.instagram = '',
    this.tiktok = '',
    this.youtube = '',
    this.telegram = '',
    this.whatsapp = '',
    this.usePhotoMenu = false,
    this.usePdfMenu = false,
    this.menuPdfUrl = '',
    this.photoAspectRatio = '3:4',
    this.photoFit = 'cover',
    this.menuPhotos = const [],
    this.menuItems = const [],
    this.services = const [],
  });

  factory GoogleMapsConfig.fromMap(Map<String, dynamic>? map) {
    if (map == null) return GoogleMapsConfig();
    return GoogleMapsConfig(
      businessType: map['businessType'] ?? 'horeca',
      dailyOfferText: map['dailyOfferText'] ?? '',
      dailyOfferImageUrl: map['dailyOfferImageUrl'] ?? '',
      phone: map['phone'] ?? '',
      instagram: map['instagram'] ?? '',
      tiktok: map['tiktok'] ?? '',
      youtube: map['youtube'] ?? '',
      telegram: map['telegram'] ?? '',
      whatsapp: map['whatsapp'] ?? '',
      usePhotoMenu: map['usePhotoMenu'] ?? false,
      usePdfMenu: map['usePdfMenu'] ?? false,
      menuPdfUrl: map['menuPdfUrl'] ?? '',
      photoAspectRatio: map['photoAspectRatio'] ?? '3:4',
      photoFit: map['photoFit'] ?? 'cover',
      menuPhotos: (map['menuPhotos'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      menuItems: (map['menuItems'] as List<dynamic>?)?.map((e) => GmMenuItem.fromMap(e as Map<String, dynamic>)).toList() ?? [],
      services: (map['services'] as List<dynamic>?)?.map((e) => GmServiceItem.fromMap(e as Map<String, dynamic>)).toList() ?? [],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'businessType': businessType,
      'dailyOfferText': dailyOfferText,
      'dailyOfferImageUrl': dailyOfferImageUrl,
      'phone': phone,
      'instagram': instagram,
      'tiktok': tiktok,
      'youtube': youtube,
      'telegram': telegram,
      'whatsapp': whatsapp,
      'usePhotoMenu': usePhotoMenu,
      'usePdfMenu': usePdfMenu,
      'menuPdfUrl': menuPdfUrl,
      'photoAspectRatio': photoAspectRatio,
      'photoFit': photoFit,
      'menuPhotos': menuPhotos,
      'menuItems': menuItems.map((e) => e.toMap()).toList(),
      'services': services.map((e) => e.toMap()).toList(),
    };
  }
  
  GoogleMapsConfig copyWith({
    String? businessType,
    String? dailyOfferText,
    String? dailyOfferImageUrl,
    String? phone,
    String? instagram,
    String? tiktok,
    String? youtube,
    String? telegram,
    String? whatsapp,
    bool? usePhotoMenu,
    bool? usePdfMenu,
    String? menuPdfUrl,
    String? photoAspectRatio,
    String? photoFit,
    List<String>? menuPhotos,
    List<GmMenuItem>? menuItems,
    List<GmServiceItem>? services,
  }) {
    return GoogleMapsConfig(
      businessType: businessType ?? this.businessType,
      dailyOfferText: dailyOfferText ?? this.dailyOfferText,
      dailyOfferImageUrl: dailyOfferImageUrl ?? this.dailyOfferImageUrl,
      phone: phone ?? this.phone,
      instagram: instagram ?? this.instagram,
      tiktok: tiktok ?? this.tiktok,
      youtube: youtube ?? this.youtube,
      telegram: telegram ?? this.telegram,
      whatsapp: whatsapp ?? this.whatsapp,
      usePhotoMenu: usePhotoMenu ?? this.usePhotoMenu,
      usePdfMenu: usePdfMenu ?? this.usePdfMenu,
      menuPdfUrl: menuPdfUrl ?? this.menuPdfUrl,
      photoAspectRatio: photoAspectRatio ?? this.photoAspectRatio,
      photoFit: photoFit ?? this.photoFit,
      menuPhotos: menuPhotos ?? this.menuPhotos,
      menuItems: menuItems ?? this.menuItems,
      services: services ?? this.services,
    );
  }
}

class GmMenuItem {
  final String id;
  final String category;
  final String name;
  final String description;
  final String price;
  final String aggregatorPrice;
  final String currency;
  final String imageUrl;
  final bool isPublished;
  final bool isAvailable;

  GmMenuItem({
    this.id = '',
    this.category = 'General',
    this.name = '',
    this.description = '',
    this.price = '',
    this.aggregatorPrice = '',
    this.currency = 'VND',
    this.imageUrl = '',
    this.isPublished = true,
    this.isAvailable = true,
  });
  
  factory GmMenuItem.fromMap(Map<String, dynamic> map) {
    return GmMenuItem(
      id: map['id'] ?? '',
      category: map['category'] ?? 'General',
      name: map['name'] ?? '',
      description: map['description'] ?? '',
      price: map['price'] ?? '',
      aggregatorPrice: map['aggregatorPrice'] ?? '',
      currency: map['currency'] ?? 'VND',
      imageUrl: map['imageUrl'] ?? '',
      isPublished: map['isPublished'] ?? true,
      isAvailable: map['isAvailable'] ?? true,
    );
  }
  
  Map<String, dynamic> toMap() => {
    'id': id,
    'category': category,
    'name': name,
    'description': description,
    'price': price,
    'aggregatorPrice': aggregatorPrice,
    'currency': currency,
    'imageUrl': imageUrl,
    'isPublished': isPublished,
    'isAvailable': isAvailable,
  };

  GmMenuItem copyWith({
    String? id,
    String? category,
    String? name,
    String? description,
    String? price,
    String? aggregatorPrice,
    String? currency,
    String? imageUrl,
    bool? isPublished,
    bool? isAvailable,
  }) {
    return GmMenuItem(
      id: id ?? this.id,
      category: category ?? this.category,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      aggregatorPrice: aggregatorPrice ?? this.aggregatorPrice,
      currency: currency ?? this.currency,
      imageUrl: imageUrl ?? this.imageUrl,
      isPublished: isPublished ?? this.isPublished,
      isAvailable: isAvailable ?? this.isAvailable,
    );
  }
}

class GmServiceItem {
  final String category;
  final String name;
  final String description;
  final String price;
  final String duration;

  GmServiceItem({this.category = '', this.name = '', this.description = '', this.price = '', this.duration = ''});

  factory GmServiceItem.fromMap(Map<String, dynamic> map) {
    return GmServiceItem(
      category: map['category'] ?? '',
      name: map['name'] ?? '',
      description: map['description'] ?? '',
      price: map['price'] ?? '',
      duration: map['duration'] ?? '',
    );
  }

  Map<String, dynamic> toMap() => {'category': category, 'name': name, 'description': description, 'price': price, 'duration': duration};
}

class HappyHourRule {
  final String id;
  final String title;
  final bool isActive;
  final List<int> daysOfWeek;
  final String startTime;
  final String endTime;
  final int discountPercent;
  final bool freeDelivery;

  const HappyHourRule({
    required this.id,
    this.title = 'Happy Hours',
    this.isActive = true,
    this.daysOfWeek = const [1, 2, 3, 4, 5],
    this.startTime = '14:00',
    this.endTime = '17:00',
    this.discountPercent = 20,
    this.freeDelivery = false,
  });

  factory HappyHourRule.fromMap(Map<String, dynamic> map) => HappyHourRule(
    id: map['id'] ?? '',
    title: map['title'] ?? 'Happy Hours',
    isActive: map['isActive'] ?? true,
    daysOfWeek: (map['daysOfWeek'] as List<dynamic>?)?.map((e) => e as int).toList() ?? const [1, 2, 3, 4, 5],
    startTime: map['startTime'] ?? '14:00',
    endTime: map['endTime'] ?? '17:00',
    discountPercent: map['discountPercent'] ?? 20,
    freeDelivery: map['freeDelivery'] ?? false,
  );

  Map<String, dynamic> toMap() => {
    'id': id,
    'title': title,
    'isActive': isActive,
    'daysOfWeek': daysOfWeek,
    'startTime': startTime,
    'endTime': endTime,
    'discountPercent': discountPercent,
    'freeDelivery': freeDelivery,
  };
}

class DeliveryLoyaltyConfig {
  final bool useCustomDeliveryTiers;
  final int percBase;
  final int percMedium;
  final int mediumDays;
  final int percVip;
  final int vipWindowDays;
  final int percDeposit;
  final double depositThreshold;
  final double freeDeliveryThreshold;
  final int pickupBonusPercent;
  final List<HappyHourRule> happyHours;

  const DeliveryLoyaltyConfig({
    this.useCustomDeliveryTiers = false,
    this.percBase = 10,
    this.percMedium = 15,
    this.mediumDays = 7,
    this.percVip = 20,
    this.vipWindowDays = 1,
    this.percDeposit = 25,
    this.depositThreshold = 1000000.0,
    this.freeDeliveryThreshold = 250000.0,
    this.pickupBonusPercent = 5,
    this.happyHours = const [],
  });

  factory DeliveryLoyaltyConfig.fromLoyalty(LoyaltyConfig loyalty) {
    final mediumStage = loyalty.decayStages.isNotEmpty ? loyalty.decayStages[0] : const LoyaltyDecayStage(days: 7, discount: 15);
    return DeliveryLoyaltyConfig(
      useCustomDeliveryTiers: false,
      percBase: loyalty.percBase,
      percMedium: mediumStage.discount,
      mediumDays: mediumStage.days,
      percVip: loyalty.percVip,
      vipWindowDays: loyalty.vipWindowDays,
      percDeposit: loyalty.percDeposit,
      depositThreshold: loyalty.depositThreshold,
      freeDeliveryThreshold: 250000.0,
      pickupBonusPercent: 5,
      happyHours: const [],
    );
  }

  factory DeliveryLoyaltyConfig.fromMap(Map<String, dynamic>? map, {LoyaltyConfig? fallbackLoyalty}) {
    if (map == null) {
      return DeliveryLoyaltyConfig.fromLoyalty(fallbackLoyalty ?? const LoyaltyConfig());
    }
    final loyalty = fallbackLoyalty ?? const LoyaltyConfig();
    final mediumStage = loyalty.decayStages.isNotEmpty ? loyalty.decayStages[0] : const LoyaltyDecayStage(days: 7, discount: 15);

    return DeliveryLoyaltyConfig(
      useCustomDeliveryTiers: map['useCustomDeliveryTiers'] ?? false,
      percBase: map['percBase'] ?? loyalty.percBase,
      percMedium: map['percMedium'] ?? mediumStage.discount,
      mediumDays: map['mediumDays'] ?? mediumStage.days,
      percVip: map['percVip'] ?? loyalty.percVip,
      vipWindowDays: map['vipWindowDays'] ?? loyalty.vipWindowDays,
      percDeposit: map['percDeposit'] ?? loyalty.percDeposit,
      depositThreshold: (map['depositThreshold'] ?? loyalty.depositThreshold).toDouble(),
      freeDeliveryThreshold: (map['freeDeliveryThreshold'] ?? 250000.0).toDouble(),
      pickupBonusPercent: map['pickupBonusPercent'] ?? 5,
      happyHours: (map['happyHours'] as List<dynamic>?)?.map((e) => HappyHourRule.fromMap(e as Map<String, dynamic>)).toList() ?? const [],
    );
  }

  Map<String, dynamic> toMap() => {
    'useCustomDeliveryTiers': useCustomDeliveryTiers,
    'percBase': percBase,
    'percMedium': percMedium,
    'mediumDays': mediumDays,
    'percVip': percVip,
    'vipWindowDays': vipWindowDays,
    'percDeposit': percDeposit,
    'depositThreshold': depositThreshold,
    'freeDeliveryThreshold': freeDeliveryThreshold,
    'pickupBonusPercent': pickupBonusPercent,
    'happyHours': happyHours.map((h) => h.toMap()).toList(),
  };

  DeliveryLoyaltyConfig copyWith({
    bool? useCustomDeliveryTiers,
    int? percBase,
    int? percMedium,
    int? mediumDays,
    int? percVip,
    int? vipWindowDays,
    int? percDeposit,
    double? depositThreshold,
    double? freeDeliveryThreshold,
    int? pickupBonusPercent,
    List<HappyHourRule>? happyHours,
  }) {
    return DeliveryLoyaltyConfig(
      useCustomDeliveryTiers: useCustomDeliveryTiers ?? this.useCustomDeliveryTiers,
      percBase: percBase ?? this.percBase,
      percMedium: percMedium ?? this.percMedium,
      mediumDays: mediumDays ?? this.mediumDays,
      percVip: percVip ?? this.percVip,
      vipWindowDays: vipWindowDays ?? this.vipWindowDays,
      percDeposit: percDeposit ?? this.percDeposit,
      depositThreshold: depositThreshold ?? this.depositThreshold,
      freeDeliveryThreshold: freeDeliveryThreshold ?? this.freeDeliveryThreshold,
      pickupBonusPercent: pickupBonusPercent ?? this.pickupBonusPercent,
      happyHours: happyHours ?? this.happyHours,
    );
  }
}

class VenuePaymentConfig {
  final bool cashOnDelivery;
  final bool cardTerminalOnDelivery;
  final bool payFromDeposit;
  final String vietQrBankBin;
  final String vietQrAccountNumber;
  final String vietQrAccountName;
  final String stripeAccountId;
  final String ziinaPaymentUrl;
  final String razorpayKeyId;
  final String upiId;

  const VenuePaymentConfig({
    this.cashOnDelivery = true,
    this.cardTerminalOnDelivery = false,
    this.payFromDeposit = true,
    this.vietQrBankBin = '',
    this.vietQrAccountNumber = '',
    this.vietQrAccountName = '',
    this.stripeAccountId = '',
    this.ziinaPaymentUrl = '',
    this.razorpayKeyId = '',
    this.upiId = '',
  });

  factory VenuePaymentConfig.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const VenuePaymentConfig();
    return VenuePaymentConfig(
      cashOnDelivery: map['cashOnDelivery'] ?? true,
      cardTerminalOnDelivery: map['cardTerminalOnDelivery'] ?? false,
      payFromDeposit: map['payFromDeposit'] ?? true,
      vietQrBankBin: map['vietQrBankBin'] ?? '',
      vietQrAccountNumber: map['vietQrAccountNumber'] ?? '',
      vietQrAccountName: map['vietQrAccountName'] ?? '',
      stripeAccountId: map['stripeAccountId'] ?? '',
      ziinaPaymentUrl: map['ziinaPaymentUrl'] ?? '',
      razorpayKeyId: map['razorpayKeyId'] ?? '',
      upiId: map['upiId'] ?? '',
    );
  }

  Map<String, dynamic> toMap() => {
    'cashOnDelivery': cashOnDelivery,
    'cardTerminalOnDelivery': cardTerminalOnDelivery,
    'payFromDeposit': payFromDeposit,
    'vietQrBankBin': vietQrBankBin,
    'vietQrAccountNumber': vietQrAccountNumber,
    'vietQrAccountName': vietQrAccountName,
    'stripeAccountId': stripeAccountId,
    'ziinaPaymentUrl': ziinaPaymentUrl,
    'razorpayKeyId': razorpayKeyId,
    'upiId': upiId,
  };
}

class VenueLogisticsConfig {
  final String deliveryMode;
  final double inHouseRadiusKm;
  final double inHouseBaseFee;
  final String preferred3plProvider;
  final String telegramDispatchChatId;

  const VenueLogisticsConfig({
    this.deliveryMode = 'in_house',
    this.inHouseRadiusKm = 5.0,
    this.inHouseBaseFee = 25000.0,
    this.preferred3plProvider = 'lalamove',
    this.telegramDispatchChatId = '',
  });

  factory VenueLogisticsConfig.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const VenueLogisticsConfig();
    return VenueLogisticsConfig(
      deliveryMode: map['deliveryMode'] ?? 'in_house',
      inHouseRadiusKm: (map['inHouseRadiusKm'] ?? 5.0).toDouble(),
      inHouseBaseFee: (map['inHouseBaseFee'] ?? 25000.0).toDouble(),
      preferred3plProvider: map['preferred3plProvider'] ?? 'lalamove',
      telegramDispatchChatId: map['telegramDispatchChatId'] ?? '',
    );
  }

  Map<String, dynamic> toMap() => {
    'deliveryMode': deliveryMode,
    'inHouseRadiusKm': inHouseRadiusKm,
    'inHouseBaseFee': inHouseBaseFee,
    'preferred3plProvider': preferred3plProvider,
    'telegramDispatchChatId': telegramDispatchChatId,
  };
}
