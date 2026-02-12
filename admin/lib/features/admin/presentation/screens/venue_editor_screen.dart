import 'package:flutter/material.dart';
import 'package:friendly_code/core/models/venue_model.dart';
import 'package:friendly_code/core/services/venue_service.dart';
import 'package:friendly_code/core/services/user_service.dart';
import 'package:friendly_code/core/theme/colors.dart';
import 'package:friendly_code/core/auth/auth_service.dart';
import 'package:friendly_code/core/auth/role_provider.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart' as url_launcher;
import 'package:provider/provider.dart';
import 'package:friendly_code/core/widgets/image_upload_widget.dart';

class VenueEditorScreen extends StatefulWidget {
  final VenueModel? venue;

  const VenueEditorScreen({super.key, this.venue});

  @override
  State<VenueEditorScreen> createState() => _VenueEditorScreenState();
}

class _VenueEditorScreenState extends State<VenueEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  final VenuesService _venuesService = VenuesService();

  late TextEditingController _nameCtrl;
  late TextEditingController _ownerEmailCtrl;
  late TextEditingController _ownerIdCtrl;
  late TextEditingController _categoryCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _descCtrl;
  late TextEditingController _logoUrlCtrl;
  late TextEditingController _linkUrlCtrl;

  List<VenueTier> _tiers = [];
  late VenueSubscription _subscription;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final roleProvider = Provider.of<RoleProvider>(context, listen: false);
    final isSuperAdmin = roleProvider.currentRole == UserRole.superAdmin;
    final currentUser = AuthService().currentUser;

    _nameCtrl = TextEditingController(text: widget.venue?.name ?? '');
    
    // Auto-fill owner info if NOT super admin or if editing existing
    String ownerEmail = widget.venue?.ownerEmail ?? '';
    String ownerId = widget.venue?.ownerId ?? '';

    if (widget.venue == null && !isSuperAdmin && currentUser != null) {
      ownerEmail = currentUser.email ?? '';
      ownerId = currentUser.uid;
    }

    _ownerEmailCtrl = TextEditingController(text: ownerEmail);
    _ownerIdCtrl = TextEditingController(text: ownerId);
    
    _categoryCtrl = TextEditingController(text: widget.venue?.category ?? 'General');
    _addressCtrl = TextEditingController(text: widget.venue?.address ?? '');
    _descCtrl = TextEditingController(text: widget.venue?.description ?? '');
    _logoUrlCtrl = TextEditingController(text: widget.venue?.logoUrl ?? '');
    _linkUrlCtrl = TextEditingController(text: widget.venue?.linkUrl ?? '');
    _tiers = widget.venue?.tiers != null ? List.from(widget.venue!.tiers) : [
      VenueTier(maxHours: 24, percentage: 20),
      VenueTier(maxHours: 72, percentage: 10),
      VenueTier(maxHours: 168, percentage: 5),
    ];

    _subscription = widget.venue?.subscription ?? VenueSubscription(
      plan: 'pro', 
      isPaid: true, 
      expiryDate: DateTime.now().add(const Duration(days: 365))
    );
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _ownerEmailCtrl.dispose();
    _ownerIdCtrl.dispose();
    _categoryCtrl.dispose();
    _addressCtrl.dispose();
    _descCtrl.dispose();
    _logoUrlCtrl.dispose();
    _linkUrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final roleProvider = Provider.of<RoleProvider>(context, listen: false);
      final isSuperAdmin = roleProvider.currentRole == UserRole.superAdmin;
      final userService = UserService();
      
      final ownerEmail = _ownerEmailCtrl.text.trim();
      String? ownerId = _ownerIdCtrl.text.trim();

      // If owner email is provided, try to resolve UID
      if (ownerEmail.isNotEmpty && (ownerId.isEmpty || (widget.venue != null && widget.venue!.ownerEmail != ownerEmail))) {
        final userDoc = await userService.getUserByEmail(ownerEmail);
        if (userDoc != null) {
          ownerId = userDoc['uid'];
        } else if (!isSuperAdmin) {
          throw "User with email $ownerEmail not found. They must sign in once first.";
        }
      }

      final updatedVenue = VenueModel(
        id: widget.venue?.id ?? '',
        ownerEmail: ownerEmail.isNotEmpty ? ownerEmail : null,
        ownerId: ownerId != null && ownerId.isNotEmpty ? ownerId : null,
        name: _nameCtrl.text.trim(),
        address: _addressCtrl.text.trim(),
        category: _categoryCtrl.text.trim(),
        description: _descCtrl.text.trim(),
        logoUrl: _logoUrlCtrl.text.trim().isNotEmpty ? _logoUrlCtrl.text.trim() : null,
        linkUrl: _linkUrlCtrl.text.trim().isNotEmpty ? _linkUrlCtrl.text.trim() : null,
        isActive: widget.venue?.isActive ?? true,
        tiers: _tiers,
        subscription: _subscription, // Use local state
        isManuallyBlocked: widget.venue?.isManuallyBlocked ?? false,
        lastBlastDate: widget.venue?.lastBlastDate,
        latitude: widget.venue?.latitude,
        longitude: widget.venue?.longitude,
        stats: widget.venue?.stats,
      );

      await _venuesService.saveVenue(updatedVenue);

      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Success! Venue profile updated.")),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Error: $e"), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final roleProvider = Provider.of<RoleProvider>(context);
    final isSuperAdmin = roleProvider.currentRole == UserRole.superAdmin;
    final isEditing = widget.venue != null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(isEditing ? "VENUE PROFILE" : "NEW VENUE"),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.brandBrown,
        elevation: 0,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(40),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Left Side: Main Info
                  Expanded(
                    flex: 2,
                    child: Column(
                      children: [
                        _buildSectionCard(
                          title: "BASIC INFORMATION",
                          children: [
                            _buildTextField(
                              controller: _nameCtrl,
                              label: "Venue Name",
                              icon: Icons.store,
                              validatorFunc: (val) => val == null || val.isEmpty ? "Name is required" : null,
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(child: _buildTextField(controller: _categoryCtrl, label: "Category", icon: Icons.category)),
                                const SizedBox(width: 16),
                                Expanded(child: _buildTextField(controller: _addressCtrl, label: "Address", icon: Icons.location_on)),
                              ],
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              controller: _ownerEmailCtrl,
                              label: "Owner Email",
                              icon: Icons.email,
                              hintText: isSuperAdmin ? "Optional for now" : "Required",
                              validatorFunc: (val) {
                                if (!isSuperAdmin && (val == null || val.isEmpty)) {
                                  return "Required for non-admins";
                                }
                                return null;
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        _buildSectionCard(
                          title: "LOYALTY TIERS (DISCOUNT POLICY)",
                          children: [
                            const Text("Define how many hours a guest has to return to get a discount.", style: TextStyle(fontSize: 12, color: AppColors.body)),
                            const SizedBox(height: 16),
                            ..._buildTierList(),
                            if (_tiers.length < 5)
                              Padding(
                                padding: const EdgeInsets.only(top: 8.0),
                                child: TextButton.icon(
                                  onPressed: () => setState(() => _tiers.add(VenueTier(maxHours: 0, percentage: 0))),
                                  icon: const Icon(Icons.add, color: AppColors.accentOrange),
                                  label: const Text("ADD NEW TIER", style: TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.bold)),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 24),
                  // Right Side: Media & Settings
                  Expanded(
                    child: Column(
                      children: [
                        _buildSectionCard(
                          title: "BRANDING",
                          children: [
                            ImageUploadWidget(
                              label: "VENUE LOGO", 
                              initialUrl: _logoUrlCtrl.text.isNotEmpty ? _logoUrlCtrl.text : null,
                              onUploadComplete: (url) => setState(() => _logoUrlCtrl.text = url),
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(controller: _descCtrl, label: "Description", icon: Icons.description, maxLines: 4),
                          ],
                        ),
                        const SizedBox(height: 24),
                        if (isSuperAdmin) ...[
                          _buildSectionCard(
                            title: "SUBSCRIPTION CONTROL",
                            children: [
                              DropdownButtonFormField<String>(
                                value: _subscription.plan,
                                decoration: const InputDecoration(labelText: "Plan", prefixIcon: Icon(Icons.stars)),
                                items: ['free', 'pro', 'enterprise'].map((p) => DropdownMenuItem(value: p, child: Text(p.toUpperCase()))).toList(),
                                onChanged: (val) => setState(() => _subscription = VenueSubscription(plan: val!, isPaid: _subscription.isPaid, expiryDate: _subscription.expiryDate)),
                              ),
                              const SizedBox(height: 16),
                              ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: const Icon(Icons.calendar_today, color: AppColors.accentOrange),
                                title: const Text("Expiry Date", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                subtitle: Text(
                                  _subscription.expiryDate != null 
                                    ? "${_subscription.expiryDate!.day}/${_subscription.expiryDate!.month}/${_subscription.expiryDate!.year}"
                                    : "NEVER",
                                ),
                                trailing: TextButton(
                                  onPressed: () async {
                                    final date = await showDatePicker(
                                      context: context,
                                      initialDate: _subscription.expiryDate ?? DateTime.now(),
                                      firstDate: DateTime.now().subtract(const Duration(days: 365)),
                                      lastDate: DateTime.now().add(const Duration(days: 3650)),
                                    );
                                    if (date != null) {
                                      setState(() => _subscription = VenueSubscription(plan: _subscription.plan, isPaid: _subscription.isPaid, expiryDate: date));
                                    }
                                  },
                                  child: const Text("CHANGE"),
                                ),
                              ),
                              SwitchListTile(
                                contentPadding: EdgeInsets.zero,
                                title: const Text("Is Paid", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                value: _subscription.isPaid,
                                activeColor: AppColors.accentOrange,
                                onChanged: (val) => setState(() => _subscription = VenueSubscription(plan: _subscription.plan, isPaid: val, expiryDate: _subscription.expiryDate)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),
                        ],
                          _buildSectionCard(
                            title: "SYSTEM ACCESS",
                            children: [
                              const Text("GUEST QR CODE", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.body, letterSpacing: 1.2)),
                              const SizedBox(height: 16),
                              Center(
                                child: Builder(
                                  builder: (context) {
                                    final idToUse = isEditing ? widget.venue!.id : 'NEW_VENUE_ID';
                                    final qrUrl = "https://quickchart.io/qr?text=${Uri.encodeComponent('https://www.friendlycode.fun/qr?id=$idToUse')}&size=300&ecLevel=H";
                                    return Image.network(
                                      qrUrl,
                                      width: 180,
                                      height: 180,
                                      loadingBuilder: (context, child, loadingProgress) {
                                        if (loadingProgress == null) return child;
                                        return const SizedBox(width: 180, height: 180, child: Center(child: CircularProgressIndicator(strokeWidth: 2)));
                                      },
                                    );
                                  }
                                ),
                              ),
                              const SizedBox(height: 16),
                              const Text("This QR code leads to your guest portal. Print it and place it on tables.", textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppColors.body)),
                              const SizedBox(height: 24),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () {
                                        final url = "https://quickchart.io/qr?text=${Uri.encodeComponent('https://www.friendlycode.fun/qr?id=${widget.venue?.id ?? ''}')}&size=1000&format=png&ecLevel=H";
                                        url_launcher.launchUrl(Uri.parse(url));
                                      },
                                      icon: const Icon(Icons.image_outlined, size: 18),
                                      label: const Text("PNG (1000px)", style: TextStyle(fontSize: 11)),
                                      style: OutlinedButton.styleFrom(
                                        side: const BorderSide(color: AppColors.accentOrange),
                                        foregroundColor: AppColors.accentOrange,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () {
                                        final url = "https://quickchart.io/qr?text=${Uri.encodeComponent('https://www.friendlycode.fun/qr?id=${widget.venue?.id ?? ''}')}&format=svg&ecLevel=H";
                                        url_launcher.launchUrl(Uri.parse(url));
                                      },
                                      icon: const Icon(Icons.crop_free_outlined, size: 18),
                                      label: const Text("SVG (Vector)", style: TextStyle(fontSize: 11)),
                                      style: OutlinedButton.styleFrom(
                                        side: const BorderSide(color: AppColors.accentOrange),
                                        foregroundColor: AppColors.accentOrange,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            const SizedBox(height: 24),
                            const Divider(),
                            const SizedBox(height: 16),
                            const Text("DEEP LINK", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.body, letterSpacing: 1.2)),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.background,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      "https://www.friendlycode.fun/qr?id=${widget.venue?.id ?? '...'}",
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, overflow: TextOverflow.ellipsis),
                                    ),
                                  ),
                                  IconButton(
                                    onPressed: () {
                                      final link = "https://www.friendlycode.fun/qr?id=${widget.venue?.id ?? ''}";
                                      Clipboard.setData(ClipboardData(text: link));
                                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Link copied to clipboard")));
                                    },
                                    icon: const Icon(Icons.copy_all, size: 20, color: AppColors.accentOrange),
                                    tooltip: "Copy to Clipboard",
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 48),
              Center(
                child: SizedBox(
                  width: 300,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentOrange,
                      foregroundColor: AppColors.deepSeaBlueDark,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
                    ),
                    child: _isSaving 
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(isEditing ? "SAVE CHANGES" : "CREATE VENUE", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildTierList() {
    return _tiers.asMap().entries.map((entry) {
      int idx = entry.key;
      VenueTier tier = entry.value;
      
      // Use unique keys for internal state management if needed, 
      // but here we rely on the list index.
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          children: [
            Expanded(
              child: TextFormField(
                initialValue: tier.maxHours.toString(),
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: "Max Hours", prefixIcon: Icon(Icons.timer)),
                onChanged: (val) {
                  _tiers[idx] = VenueTier(maxHours: int.tryParse(val) ?? 0, percentage: tier.percentage);
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextFormField(
                initialValue: tier.percentage.toString(),
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: "Discount %", prefixIcon: Icon(Icons.percent)),
                onChanged: (val) {
                  _tiers[idx] = VenueTier(maxHours: tier.maxHours, percentage: int.tryParse(val) ?? 0);
                },
              ),
            ),
            IconButton(
              onPressed: () => setState(() => _tiers.removeAt(idx)),
              icon: const Icon(Icons.remove_circle_outline, color: Colors.redAccent),
            ),
          ],
        ),
      );
    }).toList();
  }

  Widget _buildSectionCard({required String title, required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: AppColors.softShadow,
        border: Border.all(color: AppColors.title.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: AppColors.accentOrange, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.5)),
          const SizedBox(height: 24),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    int maxLines = 1,
    String? hintText,
    String? validator,
    String? Function(String?)? validatorFunc,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      validator: validatorFunc,
      decoration: InputDecoration(
        labelText: label,
        hintText: hintText,
        prefixIcon: Icon(icon),
      ),
    );
  }
}
