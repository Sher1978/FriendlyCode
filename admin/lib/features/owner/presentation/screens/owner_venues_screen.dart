import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/data/venue_repository.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:provider/provider.dart';
import 'package:friendly_code/features/admin/presentation/screens/venue_editor_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/venue_search_screen.dart';
import 'package:friendly_code/features/owner/presentation/screens/owner_dashboard_screen.dart';
import 'package:friendly_code/l10n/app_localizations.dart';

class OwnerVenuesScreen extends StatefulWidget {
  const OwnerVenuesScreen({super.key});

  @override
  State<OwnerVenuesScreen> createState() => _OwnerVenuesScreenState();
}

class _OwnerVenuesScreenState extends State<OwnerVenuesScreen> {
  final VenueRepository _venueRepo = VenueRepository();

  @override
  Widget build(BuildContext context) {
    final roleProvider = Provider.of<RoleProvider>(context);
    final userVenueIds = roleProvider.venueIds;
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 48),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.myVenues,
                      style: const TextStyle(
                        color: AppColors.macosTextPrimary,
                        fontSize: 34,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -1.0,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.selectVenueToManage,
                      style: const TextStyle(color: AppColors.macosTextSecondary, fontSize: 16),
                    ),
                  ],
                ),
                Row(
                  children: [
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      color: CupertinoColors.activeBlue,
                      borderRadius: BorderRadius.circular(10),
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueEditorScreen())),
                      child: Row(
                        children: [
                          const Icon(CupertinoIcons.add, size: 18),
                          const SizedBox(width: 8),
                          Text(l10n.registerNewVenue, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VenueSearchScreen())),
                      child: Row(
                        children: [
                          const Icon(CupertinoIcons.search, size: 18, color: Colors.white),
                          const SizedBox(width: 8),
                          Text(l10n.joinExistingVenue, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 48),
            
            Expanded(
              child: StreamBuilder<List<VenueModel>>(
                stream: _venueRepo.getVenuesStream(includeInactive: true),
                builder: (context, snapshot) {
                  if (snapshot.hasError) return Center(child: Text("Error: ${snapshot.error}", style: const TextStyle(color: Colors.white)));
                  if (!snapshot.hasData) return const Center(child: CupertinoActivityIndicator(radius: 12));
                  
                  final venues = snapshot.data!.where((v) => userVenueIds.contains(v.id)).toList();
                  
                  if (venues.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(CupertinoIcons.building_2_fill, size: 64, color: Colors.white.withOpacity(0.2)),
                          const SizedBox(height: 16),
                          Text(l10n.noVenuesFound, style: TextStyle(color: Colors.white.withOpacity(0.5))),
                        ],
                      ),
                    );
                  }

                  return ListView.builder(
                    itemCount: venues.length,
                    itemBuilder: (context, index) {
                      final venue = venues[index];
                      return _buildVenueCard(venue);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVenueCard(VenueModel venue) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
          child: GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => OwnerDashboardScreen(venue: venue))),
            child: MouseRegion(
              cursor: SystemMouseCursors.click,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.macosSurfaceBg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.macosDivider),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        image: DecorationImage(
                          image: (venue.photoUrl != null && venue.photoUrl!.isNotEmpty) 
                              ? NetworkImage(venue.photoUrl!) 
                              : const AssetImage('assets/images/venue_placeholder.png') as ImageProvider,
                          fit: BoxFit.cover,
                        ),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 24),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(venue.name, 
                                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                              const SizedBox(width: 8),
                              if (venue.isActive)
                                _buildStatusBadge("Active", CupertinoColors.activeGreen)
                              else
                                _buildStatusBadge("Pending", AppColors.accentOrange),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(venue.address, 
                            style: TextStyle(color: AppColors.macosTextSecondary.withOpacity(0.7), fontSize: 14)),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              _buildStatIcon(CupertinoIcons.person_3_fill, "${venue.totalUsers ?? 0}"),
                              const SizedBox(width: 16),
                              _buildStatIcon(CupertinoIcons.ticket_fill, "${venue.totalRedemptions ?? 0}"),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const Icon(CupertinoIcons.chevron_right, color: AppColors.macosTextSecondary, size: 20),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildStatIcon(IconData icon, String value) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.macosTextSecondary.withOpacity(0.5)),
        const SizedBox(width: 6),
        Text(value, style: TextStyle(color: AppColors.macosTextSecondary.withOpacity(0.8), fontSize: 13, fontWeight: FontWeight.w600)),
      ],
    );
  }
}
