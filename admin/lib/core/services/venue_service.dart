import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/venue_model.dart';

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
