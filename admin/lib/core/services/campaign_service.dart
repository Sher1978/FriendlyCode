import 'package:cloud_functions/cloud_functions.dart';

class CampaignService {
  final FirebaseFunctions _functions = FirebaseFunctions.instanceFor(region: 'asia-south1');

  Future<void> sendBulkCampaign({
    required String title,
    required String text,
    String? imageUrl,
    required String actionLink,
  }) async {
    try {
      final HttpsCallable callable = _functions.httpsCallable('sendBulkCampaign');
      await callable.call({
        'title': title,
        'text': text,
        'imageUrl': imageUrl,
        'actionLink': actionLink,
      });
    } catch (e) {
      throw Exception('Failed to send campaign: $e');
    }
  }
}
