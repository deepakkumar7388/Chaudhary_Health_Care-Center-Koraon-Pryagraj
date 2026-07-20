import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../services/api_service.dart';
import '../services/role_access.dart';
import 'splash_screen.dart';
import 'add_patient_screen.dart';
import 'patient_detail_screen.dart';
import 'daily_notes_screen.dart';
import 'billing_screen.dart';

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

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      _user = await ApiService.getSavedUser();
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Dynamic Bottom Nav matching Web layout exactly
    final List<Map<String, dynamic>> navItems = [
      {
        'label': 'Home',
        'icon': const Icon(Icons.home_outlined),
        'selectedIcon': const Icon(Icons.home),
        'widget': _buildDashboard(),
      },
      {
        'label': 'Patient',
        'icon': const Icon(Icons.people_outline),
        'selectedIcon': const Icon(Icons.people),
        'widget': _buildPatientHub(),
      },
      if (RoleAccess.canViewBilling)
        {
          'label': 'Billing',
          'icon': const Icon(Icons.credit_card_outlined),
          'selectedIcon': const Icon(Icons.credit_card),
          'widget': _buildBillingHub(),
        },
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

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                  child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : 'U',
                    style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.primary),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Welcome back,', style: GoogleFonts.inter(fontSize: 13, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight)),
                      Text(name, style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    role.toString().toUpperCase(),
                    style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.accent, letterSpacing: 0.5),
                  ),
                ),
              ],
            ).animate().fadeIn(duration: 400.ms),

            const SizedBox(height: 28),

            Text('Overview', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 14),

            Row(
              children: [
                Expanded(child: _StatCard(icon: Icons.people, label: 'Total Patients', value: '${_stats['totalPatients'] ?? 0}', color: AppColors.primary, delay: 0)),
                const SizedBox(width: 12),
                Expanded(child: _StatCard(icon: Icons.hotel, label: 'Admitted', value: '${_stats['admittedPatients'] ?? 0}', color: AppColors.accent, delay: 100)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _StatCard(icon: Icons.check_circle_outline, label: 'Discharged', value: '${_stats['dischargedPatients'] ?? 0}', color: AppColors.warning, delay: 200)),
                const SizedBox(width: 12),
                Expanded(child: _StatCard(icon: Icons.medical_services, label: 'IPD / OPD', value: '${_stats['ipdPatients'] ?? 0} / ${_stats['opdPatients'] ?? 0}', color: AppColors.info, delay: 300)),
              ],
            ),

            const SizedBox(height: 28),
            Text('Recent Patients', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),

            if (_patients.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      Icon(Icons.people_outline, size: 48, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                      const SizedBox(height: 12),
                      Text('No patients found', style: GoogleFonts.inter(fontSize: 14, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight)),
                    ],
                  ),
                ),
              )
            else
              ...(_patients.take(5).toList().asMap().entries.map((entry) {
                final i = entry.key;
                final p = entry.value;
                return _PatientTile(
                  patient: p,
                  onTap: () async {
                    final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => PatientDetailScreen(patient: p)));
                    if (result == true) _loadData();
                  },
                ).animate().fadeIn(delay: (300 + i * 80).ms, duration: 400.ms);
              })),
          ],
        ),
      ),
    );
  }

  // ==================== PATIENT HUB TAB (Shows Patient List directly + Add FAB) ====================
  Widget _buildPatientHub() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
    final role = _user?['role'] ?? 'staff';
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
class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final int delay;

  const _StatCard({required this.icon, required this.label, required this.value, required this.color, required this.delay});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 14),
            Text(value, style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
            const SizedBox(height: 4),
            Text(label, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondaryLight, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    ).animate().fadeIn(delay: delay.ms, duration: 400.ms).slideY(begin: 0.1, end: 0);
  }
}

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
