import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config.dart';
import '../services/api_service.dart';
import '../services/role_access.dart';
import 'user_management_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  bool _isSaving = false;
  Map<String, dynamic> _settings = {};

  // General tab controllers
  final TextEditingController _hospitalNameCtrl = TextEditingController();
  final TextEditingController _hospitalAddressCtrl = TextEditingController();
  final TextEditingController _hospitalContactCtrl = TextEditingController();
  final TextEditingController _hospitalEmailCtrl = TextEditingController();
  final TextEditingController _hospitalWebsiteCtrl = TextEditingController();
  final TextEditingController _hospitalRegCtrl = TextEditingController();
  List<Map<String, dynamic>> _doctorsList = [];

  // Bed management controllers
  final TextEditingController _bedGenCountCtrl = TextEditingController();
  final TextEditingController _bedGenChargeCtrl = TextEditingController();
  final TextEditingController _bedIcuCountCtrl = TextEditingController();
  final TextEditingController _bedIcuChargeCtrl = TextEditingController();
  final TextEditingController _bedPvtCountCtrl = TextEditingController();
  final TextEditingController _bedPvtChargeCtrl = TextEditingController();

  // Billing controllers
  final TextEditingController _consultationFeeCtrl = TextEditingController();
  final TextEditingController _wardChargeCtrl = TextEditingController();
  final TextEditingController _icuChargeCtrl = TextEditingController();
  final TextEditingController _nursingChargeCtrl = TextEditingController();
  final TextEditingController _taxRateCtrl = TextEditingController();
  final TextEditingController _invoiceFooterCtrl = TextEditingController();

  // Notification toggles & SMTP
  bool _notifyNewPatient = true;
  bool _notifyDischarge = true;
  bool _notifyDailyReport = true;
  final TextEditingController _smtpHostCtrl = TextEditingController();
  final TextEditingController _smtpPortCtrl = TextEditingController();
  final TextEditingController _smtpUserCtrl = TextEditingController();
  final TextEditingController _smtpPassCtrl = TextEditingController();
  final TextEditingController _smtpFromCtrl = TextEditingController();

  // Security controllers
  final TextEditingController _sessionTimeoutCtrl = TextEditingController();
  final TextEditingController _maxAttemptsCtrl = TextEditingController();
  bool _maintenanceMode = false;
  bool _singleSessionOnly = true;

  // Diagnostics & Backup state
  Map<String, dynamic>? _dbStatus;
  Map<String, dynamic>? _serverHealth;
  List<dynamic> _backupsList = [];
  bool _isCreatingBackup = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
    _loadSettings();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _hospitalNameCtrl.dispose();
    _hospitalAddressCtrl.dispose();
    _hospitalContactCtrl.dispose();
    _hospitalEmailCtrl.dispose();
    _hospitalWebsiteCtrl.dispose();
    _hospitalRegCtrl.dispose();
    _bedGenCountCtrl.dispose();
    _bedGenChargeCtrl.dispose();
    _bedIcuCountCtrl.dispose();
    _bedIcuChargeCtrl.dispose();
    _bedPvtCountCtrl.dispose();
    _bedPvtChargeCtrl.dispose();
    _consultationFeeCtrl.dispose();
    _wardChargeCtrl.dispose();
    _icuChargeCtrl.dispose();
    _nursingChargeCtrl.dispose();
    _taxRateCtrl.dispose();
    _invoiceFooterCtrl.dispose();
    _smtpHostCtrl.dispose();
    _smtpPortCtrl.dispose();
    _smtpUserCtrl.dispose();
    _smtpPassCtrl.dispose();
    _smtpFromCtrl.dispose();
    _sessionTimeoutCtrl.dispose();
    _maxAttemptsCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.getSettings();
      if (res['success'] == true && res['settings'] != null) {
        _settings = Map<String, dynamic>.from(res['settings']);
        _populateFields(_settings);
      }

      // Load diagnostics
      final dbRes = await ApiService.getDbStatus();
      final healthRes = await ApiService.getHealth();
      final backupsRes = await ApiService.listBackups();

      if (mounted) {
        setState(() {
          _dbStatus = dbRes;
          _serverHealth = healthRes;
          if (backupsRes['success'] == true && backupsRes['backups'] != null) {
            _backupsList = backupsRes['backups'];
          }
        });
      }
    } catch (e) {
      debugPrint('Settings load error: $e');
    }
    if (mounted) setState(() => _isLoading = false);
  }

  void _populateFields(Map<String, dynamic> s) {
    _hospitalNameCtrl.text = s['hospital-name']?.toString() ?? 'Chaudhary Health Care Center';
    _hospitalAddressCtrl.text = s['hospital-address']?.toString() ?? 'Gandhi Chauraha, Meja wali road, Koraon-Prayagraj';
    _hospitalContactCtrl.text = s['hospital-contact']?.toString() ?? '1800-XXX-XXXX';
    _hospitalEmailCtrl.text = s['hospital-email']?.toString() ?? 'contact@chc-koraon.com';
    _hospitalWebsiteCtrl.text = s['hospital-website']?.toString() ?? 'www.chc-koraon.com';
    _hospitalRegCtrl.text = s['hospital-reg']?.toString() ?? 'REG/CHC/2026/102';

    // Parse doctors list
    if (s['hospital-doctors-list'] != null) {
      try {
        final raw = s['hospital-doctors-list'];
        final List parsed = raw is String ? jsonDecode(raw) : raw;
        _doctorsList = parsed.map((d) => Map<String, dynamic>.from(d)).toList();
      } catch (_) {
        _doctorsList = [];
      }
    }

    // Beds
    _bedGenCountCtrl.text = s['bed-general-count']?.toString() ?? '20';
    _bedGenChargeCtrl.text = s['bed-general-charge']?.toString() ?? '1000';
    _bedIcuCountCtrl.text = s['bed-icu-count']?.toString() ?? '5';
    _bedIcuChargeCtrl.text = s['bed-icu-charge']?.toString() ?? '3500';
    _bedPvtCountCtrl.text = s['bed-private-count']?.toString() ?? '5';
    _bedPvtChargeCtrl.text = s['bed-private-charge']?.toString() ?? '2500';

    // Billing
    _consultationFeeCtrl.text = s['billing-default-consultation']?.toString() ?? '500';
    _wardChargeCtrl.text = s['billing-default-ward-charge']?.toString() ?? '1000';
    _icuChargeCtrl.text = s['billing-default-icu-charge']?.toString() ?? '3500';
    _nursingChargeCtrl.text = s['billing-default-nursing']?.toString() ?? '300';
    _taxRateCtrl.text = s['billing-tax-rate']?.toString() ?? '0';
    _invoiceFooterCtrl.text = s['billing-invoice-footer']?.toString() ?? 'Thank you for choosing Chaudhary Health Care Center.';

    // Notifications
    _notifyNewPatient = s['email-new-patient'] == true || s['email-new-patient'] == 'true';
    _notifyDischarge = s['email-discharge'] == true || s['email-discharge'] == 'true';
    _notifyDailyReport = s['email-daily-report'] == true || s['email-daily-report'] == 'true';
    _smtpHostCtrl.text = s['smtp-host']?.toString() ?? '';
    _smtpPortCtrl.text = s['smtp-port']?.toString() ?? '587';
    _smtpUserCtrl.text = s['smtp-user']?.toString() ?? '';
    _smtpPassCtrl.text = s['smtp-pass']?.toString() ?? '';
    _smtpFromCtrl.text = s['smtp-from-name']?.toString() ?? 'CHC Hospital';

    // Security
    _sessionTimeoutCtrl.text = s['security-session-timeout']?.toString() ?? '60';
    _maxAttemptsCtrl.text = s['security-max-attempts']?.toString() ?? '5';
    _maintenanceMode = s['system-maintenance-mode'] == true || s['system-maintenance-mode'] == 'true';
    _singleSessionOnly = s['security-single-session'] != false && s['security-single-session'] != 'false';
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);

    final genCount = int.tryParse(_bedGenCountCtrl.text.trim()) ?? 20;
    final icuCount = int.tryParse(_bedIcuCountCtrl.text.trim()) ?? 5;
    final pvtCount = int.tryParse(_bedPvtCountCtrl.text.trim()) ?? 5;
    final List<String> beds = [];
    for (int i = 1; i <= genCount; i++) {
      beds.add('GEN-${i.toString().padLeft(2, '0')}');
    }
    for (int i = 1; i <= icuCount; i++) {
      beds.add('ICU-${i.toString().padLeft(2, '0')}');
    }
    for (int i = 1; i <= pvtCount; i++) {
      beds.add('PVT-${i.toString().padLeft(2, '0')}');
    }

    final payload = <String, dynamic>{
      'hospital-name': _hospitalNameCtrl.text.trim(),
      'hospital-address': _hospitalAddressCtrl.text.trim(),
      'hospital-contact': _hospitalContactCtrl.text.trim(),
      'hospital-email': _hospitalEmailCtrl.text.trim(),
      'hospital-website': _hospitalWebsiteCtrl.text.trim(),
      'hospital-reg': _hospitalRegCtrl.text.trim(),
      'hospital-doctors-list': jsonEncode(_doctorsList),

      'bed-general-count': genCount,
      'bed-general-charge': double.tryParse(_bedGenChargeCtrl.text.trim()) ?? 1000,
      'bed-icu-count': icuCount,
      'bed-icu-charge': double.tryParse(_bedIcuChargeCtrl.text.trim()) ?? 3500,
      'bed-private-count': pvtCount,
      'bed-private-charge': double.tryParse(_bedPvtChargeCtrl.text.trim()) ?? 2500,
      'hospital-beds': beds.join(', '),

      'billing-default-consultation': double.tryParse(_consultationFeeCtrl.text.trim()) ?? 500,
      'billing-default-ward-charge': double.tryParse(_wardChargeCtrl.text.trim()) ?? 1000,
      'billing-default-icu-charge': double.tryParse(_icuChargeCtrl.text.trim()) ?? 3500,
      'billing-default-nursing': double.tryParse(_nursingChargeCtrl.text.trim()) ?? 300,
      'billing-tax-rate': double.tryParse(_taxRateCtrl.text.trim()) ?? 0,
      'billing-invoice-footer': _invoiceFooterCtrl.text.trim(),

      'email-new-patient': _notifyNewPatient,
      'email-discharge': _notifyDischarge,
      'email-daily-report': _notifyDailyReport,
      'smtp-host': _smtpHostCtrl.text.trim(),
      'smtp-port': _smtpPortCtrl.text.trim(),
      'smtp-user': _smtpUserCtrl.text.trim(),
      'smtp-pass': _smtpPassCtrl.text.trim(),
      'smtp-from-name': _smtpFromCtrl.text.trim(),

      'security-session-timeout': int.tryParse(_sessionTimeoutCtrl.text.trim()) ?? 60,
      'security-max-attempts': int.tryParse(_maxAttemptsCtrl.text.trim()) ?? 5,
      'system-maintenance-mode': _maintenanceMode,
      'security-single-session': _singleSessionOnly,
    };

    try {
      final res = await ApiService.updateSettings(payload);
      if (mounted) {
        setState(() => _isSaving = false);
        if (res['success'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              backgroundColor: const Color(0xFF059669),
              content: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: Colors.white),
                  const SizedBox(width: 10),
                  Text('Settings updated successfully in MongoDB Atlas!', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              backgroundColor: const Color(0xFFE11D48),
              content: Text('Error: ${res['message'] ?? 'Failed to update'}', style: GoogleFonts.inter()),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            backgroundColor: const Color(0xFFE11D48),
            content: Text('Network Error: $e', style: GoogleFonts.inter()),
          ),
        );
      }
    }
  }

  void _showAddDoctorDialog() {
    final nameCtrl = TextEditingController();
    final deptCtrl = TextEditingController();
    final feeCtrl = TextEditingController(text: '500');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.person_add_alt_1_rounded, color: Color(0xFF0284C7), size: 22),
            ),
            const SizedBox(width: 12),
            Text('Add Doctor', style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 18)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildDialogTextField('Doctor Full Name', nameCtrl, Icons.person_outline, 'e.g. Dr. Ramesh Gupta'),
            const SizedBox(height: 12),
            _buildDialogTextField('Specialization / Dept', deptCtrl, Icons.medical_services_outlined, 'e.g. Cardiology, Orthopedic'),
            const SizedBox(height: 12),
            _buildDialogTextField('Consultation Fee (₹)', feeCtrl, Icons.currency_rupee, '500', isNumber: true),
          ],
        ),
        actionsPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: () {
              final n = nameCtrl.text.trim();
              if (n.isEmpty) return;
              setState(() {
                _doctorsList.add({
                  'name': n,
                  'department': deptCtrl.text.trim().isEmpty ? 'General Medicine' : deptCtrl.text.trim(),
                  'fee': double.tryParse(feeCtrl.text.trim()) ?? 500,
                });
              });
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            ),
            child: Text('Save Doctor', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildDialogTextField(String label, TextEditingController ctrl, IconData icon, String hint, {bool isNumber = false}) {
    return TextField(
      controller: ctrl,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon, color: const Color(0xFF0284C7), size: 20),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
    );
  }

  Future<void> _handleCreateBackup() async {
    setState(() => _isCreatingBackup = true);
    try {
      final res = await ApiService.createBackup();
      if (mounted) {
        setState(() => _isCreatingBackup = false);
        if (res['success'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              behavior: SnackBarBehavior.floating,
              backgroundColor: const Color(0xFF059669),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              content: Text('✅ ${res['message'] ?? 'Backup snapshot created successfully!'}', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
            ),
          );
          _loadSettings();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              behavior: SnackBarBehavior.floating,
              backgroundColor: const Color(0xFFE11D48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              content: Text('Backup Failed: ${res['message']}', style: GoogleFonts.inter()),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isCreatingBackup = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            behavior: SnackBarBehavior.floating,
            backgroundColor: const Color(0xFFE11D48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            content: Text('Error: $e', style: GoogleFonts.inter()),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDev = RoleAccess.isDeveloper;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0B1120) : const Color(0xFFF1F5F9),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(115),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isDark
                  ? [const Color(0xFF0F172A), const Color(0xFF1E293B)]
                  : [const Color(0xFF0284C7), const Color(0xFF0369A1)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                        onPressed: () => Navigator.pop(context),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'System Settings',
                                  style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 18, color: Colors.white),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isDev ? const Color(0xFF10B981) : Colors.amber,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    isDev ? 'DEV PRO' : 'ADMIN',
                                    style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.black),
                                  ),
                                ),
                              ],
                            ),
                            Text(
                              'Hospital Configuration & Technical Console',
                              style: GoogleFonts.inter(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.refresh_rounded, color: Colors.white),
                        tooltip: 'Sync Settings',
                        onPressed: _loadSettings,
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: TabBar(
                    controller: _tabController,
                    isScrollable: true,
                    indicatorColor: Colors.white,
                    indicatorWeight: 3,
                    labelColor: Colors.white,
                    unselectedLabelColor: Colors.white60,
                    labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 12.5),
                    unselectedLabelStyle: GoogleFonts.inter(fontWeight: FontWeight.w500, fontSize: 12),
                    tabs: const [
                      Tab(icon: Icon(Icons.business_rounded, size: 18), text: 'Hospital'),
                      Tab(icon: Icon(Icons.bed_rounded, size: 18), text: 'Beds & Ward'),
                      Tab(icon: Icon(Icons.receipt_long_rounded, size: 18), text: 'Billing'),
                      Tab(icon: Icon(Icons.notifications_active_rounded, size: 18), text: 'Alerts'),
                      Tab(icon: Icon(Icons.security_rounded, size: 18), text: 'Security'),
                      Tab(icon: Icon(Icons.dns_rounded, size: 18), text: 'Cloud & DB'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: SafeArea(
          child: SizedBox(
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _isSaving ? null : _saveSettings,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                foregroundColor: Colors.white,
                elevation: 3,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              icon: _isSaving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : const Icon(Icons.cloud_done_rounded, size: 22),
              label: Text(
                _isSaving ? 'Saving Changes to Cloud...' : 'Save & Sync Settings',
                style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 15),
              ),
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: Color(0xFF0284C7)),
                  SizedBox(height: 12),
                  Text('Loading Live System Settings...'),
                ],
              ),
            )
          : TabBarView(
              controller: _tabController,
              children: [
                _buildGeneralTab(isDark),
                _buildBedsTab(isDark),
                _buildBillingTab(isDark),
                _buildNotificationsTab(isDark),
                _buildSecurityTab(isDark),
                _buildBackupAndHealthTab(isDark),
              ],
            ),
    );
  }

  // ==================== 1. GENERAL TAB ====================
  Widget _buildGeneralTab(bool isDark) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
      children: [
        _buildHeroHeader(
          icon: Icons.local_hospital_rounded,
          title: 'Hospital Master Identity',
          subtitle: 'Official hospital credentials, registrations & contact info',
          accentColor: const Color(0xFF0284C7),
          isDark: isDark,
        ),
        const SizedBox(height: 14),
        _buildSectionCard(
          title: 'Hospital Profile',
          icon: Icons.apartment_rounded,
          isDark: isDark,
          children: [
            _buildTextField('Hospital Name', _hospitalNameCtrl, Icons.local_hospital_outlined),
            const SizedBox(height: 12),
            _buildTextField('Complete Address', _hospitalAddressCtrl, Icons.location_on_outlined, maxLines: 2),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildTextField('Helpline / Contact', _hospitalContactCtrl, Icons.phone_outlined)),
                const SizedBox(width: 10),
                Expanded(child: _buildTextField('Reg. License No.', _hospitalRegCtrl, Icons.badge_outlined)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildTextField('Official Email', _hospitalEmailCtrl, Icons.email_outlined)),
                const SizedBox(width: 10),
                Expanded(child: _buildTextField('Website URL', _hospitalWebsiteCtrl, Icons.language_rounded)),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        _buildSectionCard(
          title: 'Registered Doctors (${_doctorsList.length})',
          icon: Icons.people_alt_rounded,
          isDark: isDark,
          action: ElevatedButton.icon(
            onPressed: _showAddDoctorDialog,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.add_rounded, size: 16),
            label: Text('Add Doctor', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 12)),
          ),
          children: [
            if (_doctorsList.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 24),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white.withValues(alpha: 0.02) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    Icon(Icons.person_add_rounded, size: 36, color: Colors.grey.shade400),
                    const SizedBox(height: 8),
                    Text('No doctors configured yet', style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: Colors.grey)),
                    Text('Tap "+ Add Doctor" to configure hospital practitioners.', style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade500)),
                  ],
                ),
              )
            else
              ...List.generate(_doctorsList.length, (index) {
                final doc = _doctorsList[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F172A) : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    leading: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF0284C7), Color(0xFF38BDF8)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          (doc['name']?.toString() ?? 'D').isNotEmpty ? (doc['name'][0]).toUpperCase() : 'D',
                          style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 18),
                        ),
                      ),
                    ),
                    title: Text(doc['name'] ?? '', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14)),
                    subtitle: Text(
                      '${doc['department'] ?? 'General Medicine'}',
                      style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF0284C7), fontWeight: FontWeight.w600),
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '₹${doc['fee'] ?? 500}',
                            style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: const Color(0xFF059669), fontSize: 12),
                          ),
                        ),
                        const SizedBox(width: 6),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFE11D48), size: 20),
                          tooltip: 'Remove Doctor',
                          onPressed: () {
                            setState(() {
                              _doctorsList.removeAt(index);
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                );
              }),
          ],
        ),
      ],
    );
  }

  // ==================== 2. BEDS TAB ====================
  Widget _buildBedsTab(bool isDark) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
      children: [
        _buildHeroHeader(
          icon: Icons.bed_rounded,
          title: 'Bed Tariff & Capacity Engine',
          subtitle: 'Configure ward bed inventories, daily rates & auto-allocation codes',
          accentColor: const Color(0xFF10B981),
          isDark: isDark,
        ),
        const SizedBox(height: 14),
        _buildWardCard(
          wardName: 'General Ward',
          codePrefix: 'GEN-01 to GEN-N',
          countCtrl: _bedGenCountCtrl,
          chargeCtrl: _bedGenChargeCtrl,
          color: const Color(0xFF0284C7),
          icon: Icons.hotel_rounded,
          isDark: isDark,
        ),
        const SizedBox(height: 12),
        _buildWardCard(
          wardName: 'Intensive Care Unit (ICU)',
          codePrefix: 'ICU-01 to ICU-N',
          countCtrl: _bedIcuCountCtrl,
          chargeCtrl: _bedIcuChargeCtrl,
          color: const Color(0xFFDC2626),
          icon: Icons.emergency_rounded,
          isDark: isDark,
        ),
        const SizedBox(height: 12),
        _buildWardCard(
          wardName: 'Private Deluxe Room',
          codePrefix: 'PVT-01 to PVT-N',
          countCtrl: _bedPvtCountCtrl,
          chargeCtrl: _bedPvtChargeCtrl,
          color: const Color(0xFF10B981),
          icon: Icons.meeting_room_rounded,
          isDark: isDark,
        ),
      ],
    );
  }

  Widget _buildWardCard({
    required String wardName,
    required String codePrefix,
    required TextEditingController countCtrl,
    required TextEditingController chargeCtrl,
    required Color color,
    required IconData icon,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(wardName, style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 15)),
                    Text(codePrefix, style: GoogleFonts.inter(fontSize: 11, color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _buildTextField('Total Beds Count', countCtrl, Icons.numbers_rounded, isNumber: true),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildTextField('Daily Charge (₹)', chargeCtrl, Icons.currency_rupee, isNumber: true),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==================== 3. BILLING TAB ====================
  Widget _buildBillingTab(bool isDark) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
      children: [
        _buildHeroHeader(
          icon: Icons.receipt_long_rounded,
          title: 'Billing & Invoice Tariffs',
          subtitle: 'Default fee schedules, nursing rates, tax rules & receipt footer',
          accentColor: const Color(0xFF8B5CF6),
          isDark: isDark,
        ),
        const SizedBox(height: 14),
        _buildSectionCard(
          title: 'Standard Charge Rates',
          icon: Icons.payments_outlined,
          isDark: isDark,
          children: [
            Row(
              children: [
                Expanded(child: _buildTextField('OPD Consultation (₹)', _consultationFeeCtrl, Icons.medical_services_outlined, isNumber: true)),
                const SizedBox(width: 10),
                Expanded(child: _buildTextField('Daily Nursing Fee (₹)', _nursingChargeCtrl, Icons.health_and_safety_outlined, isNumber: true)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildTextField('General Ward / Day (₹)', _wardChargeCtrl, Icons.hotel_outlined, isNumber: true)),
                const SizedBox(width: 10),
                Expanded(child: _buildTextField('ICU Stay / Day (₹)', _icuChargeCtrl, Icons.emergency_outlined, isNumber: true)),
              ],
            ),
            const SizedBox(height: 12),
            _buildTextField('Applicable GST / Tax Rate (%)', _taxRateCtrl, Icons.percent_rounded, isNumber: true),
            const SizedBox(height: 12),
            _buildTextField('Official Invoice Footer Note', _invoiceFooterCtrl, Icons.notes_rounded, maxLines: 2),
          ],
        ),
      ],
    );
  }

  // ==================== 4. NOTIFICATIONS TAB ====================
  Widget _buildNotificationsTab(bool isDark) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
      children: [
        _buildHeroHeader(
          icon: Icons.notifications_active_rounded,
          title: 'Automated Hospital Notifications',
          subtitle: 'Real-time alert dispatchers, trigger rules & SMTP relay configuration',
          accentColor: const Color(0xFFF59E0B),
          isDark: isDark,
        ),
        const SizedBox(height: 14),
        _buildSectionCard(
          title: 'Event Trigger Switches',
          icon: Icons.tune_rounded,
          isDark: isDark,
          children: [
            _buildToggleTile(
              title: 'New Patient Admission Alert',
              subtitle: 'Trigger instant email/FCM notification upon IPD/OPD registration',
              value: _notifyNewPatient,
              onChanged: (v) => setState(() => _notifyNewPatient = v),
              color: const Color(0xFF0284C7),
              isDark: isDark,
            ),
            const Divider(height: 16),
            _buildToggleTile(
              title: 'Discharge Summary Alert',
              subtitle: 'Send discharge report & medical summary notification upon discharge',
              value: _notifyDischarge,
              onChanged: (v) => setState(() => _notifyDischarge = v),
              color: const Color(0xFF10B981),
              isDark: isDark,
            ),
            const Divider(height: 16),
            _buildToggleTile(
              title: 'Daily Digest & Occupancy Report',
              subtitle: 'Dispatch daily midnight summary to administrative authorities',
              value: _notifyDailyReport,
              onChanged: (v) => setState(() => _notifyDailyReport = v),
              color: const Color(0xFF8B5CF6),
              isDark: isDark,
            ),
          ],
        ),
        const SizedBox(height: 16),
        _buildSectionCard(
          title: 'SMTP Server Relay',
          icon: Icons.mark_email_read_rounded,
          isDark: isDark,
          children: [
            Row(
              children: [
                Expanded(flex: 2, child: _buildTextField('SMTP Host', _smtpHostCtrl, Icons.dns_outlined)),
                const SizedBox(width: 10),
                Expanded(child: _buildTextField('Port', _smtpPortCtrl, Icons.numbers_rounded, isNumber: true)),
              ],
            ),
            const SizedBox(height: 12),
            _buildTextField('Sender Display Name', _smtpFromCtrl, Icons.badge_outlined),
            const SizedBox(height: 12),
            _buildTextField('SMTP Username / Email', _smtpUserCtrl, Icons.person_outline),
            const SizedBox(height: 12),
            _buildTextField('SMTP App Password', _smtpPassCtrl, Icons.lock_outline, isPassword: true),
          ],
        ),
      ],
    );
  }

  Widget _buildToggleTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    required Color color,
    required bool isDark,
  }) {
    return SwitchListTile.adaptive(
      contentPadding: EdgeInsets.zero,
      title: Text(title, style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13.5)),
      subtitle: Text(subtitle, style: GoogleFonts.inter(fontSize: 11.5, color: Colors.grey)),
      value: value,
      activeColor: color,
      onChanged: onChanged,
    );
  }

  // ==================== 5. SECURITY TAB ====================
  Widget _buildSecurityTab(bool isDark) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
      children: [
        _buildHeroHeader(
          icon: Icons.shield_rounded,
          title: 'Access Control & Session Security',
          subtitle: 'Authentication safeguards, single-session lock & developer controls',
          accentColor: const Color(0xFFEF4444),
          isDark: isDark,
        ),
        const SizedBox(height: 14),
        _buildSectionCard(
          title: 'Security Policies',
          icon: Icons.admin_panel_settings_rounded,
          isDark: isDark,
          children: [
            Row(
              children: [
                Expanded(child: _buildTextField('Session Timeout (Mins)', _sessionTimeoutCtrl, Icons.timer_outlined, isNumber: true)),
                const SizedBox(width: 10),
                Expanded(child: _buildTextField('Max Login Attempts', _maxAttemptsCtrl, Icons.gpp_maybe_outlined, isNumber: true)),
              ],
            ),
            const SizedBox(height: 14),
            _buildToggleTile(
              title: 'Single Device Active Session',
              subtitle: 'Invalidate old session tokens when logging in from another device',
              value: _singleSessionOnly,
              onChanged: (v) => setState(() => _singleSessionOnly = v),
              color: const Color(0xFF0284C7),
              isDark: isDark,
            ),
            const Divider(height: 16),
            _buildToggleTile(
              title: 'Maintenance Mode (Lock System)',
              subtitle: 'Restrict all non-developer staff access during database upgrades',
              value: _maintenanceMode,
              onChanged: (v) => setState(() => _maintenanceMode = v),
              color: Colors.orange,
              isDark: isDark,
            ),
          ],
        ),
        const SizedBox(height: 16),
        _buildSectionCard(
          title: 'Staff & User Access Manager',
          icon: Icons.manage_accounts_rounded,
          isDark: isDark,
          children: [
            Text(
              'Easily manage receptionist permissions, doctor accounts, billing authorizations and role hierarchies.',
              style: GoogleFonts.inter(fontSize: 12.5, color: Colors.grey),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const UserManagementScreen()),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F172A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: const Icon(Icons.supervised_user_circle_rounded, size: 20, color: Color(0xFF38BDF8)),
                label: Text('Open User Management Portal', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14)),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ==================== 6. BACKUP & HEALTH TAB ====================
  Widget _buildBackupAndHealthTab(bool isDark) {
    final isDbConnected = _dbStatus?['readyState'] == 1 || _dbStatus?['status'] == 'connected';

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
      children: [
        _buildHeroHeader(
          icon: Icons.cloud_sync_rounded,
          title: 'Cloud Infrastructure & Snapshots',
          subtitle: 'Live MongoDB Atlas cluster telemetry, server ping & automated backups',
          accentColor: const Color(0xFF06B6D4),
          isDark: isDark,
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isDbConnected
                  ? (isDark ? [const Color(0xFF064E3B), const Color(0xFF0F172A)] : [const Color(0xFFECFDF5), Colors.white])
                  : (isDark ? [const Color(0xFF4C0519), const Color(0xFF0F172A)] : [const Color(0xFFFFF1F2), Colors.white]),
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDbConnected ? const Color(0xFF10B981) : const Color(0xFFE11D48)),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: (isDbConnected ? const Color(0xFF10B981) : const Color(0xFFE11D48)).withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isDbConnected ? Icons.cloud_done_rounded : Icons.cloud_off_rounded,
                      color: isDbConnected ? const Color(0xFF10B981) : const Color(0xFFE11D48),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('MongoDB Atlas Cluster', style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 15)),
                        Text(
                          isDbConnected ? 'Active Connection (ReadyState: 1)' : 'Cluster Disconnected',
                          style: GoogleFonts.inter(fontSize: 12, color: isDbConnected ? const Color(0xFF059669) : const Color(0xFFE11D48), fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDbConnected ? const Color(0xFF10B981) : const Color(0xFFE11D48),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      isDbConnected ? 'ONLINE' : 'OFFLINE',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 10, color: Colors.white),
                    ),
                  ),
                ],
              ),
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('API Server Status:', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey)),
                  Text('${_serverHealth?['status'] ?? 'Active (ok)'}', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 12, color: const Color(0xFF0284C7))),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Active Endpoint:', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey)),
                  Flexible(
                    child: Text(
                      apiBaseUrl,
                      style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildSectionCard(
          title: 'Database Cloud Snapshots (${_backupsList.length})',
          icon: Icons.cloud_upload_rounded,
          isDark: isDark,
          action: ElevatedButton.icon(
            onPressed: _isCreatingBackup ? null : _handleCreateBackup,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            icon: _isCreatingBackup
                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.backup_rounded, size: 16),
            label: Text(_isCreatingBackup ? 'Backing up...' : 'Create Backup', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 12)),
          ),
          children: [
            Text(
              'Instant encrypted snapshot captures all records: Patients, Admissions, Surgeries, Notes & Billings.',
              style: GoogleFonts.inter(fontSize: 12.5, color: Colors.grey),
            ),
            const SizedBox(height: 14),
            if (_backupsList.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 24),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white.withValues(alpha: 0.02) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    Icon(Icons.inventory_2_outlined, size: 36, color: Colors.grey.shade400),
                    const SizedBox(height: 8),
                    Text('No backups recorded yet', style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: Colors.grey)),
                    Text('Tap "Create Backup" to generate your first snapshot.', style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade500)),
                  ],
                ),
              )
            else
              ...List.generate(_backupsList.length, (idx) {
                final b = _backupsList[idx];
                final fn = b['filename'] ?? 'Backup_${idx + 1}.json';
                final time = b['time'] ?? b['createdAt'] ?? '';
                final size = b['size'] != null ? '${(b['size'] / 1024).toStringAsFixed(1)} KB' : '';

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F172A) : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0284C7).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.code_rounded, color: Color(0xFF0284C7), size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(fn, style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13), overflow: TextOverflow.ellipsis),
                            if (time.isNotEmpty || size.isNotEmpty)
                              Text('$time ${size.isNotEmpty ? '• $size' : ''}', style: GoogleFonts.inter(fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                      ),
                      const Icon(Icons.cloud_done_rounded, color: Color(0xFF10B981), size: 20),
                    ],
                  ),
                );
              }),
          ],
        ),
      ],
    );
  }

  // ==================== COMMON REUSABLE BUILDERS ====================
  Widget _buildHeroHeader({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color accentColor,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: accentColor, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 15)),
                const SizedBox(height: 2),
                Text(subtitle, style: GoogleFonts.inter(fontSize: 11.5, color: Colors.grey)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required bool isDark,
    required List<Widget> children,
    Widget? action,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: const Color(0xFF0284C7), size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 15, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                ),
              ),
              if (action != null) action,
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller,
    IconData icon, {
    bool isNumber = false,
    bool isPassword = false,
    int maxLines = 1,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return TextField(
      controller: controller,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      obscureText: isPassword,
      maxLines: maxLines,
      style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.inter(fontSize: 12, color: isDark ? Colors.white54 : const Color(0xFF64748B), fontWeight: FontWeight.w500),
        prefixIcon: Icon(icon, size: 19, color: const Color(0xFF0284C7)),
        filled: true,
        fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF0284C7), width: 1.8),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      ),
    );
  }
}
