import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import '../theme.dart';
import '../services/api_service.dart';
import '../services/role_access.dart';
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
  final _chartPageController = PageController();
  int _chartPage = 0;

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
    if (mounted) setState(() => _isLoading = false);
  }

  void _applyFilter() {
    final query = _searchController.text.toLowerCase();
    _filteredPatients = _patients.where((p) {
      final name = (p['name'] ?? '').toString().toLowerCase();
      final id = (p['patient_id'] ?? '').toString().toLowerCase();
      final mobile = (p['mobile'] ?? '').toString().toLowerCase();
      final matchesSearch = query.isEmpty || name.contains(query) || id.contains(query) || mobile.contains(query);

      final status = (p['status'] ?? '').toString().toLowerCase();
      final matchesFilter = _filterStatus == 'All' ||
          (_filterStatus == 'Admitted' && status == 'admitted') ||
          (_filterStatus == 'Discharged' && status == 'discharged');

      return matchesSearch && matchesFilter;
    }).toList();
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
      // ── Home (Dashboard) — Always visible ──
      {
        'label': 'Home',
        'icon': const Icon(Icons.home_outlined),
        'selectedIcon': const Icon(Icons.home),
        'widget': _buildDashboard(),
      },
      // ── Patient — Always visible (all roles) ──
      {
        'label': 'Patient',
        'icon': const Icon(Icons.people_outline),
        'selectedIcon': const Icon(Icons.people),
        'widget': _buildPatientHub(),
      },
      // ── Daily Notes — Doctor, Staff, Admin, Developer only ──
      if (RoleAccess.canViewDailyNotes)
        {
          'label': 'Notes',
          'icon': const Icon(Icons.note_alt_outlined),
          'selectedIcon': const Icon(Icons.note_alt),
          'widget': _buildDailyNotesHub(),
        },
      // ── Billing — Admin, Developer, or billingAccess users only ──
      if (RoleAccess.canViewBilling)
        {
          'label': 'Billing',
          'icon': const Icon(Icons.credit_card_outlined),
          'selectedIcon': const Icon(Icons.credit_card),
          'widget': _buildBillingHub(),
        },
      // ── Profile — Always visible (logout + role-specific settings) ──
      {
        'label': 'Profile',
        'icon': const Icon(Icons.person_pin_outlined),
        'selectedIcon': const Icon(Icons.person_pin),
        'widget': _buildProfileHub(),
      },
    ];

    final currentIndex = _currentIndex >= navItems.length ? 0 : _currentIndex;

    return Scaffold(
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : navItems[currentIndex]['widget'] as Widget,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
        destinations: navItems.map((item) {
          return NavigationDestination(
            icon: item['icon'] as Widget,
            selectedIcon: item['selectedIcon'] as Widget,
            label: item['label'] as String,
          );
        }).toList(),
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
    
    // Primary aesthetic color for Overview Cards (vibrant orange)
    final cardAccentColor = isDark ? const Color(0xFFFB923C) : const Color(0xFFEA580C);

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
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.local_hospital_rounded,
                        color: Color(0xFFEF4444),
                        size: 26,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Chaudhary Health Care',
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                              letterSpacing: -0.5,
                            ),
                          ),
                          Text(
                            'Koraon, Prayagraj',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.textSecondaryDark : const Color(0xFF64748B),
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
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      // User Photo Badge (Circle Avatar with initials)
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF3B82F6).withValues(alpha: 0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'U',
                            style: GoogleFonts.inter(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
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
                                color: isDark ? AppColors.textSecondaryDark : const Color(0xFF64748B),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              name,
                              style: GoogleFonts.inter(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: isDark ? Colors.white : const Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              role.toUpperCase(),
                              style: GoogleFonts.inter(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF059669),
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${now.day}/${now.month}/${now.year}',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              color: isDark ? AppColors.textSecondaryDark : const Color(0xFF94A3B8),
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
                          _buildMetricChip(
                            icon: Icons.people_alt_rounded,
                            label: 'Total Patients',
                            value: '${_stats['totalPatients'] ?? 0}',
                            accentColor: cardAccentColor,
                            isDark: isDark,
                          ),
                          _buildMetricChip(
                            icon: Icons.hotel_rounded,
                            label: 'Admitted Now',
                            value: '${_stats['admittedPatients'] ?? 0}',
                            accentColor: cardAccentColor,
                            isDark: isDark,
                          ),
                          _buildMetricChip(
                            icon: Icons.task_alt_rounded,
                            label: 'Discharged',
                            value: '${_stats['dischargedPatients'] ?? 0}',
                            accentColor: cardAccentColor,
                            isDark: isDark,
                          ),
                          _buildMetricChip(
                            icon: Icons.bed_rounded,
                            label: 'IPD Patients',
                            value: '${_stats['ipdPatients'] ?? 0}',
                            accentColor: cardAccentColor,
                            isDark: isDark,
                          ),
                          _buildMetricChip(
                            icon: Icons.medical_services_rounded,
                            label: 'OPD Patients',
                            value: '${_stats['opdPatients'] ?? 0}',
                            accentColor: cardAccentColor,
                            isDark: isDark,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ── QUICK ACTIONS (Harmonized Medical Blue Theme) ──
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
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              if (RoleAccess.canAddPatient) ...[
                                Expanded(
                                  child: _buildActionCard(
                                    icon: Icons.person_add_rounded,
                                    label: 'Register Patient',
                                    description: 'New Entry',
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFF1E40AF), Color(0xFF3B82F6)],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    onTap: () async {
                                      final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddPatientScreen()));
                                      if (result == true) _loadData();
                                    },
                                  ),
                                ),
                                const SizedBox(width: 12),
                              ],
                              if (RoleAccess.canViewDailyNotes)
                                Expanded(
                                  child: _buildActionCard(
                                    icon: Icons.edit_note_rounded,
                                    label: 'Daily Notes',
                                    description: 'Patient Log',
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFF0D9488), Color(0xFF14B8A6)],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    onTap: () {
                                      setState(() => _currentIndex = 2);
                                    },
                                  ),
                                ),
                            ],
                          ),
                          if (RoleAccess.canViewBilling) ...[
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: _buildActionCard(
                                icon: Icons.receipt_long_rounded,
                                label: 'Billing & Invoices',
                                description: 'Financial Records',
                                gradient: const LinearGradient(
                                  colors: [Color(0xFF0284C7), Color(0xFF38BDF8)],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                onTap: () {
                                  setState(() => _currentIndex = RoleAccess.canViewDailyNotes ? 3 : 2);
                                },
                              ),
                            ),
                          ],
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
                              iconColor: const Color(0xFF0EA5E9),
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
                                        belowBarData: BarAreaData(show: true, color: const Color(0xFF10B981).withValues(alpha: 0.08)),
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
                                        color: const Color(0xFF6366F1),
                                        barWidth: 2.5,
                                        isCurved: true,
                                        dotData: FlDotData(show: false),
                                        belowBarData: BarAreaData(show: true, color: const Color(0xFF6366F1).withValues(alpha: 0.08)),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              legend: [
                                _buildLegendDot('OPD', const Color(0xFF10B981)),
                                const SizedBox(width: 14),
                                _buildLegendDot('IPD', const Color(0xFF6366F1)),
                              ],
                            ),
                          ),

                          if (role == 'admin' || role == 'developer') ...[
                            // PAGE 2: Revenue Streams Bar Chart
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              child: _buildChartCard(
                                isDark: isDark,
                                title: 'Revenue Streams',
                                icon: Icons.bar_chart_rounded,
                                iconColor: const Color(0xFF10B981),
                                child: SizedBox(
                                  height: 160,
                                  child: BarChart(
                                    BarChartData(
                                      alignment: BarChartAlignment.spaceAround,
                                      maxY: 100000,
                                      barTouchData: BarTouchData(
                                        enabled: true,
                                        touchTooltipData: BarTouchTooltipData(
                                          getTooltipItem: (g, gi, rod, ri) => BarTooltipItem(
                                            '\u20b9${rod.toY.toInt()}',
                                            const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
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
                                              return Text(labels[i], style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: isDark ? Colors.white60 : const Color(0xFF475569)));
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
                                            width: 40,
                                            borderRadius: const BorderRadius.only(topLeft: Radius.circular(6), topRight: Radius.circular(6)),
                                          ),
                                        ]),
                                        BarChartGroupData(x: 1, barRods: [
                                          BarChartRodData(
                                            toY: (_stats['pendingAmount'] ?? 22000).toDouble(),
                                            color: const Color(0xFFEF4444),
                                            width: 40,
                                            borderRadius: const BorderRadius.only(topLeft: Radius.circular(6), topRight: Radius.circular(6)),
                                          ),
                                        ]),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),

                            // PAGE 3: Payment Status Pie Chart
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              child: _buildChartCard(
                                isDark: isDark,
                                title: 'Payment Status',
                                icon: Icons.pie_chart_rounded,
                                iconColor: const Color(0xFFF59E0B),
                                child: SizedBox(
                                  height: 160,
                                  child: PieChart(
                                    PieChartData(
                                      sectionsSpace: 3,
                                      centerSpaceRadius: 40,
                                      sections: [
                                        PieChartSectionData(
                                          value: (_stats['paidBills'] ?? 6).toDouble(),
                                          color: const Color(0xFF10B981),
                                          title: '${_stats['paidBills'] ?? 6}',
                                          radius: 45,
                                          titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                                        ),
                                        PieChartSectionData(
                                          value: (_stats['pendingBills'] ?? 3).toDouble(),
                                          color: const Color(0xFFEF4444),
                                          title: '${_stats['pendingBills'] ?? 3}',
                                          radius: 45,
                                          titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                legend: [
                                  _buildLegendDot('Paid', const Color(0xFF10B981)),
                                  const SizedBox(width: 14),
                                  _buildLegendDot('Pending', const Color(0xFFEF4444)),
                                ],
                              ),
                            ),

                            // PAGE 4: Octagonal Performance Radar Chart (Matching User Image)
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20),
                              child: _buildChartCard(
                                isDark: isDark,
                                title: 'Hospital Performance Radar',
                                icon: Icons.radar_rounded,
                                iconColor: const Color(0xFF10B981),
                                child: SizedBox(
                                  height: 160,
                                  child: RadarChart(
                                    RadarChartData(
                                      radarShape: RadarShape.polygon,
                                      radarBorderData: const BorderSide(color: Color(0xFF10B981), width: 1.5),
                                      gridBorderData: BorderSide(color: isDark ? Colors.white24 : const Color(0xFFCBD5E1), width: 1),
                                      tickBorderData: const BorderSide(color: Colors.transparent),
                                      ticksTextStyle: const TextStyle(color: Colors.transparent),
                                      titlePositionPercentageOffset: 0.15,
                                      getTitle: (index, angle) {
                                        const titles = ['Admissions', 'OPD', 'IPD', 'Billing', 'Discharges', 'Surgeries'];
                                        return RadarChartTitle(
                                          text: titles[index % titles.length],
                                        );
                                      },
                                      dataSets: [
                                        RadarDataSet(
                                          fillColor: const Color(0xFFFBBF24).withValues(alpha: 0.65),
                                          borderColor: const Color(0xFFF59E0B),
                                          entryRadius: 3,
                                          borderWidth: 2,
                                          dataEntries: const [
                                            RadarEntry(value: 8.5),
                                            RadarEntry(value: 7.0),
                                            RadarEntry(value: 9.0),
                                            RadarEntry(value: 6.5),
                                            RadarEntry(value: 8.0),
                                            RadarEntry(value: 7.5),
                                          ],
                                        ),
                                        RadarDataSet(
                                          fillColor: const Color(0xFF10B981).withValues(alpha: 0.35),
                                          borderColor: const Color(0xFF10B981),
                                          entryRadius: 3,
                                          borderWidth: 2,
                                          dataEntries: const [
                                            RadarEntry(value: 6.0),
                                            RadarEntry(value: 8.5),
                                            RadarEntry(value: 5.5),
                                            RadarEntry(value: 8.0),
                                            RadarEntry(value: 6.5),
                                            RadarEntry(value: 9.0),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                legend: [
                                  _buildLegendDot('Target', const Color(0xFFF59E0B)),
                                  const SizedBox(width: 14),
                                  _buildLegendDot('Actual', const Color(0xFF10B981)),
                                ],
                              ),
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

  // ── METRIC CHIP (horizontal scroll stats) ──
  Widget _buildMetricChip({
    required IconData icon,
    required String label,
    required String value,
    required Color accentColor,
    required bool isDark,
  }) {
    // Professional sleek hospital blue card with right margin hint
    return Container(
      width: 110,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [const Color(0xFF1E3A8A), const Color(0xFF1E293B)]
              : [const Color(0xFF2563EB), const Color(0xFF1D4ED8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.20),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: Colors.white),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 9,
                  fontWeight: FontWeight.w600,
                  color: Colors.white.withValues(alpha: 0.80),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideX(begin: 0.05, end: 0);
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

  // ── ACTION CARD ──
  Widget _buildActionCard({
    required IconData icon,
    required String label,
    required String description,
    required Gradient gradient,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: gradient.colors.first.withValues(alpha: 0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    description,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: Colors.white.withValues(alpha: 0.85),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.white.withValues(alpha: 0.7), size: 18),
          ],
        ),
      ),
    );
  }

  // ==================== PATIENT HUB TAB (Shows Patient List directly + Add FAB) ====================
  Widget _buildPatientHub() {
    return Scaffold(
      floatingActionButton: RoleAccess.canAddPatient
          ? FloatingActionButton(
              onPressed: () async {
                final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddPatientScreen()));
                if (result == true) _loadData();
              },
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              child: const Icon(Icons.person_add),
            )
          : null,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Patient Management', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
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

  // ==================== PATIENTS LIST TAB (Standard layout) ====================
  Widget _buildPatientsList() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() => _applyFilter()),
                  decoration: InputDecoration(
                    hintText: 'Search by name, ID, mobile...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _applyFilter());
                            },
                          )
                        : null,
                  ),
                ),
                const SizedBox(height: 12),

                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['All', 'Admitted', 'Discharged'].map((filter) {
                      final isSelected = _filterStatus == filter;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(filter),
                          selected: isSelected,
                          onSelected: (_) {
                            setState(() {
                              _filterStatus = filter;
                              _applyFilter();
                            });
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),

          Expanded(
            child: _filteredPatients.isEmpty
                ? Center(
                    child: Text('No patients found', style: GoogleFonts.inter(fontSize: 14, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight)),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: _filteredPatients.length,
                    itemBuilder: (context, index) {
                      final patient = _filteredPatients[index];
                      return _PatientTile(
                        patient: patient,
                        onTap: () async {
                          final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => PatientDetailScreen(patient: patient)));
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
                    Text(subtitle, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondaryLight)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

// ==================== OTHER REUSABLE WIDGETS ====================


class _PatientTile extends StatefulWidget {
  final dynamic patient;
  final VoidCallback? onTap;

  const _PatientTile({required this.patient, this.onTap});

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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Web permissions check logic mapping
    final isDeveloperOrAdmin = RoleAccess.isDeveloper || RoleAccess.currentRole == 'admin';
    final canEdit = RoleAccess.isDeveloper || RoleAccess.currentRole == 'admin' || RoleAccess.currentRole == 'doctor';
    final canDelete = isDeveloperOrAdmin;
    final canWriteNotes = RoleAccess.currentRole != 'receptionist';

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: widget.onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: (isAdmitted ? AppColors.accent : AppColors.warning).withValues(alpha: 0.1),
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: isAdmitted ? AppColors.accent : AppColors.warning),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 4),
                        Text(
                          'ID: $id • $patientType',
                          style: GoogleFonts.inter(fontSize: 12, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: (isAdmitted ? AppColors.accent : AppColors.warning).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          status.toUpperCase(),
                          style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: isAdmitted ? AppColors.accent : AppColors.warning, letterSpacing: 0.5),
                        ),
                      ),
                      IconButton(
                        icon: Icon(_expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, size: 20),
                        onPressed: () => setState(() => _expanded = !_expanded),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (_expanded) ...[
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      // View
                      _MiniActionButton(
                        icon: Icons.visibility_outlined,
                        tooltip: 'View Info',
                        color: AppColors.primary,
                        onTap: widget.onTap ?? () {},
                      ),
                      // Edit (Admin/Dev/Doc)
                      if (canEdit)
                        _MiniActionButton(
                          icon: isAdmitted ? Icons.edit_outlined : Icons.info_outline,
                          tooltip: isAdmitted ? 'Edit Patient' : 'Details',
                          color: Colors.amber.shade800,
                          onTap: () {},
                        ),
                      // Transfer Bed (IPD Admitted)
                      if (isAdmitted && patientType == 'IPD')
                        _MiniActionButton(
                          icon: Icons.compare_arrows_outlined,
                          tooltip: 'Transfer Bed',
                          color: AppColors.info,
                          onTap: () {},
                        ),
                      // Convert to IPD (OPD Admitted)
                      if (isAdmitted && patientType == 'OPD')
                        _MiniActionButton(
                          icon: Icons.hotel_outlined,
                          tooltip: 'Admit to IPD',
                          color: AppColors.accent, // Violet-blue icon equivalents
                          onTap: () {},
                        ),
                      // Daily Notes (Except Receptionist)
                      if (isAdmitted && canWriteNotes)
                        _MiniActionButton(
                          icon: Icons.notes_outlined,
                          tooltip: 'Daily Notes',
                          color: Colors.green,
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => DailyNotesScreen(patient: patient))),
                        ),
                      // Surgery Event (IPD Admitted)
                      if (isAdmitted && patientType == 'IPD')
                        _MiniActionButton(
                          icon: Icons.medical_services_outlined,
                          tooltip: 'Add Surgery',
                          color: Colors.teal,
                          onTap: () {},
                        ),
                      // Delete (Admin/Dev)
                      if (canDelete)
                        _MiniActionButton(
                          icon: Icons.delete_outline,
                          tooltip: 'Delete',
                          color: AppColors.error,
                          onTap: () {},
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MiniActionButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final Color color;
  final VoidCallback onTap;

  const _MiniActionButton({required this.icon, required this.tooltip, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Tooltip(
        message: tooltip,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: color.withValues(alpha: 0.15)),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
        ),
      ),
    );
  }
}
