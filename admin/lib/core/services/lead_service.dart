import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/models/lead_model.dart';

class LeadsService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _collection = 'leads';

  // Create a new lead (Public from Landing)
  Future<void> submitLead(LeadModel lead) async {
    await _firestore.collection(_collection).add(lead.toMap());
  }

  // Get all leads (Super Admin)
  Stream<List<LeadModel>> getAllLeads() {
    return _firestore
        .collection(_collection)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) => LeadModel.fromMap(doc.id, doc.data())).toList();
    });
  }
}
