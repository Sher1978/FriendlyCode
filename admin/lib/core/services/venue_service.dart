import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/services/direct_services_scraper_service.dart';

class VenuesService {
  final FirebaseFirestore _firestore;
  final String _collection = 'venues';

  VenuesService({FirebaseFirestore? firestore}) 
      : _firestore = firestore ?? FirebaseFirestore.instance;

  // Create or Update Venue
  Future<String> saveVenue(VenueModel venue) async {
    final docRef = venue.id.isEmpty 
        ? _firestore.collection(_collection).doc() 
        : _firestore.collection(_collection).doc(venue.id);
    await docRef.set(venue.toMap(), SetOptions(merge: true));
    return docRef.id;
  }

  Future<String> createVenue(VenueModel venue) => saveVenue(venue);
  Future<String> updateVenue(VenueModel venue) => saveVenue(venue);

  /// Seeds demo starter services, top master, yield rules and AI FAQ profile for quick-start testing.
  Future<void> seedServicesStarterPack(String venueId, {String category = 'Барбершоп', String currency = '₽'}) async {
    final batch = _firestore.batch();
    
    // 1. Staff Master
    final staffRef = _firestore.collection(_collection).doc(venueId).collection('staff').doc('master_1');
    batch.set(staffRef, {
      'name': 'Алексей (Топ-мастер)',
      'role': 'Топ-барбер',
      'avatarUrl': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      'services': ['srv_1', 'srv_2', 'srv_3'],
      'rating': 4.9,
      'workingHours': {
        'monday': {'start': '10:00', 'end': '21:00'},
        'tuesday': {'start': '10:00', 'end': '21:00'},
        'wednesday': {'start': '10:00', 'end': '21:00'},
        'thursday': {'start': '10:00', 'end': '21:00'},
        'friday': {'start': '10:00', 'end': '21:00'},
        'saturday': {'start': '10:00', 'end': '20:00'},
        'sunday': null,
      },
      'breakIntervals': [
        {'start': '14:00', 'end': '15:00'},
      ],
      'isActive': true,
      'createdAt': FieldValue.serverTimestamp(),
    });

    // 2. Services
    final s1Ref = _firestore.collection(_collection).doc(venueId).collection('services').doc('srv_1');
    batch.set(s1Ref, {
      'title': 'Мужская стрижка',
      'description': 'Мытье головы, индивидуальный подбор формы, укладка премиум-стайлингом.',
      'category': 'Стрижки',
      'price': 2000,
      'durationMinutes': 45,
      'bufferMinutes': 10,
      'assignedStaffIds': ['master_1'],
      'isActive': true,
      'sortOrder': 1,
      'createdAt': FieldValue.serverTimestamp(),
    });

    final s2Ref = _firestore.collection(_collection).doc(venueId).collection('services').doc('srv_2');
    batch.set(s2Ref, {
      'title': 'Моделирование бороды',
      'description': 'Оформление контуров бритвой, распаривание горячим полотенцем, уход маслом.',
      'category': 'Борода',
      'price': 1500,
      'durationMinutes': 30,
      'bufferMinutes': 5,
      'assignedStaffIds': ['master_1'],
      'isActive': true,
      'sortOrder': 2,
      'createdAt': FieldValue.serverTimestamp(),
    });

    final s3Ref = _firestore.collection(_collection).doc(venueId).collection('services').doc('srv_3');
    batch.set(s3Ref, {
      'title': 'Комплекс: Стрижка + Борода',
      'description': 'Полный образ: авторская стрижка и моделирование бороды с уходом.',
      'category': 'Комплексы',
      'price': 3200,
      'durationMinutes': 75,
      'bufferMinutes': 15,
      'assignedStaffIds': ['master_1'],
      'isActive': true,
      'sortOrder': 3,
      'createdAt': FieldValue.serverTimestamp(),
    });

    // 3. Yield Rules
    final y1Ref = _firestore.collection(_collection).doc(venueId).collection('yield_rules').doc('rule_offpeak');
    batch.set(y1Ref, {
      'name': 'Счастливые дневные часы (Вт-Ср)',
      'daysOfWeek': [2, 3],
      'startTime': '12:00',
      'endTime': '16:00',
      'discountType': 'percentage',
      'discountValue': 20,
      'isActive': true,
      'createdAt': FieldValue.serverTimestamp(),
    });

    final y2Ref = _firestore.collection(_collection).doc(venueId).collection('yield_rules').doc('rule_flash');
    batch.set(y2Ref, {
      'name': 'Горящий слот (в день записи)',
      'daysOfWeek': [1, 2, 3, 4, 5, 6, 7],
      'startTime': '10:00',
      'endTime': '21:00',
      'discountType': 'fixed',
      'discountValue': 500,
      'leadTimeHoursMax': 3,
      'isActive': true,
      'createdAt': FieldValue.serverTimestamp(),
    });

    // 4. AI Knowledge Profile
    final aiRef = _firestore.collection(_collection).doc(venueId).collection('ai_knowledge').doc('profile');
    batch.set(aiRef, {
      'mainServices': 'Мужские стрижки, уход за бородой, бритье опасной бритвой',
      'averageCheck': '2 500 ₽',
      'peakHours': 'Пятница и суббота с 16:00 до 21:00',
      'offPeakStrategy': 'Скидки 20% во вторник и среду днем, а также горящие скидки 500 ₽ при записи за 3 часа',
      'faq': {
        'parking': 'Бесплатная парковка перед входом со шлагбаумом (код 1234)',
        'drinks': 'Кофе, чай, вода и крафтовые напитки включены в визит',
        'payment': 'Банковские карты, СБП, наличные на ресепшене',
      },
      'cancellationPolicy': 'Отмена или перенос без штрафов за 2 часа до начала визита',
      'updatedAt': FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }

  /// Seeds fully scraped and synthesized services, staff/vehicles, yield rules, and AI digital passport.
  Future<void> seedScrapedServicesData(String venueId, ScrapedServiceData data) async {
    final batch = _firestore.batch();

    // 1. Staff / Vehicles
    for (int i = 0; i < data.staff.length; i++) {
      final s = data.staff[i];
      final staffId = s['id'] ?? 'master_${i + 1}';
      final staffRef = _firestore.collection(_collection).doc(venueId).collection('staff').doc(staffId);
      batch.set(staffRef, {
        'name': s['name'] ?? 'Экипаж #${i + 1}',
        'role': s['role'] ?? 'Специалист / Трансфер',
        'avatarUrl': s['avatarUrl'] ?? 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=250&q=80',
        'services': data.services.map((srv) => srv['id'] ?? 'srv_1').toList(),
        'rating': 5.0,
        'workingHours': {
          'monday': {'start': s['workStartTime'] ?? '06:00', 'end': s['workEndTime'] ?? '18:00'},
          'tuesday': {'start': s['workStartTime'] ?? '06:00', 'end': s['workEndTime'] ?? '18:00'},
          'wednesday': {'start': s['workStartTime'] ?? '06:00', 'end': s['workEndTime'] ?? '18:00'},
          'thursday': {'start': s['workStartTime'] ?? '06:00', 'end': s['workEndTime'] ?? '18:00'},
          'friday': {'start': s['workStartTime'] ?? '06:00', 'end': s['workEndTime'] ?? '18:00'},
          'saturday': {'start': s['workStartTime'] ?? '06:00', 'end': s['workEndTime'] ?? '18:00'},
          'sunday': {'start': s['workStartTime'] ?? '06:00', 'end': s['workEndTime'] ?? '18:00'},
        },
        'isActive': true,
        'createdAt': FieldValue.serverTimestamp(),
      });
    }

    // 2. Services
    for (int i = 0; i < data.services.length; i++) {
      final s = data.services[i];
      final srvId = s['id'] ?? 'srv_${i + 1}';
      final srvRef = _firestore.collection(_collection).doc(venueId).collection('services').doc(srvId);
      batch.set(srvRef, {
        'title': s['title'] ?? 'Услуга ${i + 1}',
        'description': s['description'] ?? '',
        'category': s['category'] ?? 'Направления',
        'price': s['price'] ?? 1000,
        'durationMinutes': s['durationMinutes'] ?? 60,
        'bufferMinutes': 10,
        'assignedStaffIds': data.staff.isNotEmpty ? [data.staff.first['id'] ?? 'master_1'] : ['master_1'],
        'isActive': true,
        'sortOrder': s['sortOrder'] ?? (i + 1),
        'createdAt': FieldValue.serverTimestamp(),
      });
    }

    // 3. Yield Rules
    for (int i = 0; i < data.yieldRules.length; i++) {
      final y = data.yieldRules[i];
      final ruleId = 'rule_${i + 1}';
      final ruleRef = _firestore.collection(_collection).doc(venueId).collection('yield_rules').doc(ruleId);
      batch.set(ruleRef, {
        'name': y['name'] ?? 'Скидка на слот',
        'daysOfWeek': y['daysOfWeek'] ?? [2, 3],
        'startTime': y['startTime'] ?? '10:00',
        'endTime': y['endTime'] ?? '18:00',
        'discountType': y['discountType'] ?? 'fixed',
        'discountValue': y['discountValue'] ?? 300,
        'isActive': true,
        'createdAt': FieldValue.serverTimestamp(),
      });
    }

    // 4. AI Knowledge Profile & Master Document
    final aiRef = _firestore.collection(_collection).doc(venueId).collection('ai_knowledge').doc('profile');
    final aiK = data.aiKnowledge;
    batch.set(aiRef, {
      'toneOfVoice': aiK['toneOfVoice'] ?? 'respectful_formal',
      'mainServices': aiK['mainServices'] ?? '',
      'parkingInstructions': aiK['parkingOrPickup'] ?? 'Инструкции при бронировании.',
      'petPolicy': aiK['rulesAndPolicies'] ?? 'Требования к документам и правила.',
      'specialInstructions': aiK['specialInstructions'] ?? 'Комфорт и сервис включены.',
      'cancellationPolicy': 'Отмена или перенос без штрафов за 12 часов до поездки.',
      'faq': aiK['faq'] ?? [],
      'updatedAt': FieldValue.serverTimestamp(),
    });

    final masterDocRef = _firestore.collection(_collection).doc(venueId).collection('ai_knowledge').doc('master_doc');
    batch.set(masterDocRef, {
      'raw_markdown': data.masterKnowledgeDoc.isNotEmpty ? data.masterKnowledgeDoc : (aiK['rulesAndPolicies'] ?? ''),
      'completion_rate': 90,
      'updatedAt': FieldValue.serverTimestamp(),
    });

    // 5. Fleet Template for BATCH_CAPACITY
    final fleetRef = _firestore.collection(_collection).doc(venueId).collection('fleetTemplates').doc('toyota_commuter_13');
    batch.set(fleetRef, {
      'name': 'VIP Минивэн Toyota Commuter (13 мест)',
      'category': 'minivan',
      'totalCapacity': 13,
      'decks': [
        {
          'id': 'main',
          'name': 'Основной салон',
          'badge': 'Кондиционер • Wi-Fi • USB',
          'priceModifier': 0,
          'layoutType': 'seat',
          'rows': 4,
          'columns': 4,
          'seats': [
            {'id': '1A', 'label': '1A', 'row': 1, 'col': 1, 'features': ['window', 'vip', 'usb']},
            {'id': '1B', 'label': '1B', 'row': 1, 'col': 3, 'features': ['window', 'vip', 'usb']},
            {'id': '2A', 'label': '2A', 'row': 2, 'col': 1, 'features': ['window', 'usb']},
            {'id': '2B', 'label': '2B', 'row': 2, 'col': 2, 'features': ['ac_shield']},
            {'id': '2C', 'label': '2C', 'row': 2, 'col': 3, 'features': ['window', 'usb']},
            {'id': '3A', 'label': '3A', 'row': 3, 'col': 1, 'features': ['window', 'usb']},
            {'id': '3B', 'label': '3B', 'row': 3, 'col': 2, 'features': ['ac_shield']},
            {'id': '3C', 'label': '3C', 'row': 3, 'col': 3, 'features': ['window', 'usb']},
            {'id': '4A', 'label': '4A', 'row': 4, 'col': 1, 'features': ['window']},
            {'id': '4B', 'label': '4B', 'row': 4, 'col': 2, 'features': []},
            {'id': '4C', 'label': '4C', 'row': 4, 'col': 3, 'features': []},
            {'id': '4D', 'label': '4D', 'row': 4, 'col': 4, 'features': ['window']},
          ]
        }
      ],
      'createdAt': FieldValue.serverTimestamp(),
    });

    // 6. Update Parent Venue Document with enriched metadata
    final venueDocRef = _firestore.collection(_collection).doc(venueId);
    final vMap = <String, dynamic>{
      'archetype': data.venue['archetype'] ?? 'batch',
      'masterKnowledgeDoc': data.masterKnowledgeDoc,
    };
    if (data.venue['rating'] != null) vMap['rating'] = data.venue['rating'];
    if (data.venue['reviewCount'] != null) vMap['reviewCount'] = data.venue['reviewCount'];
    if (data.venue['coverPhotoUrl'] != null) vMap['coverPhotoUrl'] = data.venue['coverPhotoUrl'];
    if (data.venue['websiteUrl'] != null) vMap['websiteUrl'] = data.venue['websiteUrl'];
    batch.update(venueDocRef, vMap);

    await batch.commit();
  }

  // Get Venue by Owner ID
  Future<VenueModel?> getVenueByOwnerId(String ownerId) async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('ownerId', isEqualTo: ownerId)
        .limit(1)
        .get();

    if (snapshot.docs.isNotEmpty) {
      return VenueModel.fromMap(snapshot.docs.first.id, snapshot.docs.first.data());
    }
    return null;
  }

  // Get Venue by ID
  Future<VenueModel?> getVenueById(String id) async {
    final doc = await _firestore.collection(_collection).doc(id).get();
    if (doc.exists) {
      return VenueModel.fromMap(doc.id, doc.data()!);
    }
    return null;
  }

  // Get All Venues (Super Admin)
  Stream<List<VenueModel>> getAllVenues() {
    return _firestore.collection(_collection).snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => VenueModel.fromMap(doc.id, doc.data())).toList();
    });
  }
}
