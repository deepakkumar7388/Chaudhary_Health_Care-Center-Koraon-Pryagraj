import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'user_management_screen.dart';
import 'edit_profile_screen.dart';
import 'reports_screen.dart';
import 'patient_record_screen.dart';
import 'settings_screen.dart';
import '../services/role_access.dart';

enum UserRole { admin, doctor, receptionist }

class UserProfileScreen extends StatefulWidget {
  final UserRole role;
  final String name;
  final String email;
  final VoidCallback onLogout;
  final VoidCallback? onNavigateToPatients;

  const UserProfileScreen({
    super.key,
    this.role = UserRole.admin,
    this.name = 'Dr. Sarah Jenkins',
    this.email = 'sarah.j@chaudhary.com',
    required this.onLogout,
    this.onNavigateToPatients,
  });

  @override
  State<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends State<UserProfileScreen> {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8F9FA);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: bgColor,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            physics: const BouncingScrollPhysics(),
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildProfileHeader(isDark),
              const SizedBox(height: 32),
              Text(
                'Settings & Actions',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : const Color(0xFF1E293B),
                ),
              ),
            const SizedBox(height: 16),
            _buildDynamicActionList(isDark, context),
            const SizedBox(height: 30),
            _buildLogoutButton(),
            const SizedBox(height: 40),
            ],
          ),
        ),
      ),
      ),
    );
  }

  // 1. Modern Header Component
  Widget _buildProfileHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: const Color(0xFF4F46E5).withValues(alpha: 0.1),
                child: Text(
                  widget.name.isNotEmpty ? widget.name[0].toUpperCase() : 'U',
                  style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: const Color(0xFF4F46E5)),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.name,
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF1E293B),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.email,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: isDark ? Colors.white60 : const Color(0xFF64748B),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    _buildRoleBadge(widget.role, isDark),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: Colors.black12),
          const SizedBox(height: 12),
          InkWell(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const EditProfileScreen()),
              );
            },
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.edit_outlined, size: 16, color: Color(0xFF4F46E5)),
                  const SizedBox(width: 6),
                  Text(
                    'Edit Profile Information',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF4F46E5),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 2. Role Badge Tag
  Widget _buildRoleBadge(UserRole role, bool isDark) {
    Color bg;
    Color fg;
    String label;
    IconData icon;

    switch (role) {
      case UserRole.admin:
        bg = const Color(0xFFEF4444).withValues(alpha: 0.1);
        fg = const Color(0xFFEF4444);
        label = 'ADMINISTRATOR';
        icon = Icons.admin_panel_settings_rounded;
        break;
      case UserRole.doctor:
        bg = const Color(0xFF3B82F6).withValues(alpha: 0.1);
        fg = const Color(0xFF3B82F6);
        label = 'DOCTOR / PHYSICIAN';
        icon = Icons.medical_services_rounded;
        break;
      case UserRole.receptionist:
        bg = const Color(0xFF10B981).withValues(alpha: 0.1);
        fg = const Color(0xFF10B981);
        label = 'RECEPTION & STAFF';
        icon = Icons.badge_rounded;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 4),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: fg,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  // 3. Dynamic Settings/Action List (Mirroring Web Profile Hub)
  Widget _buildDynamicActionList(bool isDark, BuildContext context) {
    List<Widget> actions = [];

    // 1. Manage Users (Admin/Developer only)
    if (RoleAccess.canManageUsers || widget.role == UserRole.admin) {
      actions.add(_buildActionTile(
        icon: Icons.person_add_alt_1_rounded,
        title: 'Manage Users',
        isDark: isDark,
        iconColor: const Color(0xFF0EA5E9), // Info Blue
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const UserManagementScreen()),
          );
        },
      ));
      
      // 2. Reports (Admin/Developer only)
      actions.add(_buildActionTile(
        icon: Icons.bar_chart_rounded,
        title: 'Reports & Analytics',
        isDark: isDark,
        iconColor: const Color(0xFFEC4899), // Pink
        onTap: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportsScreen()));
        },
      ));
    }

    // 3. Patient Record (Available to all authorized roles)
    if (RoleAccess.canViewPatientRecord) {
      actions.add(_buildActionTile(
        icon: Icons.folder_shared_rounded,
        title: 'Patient Records',
        isDark: isDark,
        iconColor: const Color(0xFF14B8A6), // Teal
        onTap: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const PatientRecordScreen()));
        },
      ));
    }

    // 4. System Settings (Role-based: Admin/Developer edit, other roles view)
    actions.add(_buildActionTile(
      icon: Icons.settings_rounded,
      title: 'System Settings',
      isDark: isDark,
      iconColor: const Color(0xFF6366F1), // Indigo
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const SettingsScreen()),
        );
      },
    ));

    return Column(children: actions);
  }

  Widget _buildActionTile({
    required IconData icon,
    required String title,
    required bool isDark,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : const Color(0xFF1E293B),
          ),
        ),
        trailing: Icon(
          Icons.arrow_forward_ios_rounded,
          size: 14,
          color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        onTap: onTap,
      ),
    );
  }


  // Logout Button
  Widget _buildLogoutButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: widget.onLogout,
        icon: const Icon(Icons.logout_rounded, size: 20),
        label: Text(
          'Log Out',
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFFEF2F2), // Soft red background
          foregroundColor: const Color(0xFFDC2626), // Strong red text
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFFCA5A5), width: 1), // Subtle red border
          ),
        ),
      ),
    );
  }
}
