import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../services/api_service.dart';
import '../services/role_access.dart';
import 'daily_notes_screen.dart';
import 'billing_screen.dart';
import 'discharge_screen.dart';

class PatientDetailScreen extends StatefulWidget {
  final dynamic patient;
  const PatientDetailScreen({super.key, required this.patient});

  @override
  State<PatientDetailScreen> createState() => _PatientDetailScreenState();
}

class _PatientDetailScreenState extends State<PatientDetailScreen> {
  late Map<String, dynamic> _patient;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _patient = Map<String, dynamic>.from(widget.patient);
    _refreshPatient();
  }

  Future<void> _refreshPatient() async {
    final id = _patient['patient_id'] ?? _patient['_id'];
    if (id == null) return;
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.getPatientById(id.toString());
      if (result['success'] == true && result['patient'] != null) {
        setState(() => _patient = Map<String, dynamic>.from(result['patient']));
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  void _dischargePatient() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => DischargeScreen(initialPatient: Map<String, dynamic>.from(_patient)),
      ),
    ).then((_) => _refreshPatient());
  }

  Future<void> _confirmDeletePatient() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Patient'),
        content: Text('Are you sure you want to delete ${_patient['name']}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    final pId = (_patient['patient_id'] ?? _patient['_id'] ?? '').toString();
    final res = await ApiService.deletePatient(pId);
    if (res['success'] == true) {
      if (mounted) Navigator.pop(context, true);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['message'] ?? 'Failed to delete patient')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final name = _patient['name'] ?? 'Unknown';
    final status = (_patient['status'] ?? 'Admitted').toString();
    final isAdmitted = status.toLowerCase() == 'admitted';
    final patientId = _patient['patient_id'] ?? '';
    final age = _patient['age']?.toString() ?? '-';
    final gender = _patient['gender'] ?? '-';
    final bloodGroup = _patient['blood_group'] ?? 'Unknown';
    final guardian = _patient['guardian_name'] ?? '-';
    final mobile = _patient['mobile'] ?? '-';
    final address = _patient['address'] ?? '-';
    final problem = _patient['problem'] ?? '-';
    final doctor = _patient['doctor_assigned'] ?? '-';
    final patientType = _patient['patient_type'] ?? 'IPD';
    final admissionDate = _patient['admission_date'] ?? '';
    final bedNo = _patient['bed_no'];
    
    final List<dynamic> surgeries = _patient['surgeries'] ?? [];
    final totalBill = _patient['totalBill']?.toString() ?? '0';
    final pendingAmount = _patient['pending_amount']?.toString() ?? '0';
    final paymentStatus = (_patient['payment_status'] ?? 'Pending').toString();

    // Combine status and type for a single clean badge
    String badgeText = patientType == 'OPD' ? 'OPD' : (isAdmitted ? 'ADMITTED - IPD' : status.toUpperCase());
    Color badgeColor = patientType == 'OPD' ? const Color(0xFF2563EB) : (isAdmitted ? AppColors.accent : AppColors.warning);

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : const Color(0xFFF8F9FA),
      appBar: AppBar(
        systemOverlayStyle: isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
        title: const SizedBox.shrink(),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if ((isAdmitted && RoleAccess.canDischarge) || RoleAccess.canDeletePatient)
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'discharge') _dischargePatient();
                if (value == 'delete') _confirmDeletePatient();
              },
              icon: Icon(Icons.more_vert, color: isDark ? Colors.white : Colors.black87),
              itemBuilder: (_) => [
                if (isAdmitted && RoleAccess.canDischarge)
                  const PopupMenuItem(value: 'discharge', child: Text('Discharge Patient')),
                if (RoleAccess.canDeletePatient)
                  const PopupMenuItem(
                    value: 'delete',
                    child: Text('Delete Patient', style: TextStyle(color: Colors.red)),
                  ),
              ],
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refreshPatient,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                children: [
                  // ── UNIFIED PROFILE HEADER ──
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 20,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        CircleAvatar(
                          radius: 36,
                          backgroundColor: badgeColor.withValues(alpha: 0.1),
                          child: Text(
                            name.isNotEmpty ? name[0].toUpperCase() : '?',
                            style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: badgeColor),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, height: 1.2, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Text(
                                    'ID: $patientId',
                                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: badgeColor),
                                  ),
                                  const SizedBox(width: 12),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: badgeColor.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      badgeText,
                                      style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: badgeColor, letterSpacing: 0.5),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '$age yrs • $gender • Blood: $bloodGroup',
                                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: const Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05, end: 0),

                  const SizedBox(height: 20),

                  // ── QUICK ACTION BUTTONS ──
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        if (RoleAccess.canViewDailyNotes && patientType == 'IPD') ...[
                          _buildQuickAction(Icons.note_add_rounded, 'Notes', AppColors.accent, () => Navigator.push(context, MaterialPageRoute(builder: (_) => DailyNotesScreen(patient: _patient))), isDark),
                          const SizedBox(width: 12),
                        ],
                        if (RoleAccess.canViewBilling) ...[
                          _buildQuickAction(Icons.receipt_long_rounded, 'Billing', AppColors.primary, () => Navigator.push(context, MaterialPageRoute(builder: (_) => BillingScreen(patient: _patient))), isDark),
                          const SizedBox(width: 12),
                        ],
                        if (isAdmitted && RoleAccess.canDischarge) ...[
                          _buildQuickAction(
                            patientType == 'OPD' ? Icons.assignment_turned_in_rounded : Icons.exit_to_app_rounded,
                            patientType == 'OPD' ? 'Visit Slip' : 'Discharge',
                            patientType == 'OPD' ? const Color(0xFF2563EB) : AppColors.error,
                            _dischargePatient,
                            isDark,
                          ),
                        ],
                      ],
                    ),
                  ).animate().fadeIn(delay: 100.ms, duration: 400.ms),

                  const SizedBox(height: 24),
                  
                  // ── GROUPED INFORMATION SECTIONS ──
                  Text('Contact Details', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF64748B), letterSpacing: 0.5)).animate().fadeIn(delay: 200.ms),
                  const SizedBox(height: 8),
                  _buildInfoGroup([
                    _buildInfoRow(Icons.family_restroom_rounded, 'Guardian', guardian, isDark, iconColor: const Color(0xFF8B5CF6)),
                    _buildInfoRow(Icons.phone_rounded, 'Mobile', mobile, isDark, iconColor: const Color(0xFF10B981)),
                    _buildInfoRow(Icons.location_on_rounded, 'Address', address, isDark, isLast: true, iconColor: const Color(0xFFF59E0B)),
                  ], isDark).animate().fadeIn(delay: 200.ms).slideY(begin: 0.05, end: 0),

                  const SizedBox(height: 24),
                  
                  Text('Medical Details', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF64748B), letterSpacing: 0.5)).animate().fadeIn(delay: 300.ms),
                  const SizedBox(height: 8),
                  _buildInfoGroup([
                    _buildInfoRow(Icons.medical_services_rounded, 'Problem', problem, isDark, iconColor: const Color(0xFFEF4444)),
                    _buildInfoRow(Icons.local_hospital_rounded, 'Doctor', doctor, isDark, iconColor: const Color(0xFF3B82F6)),
                    _buildInfoRow(Icons.calendar_today_rounded, 'Admission Date', _formatDate(admissionDate), isDark, isLast: bedNo == null, iconColor: const Color(0xFF06B6D4)),
                    if (bedNo != null)
                      _buildInfoRow(Icons.hotel_rounded, 'Bed No', bedNo.toString(), isDark, isLast: true, iconColor: const Color(0xFFF97316)),
                  ], isDark).animate().fadeIn(delay: 300.ms).slideY(begin: 0.05, end: 0),
                  
                  if (surgeries.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    Text('Surgery History', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF6B46C1), letterSpacing: 0.5)).animate().fadeIn(delay: 400.ms),
                    const SizedBox(height: 8),
                    ...surgeries.map((s) => _buildSurgeryCard(s, isDark).animate().fadeIn(delay: 400.ms).slideY(begin: 0.05, end: 0)),
                  ],

                  const SizedBox(height: 24),
                  Text('Billing Summary', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF64748B), letterSpacing: 0.5)).animate().fadeIn(delay: 500.ms),
                  const SizedBox(height: 8),
                  _buildBillingSummary(totalBill, pendingAmount, paymentStatus, isDark).animate().fadeIn(delay: 500.ms).slideY(begin: 0.05, end: 0),

                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  Widget _buildQuickAction(IconData icon, String label, Color color, VoidCallback onTap, bool isDark) {
    return FilledButton.tonalIcon(
      onPressed: onTap,
      style: FilledButton.styleFrom(
        backgroundColor: color.withValues(alpha: 0.1),
        foregroundColor: color,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      icon: Icon(icon, size: 20),
      label: Text(label, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700)),
    );
  }

  Widget _buildInfoGroup(List<Widget> rows, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: isDark ? Colors.white12 : const Color(0xFFF1F5F9)),
      ),
      child: Column(children: rows),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value, bool isDark, {bool isLast = false, Color iconColor = const Color(0xFF64748B)}) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDark ? iconColor.withValues(alpha: 0.2) : iconColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 18, color: iconColor),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: const Color(0xFF94A3B8))),
                    const SizedBox(height: 2),
                    Text(value, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: isDark ? Colors.white : const Color(0xFF1E293B))),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (!isLast)
          Divider(height: 1, thickness: 1, color: isDark ? Colors.white12 : const Color(0xFFF1F5F9), indent: 56, endIndent: 16),
      ],
    );
  }

  Widget _buildSurgeryCard(dynamic s, bool isDark) {
    final surgeryName = s['surgeryName'] ?? 'Unknown Surgery';
    final indoorNo = s['indoorNo'];
    final wardNo = s['wardNo'];
    final surgeonName = s['surgeonName'] ?? 'Unknown Surgeon';
    final surgeryDate = s['surgeryDate'] ?? '';
    final provisional = s['provisional'];
    final finalDiag = s['finalDiag'];
    final guardianName = s['guardianName'];
    final witnessName = s['witnessName'];
    final guardianSignature = s['guardianSignature'];
    final cost = s['cost']?.toString() ?? '0';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: const BorderSide(color: Color(0xFF8B5CF6), width: 4)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    Text(surgeryName, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: isDark ? Colors.white : const Color(0xFF1E293B))),
                    if (indoorNo != null && indoorNo.toString().isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: const Color(0xFFE0E7FF), borderRadius: BorderRadius.circular(4), border: Border.all(color: const Color(0xFFC7D2FE))),
                        child: Text('Indoor: $indoorNo', style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF4F46E5), fontWeight: FontWeight.w600)),
                      ),
                    if (wardNo != null && wardNo.toString().isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(4), border: Border.all(color: const Color(0xFFFDE68A))),
                        child: Text('Ward: $wardNo', style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFFD97706), fontWeight: FontWeight.w600)),
                      ),
                  ],
                ),
              ),
              if (RoleAccess.canViewBilling)
                Text('₹$cost', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w800, color: const Color(0xFF8B5CF6)))
              else
                const Icon(Icons.lock_outline_rounded, size: 14, color: Color(0xFF94A3B8)),
            ],
          ),
          const SizedBox(height: 8),
          Text('Surgeon: $surgeonName  |  Date: ${_formatDate(surgeryDate)}', style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B), fontWeight: FontWeight.w500)),
          
          if ((provisional != null && provisional.toString().isNotEmpty) || (finalDiag != null && finalDiag.toString().isNotEmpty)) ...[
            const SizedBox(height: 8),
            Text(
              '${provisional != null ? 'Prov: $provisional' : ''}${provisional != null && finalDiag != null ? '  |  ' : ''}${finalDiag != null ? 'Final: $finalDiag' : ''}',
              style: GoogleFonts.inter(fontSize: 12, fontStyle: FontStyle.italic, color: const Color(0xFF94A3B8)),
            ),
          ],

          if ((guardianName != null && guardianName.toString().isNotEmpty) || (witnessName != null && witnessName.toString().isNotEmpty)) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: isDark ? Colors.white12 : const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
              child: Text(
                '${guardianName != null ? 'Guardian: $guardianName' : ''}${guardianName != null && witnessName != null ? '  |  ' : ''}${witnessName != null ? 'Witness: $witnessName' : ''}',
                style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B), fontWeight: FontWeight.w500),
              ),
            ),
          ],

          if (guardianSignature != null && guardianSignature.toString().isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Text('Signature Proof: ', style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600)),
                const SizedBox(width: 8),
                Container(
                  height: 40,
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                    borderRadius: BorderRadius.circular(4),
                    color: isDark ? Colors.white12 : Colors.white,
                  ),
                  child: Image.network(
                    guardianSignature,
                    errorBuilder: (context, error, stackTrace) => const Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Icon(Icons.broken_image, size: 20, color: Colors.grey)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBillingSummary(String totalBill, String pendingAmount, String paymentStatus, bool isDark) {
    final isPending = paymentStatus.toLowerCase() == 'pending';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white12 : const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (RoleAccess.canViewBilling)
                Text('Total Bill: ₹$totalBill', style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF64748B), fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: (isPending ? AppColors.error : const Color(0xFF10B981)).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  paymentStatus.toUpperCase(),
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: isPending ? AppColors.error : const Color(0xFF059669)),
                ),
              ),
            ],
          ),
          if (RoleAccess.canViewBilling && isPending)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('Balance Due', style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B), fontWeight: FontWeight.w500)),
                Text('₹$pendingAmount', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.error)),
              ],
            ),
        ],
      ),
    );
  }

  String _formatDate(dynamic date) {
    if (date == null || date.toString().isEmpty) return '-';
    try {
      final dt = DateTime.parse(date.toString());
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return date.toString();
    }
  }
}
