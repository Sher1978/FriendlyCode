import 'package:cloud_firestore/cloud_firestore.dart';

class AiKnowledgeProfile {
  final String venueId;
  final String toneOfVoice; // 'friendly_informal' or 'respectful_formal'
  final String parkingInstructions;
  final String petPolicy;
  final String cancellationPolicy;
  final String specialInstructions;
  final List<Map<String, String>> frequentlyAskedQuestions;
  final String lastUpdatedBy;
  final DateTime updatedAt;

  const AiKnowledgeProfile({
    required this.venueId,
    this.toneOfVoice = 'respectful_formal',
    this.parkingInstructions = '',
    this.petPolicy = '',
    this.cancellationPolicy = '',
    this.specialInstructions = '',
    this.frequentlyAskedQuestions = const [],
    this.lastUpdatedBy = '',
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() => {
    'venueId': venueId,
    'toneOfVoice': toneOfVoice,
    'parkingInstructions': parkingInstructions,
    'petPolicy': petPolicy,
    'cancellationPolicy': cancellationPolicy,
    'specialInstructions': specialInstructions,
    'frequentlyAskedQuestions': frequentlyAskedQuestions,
    'lastUpdatedBy': lastUpdatedBy,
    'updatedAt': Timestamp.fromDate(updatedAt),
  };

  factory AiKnowledgeProfile.fromMap(Map<String, dynamic> map, [String? docId]) => AiKnowledgeProfile(
    venueId: docId ?? map['venueId'] ?? '',
    toneOfVoice: map['toneOfVoice'] ?? 'respectful_formal',
    parkingInstructions: map['parkingInstructions'] ?? '',
    petPolicy: map['petPolicy'] ?? '',
    cancellationPolicy: map['cancellationPolicy'] ?? '',
    specialInstructions: map['specialInstructions'] ?? '',
    frequentlyAskedQuestions: (map['frequentlyAskedQuestions'] as List<dynamic>?)
        ?.map((item) => Map<String, String>.from(item as Map))
        .toList() ?? const [],
    lastUpdatedBy: map['lastUpdatedBy'] ?? '',
    updatedAt: map['updatedAt'] != null ? (map['updatedAt'] as Timestamp).toDate() : DateTime.now(),
  );

  AiKnowledgeProfile copyWith({
    String? venueId,
    String? toneOfVoice,
    String? parkingInstructions,
    String? petPolicy,
    String? cancellationPolicy,
    String? specialInstructions,
    List<Map<String, String>>? frequentlyAskedQuestions,
    String? lastUpdatedBy,
    DateTime? updatedAt,
  }) => AiKnowledgeProfile(
    venueId: venueId ?? this.venueId,
    toneOfVoice: toneOfVoice ?? this.toneOfVoice,
    parkingInstructions: parkingInstructions ?? this.parkingInstructions,
    petPolicy: petPolicy ?? this.petPolicy,
    cancellationPolicy: cancellationPolicy ?? this.cancellationPolicy,
    specialInstructions: specialInstructions ?? this.specialInstructions,
    frequentlyAskedQuestions: frequentlyAskedQuestions ?? this.frequentlyAskedQuestions,
    lastUpdatedBy: lastUpdatedBy ?? this.lastUpdatedBy,
    updatedAt: updatedAt ?? this.updatedAt,
  );
}
