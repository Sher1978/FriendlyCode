const fs = require('fs');

const content = `

class GoogleMapsConfig {
  final String businessType; // 'horeca' or 'services'
  final String dailyOfferText;
  final String dailyOfferImageUrl;
  final List<GmMenuItem> menuItems;
  final List<GmServiceItem> services;

  GoogleMapsConfig({
    this.businessType = 'horeca',
    this.dailyOfferText = '',
    this.dailyOfferImageUrl = '',
    this.menuItems = const [],
    this.services = const [],
  });

  factory GoogleMapsConfig.fromMap(Map<String, dynamic>? map) {
    if (map == null) return GoogleMapsConfig();
    return GoogleMapsConfig(
      businessType: map['businessType'] ?? 'horeca',
      dailyOfferText: map['dailyOfferText'] ?? '',
      dailyOfferImageUrl: map['dailyOfferImageUrl'] ?? '',
      menuItems: (map['menuItems'] as List<dynamic>?)?.map((e) => GmMenuItem.fromMap(e as Map<String, dynamic>)).toList() ?? [],
      services: (map['services'] as List<dynamic>?)?.map((e) => GmServiceItem.fromMap(e as Map<String, dynamic>)).toList() ?? [],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'businessType': businessType,
      'dailyOfferText': dailyOfferText,
      'dailyOfferImageUrl': dailyOfferImageUrl,
      'menuItems': menuItems.map((e) => e.toMap()).toList(),
      'services': services.map((e) => e.toMap()).toList(),
    };
  }
  
  GoogleMapsConfig copyWith({
    String? businessType,
    String? dailyOfferText,
    String? dailyOfferImageUrl,
    List<GmMenuItem>? menuItems,
    List<GmServiceItem>? services,
  }) {
    return GoogleMapsConfig(
      businessType: businessType ?? this.businessType,
      dailyOfferText: dailyOfferText ?? this.dailyOfferText,
      dailyOfferImageUrl: dailyOfferImageUrl ?? this.dailyOfferImageUrl,
      menuItems: menuItems ?? this.menuItems,
      services: services ?? this.services,
    );
  }
}

class GmMenuItem {
  final String name;
  final String description;
  final String price;
  final String imageUrl;

  GmMenuItem({this.name = '', this.description = '', this.price = '', this.imageUrl = ''});
  
  factory GmMenuItem.fromMap(Map<String, dynamic> map) {
    return GmMenuItem(
      name: map['name'] ?? '',
      description: map['description'] ?? '',
      price: map['price'] ?? '',
      imageUrl: map['imageUrl'] ?? '',
    );
  }
  
  Map<String, dynamic> toMap() => {'name': name, 'description': description, 'price': price, 'imageUrl': imageUrl};
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
`;

fs.appendFileSync('admin/lib/core/models/venue_model.dart', content);
console.log('Appended GoogleMapsConfig classes.');
