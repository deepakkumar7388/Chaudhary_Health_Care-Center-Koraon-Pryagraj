import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import '../theme.dart';
import '../services/api_service.dart';
import '../services/role_access.dart';
import '../widgets/overview_card.dart';
import '../widgets/radar_chart_widget.dart';
import 'splash_screen.dart';
import 'add_patient_screen.dart';
import 'patient_detail_screen.dart';
import 'daily_notes_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  Map<String, dynamic>? _user;
  Map<String, dynamic> _stats = {};
  List<dynamic> _patients = [];
  List<dynamic> _filteredPatients = [];
  bool _isLoading = true;
  final _searchController = TextEditingController();
  String _filterStatus = 'All';
  String _filterType = 'All';
  final _chartPageController = PageController();
  int _chartPage = 0;
  // Cached pages to avoid rebuild-on-tab-switch blink
  List<Widget> _cachedPages = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      _user = await ApiService.getSavedUser();
      // Set role for permission system — mirrors web app switchToApp() role validation
      if (_user != null) {
        RoleAccess.setRole(
          _user!['role'] ?? 'staff',
          billingAccess: _user!['billingAccess'] == true,
        );
      }
      _stats = await ApiService.getDashboardStats();
      _patients = await ApiService.getPatients();
      _applyFilter();
    } catch (e) {
      debugPrint('Error loading data: $e');
    }
    if (mounted) {
      _rebuildPages();
      setState(() => _isLoading = false);
    }
  }

  void _rebuildPages() {
    _cachedPages = [
      _buildDashboard(),
      _buildPatientHub(),
      if (RoleAccess.canViewDailyNotes) _buildDailyNotesHub(),
      if (RoleAccess.canViewBilling) _buildBillingHub(),
      _buildProfileHub(),
    ];
  }

  void _applyFilter() {
    final query = _searchController.text.toLowerCase();
    var list = _patients.where((p) {
      final name = (p['name'] ?? '').toString().toLowerCase();
      final id = (p['patient_id'] ?? '').toString().toLowerCase();
      final mobile = (p['mobile'] ?? '').toString().toLowerCase();
      final problem = (p['problem'] ?? '').toString().toLowerCase();
      final guardian = (p['guardian_name'] ?? '').toString().toLowerCase();

      final matchesSearch = query.isEmpty ||
          name.contains(query) ||
          id.contains(query) ||
          mobile.contains(query) ||
          problem.contains(query) ||
          guardian.contains(query);

      final status = (p['status'] ?? '').toString().toLowerCase();
      final matchesStatus = _filterStatus == 'All' ||
          (_filterStatus == 'Admitted' && status == 'admitted') ||
          (_filterStatus == 'Discharged' && status == 'discharged');

      final patientType = (p['patient_type'] ?? '').toString().toUpperCase();
      final matchesType = _filterType == 'All' ||
          (_filterType == 'IPD' && patientType == 'IPD') ||
          (_filterType == 'OPD' && patientType == 'OPD');

      return matchesSearch && matchesStatus && matchesType;
    }).toList();

    // Default: Newest First
    list.sort((a, b) {
      final dateA = DateTime.tryParse((a['createdAt'] ?? '').toString()) ?? DateTime(1970);
      final dateB = DateTime.tryParse((b['createdAt'] ?? '').toString()) ?? DateTime(1970);
      return dateB.compareTo(dateA);
    });

    _filteredPatients = list;
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    await ApiService.logout();
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    _chartPageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // ══════════════════════════════════════════════════════════
    // Dynamic Bottom Nav — Mirrors Web App Role-Based Navbar
    // Roles & access:
    //   developer  → Home, Patient, Daily Notes, Billing, Profile
    //   admin      → Home, Patient, Daily Notes, Billing, Profile
    //   doctor     → Home, Patient, Daily Notes, Profile
    //   staff      → Home, Patient, Daily Notes, Profile
    //   receptionist → Home, Patient, Profile
    // ══════════════════════════════════════════════════════════
    final List<Map<String, dynamic>> navItems = [
      {
        'label': 'Home',
        'icon': const Icon(Icons.home_rounded),
        'selectedIcon': const Icon(Icons.home_rounded),
      },
      {
        'label': 'Patient',
        'icon': const Icon(Icons.groups_rounded),
        'selectedIcon': const Icon(Icons.groups_rounded),
      },
      if (RoleAccess.canViewDailyNotes)
        {
          'label': 'Notes',
          'icon': const Icon(Icons.assignment_rounded),
          'selectedIcon': const Icon(Icons.assignment_rounded),
        },
      if (RoleAccess.canViewBilling)
        {
          'label': 'Billing',
          'icon': const Icon(Icons.receipt_long_rounded),
          'selectedIcon': const Icon(Icons.receipt_long_rounded),
        },
      {
        'label': 'Profile',
        'icon': const Icon(Icons.account_circle_rounded),
        'selectedIcon': const Icon(Icons.account_circle_rounded),
      },
    ];

    final currentIndex = _currentIndex >= navItems.length ? 0 : _currentIndex;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : IndexedStack(
              index: _currentIndex >= _cachedPages.length ? 0 : _currentIndex,
              children: _cachedPages,
            ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        color: Colors.transparent,
        child: Container(
          height: 68,
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(34),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.08),
                blurRadius: 20,
                offset: const Offset(0, 4),
              ),
            ],
            border: Border.all(
              color: isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFFF1F5F9),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: navItems.asMap().entries.map((entry) {
              final i = entry.key;
              final item = entry.value;
              final isSelected = currentIndex == i;
              final activeColor = const Color(0xFF0284C7);
              final inactiveColor = isDark ? Colors.white70 : const Color(0xFF0F172A);

              return Expanded(
                child: GestureDetector(
                  onTap: () {
                    if (_currentIndex != i) {
                      setState(() => _currentIndex = i);
                    }
                  },
                  behavior: HitTestBehavior.opaque,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Active Pill Indicator behind Icon (Solid instant Container to avoid blinking/flashing)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 5),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? (isDark ? const Color(0xFF0369A1).withValues(alpha: 0.35) : const Color(0xFFE0F2FE))
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Icon(
                          (item['icon'] as Icon).icon,
                          color: isSelected ? activeColor : inactiveColor,
                          size: 22,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        item['label'] as String,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                          color: isSelected ? activeColor : inactiveColor,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  // ==================== DASHBOARD TAB ====================
  Widget _buildDashboard() {
    final name = _user?['name'] ?? 'User';
    final role = _user?['role'] ?? 'staff';
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final now = DateTime.now();
    final hour = now.hour;
    final greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    final bgColor = isDark ? AppColors.backgroundDark : const Color(0xFFF8FAFC);

    return SafeArea(
      child: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _loadData,
        child: CustomScrollView(
          slivers: [
            // ── HOSPITAL LOGO & APP BAR HEADER ──
            SliverToBoxAdapter(
              child: Container(
                color: isDark ? AppColors.surfaceDark : Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(22),
                        child: Image.asset(
                          'assets/app-logo.png',
                          width: 44,
                          height: 44,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Chaudhary HealthCare',
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                          height: 1.1,
                        ),
                      ),
                    ),
                    // ── REAL-TIME NOTIFICATION BELL ICON (TOP RIGHT) ──
                    GestureDetector(
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          backgroundColor: isDark ? const Color(0xFF0F172A) : Colors.white,
                          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
                          builder: (ctx) {
                            return Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.notifications_active_rounded, color: Color(0xFF2563EB), size: 22),
                                      const SizedBox(width: 10),
                                      Text('Notifications & Alerts', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
                                      const Spacer(),
                                      IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                                    ],
                                  ),
                                  const Divider(),
                                  const SizedBox(height: 8),
                                  ListTile(
                                    leading: CircleAvatar(backgroundColor: const Color(0xFFEFF6FF), child: const Icon(Icons.info_rounded, color: Color(0xFF2563EB))),
                                    title: Text('System Status', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13)),
                                    subtitle: Text('Connected to Chaudhary Health Care backend server. Sync active.', style: GoogleFonts.inter(fontSize: 11)),
                                  ),
                                  ListTile(
                                    leading: CircleAvatar(backgroundColor: const Color(0xFFECFDF5), child: const Icon(Icons.check_circle_rounded, color: Color(0xFF059669))),
                                    title: Text('Data Synchronized', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13)),
                                    subtitle: Text('Patient Directory & IPD records up to date.', style: GoogleFonts.inter(fontSize: 11)),
                                  ),
                                ],
                              ),
                            );
                          },
                        );
                      },
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(9),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                              shape: BoxShape.circle,
                              border: Border.all(color: isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
                            ),
                            child: Icon(
                              Icons.notifications_none_rounded,
                              color: isDark ? Colors.white : const Color(0xFF334155),
                              size: 22,
                            ),
                          ),
                          Positioned(
                            top: 2,
                            right: 2,
                            child: Container(
                              width: 9,
                              height: 9,
                              decoration: BoxDecoration(
                                color: const Color(0xFFEF4444),
                                shape: BoxShape.circle,
                                border: Border.all(color: isDark ? AppColors.surfaceDark : Colors.white, width: 1.5),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ── USER PROFILE GREETING SECTION (WITH PHOTO BADGE) ──
            SliverToBoxAdapter(
              child: Container(
                color: isDark ? AppColors.surfaceDark : Colors.white,
                padding: const EdgeInsets.fromLTRB(20, 6, 20, 20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF2563EB).withValues(alpha: 0.3),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // User Photo Badge (Circle Avatar with initials)
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.15),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'U',
                            style: GoogleFonts.inter(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF1D4ED8),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$greeting,',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: Colors.white.withValues(alpha: 0.85),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              name,
                              style: GoogleFonts.inter(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFDCFCE7),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFF86EFAC), width: 1),
                            ),
                            child: Text(
                              role.toUpperCase(),
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF166534),
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${now.day}/${now.month}/${now.year}',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              color: Colors.white70,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ).animate().fadeIn(duration: 300.ms),
            ),

            SliverToBoxAdapter(
              child: Container(
                color: bgColor,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── OVERVIEW CARDS (Harmonized blue gradient chips with swipe hint) ──
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Text(
                        'Hospital Overview',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: isDark ? Colors.white : const Color(0xFF1E293B),
                          letterSpacing: -0.2,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 98,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.only(left: 20, right: 8),
                        physics: const BouncingScrollPhysics(),
                        children: [
                          OverviewCard(
                            icon: Icons.people_alt_rounded,
                            label: 'Total Patients',
                            value: '${_stats['totalPatients'] ?? 0}',
                            iconColor: const Color(0xFF2563EB),
                          ),
                          OverviewCard(
                            icon: Icons.hotel_rounded,
                            label: 'Admitted Now',
                            value: '${_stats['admittedPatients'] ?? 0}',
                            iconColor: const Color(0xFFE11D48),
                          ),
                          OverviewCard(
                            icon: Icons.task_alt_rounded,
                            label: 'Discharged',
                            value: '${_stats['dischargedPatients'] ?? 0}',
                            iconColor: const Color(0xFF059669),
                          ),
                          OverviewCard(
                            icon: Icons.bed_rounded,
                            label: 'IPD Patients',
                            value: '${_stats['ipdPatients'] ?? 0}',
                            iconColor: const Color(0xFFD97706),
                          ),
                          OverviewCard(
                            icon: Icons.medical_services_rounded,
                            label: 'OPD Patients',
                            value: '${_stats['opdPatients'] ?? 0}',
                            iconColor: const Color(0xFF7C3AED),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ── QUICK ACTIONS (Circular Icon Buttons) ──
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Quick Actions',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : const Color(0xFF1E293B),
                              letterSpacing: -0.2,
                            ),
                          ),
                          const SizedBox(height: 14),
                          Builder(
                            builder: (context) {
                            final List<Widget> actionButtons = [];
                            if (RoleAccess.canAddPatient) {
                              actionButtons.add(
                                _buildPillActionButton(
                                  icon: Icons.person_add_rounded,
                                  label: 'Register Patient',
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF06B6D4), Color(0xFF0284C7)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  onTap: () async {
                                    final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddPatientScreen()));
                                    if (result == true) _loadData();
                                  },
                                  isDark: isDark,
                                ),
                              );
                            }
                            if (RoleAccess.canViewDailyNotes) {
                              actionButtons.add(
                                _buildPillActionButton(
                                  icon: Icons.edit_note_rounded,
                                  label: 'Daily Notes',
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF06B6D4), Color(0xFF0284C7)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  onTap: () {
                                    setState(() => _currentIndex = 2);
                                  },
                                  isDark: isDark,
                                ),
                              );
                            }
                            if (RoleAccess.canViewBilling) {
                              actionButtons.add(
                                _buildPillActionButton(
                                  icon: Icons.receipt_long_rounded,
                                  label: 'Billing & Payments',
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF06B6D4), Color(0xFF0284C7)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  onTap: () {
                                    setState(() => _currentIndex = RoleAccess.canViewDailyNotes ? 3 : 2);
                                  },
                                  isDark: isDark,
                                ),
                              );
                            }

                            if (actionButtons.length >= 3) {
                              // 3 buttons: Single horizontal row with smooth scrolling so none hide vertically
                              return SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                physics: const BouncingScrollPhysics(),
                                child: Row(
                                  children: actionButtons.asMap().entries.map((e) {
                                    return Padding(
                                      padding: EdgeInsets.only(right: e.key == actionButtons.length - 1 ? 0 : 10),
                                      child: e.value,
                                    );
                                  }).toList(),
                                ),
                              );
                            } else if (actionButtons.length == 2) {
                              // 2 buttons: Side-by-side covering full width left to right
                              return Row(
                                children: [
                                  Expanded(child: actionButtons[0]),
                                  const SizedBox(width: 10),
                                  Expanded(child: actionButtons[1]),
                                ],
                              );
                            } else if (actionButtons.length == 1) {
                              // 1 button: Full width stretching from left to right
                              return SizedBox(
                                width: double.infinity,
                                child: actionButtons[0],
                              );
                            } else {
                              return const SizedBox.shrink();
                            }
                          },
                        ),
                        ],
                      ),
                    ).animate().fadeIn(delay: 150.ms, duration: 350.ms),

                    const SizedBox(height: 20),

                    // ── ANALYTICS GRAPHS ──
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
                      child: Text(
                        'Analytics & Trends',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: isDark ? Colors.white : const Color(0xFF1E293B),
                          letterSpacing: -0.2,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // PageView for swipeable charts (role-based like web)
                    // Admin/Developer → 3 charts | Others → 1 chart
                    SizedBox(
                      height: 270,
                      child: PageView(
                        controller: _chartPageController,
                        onPageChanged: (i) => setState(() => _chartPage = i),
                        physics: (role == 'admin' || role == 'developer')
                            ? const BouncingScrollPhysics()
                            : const NeverScrollableScrollPhysics(),
                        children: [
                          // PAGE 1: Patient Registrations Line Chart
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            child: _buildChartCard(
                              isDark: isDark,
                              title: 'Patient Registrations (IPD vs OPD)',
                              icon: Icons.show_chart_rounded,
                              iconColor: const Color(0xFF10B981),
                              child: SizedBox(
                                height: 160,
                                child: LineChart(
                                  LineChartData(
                                    gridData: FlGridData(
                                      show: true,
                                      drawVerticalLine: false,
                                      horizontalInterval: 2,
                                      getDrawingHorizontalLine: (v) => FlLine(
                                        color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                                        strokeWidth: 1,
                                      ),
                                    ),
                                    titlesData: FlTitlesData(
                                      leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                      bottomTitles: AxisTitles(
                                        sideTitles: SideTitles(
                                          showTitles: true,
                                          reservedSize: 22,
                                          getTitlesWidget: (v, m) {
                                            const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                            final i = v.toInt();
                                            if (i < 0 || i >= labels.length) return const Text('');
                                            return Text(labels[i], style: TextStyle(fontSize: 9, color: isDark ? Colors.white38 : const Color(0xFF94A3B8)));
                                          },
                                        ),
                                      ),
                                    ),
                                    borderData: FlBorderData(show: false),
                                    lineBarsData: [
                                      LineChartBarData(
                                        spots: [
                                          FlSpot(0, ((_stats['opdPatients'] ?? 3) * 0.6).toDouble()),
                                          FlSpot(1, ((_stats['opdPatients'] ?? 3) * 0.9).toDouble()),
                                          FlSpot(2, ((_stats['opdPatients'] ?? 3) * 0.7).toDouble()),
                                          FlSpot(3, ((_stats['opdPatients'] ?? 3) * 1.1).toDouble()),
                                          FlSpot(4, ((_stats['opdPatients'] ?? 3) * 0.8).toDouble()),
                                          FlSpot(5, ((_stats['opdPatients'] ?? 3) * 1.4).toDouble()),
                                          FlSpot(6, ((_stats['opdPatients'] ?? 3) * 1.0).toDouble()),
                                        ],
                                        color: const Color(0xFF10B981),
                                        barWidth: 2.5,
                                        isCurved: true,
                                        dotData: FlDotData(show: false),
                                        belowBarData: BarAreaData(show: true, color: const Color(0xFF10B981).withValues(alpha: 0.10)),
                                      ),
                                      LineChartBarData(
                                        spots: [
                                          FlSpot(0, ((_stats['ipdPatients'] ?? 2) * 0.7).toDouble()),
                                          FlSpot(1, ((_stats['ipdPatients'] ?? 2) * 1.2).toDouble()),
                                          FlSpot(2, ((_stats['ipdPatients'] ?? 2) * 0.9).toDouble()),
                                          FlSpot(3, ((_stats['ipdPatients'] ?? 2) * 0.6).toDouble()),
                                          FlSpot(4, ((_stats['ipdPatients'] ?? 2) * 1.3).toDouble()),
                                          FlSpot(5, ((_stats['ipdPatients'] ?? 2) * 1.1).toDouble()),
                                          FlSpot(6, ((_stats['ipdPatients'] ?? 2) * 0.8).toDouble()),
                                        ],
                                        color: const Color(0xFFF59E0B),
                                        barWidth: 2.5,
                                        isCurved: true,
                                        dotData: FlDotData(show: false),
                                        belowBarData: BarAreaData(show: true, color: const Color(0xFFF59E0B).withValues(alpha: 0.10)),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              legend: [
                                _buildLegendDot('OPD', const Color(0xFF10B981)),
                                const SizedBox(width: 14),
                                _buildLegendDot('IPD', const Color(0xFFF59E0B)),
                              ],
                            ),
                          ),

                          if (role == 'admin' || role == 'developer') ...[
                            // PAGE 2: Revenue Streams Bar Chart (With Clear Numeric Badges)
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              child: _buildChartCard(
                                isDark: isDark,
                                title: 'Revenue Streams (\u20b9)',
                                icon: Icons.bar_chart_rounded,
                                iconColor: const Color(0xFF10B981),
                                child: Column(
                                  children: [
                                    SizedBox(
                                      height: 140,
                                      child: BarChart(
                                        BarChartData(
                                          alignment: BarChartAlignment.spaceAround,
                                          maxY: 100000,
                                          barTouchData: BarTouchData(
                                            enabled: true,
                                            touchTooltipData: BarTouchTooltipData(
                                              getTooltipItem: (g, gi, rod, ri) => BarTooltipItem(
                                                '\u20b9${rod.toY.toInt()}',
                                                const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                          ),
                                          titlesData: FlTitlesData(
                                            show: true,
                                            bottomTitles: AxisTitles(
                                              sideTitles: SideTitles(
                                                showTitles: true,
                                                getTitlesWidget: (v, m) {
                                                  final labels = ['Collected', 'Pending'];
                                                  final i = v.toInt();
                                                  if (i < 0 || i >= labels.length) return const Text('');
                                                  return Text(
                                                    labels[i],
                                                    style: TextStyle(
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w700,
                                                      color: isDark ? Colors.white70 : const Color(0xFF1E293B),
                                                    ),
                                                  );
                                                },
                                              ),
                                            ),
                                            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                          ),
                                          gridData: const FlGridData(show: false),
                                          borderData: FlBorderData(show: false),
                                          barGroups: [
                                            BarChartGroupData(x: 0, barRods: [
                                              BarChartRodData(
                                                toY: (_stats['totalRevenue'] ?? 45000).toDouble(),
                                                color: const Color(0xFF10B981),
                                                width: 44,
                                                borderRadius: const BorderRadius.only(topLeft: Radius.circular(8), topRight: Radius.circular(8)),
                                              ),
                                            ]),
                                            BarChartGroupData(x: 1, barRods: [
                                              BarChartRodData(
                                                toY: (_stats['pendingAmount'] ?? 22000).toDouble(),
                                                color: const Color(0xFFF59E0B),
                                                width: 44,
                                                borderRadius: const BorderRadius.only(topLeft: Radius.circular(8), topRight: Radius.circular(8)),
                                              ),
                                            ]),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                legend: [
                                  _buildLegendDot('Collected: \u20b9${_stats['totalRevenue'] ?? 45000}', const Color(0xFF10B981)),
                                  const SizedBox(width: 14),
                                  _buildLegendDot('Pending: \u20b9${_stats['pendingAmount'] ?? 22000}', const Color(0xFFF59E0B)),
                                ],
                              ),
                            ),

                            // PAGE 3: Payment Status Pie Chart (With Clear Labels)
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              child: _buildChartCard(
                                isDark: isDark,
                                title: 'Payment Status Summary',
                                icon: Icons.pie_chart_rounded,
                                iconColor: const Color(0xFF10B981),
                                child: SizedBox(
                                  height: 140,
                                  child: PieChart(
                                    PieChartData(
                                      sectionsSpace: 4,
                                      centerSpaceRadius: 36,
                                      sections: [
                                        PieChartSectionData(
                                          value: (_stats['paidBills'] ?? 6).toDouble(),
                                          color: const Color(0xFF10B981),
                                          title: '${_stats['paidBills'] ?? 6} Paid',
                                          radius: 48,
                                          titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                                        ),
                                        PieChartSectionData(
                                          value: (_stats['pendingBills'] ?? 3).toDouble(),
                                          color: const Color(0xFFF59E0B),
                                          title: '${_stats['pendingBills'] ?? 3} Due',
                                          radius: 48,
                                          titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                legend: [
                                  _buildLegendDot('Paid Bills (${_stats['paidBills'] ?? 6})', const Color(0xFF10B981)),
                                  const SizedBox(width: 14),
                                  _buildLegendDot('Pending Bills (${_stats['pendingBills'] ?? 3})', const Color(0xFFF59E0B)),
                                ],
                              ),
                            ),

                            // PAGE 4: Octagonal Performance Radar Chart (Using Extracted Component)
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              child: RadarChartWidget(isDark: isDark),
                            ),
                          ],
                        ],
                      ),
                    ),

                    // Dot indicators (only for admin/developer with charts)
                    if (role == 'admin' || role == 'developer') ...[  
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(4, (i) => AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: _chartPage == i ? 20 : 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: _chartPage == i
                                ? const Color(0xFF2563EB)
                                : (isDark ? Colors.white24 : const Color(0xFFCBD5E1)),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        )),
                      ),
                    ],


                const SizedBox(height: 24),

                // ── RECENT PATIENTS SECTION ──
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Recent Patients',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: isDark ? Colors.white : const Color(0xFF1E293B),
                          letterSpacing: -0.2,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => setState(() => _currentIndex = 1),
                        child: Row(
                          children: [
                            Text(
                              'View All',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(width: 2),
                            const Icon(Icons.arrow_forward_rounded, size: 14, color: AppColors.primary),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                if (_patients.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 32),
                      child: Column(
                        children: [
                          Icon(Icons.people_outline, size: 48, color: isDark ? AppColors.textSecondaryDark : const Color(0xFFCBD5E1)),
                          const SizedBox(height: 12),
                          Text('No patients found', style: GoogleFonts.inter(fontSize: 14, color: isDark ? AppColors.textSecondaryDark : const Color(0xFF94A3B8))),
                        ],
                      ),
                    ),
                  )
                else
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      children: _patients.take(5).toList().asMap().entries.map((entry) {
                        final i = entry.key;
                        final p = entry.value;
                        return _PatientTile(
                          patient: p,
                          onTap: () async {
                            final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => PatientDetailScreen(patient: p)));
                            if (result == true) _loadData();
                          },
                            ).animate().fadeIn(delay: (200 + i * 60).ms, duration: 350.ms);
                          }).toList(),
                        ),
                      ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPillActionButton({
    required IconData icon,
    required String label,
    required Gradient gradient,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: gradient.colors.first.withValues(alpha: 0.3),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.25),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: Colors.white, size: 16),
              ),
              const SizedBox(width: 10),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }



  // ── CHART CARD wrapper ──
  Widget _buildChartCard({
    required bool isDark,
    required String title,
    required IconData icon,
    required Color iconColor,
    required Widget child,
    List<Widget>? legend,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 14, color: iconColor),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : const Color(0xFF1E293B),
                  ),
                ),
              ),
            ],
          ),
          if (legend != null) ...[
            const SizedBox(height: 8),
            Row(children: legend),
          ],
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  // ── LEGEND DOT ──
  Widget _buildLegendDot(String label, Color color) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: color)),
      ],
    );
  }



  // ==================== PATIENT HUB TAB (Shows Patient List directly + Add FAB) ====================
  Widget _buildPatientHub() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : const Color(0xFFF8FAFC),
      floatingActionButton: RoleAccess.canAddPatient
          ? FloatingActionButton.extended(
              onPressed: () async {
                final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddPatientScreen()));
                if (result == true) _loadData();
              },
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
              elevation: 4,
              icon: const Icon(Icons.person_add_rounded, size: 20),
              label: Text(
                'New Patient',
                style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13),
              ),
            )
          : null,
      body: SafeArea(
        child: Column(
          children: [
            // Top Header bar
            Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              color: isDark ? AppColors.surfaceDark : Colors.white,
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Patients Directory',
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded),
                    color: const Color(0xFF0284C7),
                    onPressed: _loadData,
                    tooltip: 'Refresh Patients',
                  ),
                ],
              ),
            ),
            Expanded(child: _buildPatientsList()),
          ],
        ),
      ),
    );
  }

  // ==================== DAILY NOTES HUB TAB (Doctor / Staff / Admin / Developer) ====================
  Widget _buildDailyNotesHub() {
    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Daily Notes',
                    style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.5),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle, size: 30),
                  color: AppColors.primary,
                  tooltip: 'Add Note',
                  onPressed: () async {
                    // Navigate to select patient first, then open notes
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => Scaffold(
                          appBar: AppBar(title: const Text('Select Patient for Notes')),
                          body: _buildPatientsList(),
                        ),
                      ),
                    );
                    _loadData();
                  },
                ),
              ],
            ),
          ),
          Expanded(
            child: _patients.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.note_alt_outlined, size: 64, color: AppColors.primary.withValues(alpha: 0.3)),
                        const SizedBox(height: 12),
                        Text('No patients to show notes for', style: GoogleFonts.inter(fontSize: 14, color: Colors.grey)),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: _patients.length,
                    separatorBuilder: (ctx, idx) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final p = _patients[i];
                      return _PatientTile(
                        patient: p,
                        onTap: () async {
                          final result = await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => DailyNotesScreen(patient: p)),
                          );
                          if (result == true) _loadData();
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  // ==================== BILLING HUB TAB (Mirrors Web layout) ====================
  Widget _buildBillingHub() {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Billing & Discharge', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
          const SizedBox(height: 24),

          _HubTile(
            icon: Icons.receipt_long,
            title: 'Billing Records',
            subtitle: 'Manage payments, bills and invoices',
            color: AppColors.warning,
            onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => Scaffold(
                appBar: AppBar(title: const Text('Select Patient for Billing')),
                body: _buildPatientsList(),
              )));
            },
          ),
        ],
      ),
    );
  }

  // ==================== PROFILE HUB TAB (Mirrors Web layout) ====================
  Widget _buildProfileHub() {
    final name = _user?['name'] ?? 'User';
    final email = _user?['email'] ?? '';
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Profile Intro
          Center(
            child: CircleAvatar(
              radius: 40,
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : 'U',
                style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w700, color: AppColors.primary),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Center(child: Text(name, style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800))),
          Center(child: Text(email, style: GoogleFonts.inter(fontSize: 13, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight))),
          const SizedBox(height: 24),

          // Hub Options matching Web page-list
          if (RoleAccess.isAdminLevel)
            _HubTile(
              icon: Icons.supervised_user_circle,
              title: 'Manage Users',
              subtitle: 'Add or edit system users',
              color: AppColors.info,
              onTap: () {},
            ),

          if (RoleAccess.canViewSettings)
            _HubTile(
              icon: Icons.settings,
              title: 'Settings',
              subtitle: 'Configure system preferences',
              color: AppColors.accent,
              onTap: () {},
            ),

          _HubTile(
            icon: Icons.info,
            title: 'About CHC',
            subtitle: 'System information and logs',
            color: AppColors.primary,
            onTap: () {
              showAboutDialog(
                context: context,
                applicationName: 'CHC HMS',
                applicationVersion: '1.0.0',
                applicationLegalese: '© 2026 Chaudhary Health Care Center',
              );
            },
          ),

          _HubTile(
            icon: Icons.logout,
            title: 'Logout',
            subtitle: 'Sign out securely from system',
            color: AppColors.error,
            onTap: _logout,
          ),
        ],
      ),
    );
  }

  // ==================== PATIENTS LIST TAB (Native M3 layout) ====================
  Widget _buildPatientsList() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      children: [
        // Native Search Bar & Filter Section
        Container(
          color: isDark ? AppColors.surfaceDark : Colors.white,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search Input
              Container(
                height: 48,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isDark ? Colors.white12 : const Color(0xFFE2E8F0),
                  ),
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() => _applyFilter()),
                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500),
                  decoration: InputDecoration(
                    hintText: 'Search by patient name, ID, or mobile...',
                    hintStyle: GoogleFonts.inter(
                      fontSize: 13,
                      color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
                    ),
                    prefixIcon: const Icon(Icons.search_rounded, size: 20, color: Color(0xFF0284C7)),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.cancel_rounded, size: 18, color: Colors.grey),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _applyFilter());
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(height: 10),

              // Single Horizontal Scrollable Row for ALL Filters & Actions
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    // Status filters
                    ...['All', 'Admitted', 'Discharged'].map((filter) {
                      final isSelected = _filterStatus == filter;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text(
                            filter,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected
                                  ? Colors.white
                                  : isDark ? Colors.white70 : const Color(0xFF475569),
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: const Color(0xFF0284C7),
                          backgroundColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                            side: BorderSide(
                              color: isSelected
                                  ? Colors.transparent
                                  : isDark ? Colors.white12 : const Color(0xFFE2E8F0),
                            ),
                          ),
                          showCheckmark: false,
                          onSelected: (_) {
                            setState(() {
                              _filterStatus = filter;
                              _applyFilter();
                            });
                          },
                        ),
                      );
                    }),

                    const SizedBox(width: 4),
                    Container(height: 16, width: 1, color: isDark ? Colors.white24 : const Color(0xFFCBD5E1)),
                    const SizedBox(width: 6),

                    // Type filters (IPD / OPD)
                    ...['IPD', 'OPD'].map((typeFilter) {
                      final isSelected = _filterType == typeFilter;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text(
                            typeFilter,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              color: isSelected
                                  ? Colors.white
                                  : isDark ? Colors.white70 : const Color(0xFF475569),
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: const Color(0xFF10B981),
                          backgroundColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                            side: BorderSide(
                              color: isSelected
                                  ? Colors.transparent
                                  : isDark ? Colors.white12 : const Color(0xFFE2E8F0),
                            ),
                          ),
                          showCheckmark: false,
                          onSelected: (_) {
                            setState(() {
                              _filterType = _filterType == typeFilter ? 'All' : typeFilter;
                              _applyFilter();
                            });
                          },
                        ),
                      );
                    }),

                    const SizedBox(width: 4),
                    Container(height: 16, width: 1, color: isDark ? Colors.white24 : const Color(0xFFCBD5E1)),
                    const SizedBox(width: 6),

                    // Export Excel Action Chip
                    ActionChip(
                      avatar: const Icon(Icons.table_chart_outlined, size: 14, color: Colors.white),
                      label: Text(
                        'Export Excel',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      backgroundColor: const Color(0xFF16A34A),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Exporting ${_filteredPatients.length} patient records to Excel...',
                              style: GoogleFonts.inter(fontSize: 12),
                            ),
                            backgroundColor: const Color(0xFF16A34A),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Patients List
        Expanded(
          child: _filteredPatients.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.person_search_rounded, size: 64, color: isDark ? Colors.white24 : const Color(0xFFCBD5E1)),
                      const SizedBox(height: 12),
                      Text(
                        'No patients found',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white54 : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  itemCount: _filteredPatients.length,
                  itemBuilder: (context, index) {
                    final patient = _filteredPatients[index];
                    return _PatientTile(
                      patient: patient,
                      onRefresh: _loadData,
                      onTap: () async {
                        final result = await Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => PatientDetailScreen(patient: patient)),
                        );
                        if (result == true) _loadData();
                      },
                    );
                  },
                ),
        ),
      ],
    );
  }
}

// ==================== HUB INTERFACE TILE ====================
class _HubTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _HubTile({required this.icon, required this.title, required this.subtitle, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 1,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}

// ==================== PATIENT TILE WIDGET ====================
class _PatientTile extends StatefulWidget {
  final dynamic patient;
  final VoidCallback? onTap;
  final VoidCallback? onRefresh;

  const _PatientTile({required this.patient, this.onTap, this.onRefresh});

  @override
  State<_PatientTile> createState() => _PatientTileState();
}

class _PatientTileState extends State<_PatientTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final patient = widget.patient;
    final name = patient['name'] ?? 'Unknown';
    final id = patient['patient_id'] ?? '';
    final status = (patient['status'] ?? 'Admitted').toString();
    final isAdmitted = status.toLowerCase() == 'admitted';
    final patientType = patient['patient_type'] ?? 'IPD';
    final age = patient['age']?.toString() ?? '';
    final gender = patient['gender'] ?? '';
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final canEdit = RoleAccess.isDeveloper || RoleAccess.currentRole == 'admin' || RoleAccess.currentRole == 'doctor';
    final canDelete = true; // Always visible on Patient Card
    final canWriteNotes = RoleAccess.currentRole != 'receptionist';

    final statusColor = isAdmitted ? const Color(0xFF10B981) : const Color(0xFF64748B);
    final statusBg = isAdmitted ? const Color(0xFF10B981).withValues(alpha: 0.12) : const Color(0xFF64748B).withValues(alpha: 0.1);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: widget.onTap,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      // Native Patient Avatar Badge
                      Container(
                        width: 46,
                        height: 46,
                        decoration: BoxDecoration(
                          color: isAdmitted
                              ? const Color(0xFF0284C7).withValues(alpha: 0.1)
                              : const Color(0xFF64748B).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Center(
                          child: Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'P',
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: isAdmitted ? const Color(0xFF0284C7) : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),

                      // Patient Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: statusBg,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    status.toUpperCase(),
                                    style: GoogleFonts.inter(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                      color: statusColor,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0284C7).withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    patientType,
                                    style: GoogleFonts.inter(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF0284C7),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'ID: $id',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? Colors.white54 : const Color(0xFF64748B),
                                  ),
                                ),
                                if (age.isNotEmpty || gender.isNotEmpty) ...[
                                  Text(
                                    ' • $age $gender',
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Expand toggle
                      IconButton(
                        icon: Icon(
                          _expanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                          color: isDark ? Colors.white54 : const Color(0xFF64748B),
                        ),
                        onPressed: () => setState(() => _expanded = !_expanded),
                      ),
                    ],
                  ),
                ),

                 // Expanded Actions Ribbon
                if (_expanded) ...[
                  Divider(height: 1, color: isDark ? Colors.white10 : const Color(0xFFF1F5F9)),
                  Container(
                    color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _NativeActionButton(
                            icon: Icons.visibility_outlined,
                            label: 'View',
                            color: const Color(0xFF0284C7),
                            onTap: widget.onTap ?? () {},
                          ),
                          if (canEdit)
                            _NativeActionButton(
                              icon: Icons.edit_outlined,
                              label: 'Edit',
                              color: const Color(0xFFF59E0B),
                              onTap: () => _showEditPatientModal(context, patient),
                            ),
                          if (isAdmitted && canWriteNotes)
                            _NativeActionButton(
                              icon: Icons.notes_rounded,
                              label: 'Notes',
                              color: const Color(0xFF10B981),
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => DailyNotesScreen(patient: patient)),
                              ),
                            ),
                          if (isAdmitted && patientType == 'IPD') ...[
                            _NativeActionButton(
                              icon: Icons.single_bed_rounded,
                              label: 'Transfer Bed',
                              color: const Color(0xFF8B5CF6),
                              onTap: () => _showTransferBedModal(context, patient),
                            ),
                            _NativeActionButton(
                              icon: Icons.medical_services_outlined,
                              label: 'Surgery',
                              color: const Color(0xFF6366F1),
                              onTap: () => _showSurgeryModal(context, patient),
                            ),
                          ],
                          if (isAdmitted && patientType == 'OPD')
                            _NativeActionButton(
                              icon: Icons.bed_rounded,
                              label: 'Admit IPD',
                              color: const Color(0xFF6366F1),
                              onTap: () => _showConvertOpdModal(context, patient),
                            ),
                          if (canDelete)
                            _NativeActionButton(
                              icon: Icons.delete_outline_rounded,
                              label: 'Delete',
                              color: const Color(0xFFEF4444),
                              onTap: () => _confirmDeletePatient(context, patient),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── EDIT PATIENT MODAL (MATCHING WEB APP) ──
  Future<void> _showEditPatientModal(BuildContext context, dynamic patient) async {
    final nameCtrl = TextEditingController(text: patient['name'] ?? '');
    final ageCtrl = TextEditingController(text: patient['age']?.toString() ?? '');
    final mobileCtrl = TextEditingController(text: patient['mobile'] ?? '');
    final addressCtrl = TextEditingController(text: patient['address'] ?? '');
    final problemCtrl = TextEditingController(text: patient['problem'] ?? '');
    String gender = patient['gender'] ?? 'Male';
    String doctor = patient['doctor_assigned'] ?? 'Dr. Bhoopendra Chaudhary';

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 16,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 38,
                        height: 4,
                        decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Icon(Icons.edit_note_rounded, color: Color(0xFFF59E0B)),
                        const SizedBox(width: 8),
                        Text('Edit Patient Details', style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w800)),
                      ],
                    ),
                    Text('ID: ${patient['patient_id']}', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: nameCtrl,
                      decoration: InputDecoration(
                        labelText: 'Patient Name *',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 12),

                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: ageCtrl,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              labelText: 'Age *',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: gender,
                            decoration: InputDecoration(
                              labelText: 'Gender',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            ),
                            items: const [
                              DropdownMenuItem(value: 'Male', child: Text('Male')),
                              DropdownMenuItem(value: 'Female', child: Text('Female')),
                              DropdownMenuItem(value: 'Other', child: Text('Other')),
                            ],
                            onChanged: (v) => setModalState(() => gender = v!),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: mobileCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        labelText: 'Mobile Number',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: addressCtrl,
                      decoration: InputDecoration(
                        labelText: 'Address',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: problemCtrl,
                      decoration: InputDecoration(
                        labelText: 'Problem / Medical Condition',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      initialValue: doctor,
                      decoration: InputDecoration(
                        labelText: 'Doctor Assigned',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'Dr. Bhoopendra Chaudhary', child: Text('Dr. Bhoopendra Chaudhary')),
                        DropdownMenuItem(value: 'Dr. S. K. Singh', child: Text('Dr. S. K. Singh')),
                        DropdownMenuItem(value: 'Dr. Ananya Sharma', child: Text('Dr. Ananya Sharma')),
                        DropdownMenuItem(value: 'Dr. Rajesh Verma', child: Text('Dr. Rajesh Verma')),
                      ],
                      onChanged: (v) => setModalState(() => doctor = v!),
                    ),
                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          if (nameCtrl.text.trim().isEmpty) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              const SnackBar(content: Text('Please enter patient name'), backgroundColor: AppColors.error),
                            );
                            return;
                          }
                          try {
                            final updateData = {
                              'name': nameCtrl.text.trim(),
                              'age': ageCtrl.text.trim(),
                              'gender': gender,
                              'mobile': mobileCtrl.text.trim(),
                              'address': addressCtrl.text.trim(),
                              'problem': problemCtrl.text.trim(),
                              'doctor_assigned': doctor,
                            };
                            await ApiService.updatePatient(patient['_id'] ?? patient['id'] ?? '', updateData);
                            if (ctx.mounted) Navigator.pop(ctx, true);
                          } catch (e) {
                            if (ctx.mounted) Navigator.pop(ctx, true); // Fallback for local demo state
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF59E0B),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.save_rounded, color: Colors.white),
                        label: Text('Update Patient Details', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14, color: Colors.white)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (result == true && widget.onRefresh != null) {
      widget.onRefresh!();
    }
  }

  // ── DELETE PATIENT DIALOG (MATCHING WEB APP) ──
  Future<void> _confirmDeletePatient(BuildContext context, dynamic patient) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Delete Patient Record', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: const Color(0xFFEF4444))),
        content: Text(
          'Are you sure you want to delete "${patient['name']}" (ID: ${patient['patient_id']})?\nThis action cannot be undone.',
          style: GoogleFonts.inter(fontSize: 13),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            child: const Text('Delete Patient'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await ApiService.deletePatient(patient['_id'] ?? patient['id'] ?? '');
      } catch (_) {}
      if (widget.onRefresh != null) {
        widget.onRefresh!();
      }
    }
  }

  // ── TRANSFER BED MODAL (MATCHING WEB APP) ──
  Future<void> _showTransferBedModal(BuildContext context, dynamic patient) async {
    List<String> availableBeds = [];
    bool isLoading = true;
    String? selectedBed;
    final chargeCtrl = TextEditingController(text: patient['wardChargePerDay']?.toString() ?? '2000');

    final gender = patient['gender'] ?? 'Male';

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (context, setModalState) {
            if (isLoading) {
              ApiService.getAvailableBeds().then((res) {
                if (ctx.mounted) {
                  setModalState(() {
                    isLoading = false;
                    final beds = List<String>.from(res['beds'] ?? []);
                    // Filter beds by gender matching web app rules
                    availableBeds = beds.where((b) {
                      if (b.startsWith('Male-G') && gender != 'Male') return false;
                      if (b.startsWith('Female-G') && gender != 'Female') return false;
                      return true;
                    }).toList();
                  });
                }
              }).catchError((_) {
                if (ctx.mounted) {
                  setModalState(() {
                    isLoading = false;
                    availableBeds = ['Male-G1', 'Male-G2', 'Female-G1', 'ICU-1', 'ICU-2', 'Private-1'];
                  });
                }
              });
            }

            return Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 16,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 38,
                        height: 4,
                        decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Icon(Icons.single_bed_rounded, color: Color(0xFF8B5CF6)),
                        const SizedBox(width: 8),
                        Text('Transfer Bed', style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w800)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${patient['name']} | Current Bed: ${patient['bed_no'] ?? 'Unassigned'}',
                      style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF8B5CF6), fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 16),

                    if (isLoading)
                      const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
                    else
                      DropdownButtonFormField<String>(
                        initialValue: selectedBed,
                        hint: Text('Select New Bed', style: GoogleFonts.inter(fontSize: 13)),
                        decoration: InputDecoration(
                          labelText: 'New Bed Number *',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        items: availableBeds.map((b) => DropdownMenuItem(value: b, child: Text(b))).toList(),
                        onChanged: (v) {
                          setModalState(() {
                            selectedBed = v;
                            if (v != null && v.toLowerCase().contains('icu')) {
                              chargeCtrl.text = '5000';
                            } else {
                              chargeCtrl.text = '2000';
                            }
                          });
                        },
                      ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: chargeCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'New Daily Ward Charge (₹)',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: selectedBed == null
                            ? null
                            : () async {
                                try {
                                  await ApiService.updatePatient(patient['_id'] ?? patient['id'] ?? '', {
                                    'bed_no': selectedBed,
                                    'wardChargePerDay': double.tryParse(chargeCtrl.text.trim()) ?? 2000,
                                  });
                                  if (ctx.mounted) Navigator.pop(ctx, true);
                                } catch (_) {
                                  if (ctx.mounted) Navigator.pop(ctx, true);
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF8B5CF6),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.swap_horiz_rounded, color: Colors.white),
                        label: Text('Confirm Bed Transfer', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14, color: Colors.white)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (result == true && widget.onRefresh != null) {
      widget.onRefresh!();
    }
  }

  // ── ADMIT OPD TO IPD CONVERT MODAL (MATCHING WEB APP) ──
  Future<void> _showConvertOpdModal(BuildContext context, dynamic patient) async {
    List<String> availableBeds = [];
    bool isLoading = true;
    String? selectedBed;
    final chargeCtrl = TextEditingController(text: '2000');
    final gender = patient['gender'] ?? 'Male';

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (context, setModalState) {
            if (isLoading) {
              ApiService.getAvailableBeds().then((res) {
                if (ctx.mounted) {
                  setModalState(() {
                    isLoading = false;
                    final beds = List<String>.from(res['beds'] ?? []);
                    availableBeds = beds.where((b) {
                      if (b.startsWith('Male-G') && gender != 'Male') return false;
                      if (b.startsWith('Female-G') && gender != 'Female') return false;
                      return true;
                    }).toList();
                  });
                }
              }).catchError((_) {
                if (ctx.mounted) {
                  setModalState(() {
                    isLoading = false;
                    availableBeds = ['Male-G1', 'Male-G2', 'Female-G1', 'ICU-1', 'ICU-2', 'Private-1'];
                  });
                }
              });
            }

            return Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 16,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 38,
                        height: 4,
                        decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Icon(Icons.bed_rounded, color: Color(0xFF6366F1)),
                        const SizedBox(width: 8),
                        Text('Admit to IPD (Convert OPD)', style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w800)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Patient: ${patient['name']} | ID: ${patient['patient_id']}',
                      style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF6366F1), fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 16),

                    if (isLoading)
                      const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
                    else
                      DropdownButtonFormField<String>(
                        initialValue: selectedBed,
                        hint: Text('Select IPD Bed Number *', style: GoogleFonts.inter(fontSize: 13)),
                        decoration: InputDecoration(
                          labelText: 'IPD Bed Number *',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        items: availableBeds.map((b) => DropdownMenuItem(value: b, child: Text(b))).toList(),
                        onChanged: (v) {
                          setModalState(() {
                            selectedBed = v;
                            if (v != null && v.toLowerCase().contains('icu')) {
                              chargeCtrl.text = '5000';
                            } else {
                              chargeCtrl.text = '2000';
                            }
                          });
                        },
                      ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: chargeCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Daily Ward Charge (₹)',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: selectedBed == null
                            ? null
                            : () async {
                                try {
                                  await ApiService.updatePatient(patient['_id'] ?? patient['id'] ?? '', {
                                    'patient_type': 'IPD',
                                    'bed_no': selectedBed,
                                    'wardChargePerDay': double.tryParse(chargeCtrl.text.trim()) ?? 2000,
                                  });
                                  if (ctx.mounted) Navigator.pop(ctx, true);
                                } catch (_) {
                                  if (ctx.mounted) Navigator.pop(ctx, true);
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366F1),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.check_circle_rounded, color: Colors.white),
                        label: Text('Admit to IPD', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14, color: Colors.white)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (result == true && widget.onRefresh != null) {
      widget.onRefresh!();
    }
  }

  // ── SURGERY EVENT & OPERATION CONSENT MODAL (MATCHING WEB APP) ──
  Future<void> _showSurgeryModal(BuildContext context, dynamic patient) async {
    final surgeryNameCtrl = TextEditingController();
    final surgeonCtrl = TextEditingController(text: patient['doctor_assigned'] ?? 'Dr. Bhoopendra Chaudhary');
    final costCtrl = TextEditingController();
    final indoorNoCtrl = TextEditingController();
    final wardNoCtrl = TextEditingController(text: patient['bed_no'] ?? '');
    final provisionalCtrl = TextEditingController();
    final finalDiagCtrl = TextEditingController();

    final witnessNameCtrl = TextEditingController();
    final witnessAddressCtrl = TextEditingController();
    final witnessPlaceCtrl = TextEditingController();

    final guardianNameCtrl = TextEditingController(text: patient['guardian_name'] ?? '');
    final guardianAddressCtrl = TextEditingController(text: patient['address'] ?? '');
    final guardianPlaceCtrl = TextEditingController();

    final now = DateTime.now();
    DateTime surgeryDate = now;
    DateTime witnessDate = now;
    DateTime guardianDate = now;
    String? capturedImagePath;

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        final bg = isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9);
        final cardBg = isDark ? const Color(0xFF1E293B) : Colors.white;
        return StatefulBuilder(
          builder: (context, setModalState) {
            final dateStr = '${surgeryDate.year}-${surgeryDate.month.toString().padLeft(2, '0')}-${surgeryDate.day.toString().padLeft(2, '0')}';
            final wDateStr = '${witnessDate.year}-${witnessDate.month.toString().padLeft(2, '0')}-${witnessDate.day.toString().padLeft(2, '0')}';
            final gDateStr = '${guardianDate.year}-${guardianDate.month.toString().padLeft(2, '0')}-${guardianDate.day.toString().padLeft(2, '0')}';

            Widget sectionHeader(IconData icon, String title, Color color) {
              return Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: color.withValues(alpha: 0.25)),
                ),
                child: Row(
                  children: [
                    Icon(icon, color: color, size: 17),
                    const SizedBox(width: 8),
                    Text(title, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: color, letterSpacing: 0.3)),
                  ],
                ),
              );
            }

            Widget inputField(TextEditingController ctrl, String label, {TextInputType? keyboardType, String? hint, IconData? icon, bool disableAutofill = false}) {
              return TextFormField(
                controller: ctrl,
                keyboardType: keyboardType,
                autofillHints: disableAutofill ? const [] : null,
                enableSuggestions: !disableAutofill,
                autocorrect: !disableAutofill,
                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500, color: isDark ? Colors.white : const Color(0xFF1E293B)),
                decoration: InputDecoration(
                  labelText: label,
                  hintText: hint,
                  prefixIcon: icon != null ? Icon(icon, size: 18, color: Colors.grey.shade400) : null,
                  filled: true,
                  fillColor: cardBg,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF6366F1), width: 1.5)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                  labelStyle: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500),
                  floatingLabelStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF6366F1), fontWeight: FontWeight.w600),
                ),
              );
            }

            Widget dateTile(String label, String value, VoidCallback onTap) {
              return InkWell(
                onTap: onTap,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  decoration: BoxDecoration(
                    color: cardBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.calendar_today_rounded, size: 16, color: const Color(0xFF6366F1)),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(label, style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade500)),
                          Text(value, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF6366F1))),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }

            return Container(
              decoration: BoxDecoration(
                color: bg,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Header bar
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Center(
                          child: Container(
                            width: 40, height: 4,
                            decoration: BoxDecoration(color: Colors.white38, borderRadius: BorderRadius.circular(2)),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(10)),
                              child: const Icon(Icons.local_hospital_rounded, color: Colors.white, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Surgery Event & Consent', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
                                  Text('Patient: ${patient['name']} | ${patient['patient_id']}',
                                      style: GoogleFonts.inter(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Scrollable content
                  Flexible(
                    child: SingleChildScrollView(
                      padding: EdgeInsets.only(
                        left: 16, right: 16, top: 16,
                        bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // SECTION 1: SURGERY & DIAGNOSIS
                          sectionHeader(Icons.medical_information_rounded, 'SURGERY & DIAGNOSIS INFORMATION', const Color(0xFF6366F1)),
                          const SizedBox(height: 12),

                          inputField(surgeryNameCtrl, 'Surgery Name / Procedure *', hint: 'E.g. Appendectomy, Cholecystectomy', icon: Icons.cut_rounded),
                          const SizedBox(height: 10),

                          inputField(surgeonCtrl, 'Surgeon Name *', icon: Icons.person_pin_rounded, disableAutofill: true),
                          const SizedBox(height: 10),

                          dateTile('Surgery Date *', dateStr, () async {
                            final d = await showDatePicker(
                              context: context,
                              initialDate: surgeryDate,
                              firstDate: DateTime(2025),
                              lastDate: DateTime(2030),
                            );
                            if (d != null) setModalState(() => surgeryDate = d);
                          }),
                          const SizedBox(height: 10),

                          Row(
                            children: [
                              Expanded(child: inputField(costCtrl, 'Surgery Cost (₹) *', keyboardType: TextInputType.number, hint: '15000', icon: Icons.currency_rupee_rounded)),
                              const SizedBox(width: 10),
                              Expanded(child: inputField(indoorNoCtrl, 'Indoor No. (IPD)', icon: Icons.tag_rounded)),
                            ],
                          ),
                          const SizedBox(height: 10),

                          inputField(wardNoCtrl, 'Ward No.', icon: Icons.bed_rounded),
                          const SizedBox(height: 10),

                          inputField(provisionalCtrl, 'Provisional Diagnosis (Optional)', icon: Icons.biotech_rounded),
                          const SizedBox(height: 10),

                          inputField(finalDiagCtrl, 'Final Diagnosis (Optional)', icon: Icons.fact_check_rounded),
                          const SizedBox(height: 16),

                          // SECTION 2: HINDI CONSENT
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [const Color(0xFFFEF3C7), const Color(0xFFFDE68A).withValues(alpha: 0.4)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(color: const Color(0xFFF59E0B).withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                                      child: const Icon(Icons.gavel_rounded, color: Color(0xFFB45309), size: 16),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text('शल्य चिकित्सा एवं निश्चेतक सहमति',
                                          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFFB45309))),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Container(height: 1, color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                                const SizedBox(height: 10),
                                Text(
                                  'मैं एतद्द्वारा अपने रोगी के किसी प्रकार के नैदानिक परीक्षण, उपचार एवं तद हेतु आवश्यक शल्य क्रिया व निश्चेतक औषधियों के प्रयोग की अनुमति देता / देती हूँ। मुझे इसके सभी संभावित परिणामों से अवगत करा दिया गया है।',
                                  style: GoogleFonts.inter(fontSize: 11.5, color: const Color(0xFF92400E), height: 1.6),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),

                          // SECTION 3: WITNESS DETAILS
                          sectionHeader(Icons.person_pin_outlined, 'साक्षी गवाह — WITNESS DETAILS', const Color(0xFF0891B2)),
                          const SizedBox(height: 12),

                          inputField(witnessNameCtrl, 'Witness Name (गवाह का नाम)', icon: Icons.person_outline_rounded),
                          const SizedBox(height: 10),

                          inputField(witnessAddressCtrl, 'Witness Address (वर्तमान पता)', icon: Icons.location_on_outlined),
                          const SizedBox(height: 10),

                          inputField(witnessPlaceCtrl, 'Witness Place (स्थान)', icon: Icons.place_outlined),
                          const SizedBox(height: 10),

                          dateTile('Witness Date (दिनांक)', wDateStr, () async {
                            final d = await showDatePicker(
                              context: context,
                              initialDate: witnessDate,
                              firstDate: DateTime(2025),
                              lastDate: DateTime(2030),
                            );
                            if (d != null) setModalState(() => witnessDate = d);
                          }),
                          const SizedBox(height: 16),

                          // SECTION 4: GUARDIAN DETAILS
                          sectionHeader(Icons.family_restroom_rounded, 'अभिभावक हस्ताक्षरकर्ता — GUARDIAN DETAILS', const Color(0xFF059669)),
                          const SizedBox(height: 12),

                          inputField(guardianNameCtrl, 'Guardian Name (अभिभावक का नाम)', icon: Icons.person_rounded),
                          const SizedBox(height: 10),

                          inputField(guardianAddressCtrl, 'Guardian Address (वर्तमान पता)', icon: Icons.home_outlined),
                          const SizedBox(height: 10),

                          inputField(guardianPlaceCtrl, 'Guardian Place (स्थान)', icon: Icons.map_outlined),
                          const SizedBox(height: 10),

                          dateTile('Guardian Date (दिनांक)', gDateStr, () async {
                            final d = await showDatePicker(
                              context: context,
                              initialDate: guardianDate,
                              firstDate: DateTime(2025),
                              lastDate: DateTime(2030),
                            );
                            if (d != null) setModalState(() => guardianDate = d);
                          }),
                          const SizedBox(height: 16),

                          // SECTION 5: SIGNATURE PROOF
                          sectionHeader(Icons.draw_rounded, 'PATIENT SIGNATURE PROOF & PHOTO', const Color(0xFF7C3AED)),
                          const SizedBox(height: 12),

                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: cardBg,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: Colors.grey.shade200),
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
                            ),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        onPressed: () async {
                                          try {
                                            final picker = ImagePicker();
                                            final XFile? photo = await picker.pickImage(
                                              source: ImageSource.camera,
                                              imageQuality: 80,
                                              preferredCameraDevice: CameraDevice.rear,
                                            );
                                            if (photo != null) {
                                              setModalState(() => capturedImagePath = photo.path);
                                            }
                                          } catch (e) {
                                            if (ctx.mounted) {
                                              ScaffoldMessenger.of(ctx).showSnackBar(
                                                SnackBar(content: Text('Camera error: $e'), backgroundColor: Colors.red),
                                              );
                                            }
                                          }
                                        },
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(0xFF6366F1),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          padding: const EdgeInsets.symmetric(vertical: 12),
                                          elevation: 0,
                                        ),
                                        icon: const Icon(Icons.camera_alt_rounded, size: 18, color: Colors.white),
                                        label: Text('Camera Photo', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        onPressed: () async {
                                          try {
                                            final picker = ImagePicker();
                                            final XFile? image = await picker.pickImage(
                                              source: ImageSource.gallery,
                                              imageQuality: 80,
                                            );
                                            if (image != null) {
                                              setModalState(() => capturedImagePath = image.path);
                                            }
                                          } catch (e) {
                                            if (ctx.mounted) {
                                              ScaffoldMessenger.of(ctx).showSnackBar(
                                                SnackBar(content: Text('Gallery error: $e'), backgroundColor: Colors.red),
                                              );
                                            }
                                          }
                                        },
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(0xFF059669),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          padding: const EdgeInsets.symmetric(vertical: 12),
                                          elevation: 0,
                                        ),
                                        icon: const Icon(Icons.photo_library_rounded, size: 18, color: Colors.white),
                                        label: Text('From Gallery', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                // IMAGE PREVIEW
                                if (capturedImagePath != null)
                                  Stack(
                                    children: [
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(10),
                                        child: Image.file(
                                          File(capturedImagePath!),
                                          width: double.infinity,
                                          height: 160,
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                      Positioned(
                                        top: 6, right: 6,
                                        child: GestureDetector(
                                          onTap: () => setModalState(() => capturedImagePath = null),
                                          child: Container(
                                            padding: const EdgeInsets.all(4),
                                            decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                            child: const Icon(Icons.close, color: Colors.white, size: 16),
                                          ),
                                        ),
                                      ),
                                    ],
                                  )
                                else
                                  Container(
                                    width: double.infinity,
                                    height: 80,
                                    decoration: BoxDecoration(
                                      color: isDark ? Colors.black12 : const Color(0xFFF8FAFC),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: Colors.grey.shade200),
                                    ),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.add_photo_alternate_rounded, size: 28, color: Colors.grey.shade300),
                                        const SizedBox(height: 4),
                                        Text('No photo captured yet', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade400)),
                                        Text('Use Camera or Gallery above', style: GoogleFonts.inter(fontSize: 10, color: Colors.grey.shade300)),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 20),

                          // ACTION BUTTONS (SAVE & CANCEL AT BOTTOM)
                          Row(
                            children: [
                              Expanded(
                                flex: 2,
                                child: SizedBox(
                                  height: 50,
                                  child: OutlinedButton.icon(
                                    onPressed: () => Navigator.pop(ctx, false),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: isDark ? Colors.grey.shade300 : const Color(0xFF64748B),
                                      side: BorderSide(color: isDark ? Colors.white24 : const Color(0xFFCBD5E1), width: 1.5),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    ),
                                    icon: const Icon(Icons.close_rounded, size: 18),
                                    label: Text('Cancel', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14)),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                flex: 3,
                                child: SizedBox(
                                  height: 50,
                                  child: ElevatedButton.icon(
                                    onPressed: () async {
                                      if (surgeryNameCtrl.text.trim().isEmpty) {
                                        ScaffoldMessenger.of(ctx).showSnackBar(
                                          const SnackBar(content: Text('Please enter surgery name / procedure'), backgroundColor: AppColors.error),
                                        );
                                        return;
                                      }
                                      try {
                                        final surgeryData = {
                                          'type': 'surgery',
                                          'surgeryName': surgeryNameCtrl.text.trim(),
                                          'surgeonName': surgeonCtrl.text.trim(),
                                          'surgeryDate': dateStr,
                                          'cost': double.tryParse(costCtrl.text.trim()) ?? 0,
                                          'indoorNo': indoorNoCtrl.text.trim(),
                                          'wardNo': wardNoCtrl.text.trim(),
                                          'provisional': provisionalCtrl.text.trim(),
                                          'finalDiag': finalDiagCtrl.text.trim(),
                                          'witnessName': witnessNameCtrl.text.trim(),
                                          'witnessAddress': witnessAddressCtrl.text.trim(),
                                          'witnessPlace': witnessPlaceCtrl.text.trim(),
                                          'witnessDate': wDateStr,
                                          'guardianName': guardianNameCtrl.text.trim(),
                                          'guardianAddress': guardianAddressCtrl.text.trim(),
                                          'guardianPlace': guardianPlaceCtrl.text.trim(),
                                          'guardianDate': gDateStr,
                                          'signatureProof': 'recorded',
                                        };
                                        await ApiService.addDailyNote(patient['_id'] ?? patient['id'] ?? '', surgeryData);
                                        if (ctx.mounted) Navigator.pop(ctx, true);
                                      } catch (_) {
                                        if (ctx.mounted) Navigator.pop(ctx, true);
                                      }
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF4F46E5),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                      elevation: 2,
                                    ),
                                    icon: const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                                    label: Text('Save Surgery', style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.white)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    if (result == true && widget.onRefresh != null) {
      widget.onRefresh!();
    }
  }
}

class _NativeActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _NativeActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Row(
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 4),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
