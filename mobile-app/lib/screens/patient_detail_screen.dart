import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../services/api_service.dart';
import '../services/role_access.dart';
import 'daily_notes_screen.dart';
import 'billing_screen.dart';

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
    final id = _patient['_id'];
    if (id == null) return;
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.getPatientById(id);
      if (result['success'] == true && result['patient'] != null) {
        setState(() => _patient = Map<String, dynamic>.from(result['patient']));
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _dischargePatient() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Discharge'),
        content: Text('Are you sure you want to discharge ${_patient['name']}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Discharge'),
          ),
        ],
      ),
    );

    if (confirm != true) return;
    setState(() => _isLoading = true);

    try {
      final result = await ApiService.dischargePatient({
        'patientId': _patient['_id'],
      });
      if (!mounted) return;

      if (result['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Patient discharged successfully'), backgroundColor: AppColors.success),
        );
        Navigator.pop(context, true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result['message'] ?? 'Discharge failed'), backgroundColor: AppColors.error),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error: Cannot connect to server'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
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
    final guardian = _patient['guardian_name'] ?? '-';
    final mobile = _patient['mobile'] ?? '-';
    final address = _patient['address'] ?? '-';
    final problem = _patient['problem'] ?? '-';
    final doctor = _patient['doctor_assigned'] ?? '-';
    final patientType = _patient['patient_type'] ?? 'IPD';
    final admissionDate = _patient['admission_date'] ?? '';

    return Scaffold(
      appBar: AppBar(
        title: Text(name),
        actions: [
          if (isAdmitted && RoleAccess.canDischarge)
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'discharge') _dischargePatient();
              },
              itemBuilder: (_) => [
                const PopupMenuItem(value: 'discharge', child: Text('Discharge Patient')),
              ],
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refreshPatient,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  // Patient Header Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 30,
                            backgroundColor: (isAdmitted ? AppColors.accent : AppColors.warning).withValues(alpha: 0.1),
                            child: Text(
                              name.isNotEmpty ? name[0].toUpperCase() : '?',
                              style: GoogleFonts.inter(
                                fontSize: 24,
                                fontWeight: FontWeight.w700,
                                color: isAdmitted ? AppColors.accent : AppColors.warning,
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(name, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700)),
                                const SizedBox(height: 4),
                                Text('ID: $patientId', style: GoogleFonts.inter(fontSize: 13, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight)),
                              ],
                            ),
                          ),
                          Column(
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
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  patientType,
                                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary, letterSpacing: 0.5),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05, end: 0),

                  const SizedBox(height: 16),

                  // Quick Actions
                  Row(
                    children: [
                      if (RoleAccess.canViewDailyNotes) ...[
                        _ActionButton(
                          icon: Icons.note_add,
                          label: 'Daily Notes',
                          color: AppColors.accent,
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => DailyNotesScreen(patient: _patient))),
                        ),
                      ],
                      if (RoleAccess.canViewBilling) ...[
                        if (RoleAccess.canViewDailyNotes) const SizedBox(width: 12),
                        _ActionButton(
                          icon: Icons.receipt_long,
                          label: 'Billing',
                          color: AppColors.primary,
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => BillingScreen(patient: _patient))),
                        ),
                      ],
                      if (isAdmitted && RoleAccess.canDischarge) ...[
                        if (RoleAccess.canViewDailyNotes || RoleAccess.canViewBilling) const SizedBox(width: 12),
                        _ActionButton(
                          icon: Icons.exit_to_app,
                          label: 'Discharge',
                          color: AppColors.error,
                          onTap: _dischargePatient,
                        ),
                      ],
                    ],
                  ).animate().fadeIn(delay: 200.ms, duration: 400.ms),

                  const SizedBox(height: 24),

                  // Details Section
                  Text('Patient Information', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),

                  _InfoTile(icon: Icons.cake_outlined, label: 'Age', value: '$age years'),
                  _InfoTile(icon: Icons.wc_outlined, label: 'Gender', value: gender),
                  _InfoTile(icon: Icons.family_restroom_outlined, label: 'Guardian', value: guardian),
                  _InfoTile(icon: Icons.phone_outlined, label: 'Mobile', value: mobile),
                  _InfoTile(icon: Icons.location_on_outlined, label: 'Address', value: address),
                  _InfoTile(icon: Icons.medical_services_outlined, label: 'Problem', value: problem),
                  _InfoTile(icon: Icons.local_hospital_outlined, label: 'Doctor', value: doctor),
                  _InfoTile(icon: Icons.calendar_today_outlined, label: 'Admission Date', value: _formatDate(admissionDate)),
                  if (_patient['bed_no'] != null)
                    _InfoTile(icon: Icons.hotel_outlined, label: 'Bed No', value: _patient['bed_no'].toString()),
                ],
              ),
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

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withValues(alpha: 0.15)),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 6),
              Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoTile({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: AppColors.primary, size: 22),
        title: Text(label, style: GoogleFonts.inter(fontSize: 12, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight)),
        subtitle: Text(value, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
