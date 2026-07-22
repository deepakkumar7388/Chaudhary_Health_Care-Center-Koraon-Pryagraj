import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../services/api_service.dart';
import '../services/role_access.dart';

class DailyNotesScreen extends StatefulWidget {
  final Map<String, dynamic>? patient;
  const DailyNotesScreen({super.key, this.patient});

  @override
  State<DailyNotesScreen> createState() => _DailyNotesScreenState();
}

class _DailyNotesScreenState extends State<DailyNotesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<String, dynamic>? _selectedPatient;
  List<dynamic> _patients = [];
  List<dynamic> _filteredPatients = [];
  bool _isLoadingNotes = false;

  List<dynamic> _vitalsNotes = [];
  List<dynamic> _medicationNotes = [];

  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _selectedPatient = widget.patient;

    _loadPatients().then((_) {
      if (_selectedPatient != null) {
        _loadNotesForPatient(_selectedPatient!['_id']);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPatients() async {
    try {
      final list = await ApiService.getPatients();
      // Filter out discharged patients matching web logic
      _patients = list.where((p) {
        final status = (p['status'] ?? 'Admitted').toString().toUpperCase();
        return status != 'DISCHARGED';
      }).toList();
      _filteredPatients = _patients;

      // If no patient passed via constructor, default select first patient
      if (_selectedPatient == null && _patients.isNotEmpty) {
        _selectedPatient = _patients.first;
      }
    } catch (e) {
      debugPrint('Error loading patients: $e');
    }
  }

  Future<void> _loadNotesForPatient(String patientId) async {
    setState(() => _isLoadingNotes = true);
    try {
      final res = await ApiService.getDailyNotes(patientId);
      _vitalsNotes = res.where((n) => n['type'] == 'vitals').toList();
      _medicationNotes = res.where((n) => n['type'] == 'medication').toList();

      // Sort by newest first
      _vitalsNotes.sort((a, b) {
        final dA = DateTime.tryParse('${a['date']} ${a['time']}') ?? DateTime(1970);
        final dB = DateTime.tryParse('${b['date']} ${b['time']}') ?? DateTime(1970);
        return dB.compareTo(dA);
      });
      _medicationNotes.sort((a, b) {
        final dA = DateTime.tryParse('${a['date']} ${a['time']}') ?? DateTime(1970);
        final dB = DateTime.tryParse('${b['date']} ${b['time']}') ?? DateTime(1970);
        return dB.compareTo(dA);
      });
    } catch (e) {
      debugPrint('Error loading notes: $e');
    }
    if (mounted) setState(() => _isLoadingNotes = false);
  }

  void _filterPatients(String query) {
    final q = query.toLowerCase().trim();
    setState(() {
      if (q.isEmpty) {
        _filteredPatients = _patients;
      } else {
        _filteredPatients = _patients.where((p) {
          final name = (p['name'] ?? '').toString().toLowerCase();
          final id = (p['patient_id'] ?? '').toString().toLowerCase();
          return name.contains(q) || id.contains(q);
        }).toList();
      }
    });
  }

  // ── ADD VITALS / OBSERVATION MODAL ──
  Future<void> _showAddVitalsModal() async {
    if (_selectedPatient == null) return;

    final pulseCtrl = TextEditingController();
    final bpCtrl = TextEditingController();
    final tempCtrl = TextEditingController();
    final spo2Ctrl = TextEditingController();
    final rbsCtrl = TextEditingController();
    final urineCtrl = TextEditingController();
    final drainCtrl = TextEditingController();
    final painCtrl = TextEditingController();

    final now = DateTime.now();
    DateTime selectedDate = now;
    TimeOfDay selectedTime = TimeOfDay.now();

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (context, setModalState) {
            final dateStr = '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}';
            final timeStr = '${selectedTime.hour.toString().padLeft(2, '0')}:${selectedTime.minute.toString().padLeft(2, '0')}';

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
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Icon(Icons.favorite_rounded, color: Color(0xFF0284C7)),
                        const SizedBox(width: 8),
                        Text(
                          'Add Clinical Observation',
                          style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                    Text(
                      _selectedPatient!['name'] ?? '',
                      style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF0284C7), fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 16),

                    // ── OBSERVATION DATE & TIME PICKERS ──
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              final d = await showDatePicker(
                                context: context,
                                initialDate: selectedDate,
                                firstDate: DateTime(2025),
                                lastDate: DateTime(2030),
                              );
                              if (d != null) setModalState(() => selectedDate = d);
                            },
                            child: InputDecorator(
                              decoration: InputDecoration(
                                labelText: 'Date *',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                                prefixIcon: const Icon(Icons.calendar_today_rounded, size: 18, color: Color(0xFF0284C7)),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              ),
                              child: Text(dateStr, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              final t = await showTimePicker(
                                context: context,
                                initialTime: selectedTime,
                              );
                              if (t != null) setModalState(() => selectedTime = t);
                            },
                            child: InputDecorator(
                              decoration: InputDecoration(
                                labelText: 'Time *',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                                prefixIcon: const Icon(Icons.access_time_rounded, size: 18, color: Color(0xFF0284C7)),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              ),
                              child: Text(timeStr, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    Row(
                      children: [
                        Expanded(child: _vitalsField('Pulse (/min)', pulseCtrl, TextInputType.number, '72')),
                        const SizedBox(width: 12),
                        Expanded(child: _vitalsField('BP (mmHg)', bpCtrl, TextInputType.text, '120/80')),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _vitalsField('Temp (°F)', tempCtrl, const TextInputType.numberWithOptions(decimal: true), '98.6')),
                        const SizedBox(width: 12),
                        Expanded(child: _vitalsField('SpO2 (%)', spo2Ctrl, TextInputType.number, '98')),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _vitalsField('RBS (mg/dL)', rbsCtrl, TextInputType.number, '110')),
                        const SizedBox(width: 12),
                        Expanded(child: _vitalsField('Pain Score (1-10)', painCtrl, TextInputType.number, '1-10')),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _vitalsField('Urine Output (ml)', urineCtrl, TextInputType.number, 'Optional')),
                        const SizedBox(width: 12),
                        Expanded(child: _vitalsField('Drain Output (ml)', drainCtrl, TextInputType.number, 'Optional')),
                      ],
                    ),
                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          try {
                            final payload = {
                              'type': 'vitals',
                              'date': dateStr,
                              'time': timeStr,
                              'pulse': pulseCtrl.text.trim(),
                              'bp': bpCtrl.text.trim(),
                              'temp': tempCtrl.text.trim(),
                              'spo2': spo2Ctrl.text.trim(),
                              'rbs': rbsCtrl.text.trim(),
                              'urineOutput': urineCtrl.text.trim(),
                              'drainOutput': drainCtrl.text.trim(),
                              'painScore': painCtrl.text.trim(),
                            };
                            await ApiService.addDailyNote(_selectedPatient!['_id'], payload);
                            if (ctx.mounted) Navigator.pop(ctx, true);
                          } catch (e) {
                            if (ctx.mounted) {
                              ScaffoldMessenger.of(ctx).showSnackBar(
                                const SnackBar(content: Text('Failed to add observation'), backgroundColor: AppColors.error),
                              );
                            }
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.check_circle_rounded, color: Colors.white),
                        label: Text('Save Observation', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15, color: Colors.white)),
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

    if (result == true) {
      _loadNotesForPatient(_selectedPatient!['_id']);
    }
  }

  // ── PRESCRIBE MEDICATION MODAL (DOCTORS & ADMIN ONLY) ──
  Future<void> _showPrescribeMedicationModal() async {
    if (_selectedPatient == null) return;

    final nameCtrl = TextEditingController();
    final doseCtrl = TextEditingController();
    String medType = 'Injection';

    final now = DateTime.now();
    DateTime selectedDate = now;
    TimeOfDay selectedTime = TimeOfDay.now();

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (context, setModalState) {
            final dateStr = '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}';
            final timeStr = '${selectedTime.hour.toString().padLeft(2, '0')}:${selectedTime.minute.toString().padLeft(2, '0')}';

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
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Icon(Icons.medication_liquid_rounded, color: Color(0xFF10B981)),
                        const SizedBox(width: 8),
                        Text(
                          'Prescribe Medication',
                          style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                    Text(
                      _selectedPatient!['name'] ?? '',
                      style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF10B981), fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 16),

                    // ── SCHEDULE DATE & TIME PICKERS ──
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              final d = await showDatePicker(
                                context: context,
                                initialDate: selectedDate,
                                firstDate: DateTime(2025),
                                lastDate: DateTime(2030),
                              );
                              if (d != null) setModalState(() => selectedDate = d);
                            },
                            child: InputDecorator(
                              decoration: InputDecoration(
                                labelText: 'Prescribe Date *',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                                prefixIcon: const Icon(Icons.calendar_today_rounded, size: 18, color: Color(0xFF10B981)),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              ),
                              child: Text(dateStr, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              final t = await showTimePicker(
                                context: context,
                                initialTime: selectedTime,
                              );
                              if (t != null) setModalState(() => selectedTime = t);
                            },
                            child: InputDecorator(
                              decoration: InputDecoration(
                                labelText: 'Schedule Time *',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                                prefixIcon: const Icon(Icons.access_time_rounded, size: 18, color: Color(0xFF10B981)),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              ),
                              child: Text(timeStr, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    DropdownButtonFormField<String>(
                      initialValue: medType,
                      decoration: InputDecoration(
                        labelText: 'Medication Type',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'Injection', child: Text('Injection')),
                        DropdownMenuItem(value: 'Tablet', child: Text('Tablet')),
                        DropdownMenuItem(value: 'Syrup', child: Text('Syrup')),
                        DropdownMenuItem(value: 'Other', child: Text('Other')),
                      ],
                      onChanged: (v) => setModalState(() => medType = v!),
                    ),
                    const SizedBox(height: 12),
                    _vitalsField('Drug / Medicine Name *', nameCtrl, TextInputType.text, 'E.g. Monocef'),
                    const SizedBox(height: 12),
                    _vitalsField('Dose *', doseCtrl, TextInputType.text, 'E.g. 1g / 500mg'),
                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          if (nameCtrl.text.trim().isEmpty || doseCtrl.text.trim().isEmpty) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              const SnackBar(content: Text('Please enter drug name and dose'), backgroundColor: AppColors.error),
                            );
                            return;
                          }
                          try {
                            final payload = {
                              'type': 'medication',
                              'date': dateStr,
                              'time': timeStr,
                              'medType': medType,
                              'drugName': nameCtrl.text.trim(),
                              'dose': doseCtrl.text.trim(),
                              'status': 'Pending',
                            };
                            await ApiService.addDailyNote(_selectedPatient!['_id'], payload);
                            if (ctx.mounted) Navigator.pop(ctx, true);
                          } catch (e) {
                            if (ctx.mounted) {
                              ScaffoldMessenger.of(ctx).showSnackBar(
                                const SnackBar(content: Text('Failed to prescribe medication'), backgroundColor: AppColors.error),
                              );
                            }
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.send_rounded, color: Colors.white),
                        label: Text('Prescribe Medicine', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15, color: Colors.white)),
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

    if (result == true) {
      _loadNotesForPatient(_selectedPatient!['_id']);
    }
  }

  // ── MARK DOSE AS GIVEN (STAFF & DOCTORS) ──
  Future<void> _markDoseAsGiven(Map<String, dynamic> med) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Confirm Administration', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text(
          'Mark "${med['drugName']} (${med['dose']})"` as Given?',
          style: GoogleFonts.inter(fontSize: 14),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            child: const Text('Yes, Mark Given'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final user = await ApiService.getSavedUser();
      final doneBy = user?['name'] ?? 'Staff';
      final now = DateTime.now();
      final doneTime = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

      await ApiService.updateDailyNote(med['_id'], {
        'status': 'Given',
        'doneBy': doneBy,
        'doneTime': doneTime,
      });

      _loadNotesForPatient(_selectedPatient!['_id']);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update dose status'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Widget _vitalsField(String label, TextEditingController controller, TextInputType keyboard, String hint) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return TextFormField(
      controller: controller,
      keyboardType: keyboard,
      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final canPrescribe = RoleAccess.isDoctorLevel || RoleAccess.isAdminLevel;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
        title: Text(
          'Clinical Patient Register',
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF0284C7),
          unselectedLabelColor: isDark ? Colors.white60 : const Color(0xFF64748B),
          indicatorColor: const Color(0xFF0284C7),
          indicatorWeight: 3,
          labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700),
          tabs: const [
            Tab(icon: Icon(Icons.favorite_outline_rounded, size: 18), text: 'Vitals & Observations'),
            Tab(icon: Icon(Icons.medication_outlined, size: 18), text: 'Medication Schedule'),
          ],
        ),
      ),
      body: Column(
        children: [
          // ── PATIENT SELECTOR HEADER ──
          Container(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: _showPatientSearchSheet,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.person_search_rounded, size: 20, color: Color(0xFF0284C7)),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _selectedPatient != null
                                      ? '${_selectedPatient!['name']} | ID: ${_selectedPatient!['patient_id']}'
                                      : 'Select Patient for Register',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF0284C7)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── ACTION BAR (ADD VITALS & PRESCRIBE) ──
          if (_selectedPatient != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF0F9FF),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _showAddVitalsModal,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF0284C7),
                        side: const BorderSide(color: Color(0xFF0284C7)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                      label: Text('Add Vitals', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13)),
                    ),
                  ),
                  if (canPrescribe) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _showPrescribeMedicationModal,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.medication_rounded, size: 18),
                        label: Text('Prescribe', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13)),
                      ),
                    ),
                  ],
                ],
              ),
            ),

          // ── TAB VIEWS ──
          Expanded(
            child: _selectedPatient == null
                ? Center(
                    child: Text(
                      'Select a patient above to view register',
                      style: GoogleFonts.inter(color: Colors.grey),
                    ),
                  )
                : _isLoadingNotes
                    ? const Center(child: CircularProgressIndicator())
                    : TabBarView(
                        controller: _tabController,
                        children: [
                          _buildVitalsTab(isDark),
                          _buildMedicationsTab(isDark),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  // ── VITALS REGISTER LIST ──
  Widget _buildVitalsTab(bool isDark) {
    if (_vitalsNotes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.favorite_outline, size: 54, color: isDark ? Colors.white38 : Colors.grey.shade400),
            const SizedBox(height: 12),
            Text('No observation records yet', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.grey)),
            const SizedBox(height: 6),
            Text('Tap "+ Add Vitals" to add observation', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade500)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _vitalsNotes.length,
      itemBuilder: (context, index) {
        final v = _vitalsNotes[index];
        final addedBy = v['addedBy'] ?? 'Staff';
        final date = v['date'] ?? '';
        final time = v['time'] ?? '';

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.access_time_rounded, size: 14, color: Color(0xFF0284C7)),
                        const SizedBox(width: 6),
                        Text('$date $time', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF0284C7))),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.grey.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text('By: $addedBy', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.grey.shade700)),
                    ),
                  ],
                ),
                const Divider(height: 16),

                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (v['pulse']?.toString().isNotEmpty == true) _vitalBadge('Pulse', '${v['pulse']} /min', Icons.monitor_heart_outlined),
                    if (v['bp']?.toString().isNotEmpty == true) _vitalBadge('BP', '${v['bp']} mmHg', Icons.favorite_outline),
                    if (v['temp']?.toString().isNotEmpty == true) _vitalBadge('Temp', '${v['temp']} °F', Icons.thermostat_outlined),
                    if (v['spo2']?.toString().isNotEmpty == true) _vitalBadge('SpO2', '${v['spo2']} %', Icons.air_rounded),
                    if (v['rbs']?.toString().isNotEmpty == true) _vitalBadge('RBS', '${v['rbs']} mg/dL', Icons.water_drop_outlined),
                    if (v['painScore']?.toString().isNotEmpty == true) _vitalBadge('Pain', '${v['painScore']}/10', Icons.sentiment_dissatisfied_rounded),
                    if (v['urineOutput']?.toString().isNotEmpty == true) _vitalBadge('Urine', '${v['urineOutput']} ml', Icons.invert_colors_rounded),
                    if (v['drainOutput']?.toString().isNotEmpty == true) _vitalBadge('Drain', '${v['drainOutput']} ml', Icons.opacity_rounded),
                  ],
                ),
              ],
            ),
          ),
        ).animate().fadeIn(duration: 250.ms);
      },
    );
  }

  Widget _vitalBadge(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF0284C7).withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF0284C7)),
          const SizedBox(width: 5),
          Text('$label: ', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: const Color(0xFF475569))),
          Text(value, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF0284C7))),
        ],
      ),
    );
  }

  // ── MEDICATION SCHEDULE TAB ──
  Widget _buildMedicationsTab(bool isDark) {
    if (_medicationNotes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.medication_outlined, size: 54, color: isDark ? Colors.white38 : Colors.grey.shade400),
            const SizedBox(height: 12),
            Text('No prescribed medications', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.grey)),
            const SizedBox(height: 6),
            Text('Doctors can prescribe medicines using top button', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade500)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _medicationNotes.length,
      itemBuilder: (context, index) {
        final m = _medicationNotes[index];
        final isGiven = m['status'] == 'Given';
        final drugName = m['drugName'] ?? 'Medicine';
        final medType = m['medType'] ?? 'Medicine';
        final dose = m['dose'] ?? '';
        final prescribedBy = m['addedBy'] ?? 'Doctor';
        final date = m['date'] ?? '';
        final time = m['time'] ?? '';

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: isGiven ? const Color(0xFF10B981).withValues(alpha: 0.3) : const Color(0xFFF59E0B).withValues(alpha: 0.3)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: (isGiven ? const Color(0xFF10B981) : const Color(0xFFF59E0B)).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        isGiven ? '✓ GIVEN' : '⏳ PENDING',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: isGiven ? const Color(0xFF059669) : const Color(0xFFD97706),
                        ),
                      ),
                    ),
                    Text('$date $time', style: GoogleFonts.inter(fontSize: 11, color: Colors.grey)),
                  ],
                ),
                const SizedBox(height: 10),

                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.medication_rounded, color: Color(0xFF10B981), size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(drugName, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w800)),
                          Text('$dose ($medType)', style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B), fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('By: $prescribedBy', style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
                    if (!isGiven)
                      ElevatedButton.icon(
                        onPressed: () => _markDoseAsGiven(m),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.check_circle_outline_rounded, size: 16),
                        label: Text('Mark Given', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700)),
                      )
                    else
                      Text(
                        'Given by: ${m['doneBy'] ?? 'Staff'} (${m['doneTime'] ?? ''})',
                        style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF059669), fontWeight: FontWeight.w600),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ).animate().fadeIn(duration: 250.ms);
      },
    );
  }

  // ── PATIENT SEARCH BOTTOM SHEET ──
  void _showPatientSearchSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              height: MediaQuery.of(ctx).size.height * 0.7,
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Container(
                    width: 38,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                  ),
                  const SizedBox(height: 14),
                  Text('Select Patient for Register', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 12),

                  TextField(
                    onChanged: (q) {
                      _filterPatients(q);
                      setSheetState(() {});
                    },
                    decoration: InputDecoration(
                      hintText: 'Search patient by name or ID...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),

                  Expanded(
                    child: _filteredPatients.isEmpty
                        ? const Center(child: Text('No admitted patient found'))
                        : ListView.builder(
                            itemCount: _filteredPatients.length,
                            itemBuilder: (ctx, index) {
                              final p = _filteredPatients[index];
                              final isSelected = _selectedPatient?['_id'] == p['_id'];
                              return ListTile(
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                tileColor: isSelected ? const Color(0xFF0284C7).withValues(alpha: 0.1) : null,
                                title: Text(p['name'] ?? '', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14)),
                                subtitle: Text('ID: ${p['patient_id']} | Type: ${p['patient_type'] ?? 'IPD'}', style: GoogleFonts.inter(fontSize: 12)),
                                trailing: isSelected ? const Icon(Icons.check_circle, color: Color(0xFF0284C7)) : null,
                                onTap: () {
                                  setState(() {
                                    _selectedPatient = p;
                                    _loadNotesForPatient(p['_id']);
                                  });
                                  Navigator.pop(ctx);
                                },
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
