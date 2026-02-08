class GlobalSettings {
  final int maxTiersAllowed;
  final bool maintenanceMode;

  GlobalSettings({
    required this.maxTiersAllowed,
    required this.maintenanceMode,
  });

  Map<String, dynamic> toMap() {
    return {
      'maxTiersAllowed': maxTiersAllowed,
      'maintenanceMode': maintenanceMode,
    };
  }

  factory GlobalSettings.fromMap(Map<String, dynamic> map) {
    return GlobalSettings(
      maxTiersAllowed: map['maxTiersAllowed'] ?? 5,
      maintenanceMode: map['maintenanceMode'] ?? false,
    );
  }
}

class AppConfigModel {
  final GlobalSettings globalSettings;

  AppConfigModel({required this.globalSettings});

  Map<String, dynamic> toMap() {
    return {
      'globalSettings': globalSettings.toMap(),
    };
  }

  factory AppConfigModel.fromMap(Map<String, dynamic> map) {
    return AppConfigModel(
      globalSettings: map['globalSettings'] != null
          ? GlobalSettings.fromMap(map['globalSettings'])
          : GlobalSettings(maxTiersAllowed: 5, maintenanceMode: false),
    );
  }
}
