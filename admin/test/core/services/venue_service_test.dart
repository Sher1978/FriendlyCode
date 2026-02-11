import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/services/venue_service.dart';

void main() {
  group('VenuesService Database Integration Test', () {
    late FakeFirebaseFirestore fakeFirestore;
    late VenuesService venuesService;

    setUp(() {
      fakeFirestore = FakeFirebaseFirestore();
      venuesService = VenuesService(firestore: fakeFirestore);
    });

    test('Should create a new venue and verify it in the database', () async {
      // 1. Prepare test data
      final testVenue = VenueModel(
        id: '', // Empty ID means new venue
        ownerId: 'test_owner_123',
        ownerEmail: 'test@example.com',
        name: 'Test Coffee Shop',
        address: '123 Test St, Dubai',
        category: 'Cafe',
        description: 'A cozy place for testing',
      );

      // 2. Perform the save operation
      await venuesService.saveVenue(testVenue);

      // 3. Verify it exists in Firestore
      final snapshot = await fakeFirestore.collection('venues').get();
      expect(snapshot.docs.length, 1);
      
      final savedData = snapshot.docs.first.data();
      expect(savedData['name'], 'Test Coffee Shop');
      expect(savedData['ownerId'], 'test_owner_123');
      expect(savedData['address'], '123 Test St, Dubai');
      expect(savedData['category'], 'Cafe');
    });

    test('Should retrieve a venue by Owner ID', () async {
      // 1. Seed data
      await fakeFirestore.collection('venues').add({
        'ownerId': 'owner_456',
        'name': 'Seeded Venue',
        'address': 'Seeded Address',
        'category': 'General',
        'isActive': true,
      });

      // 2. Retrieve via service
      final venue = await venuesService.getVenueByOwnerId('owner_456');

      // 3. Verify
      expect(venue, isNotNull);
      expect(venue!.name, 'Seeded Venue');
      expect(venue.ownerId, 'owner_456');
    });
    
    test('Should handle non-existent venue retrieval', () async {
      final venue = await venuesService.getVenueByOwnerId('non_existent');
      expect(venue, isNull);
    });
  });
}
