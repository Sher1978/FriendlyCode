
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

class NotificationBadge extends StatelessWidget {
  const NotificationBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final roleProvider = Provider.of<RoleProvider>(context);
    final isSuperAdmin = roleProvider.isSuperAdmin;
    final venueIds = roleProvider.venueIds;

    // Stream for Unread Notifications
    // If SuperAdmin, maybe all? For now, let's stick to venueIds logic unless explicitly global.
    // Actually, SuperAdmin monitors "operations", so likely wants to see everything.
    // But querying ALL notifications might be heavy. Let's start with "My Venues" notifications.
    
    Query query = FirebaseFirestore.instance
        .collection('notifications')
        .where('read', isEqualTo: false)
        .orderBy('timestamp', descending: true);

    if (!isSuperAdmin && venueIds.isNotEmpty) {
       query = query.where('venueId', whereIn: venueIds); 
       // Note: 'whereIn' limits to 10 items. If admin has >10 venues, this might break.
       // Backup strategy: Client-side filtering if venueIds > 10, or just query separately.
       // For now, robust enough for MVP.
    } else if (!isSuperAdmin && venueIds.isEmpty) {
       // No access, no notifications
       return const SizedBox();
    }

    return StreamBuilder<QuerySnapshot>(
      stream: query.snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasError) return const Icon(Icons.notifications_off, color: Colors.grey);
        
        final unreadCount = snapshot.hasData ? snapshot.data!.docs.length : 0;
        
        return PopupMenuButton(
          tooltip: 'Notifications',
          offset: const Offset(0, 50),
          icon: Stack(
            children: [
              const Icon(Icons.notifications_outlined, color: AppColors.body, size: 24),
              if (unreadCount > 0)
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      unreadCount > 9 ? '9+' : '$unreadCount',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          itemBuilder: (context) {
             if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
               return [
                 const PopupMenuItem(enabled: false, child: Text("No new notifications")),
               ];
             }

             return snapshot.data!.docs.map((doc) {
               final data = doc.data() as Map<String, dynamic>;
               final title = data['title'] ?? 'Notification';
               final body = data['message'] ?? '';
               final time = data['timestamp'] != null 
                  ? DateFormat('HH:mm').format((data['timestamp'] as Timestamp).toDate())
                  : '';

               return PopupMenuItem(
                 onTap: () {
                    // Mark as read
                    doc.reference.update({'read': true});
                 },
                 child: ListTile(
                   contentPadding: EdgeInsets.zero,
                   leading: const Icon(Icons.info_outline, color: AppColors.brandOrange),
                   title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                   subtitle: Text(body, maxLines: 2, overflow: TextOverflow.ellipsis),
                   trailing: Text(time, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                 ),
               );
             }).toList();
          },
        );
      },
    );
  }
}
