import 'package:cloud_firestore/cloud_firestore.dart';

class AiKnowledgeProfile {
  final String venueId;
  final String conciergeName;
  final String conciergeAvatarUrl;
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
    this.conciergeName = 'AI-Консьерж',
    this.conciergeAvatarUrl = '',
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
    'conciergeName': conciergeName,
    'conciergeAvatarUrl': conciergeAvatarUrl,
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
    conciergeName: map['conciergeName'] ?? 'AI-Консьерж',
    conciergeAvatarUrl: map['conciergeAvatarUrl'] ?? '',
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
    String? conciergeName,
    String? conciergeAvatarUrl,
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
    conciergeName: conciergeName ?? this.conciergeName,
    conciergeAvatarUrl: conciergeAvatarUrl ?? this.conciergeAvatarUrl,
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

class ConciergeAvatarPreset {
  final String name;
  final String label;
  final String avatarUrl;

  const ConciergeAvatarPreset({
    required this.name,
    required this.label,
    required this.avatarUrl,
  });
}

const List<ConciergeAvatarPreset> kConciergeAvatarPresets = [
  ConciergeAvatarPreset(
    name: "Алиса",
    label: "Деловой (жен)",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
  ),
  ConciergeAvatarPreset(
    name: "Алексей",
    label: "Деловой (муж)",
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80",
  ),
  ConciergeAvatarPreset(
    name: "Елена",
    label: "Премиум сервис",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80",
  ),
  ConciergeAvatarPreset(
    name: "Марк",
    label: "Диспетчер",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
  ),
  ConciergeAvatarPreset(
    name: "Revoo Bot",
    label: "3D Cyber Bot",
    avatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=256&q=80",
  ),
];
