import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../services/api_service.dart';
import '../services/role_access.dart';
import '../widgets/app_snackbar.dart';

class PatientRecordScreen extends StatefulWidget {
  const PatientRecordScreen({super.key});

  @override
  State<PatientRecordScreen> createState() => _PatientRecordScreenState();
}

class _PatientRecordScreenState extends State<PatientRecordScreen> {
  bool _isLoading = true;
  List<dynamic> _allPatients = [];
  Map<String, dynamic>? _selectedPatient;
  Map<String, dynamic>? _selectedPatientBilling;
  String _patientTypeFilter = 'all';
  String _statusFilter = 'all';
  String _dateFilter = 'all';
  DateTime? _customFrom;
  DateTime? _customTo;

  List<dynamic> get _filteredPatients {
    return _allPatients.where((p) {
      if (_patientTypeFilter != 'all' && (p['patient_type'] ?? '').toString().toLowerCase() != _patientTypeFilter) return false;
      if (_statusFilter != 'all' && (p['status'] ?? '').toString().toLowerCase() != _statusFilter) return false;
      
      if (_dateFilter != 'all') {
        final dateStr = p['admission_date'] ?? p['createdAt'];
        if (dateStr == null) return false;
        final pDate = DateTime.parse(dateStr);
        final now = DateTime.now();
        if (_dateFilter == 'today') {
          if (pDate.year != now.year || pDate.month != now.month || pDate.day != now.day) return false;
        } else if (_dateFilter == 'weekly') {
          if (now.difference(pDate).inDays > 7) return false;
        } else if (_dateFilter == 'monthly') {
          if (now.difference(pDate).inDays > 30) return false;
        } else if (_dateFilter == 'custom') {
          if (_customFrom != null && pDate.isBefore(_customFrom!)) return false;
          if (_customTo != null) {
            final to = DateTime(_customTo!.year, _customTo!.month, _customTo!.day, 23, 59, 59);
            if (pDate.isAfter(to)) return false;
          }
        }
      }
      return true;
    }).toList();
  }

  @override
  void initState() {
    super.initState();
    _fetchPatients();
  }

  Future<void> _fetchPatients() async {
    try {
      final res = await ApiService.getPatients();
      if (mounted) {
        setState(() {
          _allPatients = res.where((p) => p['isDeleted'] != true).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        AppSnackBar.showTopSnack(context, 'Failed to fetch patients', isError: true);
      }
    }
  }

  Future<void> _fetchBillingDetails(String patientId) async {
    if (!RoleAccess.isAdminLevel) return;
    try {
      final bRes = await ApiService.getBilling(patientId);
      if (bRes['success'] == true && mounted) {
        setState(() {
          _selectedPatientBilling = bRes['billing'];
        });
      }
    } catch (e) {
      // Ignore silently if no billing found
    }
  }

  void _onPatientSelected(Map<String, dynamic> patient) {
    setState(() {
      _selectedPatient = patient;
      _selectedPatientBilling = null;
    });
    _fetchBillingDetails(patient['patient_id'] ?? patient['_id']);
  }

  String _formatDate(dynamic dateStr) {
    if (dateStr == null || dateStr.toString().trim().isEmpty) return '-';
    try {
      final dt = DateTime.parse(dateStr.toString());
      return DateFormat('dd MMM yyyy').format(dt);
    } catch (_) {
      return dateStr.toString();
    }
  }
  
  String _formatTime(dynamic timeStr) {
    if (timeStr == null || timeStr.toString().trim().isEmpty) return '-';
    try {
      final dt = DateTime.parse(timeStr.toString());
      return DateFormat('hh:mm a').format(dt);
    } catch (_) {
      return timeStr.toString();
    }
  }

  Future<void> _generatePdf() async {
    if (_selectedPatient == null) return;
    
    final pdf = pw.Document();
    final p = _selectedPatient!;
    
    // Fallbacks
    final indoorNo = p['indoor_no'] ?? p['patient_id'] ?? '-';
    final wardNo = p['ward_no'] ?? p['bed_assigned'] ?? '-';
    final name = p['name'] ?? '-';
    final guardian = p['guardian_name'] ?? '-';
    final age = p['age']?.toString() ?? '-';
    final gender = p['gender'] ?? '-';
    final religion = p['religion'] ?? '-';
    final address = p['address'] ?? '-';
    final mobile = p['phone'] ?? '-';
    final physician = p['doctor_assigned'] ?? '-';
    final doa = _formatDate(p['admission_date'] ?? p['createdAt']);
    final toa = _formatTime(p['admission_date'] ?? p['createdAt']);
    final dod = _formatDate(p['discharge_date']);
    final tod = _formatTime(p['discharge_date']);
    final pType = (p['patient_type'] ?? 'IPD').toString().toUpperCase();

    // Load image for PDF
    final ByteData image = await rootBundle.load('assets/logo.png');
    final Uint8List imageData = image.buffer.asUint8List();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Container(
                padding: const pw.EdgeInsets.only(bottom: 12),
                decoration: const pw.BoxDecoration(
                  border: pw.Border(bottom: pw.BorderSide(color: PdfColors.blue900, width: 2)),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: pw.CrossAxisAlignment.center,
                      children: [
                        pw.Container(
                          width: 80,
                          alignment: pw.Alignment.centerLeft,
                          child: pw.Image(pw.MemoryImage(imageData), height: 75),
                        ),
                        pw.Expanded(
                          child: pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.center,
                            children: [
                              pw.Text(
                                'CHAUDHARY HEALTH CARE CENTER', 
                                style: pw.TextStyle(fontSize: 30, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900),
                                maxLines: 1,
                              ),
                              pw.SizedBox(height: 2),
                              pw.Text(
                                'GANDHI CHAURAHA, MEJA WALI ROAD, KORAON-PRAYAGRAJ 212306', 
                                style: pw.TextStyle(fontSize: 10, color: PdfColors.red800, fontWeight: pw.FontWeight.bold),
                                maxLines: 1,
                              ),
                            ],
                          ),
                        ),
                        pw.Container(width: 20), // Reduced right padding to give title more space
                      ],
                    ),
                    pw.SizedBox(height: 12),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text('Dr. B.K. Chaudhary', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                            pw.Text('(M.D. Medicine)', style: pw.TextStyle(fontSize: 12.5, fontWeight: pw.FontWeight.bold, color: PdfColors.red800)),
                          ]
                        ),
                        pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.end,
                          children: [
                            pw.Text('Consulting Timing : 10:00 am to 2:00 pm', style: pw.TextStyle(fontSize: 11, color: PdfColors.grey700)),
                            pw.Text('5:00 pm to 8:00 pm', style: pw.TextStyle(fontSize: 11, color: PdfColors.grey700)),
                          ]
                        ),
                      ]
                    )
                  ]
                )
              ),
              
              pw.SizedBox(height: 10),
              pw.Center(
                child: pw.Container(
                  padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.black, width: 2)),
                  child: pw.Text('$pType CASE RECORD', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
                ),
              ),
              pw.SizedBox(height: 20),

              // Patient Details
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('INDOOR No.: $indoorNo', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text('WARD No.: $wardNo', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                ],
              ),
              pw.SizedBox(height: 10),
              pw.Text('Patient\'s Name: $name', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 10),
              pw.Text('Fathers/Husband Name: $guardian', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 10),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Age: $age', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text('Sex: $gender', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text('Religion: $religion', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                ],
              ),
              pw.SizedBox(height: 10),
              pw.Text('Address: $address', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 10),
              pw.Text('Mobile No.: $mobile', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 10),
              pw.Text('Physician/Surgeon-in-Charge: $physician', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              
              pw.SizedBox(height: 15),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Date of Admission: $doa', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text('Time: $toa', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                ],
              ),
              pw.SizedBox(height: 10),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Date of Discharge: $dod', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text('Time: $tod', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                ],
              ),

              pw.SizedBox(height: 20),
              pw.Text('Provisional Diagnosis: ${p['diagnosis'] ?? '-'}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 10),
              pw.Text('Final Diagnosis: ${p['diagnosis'] ?? '-'}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              
              pw.SizedBox(height: 30),
              pw.Divider(),
              pw.SizedBox(height: 10),
              pw.Text('History & Physical Examination:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14)),
              pw.SizedBox(height: 8),
              pw.Text('Vitals - Temp: ${p['temperature'] ?? '-'}, BP: ${p['blood_pressure'] ?? '-'}, SPO2: ${p['spo2'] ?? '-'}', style: const pw.TextStyle(fontSize: 12)),
              
              if (_selectedPatientBilling != null) ...[
                pw.SizedBox(height: 30),
                pw.Divider(),
                pw.SizedBox(height: 10),
                pw.Text('Financial Summary:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14)),
                pw.SizedBox(height: 8),
                pw.Text('Total Bill: Rs. ${_selectedPatientBilling!['totalAmount'] ?? '0'}', style: const pw.TextStyle(fontSize: 12)),
                pw.Text('Discount: Rs. ${_selectedPatientBilling!['discount'] ?? '0'}', style: const pw.TextStyle(fontSize: 12)),
                pw.Text('Paid: Rs. ${_selectedPatientBilling!['totalPaid'] ?? '0'}', style: const pw.TextStyle(fontSize: 12)),
              ]
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Case_Record_${name.replaceAll(' ', '_')}.pdf',
    );
  }

  Future<void> _showCustomDateRangePicker() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: _customFrom != null && _customTo != null 
          ? DateTimeRange(start: _customFrom!, end: _customTo!)
          : null,
    );
    if (picked != null) {
      setState(() {
        _customFrom = picked.start;
        _customTo = picked.end;
      });
    } else {
      setState(() => _dateFilter = 'all');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return PopScope(
      canPop: _selectedPatient == null,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_selectedPatient != null) {
          setState(() {
            _selectedPatient = null;
            _selectedPatientBilling = null;
          });
        }
      },
      child: Scaffold(
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
          elevation: 0,
          title: Text(
            'Patient Record', 
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: isDark ? Colors.white : const Color(0xFF0F172A))
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, size: 18),
            onPressed: () {
              if (_selectedPatient != null) {
                setState(() {
                  _selectedPatient = null;
                  _selectedPatientBilling = null;
                });
              } else {
                Navigator.pop(context);
              }
            },
          ),
        actions: [
          if (_selectedPatient != null)
            IconButton(
              icon: const Icon(Icons.print_rounded, size: 20, color: Color(0xFF2563EB)),
              onPressed: _generatePdf,
              tooltip: 'Print Case Record',
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : Column(
            children: [
              // Search Section
              Container(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
                child: Autocomplete<Map<String, dynamic>>(
                  optionsBuilder: (TextEditingValue textEditingValue) {
                    if (textEditingValue.text.isEmpty) {
                      return const Iterable<Map<String, dynamic>>.empty();
                    }
                    final q = textEditingValue.text.toLowerCase();
                    return _filteredPatients.where((p) {
                      final n = (p['name'] ?? '').toLowerCase();
                      final id = (p['patient_id'] ?? '').toLowerCase();
                      final ph = (p['phone'] ?? '').toLowerCase();
                      return n.contains(q) || id.contains(q) || ph.contains(q);
                    }).cast<Map<String, dynamic>>();
                  },
                  displayStringForOption: (option) => '${option['name']} (${option['patient_id'] ?? option['phone']})',
                  onSelected: _onPatientSelected,
                  fieldViewBuilder: (context, controller, focusNode, onEditingComplete) {
                    return TextField(
                      controller: controller,
                      focusNode: focusNode,
                      onEditingComplete: onEditingComplete,
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500),
                      decoration: InputDecoration(
                        hintText: 'Search by ID, Name or Phone...',
                        hintStyle: GoogleFonts.inter(color: Colors.grey),
                        prefixIcon: const Icon(Icons.search_rounded, color: Colors.grey),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    );
                  },
                ),
              ),

              // Filter Section
              if (_selectedPatient == null)
                SizedBox(
                  height: 38,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    children: [
                      _buildFilterChip(Icons.category_rounded, 'Type', _patientTypeFilter, ['all', 'opd', 'ipd'], (v) => setState(() => _patientTypeFilter = v), isDark),
                      const SizedBox(width: 8),
                      _buildFilterChip(Icons.local_hospital_rounded, 'Status', _statusFilter, ['all', 'admitted', 'discharged'], (v) => setState(() => _statusFilter = v), isDark),
                      const SizedBox(width: 8),
                      _buildFilterChip(Icons.calendar_today_rounded, 'Period', _dateFilter, ['all', 'today', 'weekly', 'monthly', 'custom'], (v) {
                        setState(() => _dateFilter = v);
                        if (v == 'custom') _showCustomDateRangePicker();
                      }, isDark),
                      if (_dateFilter == 'custom') ...[
                        const SizedBox(width: 8),
                        _buildCustomDateChip(isDark),
                      ],
                    ],
                  ),
                ),
              const SizedBox(height: 10),

              // Case Sheet Area
              Expanded(
                child: _selectedPatient == null 
                  ? _filteredPatients.isEmpty
                      ? Center(
                          child: Text('No patients found', style: GoogleFonts.inter(color: Colors.grey)),
                        )
                      : ListView.builder(
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                          itemCount: _filteredPatients.length,
                          itemBuilder: (context, index) {
                            final p = _filteredPatients[index];
                            final name = p['name'] ?? 'Unknown';
                            final pid = p['patient_id'] ?? '-';
                            final phone = p['phone'] ?? '-';
                            final gender = p['gender'] ?? '-';
                            final age = p['age']?.toString() ?? '-';
                            
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.02),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  )
                                ]
                              ),
                              child: ListTile(
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                                leading: CircleAvatar(
                                  backgroundColor: const Color(0xFF2563EB).withValues(alpha: 0.1),
                                  child: Text(
                                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                                    style: GoogleFonts.inter(color: const Color(0xFF2563EB), fontWeight: FontWeight.bold),
                                  ),
                                ),
                                title: Text(name, style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 15, color: isDark ? Colors.white : const Color(0xFF0F172A))),
                                subtitle: Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text('ID: $pid • $age Yrs, $gender • 📞 $phone', style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B))),
                                ),
                                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.grey),
                                onTap: () => _onPatientSelected(p),
                              ),
                            );
                          },
                        )
                  : SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.all(20),
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 15,
                              offset: const Offset(0, 5),
                            )
                          ],
                        ),
                        child: _buildCaseSheet(_selectedPatient!),
                      ),
                    ),
              )
            ],
          ),
        ),
    );
  }

  Widget _buildFilterChip(IconData icon, String label, String value, List<String> options, Function(String) onChanged, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
          const SizedBox(width: 6),
          Text('$label: ', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
          DropdownButton<String>(
            value: value,
            isDense: true,
            underline: const SizedBox(),
            icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: Color(0xFF94A3B8)),
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: isDark ? Colors.white : const Color(0xFF0F172A)),
            items: options.map((o) => DropdownMenuItem(value: o, child: Text(o.toUpperCase()))).toList(),
            onChanged: (v) {
              if (v != null) onChanged(v);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCustomDateChip(bool isDark) {
    String text = 'Select Dates';
    if (_customFrom != null && _customTo != null) {
      text = '${DateFormat('MMM d').format(_customFrom!)} - ${DateFormat('MMM d').format(_customTo!)}';
    }
    return GestureDetector(
      onTap: _showCustomDateRangePicker,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFEFF6FF),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.date_range_rounded, size: 14, color: Color(0xFF2563EB)),
            const SizedBox(width: 6),
            Text(text, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF2563EB))),
          ],
        ),
      ),
    );
  }

  Widget _buildCaseSheet(Map<String, dynamic> p) {
    final indoorNo = p['indoor_no'] ?? p['patient_id'] ?? '-';
    final wardNo = p['ward_no'] ?? p['bed_assigned'] ?? '-';
    final name = p['name'] ?? '-';
    final guardian = p['guardian_name'] ?? '-';
    final age = p['age']?.toString() ?? '-';
    final gender = p['gender'] ?? '-';
    final religion = p['religion'] ?? '-';
    final address = p['address'] ?? '-';
    final mobile = p['phone'] ?? '-';
    final physician = p['doctor_assigned'] ?? '-';
    final doa = _formatDate(p['admission_date'] ?? p['createdAt']);
    final toa = _formatTime(p['admission_date'] ?? p['createdAt']);
    final dod = _formatDate(p['discharge_date']);
    final tod = _formatTime(p['discharge_date']);
    final pType = (p['patient_type'] ?? 'IPD').toString().toUpperCase();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('CMO Reg. NO. 3437/3967', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.red[800])),
            const SizedBox(height: 4),
            Row(
              children: [
                Image.asset('assets/logo.png', height: 50),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text('CHAUDHARY HEALTH CARE CENTER', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF1E3A8A))),
                      ),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text('GANDHI CHAURAHA, MEJA WALI ROAD, KORAON-PRAYAGRAJ 212306', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.red[800])),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 50),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FittedBox(fit: BoxFit.scaleDown, child: Text('Dr. B.K. Chaudhary', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF1E3A8A)))),
                    FittedBox(fit: BoxFit.scaleDown, child: Text('(M.D. Medicine)', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.red[800]))),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    FittedBox(fit: BoxFit.scaleDown, child: Text('Consulting Timing : 10:00 am to 2:00 pm', style: GoogleFonts.inter(fontSize: 9, color: Colors.grey[700]))),
                    FittedBox(fit: BoxFit.scaleDown, child: Text('5:00 pm to 8:00 pm', style: GoogleFonts.inter(fontSize: 9, color: Colors.grey[700]))),
                  ],
                ),
              ],
            ),
          ]
        ),
        const Divider(color: Color(0xFF1E3A8A), thickness: 2, height: 24),
        
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(border: Border.all(color: Colors.black, width: 1.5)),
            child: Text('$pType CASE RECORD', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.black)),
          ),
        ),
        const SizedBox(height: 20),

        // Demographics
        Row(
          children: [
            Expanded(child: _buildRow('INDOOR No.', indoorNo)),
            Expanded(child: _buildRow('WARD No.', wardNo)),
          ],
        ),
        const SizedBox(height: 12),
        _buildRow('Patient\'s Name', name),
        const SizedBox(height: 12),
        _buildRow('Fathers/Husband Name', guardian),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(flex: 2, child: _buildRow('Age', age)),
            Expanded(flex: 2, child: _buildRow('Sex', gender)),
            Expanded(flex: 3, child: _buildRow('Religion', religion)),
          ],
        ),
        const SizedBox(height: 12),
        _buildRow('Address', address),
        const SizedBox(height: 12),
        Align(alignment: Alignment.centerRight, child: _buildRow('Mobile No.', mobile, width: 180)),
        const SizedBox(height: 12),
        _buildRow('Physician/Surgeon', physician),
        const SizedBox(height: 12),
        
        // Admission / Discharge
        Row(
          children: [
            Expanded(flex: 3, child: _buildRow('Date of Admission', doa)),
            Expanded(flex: 2, child: _buildRow('Time', toa)),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(flex: 3, child: _buildRow('Date of Discharge', dod)),
            Expanded(flex: 2, child: _buildRow('Time', tod)),
          ],
        ),
        const SizedBox(height: 12),
        
        _buildRow('Provisional Diagnosis', p['diagnosis'] ?? '-'),
        const SizedBox(height: 12),
        _buildRow('Final Diagnosis', p['diagnosis'] ?? '-'),
        
        const SizedBox(height: 30),
        Text('History & Physical Examination:', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: Colors.black, fontSize: 13)),
        const SizedBox(height: 8),
        Text('Temp: ${p['temperature'] ?? '-'}   BP: ${p['blood_pressure'] ?? '-'}   SPO2: ${p['spo2'] ?? '-'}', style: GoogleFonts.inter(color: Colors.black87, fontSize: 12)),
        
        if (_selectedPatientBilling != null) ...[
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 8),
          Text('Financial Summary:', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: Colors.black, fontSize: 13)),
          const SizedBox(height: 8),
          _buildRow('Total Bill', '₹ ${_selectedPatientBilling!['totalAmount'] ?? '0'}'),
          const SizedBox(height: 8),
          _buildRow('Discount', '₹ ${_selectedPatientBilling!['discount'] ?? '0'}'),
          const SizedBox(height: 8),
          _buildRow('Paid Amount', '₹ ${_selectedPatientBilling!['totalPaid'] ?? '0'}'),
        ]
      ],
    );
  }

  Widget _buildRow(String label, String value, {double? width}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: width == null ? MainAxisSize.max : MainAxisSize.min,
      children: [
        Text('$label: ', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.black87)),
        Expanded(
          flex: width == null ? 1 : 0,
          child: Container(
            width: width,
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.black38, style: BorderStyle.solid, width: 1)),
            ),
            child: Text(
              value, 
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.black),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ),
      ],
    );
  }
}
