import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';
import '../services/api_service.dart';
import 'billing_screen.dart';

String _fmtDate(DateTime d) =>
    '${d.year.toString().padLeft(4, "0")}-${d.month.toString().padLeft(2, "0")}-${d.day.toString().padLeft(2, "0")}';
String _fmtTime(DateTime d) =>
    '${d.hour.toString().padLeft(2, "0")}:${d.minute.toString().padLeft(2, "0")}';

class DischargeScreen extends StatefulWidget {
  final Map<String, dynamic>? initialPatient;
  const DischargeScreen({super.key, this.initialPatient});
  @override
  State<DischargeScreen> createState() => _DischargeScreenState();
}

class _DischargeScreenState extends State<DischargeScreen> {
  List<dynamic> _patients = [];
  Map<String, dynamic>? _selectedPatient;
  bool _isLoadingPatients = true;
  bool _isSubmitting = false;
  final TextEditingController _doctorCtrl = TextEditingController(text: 'Dr. Bhoopendra Chaudhary');
  final TextEditingController _dateCtrl = TextEditingController();
  final TextEditingController _timeCtrl = TextEditingController();
  final TextEditingController _summaryCtrl = TextEditingController();
  final List<Map<String, TextEditingController>> _medicineRows = [];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _dateCtrl.text = _fmtDate(now);
    _timeCtrl.text = _fmtTime(now);
    _addMedicineRow();
    if (widget.initialPatient != null) {
      _selectedPatient = widget.initialPatient;
      _isLoadingPatients = false;
    } else {
      _loadPatients();
    }
  }

  @override
  void dispose() {
    _doctorCtrl.dispose(); _dateCtrl.dispose(); _timeCtrl.dispose(); _summaryCtrl.dispose();
    for (var r in _medicineRows) { r['name']?.dispose(); r['dose']?.dispose(); r['freq']?.dispose(); r['dur']?.dispose(); }
    super.dispose();
  }

  void _addMedicineRow() {
    setState(() { _medicineRows.add({'name': TextEditingController(), 'dose': TextEditingController(), 'freq': TextEditingController(), 'dur': TextEditingController()}); });
  }

  void _removeMedicineRow(int i) {
    if (_medicineRows.length <= 1) return;
    setState(() { final r = _medicineRows.removeAt(i); r['name']?.dispose(); r['dose']?.dispose(); r['freq']?.dispose(); r['dur']?.dispose(); });
  }

  Future<void> _loadPatients() async {
    setState(() => _isLoadingPatients = true);
    try {
      final list = await ApiService.getPatients();
      if (mounted) { setState(() { _patients = list; _isLoadingPatients = false; if (_patients.isNotEmpty) _selectedPatient = Map<String, dynamic>.from(_patients.first); }); }
    } catch (_) { if (mounted) setState(() => _isLoadingPatients = false); }
  }

  bool get _isOpd => (_selectedPatient?['patient_type'] ?? '') == 'OPD';
  bool get _isDischarged => (_selectedPatient?['status'] ?? '').toString().toLowerCase() == 'discharged';

  Future<void> _submitDischarge() async {
    if (_selectedPatient == null) {
      _showSnack('Please select a patient', isError: true);
      return;
    }
    final summary = _summaryCtrl.text.trim();
    if (summary.isEmpty) {
      _showSnack('Please enter treatment summary / clinical notes', isError: true);
      return;
    }
    final patientId = _selectedPatient!['_id']?.toString() ?? _selectedPatient!['patient_id']?.toString() ?? '';

    setState(() => _isSubmitting = true);

    try {
      if (!_isOpd && !_isDischarged) {
        try {
          final r = await ApiService.getBilling(patientId);
          if (r['success'] == true && (r['payment_status'] ?? '').toString().toLowerCase() != 'paid') {
            setState(() => _isSubmitting = false);
            _showBillingWarning(r['pending_amount'] ?? 0);
            return;
          }
        } catch (_) {}
      }

      final meds = <Map<String, String>>[];
      for (var row in _medicineRows) {
        final nm = row['name']!.text.trim();
        if (nm.isNotEmpty) {
          meds.add({
            'name': nm,
            'dose': row['dose']!.text.trim(),
            'freq': row['freq']!.text.trim(),
            'duration': row['dur']!.text.trim(),
          });
        }
      }

      final payload = <String, dynamic>{
        'id': 'D${DateTime.now().millisecondsSinceEpoch}',
        'patientId': patientId,
        'doctorName': _doctorCtrl.text.trim(),
        'dischargeDate': _dateCtrl.text.trim(),
        'dischargeTime': _timeCtrl.text.trim(),
        'diagnosis': '',
        'summary': summary,
        'advisedMedicines': meds,
      };

      await ApiService.dischargePatient(payload);
      if (_selectedPatient != null) {
        _selectedPatient!['status'] = 'Discharged';
      }
      setState(() => _isSubmitting = false);

      if (mounted) {
        _showSnack('Report generated successfully!');
        _showReport(payload, meds);
      }
    } catch (e) {
      setState(() => _isSubmitting = false);
      if (mounted) {
        _showSnack('Error: $e', isError: true);
      }
    }
  }

  void _showBillingWarning(dynamic pending) {
    showDialog(context: context, builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(children: [const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444)), const SizedBox(width: 8), Text('Billing Incomplete', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 16))]),
      content: Text('Cannot discharge: Billing is not complete.\nPending: Rs.$pending\n\nOpen Billing to clear the bill?', style: GoogleFonts.inter(fontSize: 13)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text('Cancel', style: GoogleFonts.inter())),
        ElevatedButton(style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4F46E5)), onPressed: () { Navigator.pop(ctx); if (_selectedPatient != null) Navigator.push(context, MaterialPageRoute(builder: (_) => BillingScreen(patient: _selectedPatient!))); }, child: Text('Go to Billing', style: GoogleFonts.inter(color: Colors.white))),
      ],
    ));
  }

  Future<String> _getLogoBase64() async {
    try {
      final ByteData bytes = await rootBundle.load('assets/app-logo.png');
      final Uint8List list = bytes.buffer.asUint8List();
      return base64Encode(list);
    } catch (_) {
      return '';
    }
  }

  Future<void> _printReport(Map<String, dynamic> payload, List<Map<String, String>> meds) async {
    final logoBase64 = await _getLogoBase64();
    final logoDataUrl = logoBase64.isNotEmpty ? 'data:image/png;base64,$logoBase64' : '';

    final patientName = _selectedPatient?['name'] ?? 'Patient';
    final patientId = _selectedPatient?['patient_id'] ?? '';
    final age = _selectedPatient?['age']?.toString() ?? '-';
    final gender = _selectedPatient?['gender'] ?? '-';
    final mobile = _selectedPatient?['mobile'] ?? '-';
    final address = _selectedPatient?['address'] ?? '-';
    final bedNo = _selectedPatient?['bed_no'] ?? (_isOpd ? 'OPD Consultation' : 'N/A');
    final docTitle = _isOpd ? 'OPD PRESCRIPTION & VISIT SLIP' : 'PATIENT DISCHARGE SUMMARY';
    final summaryHeading = _isOpd ? 'CLINICAL NOTES & DIAGNOSIS' : 'TREATMENT SUMMARY & HOSPITAL COURSE';
    final dateLabel = _isOpd ? 'Visit Date / Time:' : 'Discharge Date / Time:';
    final docColor = _isOpd ? '#2563eb' : '#dc2626';

    String medRowsHtml = '';
    for (int i = 0; i < meds.length; i++) {
      final m = meds[i];
      medRowsHtml += '''
        <tr>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">${i + 1}</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${m['name']}</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">${m['dose']}</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">${m['freq']}</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">${m['duration']}</td>
        </tr>
      ''';
    }

    final htmlContent = '''
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; position: relative; }
          .logo-img { position: absolute; left: 10px; top: 0; width: 60px; height: 60px; object-fit: contain; }
          .h-title { font-size: 20px; font-weight: 900; color: #1e3a8a; margin: 0; }
          .h-sub { font-size: 11px; color: #475569; margin-top: 4px; }
          .doc-badge { display: inline-block; background-color: $docColor; color: white; padding: 4px 12px; font-size: 11px; font-weight: 800; border-radius: 4px; margin-top: 8px; }
          .patient-box { background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 15px; }
          .info-table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .info-table td { padding: 3px 0; vertical-align: top; }
          .section-title { font-size: 12px; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #94a3b8; padding-bottom: 3px; margin-top: 15px; margin-bottom: 8px; }
          .summary-box { background-color: #f1f5f9; border-left: 4px solid $docColor; padding: 10px; font-size: 11px; white-space: pre-wrap; border-radius: 4px; }
          .med-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
          .med-table th { background-color: #f1f5f9; padding: 6px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 10px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoDataUrl.isNotEmpty ? '<img src="$logoDataUrl" class="logo-img" />' : ''}
          <div class="h-title">CHAUDHARY HEALTH CARE CENTER</div>
          <div class="h-sub">Koraon, Prayagraj, Uttar Pradesh • Ph: +91 9876543210</div>
          <div class="doc-badge">$docTitle</div>
        </div>

        <div class="patient-box">
          <table class="info-table">
            <tr>
              <td style="width: 50%;">
                <div><strong>Patient ID:</strong> $patientId</div>
                <div><strong>Patient Name:</strong> <span style="font-size: 13px; font-weight: 900;">$patientName</span></div>
                <div><strong>Age / Gender:</strong> $age Yrs / $gender</div>
                <div><strong>Mobile:</strong> $mobile</div>
              </td>
              <td style="width: 50%; padding-left: 10px; border-left: 1px solid #cbd5e1;">
                <div><strong>Location / Bed:</strong> $bedNo</div>
                <div><strong>Attending Doctor:</strong> ${payload['doctorName']}</div>
                <div><strong>$dateLabel</strong> ${payload['dischargeDate']} ${payload['dischargeTime']}</div>
                <div><strong>Address:</strong> $address</div>
              </td>
            </tr>
          </table>
        </div>

        <div class="section-title">$summaryHeading</div>
        <div class="summary-box">${payload['summary'] ?? 'N/A'}</div>

        ${meds.isNotEmpty ? '''
          <div class="section-title">ADVISED MEDICINES / PRESCRIPTION</div>
          <table class="med-table">
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Medicine Name</th>
                <th style="width: 80px; text-align: center;">Dose</th>
                <th style="width: 80px; text-align: center;">Frequency</th>
                <th style="width: 80px; text-align: center;">Duration</th>
              </tr>
            </thead>
            <tbody>
              $medRowsHtml
            </tbody>
          </table>
        ''' : ''}

        <div style="margin-top: 50px; text-align: right;">
          <div style="display: inline-block; text-align: center; width: 190px; border-top: 1px solid #0f172a; padding-top: 4px; font-size: 10.5px; font-weight: 800;">
            ${payload['doctorName']}<br>
            <span style="font-size: 9px; font-weight: 400; color: #475569;">Attending Consultant / Authorised Signatory</span>
          </div>
        </div>
      </body>
      </html>
    ''';

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async {
        return await Printing.convertHtml(format: format, html: htmlContent);
      },
      name: '${_isOpd ? 'OPD_Visit_Slip' : 'Discharge_Summary'}_$patientId.pdf',
    );
  }

  void _showReport(Map<String, dynamic> payload, List<Map<String, String>> meds) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Column(
          children: [
            const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 48),
            const SizedBox(height: 8),
            Text(
              _isOpd ? 'OPD Visit Slip Generated' : 'Discharge Summary Generated',
              style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 16),
              textAlign: TextAlign.center,
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Patient: ${_selectedPatient?['name']}', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
              Text('ID: ${_selectedPatient?['patient_id']}', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey)),
              Text('Doctor: ${payload['doctorName']}', style: GoogleFonts.inter(fontSize: 12)),
              Text('Date: ${payload['dischargeDate']}  ${payload['dischargeTime']}', style: GoogleFonts.inter(fontSize: 12)),
              const Divider(height: 20),
              Text(_isOpd ? 'Clinical Notes:' : 'Treatment Summary:', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 12)),
              Text(payload['summary'] ?? '', style: GoogleFonts.inter(fontSize: 12)),
              if (meds.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text('Advised Medicines:', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 12)),
                ...meds.map((m) => Padding(
                      padding: const EdgeInsets.only(top: 3),
                      child: Text('* ${m['name']} - ${m['dose']} (${m['freq']}, ${m['duration']})', style: GoogleFonts.inter(fontSize: 11)),
                    )),
              ],
            ],
          ),
        ),
        actions: [
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFF0284C7)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => _printReport(payload, meds),
            icon: const Icon(Icons.print_rounded, size: 16, color: Color(0xFF0284C7)),
            label: Text('Print / Save PDF', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: const Color(0xFF0284C7))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4F46E5),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            child: Text('Done', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    final topPadding = MediaQuery.of(context).padding.top + 10;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg, style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
      backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
      behavior: SnackBarBehavior.floating,
      margin: EdgeInsets.only(
        bottom: MediaQuery.of(context).size.height - topPadding - 70,
        left: 16,
        right: 16,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
    final cardColor = isDark ? const Color(0xFF1E293B) : Colors.white;
    final fillColor = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
    final border = OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none);

    InputDecoration dec({String? hint, IconData? icon}) => InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.inter(fontSize: 12, color: Colors.grey),
          filled: true,
          fillColor: fillColor,
          border: border,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          suffixIcon: icon != null ? Icon(icon, size: 16) : null,
        );

    Widget lbl(String t) => Text(
          t,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white70 : Colors.black54,
          ),
        );

    Widget card(Widget child) => Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
          ),
          child: child,
        );

    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;

    return Scaffold(
      resizeToAvoidBottomInset: false,
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: cardColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          _isOpd ? 'OPD Visit Summary' : 'Patient Discharge',
          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.print_rounded, color: Color(0xFF0284C7)),
            tooltip: 'Print / Save PDF',
            onPressed: () {
              final meds = <Map<String, String>>[];
              for (var row in _medicineRows) {
                final nm = row['name']!.text.trim();
                if (nm.isNotEmpty) {
                  meds.add({
                    'name': nm,
                    'dose': row['dose']!.text.trim(),
                    'freq': row['freq']!.text.trim(),
                    'duration': row['dur']!.text.trim(),
                  });
                }
              }
              final payload = <String, dynamic>{
                'id': 'D${DateTime.now().millisecondsSinceEpoch}',
                'patientId': _selectedPatient?['_id'] ?? _selectedPatient?['patient_id'] ?? '',
                'doctorName': _doctorCtrl.text.trim(),
                'dischargeDate': _dateCtrl.text.trim(),
                'dischargeTime': _timeCtrl.text.trim(),
                'diagnosis': '',
                'summary': _summaryCtrl.text.trim(),
                'advisedMedicines': meds,
              };
              _printReport(payload, meds);
            },
          ),
        ],
      ),
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                padding: EdgeInsets.fromLTRB(16, 16, 16, 120 + keyboardHeight),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    card(Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        lbl('Select Patient *'),
                        const SizedBox(height: 8),
                        if (_isLoadingPatients)
                          const Center(child: CircularProgressIndicator())
                        else if (widget.initialPatient != null)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(color: fillColor, borderRadius: BorderRadius.circular(10)),
                            child: Row(children: [
                              const Icon(Icons.person_outline, color: Color(0xFF4F46E5)),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${_selectedPatient?['name']} (${_selectedPatient?['patient_type'] ?? 'IPD'})',
                                      style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13),
                                    ),
                                    Text(
                                      'ID: ${_selectedPatient?['patient_id']}  Bed: ${_selectedPatient?['bed_no'] ?? 'N/A'}',
                                      style: GoogleFonts.inter(fontSize: 11, color: Colors.grey),
                                    ),
                                  ],
                                ),
                              ),
                            ]),
                          )
                        else
                          DropdownButtonFormField<Map<String, dynamic>>(
                            value: _selectedPatient,
                            isExpanded: true,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: fillColor,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: BorderSide.none,
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            ),
                            dropdownColor: cardColor,
                            items: _patients.map((p) {
                              final pm = Map<String, dynamic>.from(p);
                              return DropdownMenuItem<Map<String, dynamic>>(
                                value: pm,
                                child: Text(
                                  '${pm['name']} (${pm['patient_id']}) - ${pm['patient_type'] ?? 'IPD'}',
                                  style: GoogleFonts.inter(fontSize: 13),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              );
                            }).toList(),
                            onChanged: (v) => setState(() => _selectedPatient = v),
                          ),
                      ],
                    )),
                    card(Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Discharge & Treatment Details',
                          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 14),
                        lbl('Attending Doctor'),
                        const SizedBox(height: 6),
                        TextField(controller: _doctorCtrl, style: GoogleFonts.inter(fontSize: 13), decoration: dec()),
                        const SizedBox(height: 12),
                        Row(children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                lbl(_isOpd ? 'Visit Date' : 'Discharge Date'),
                                const SizedBox(height: 6),
                                TextField(controller: _dateCtrl, style: GoogleFonts.inter(fontSize: 13), decoration: dec(icon: Icons.calendar_today_rounded)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                lbl('Time'),
                                const SizedBox(height: 6),
                                TextField(controller: _timeCtrl, style: GoogleFonts.inter(fontSize: 13), decoration: dec(icon: Icons.access_time_rounded)),
                              ],
                            ),
                          ),
                        ]),
                        const SizedBox(height: 12),
                        lbl(_isOpd ? 'Clinical Notes / Diagnosis *' : 'Treatment Summary *'),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _summaryCtrl,
                          maxLines: 4,
                          scrollPadding: const EdgeInsets.only(bottom: 150),
                          style: GoogleFonts.inter(fontSize: 13),
                          decoration: InputDecoration(
                            hintText: _isOpd ? 'Enter clinical findings, symptoms, diagnosis...' : 'Enter treatment given, hospital course...',
                            hintStyle: GoogleFonts.inter(fontSize: 12, color: Colors.grey),
                            filled: true,
                            fillColor: fillColor,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.all(12),
                          ),
                        ),
                      ],
                    )),
                    card(Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Advised Medicines', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w800)),
                            TextButton.icon(
                              onPressed: _addMedicineRow,
                              icon: const Icon(Icons.add, size: 16),
                              label: Text('Add Row', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        ...List.generate(_medicineRows.length, (i) {
                          final row = _medicineRows[i];
                          Widget mCell(TextEditingController c, int fl, String h) => Expanded(
                                flex: fl,
                                child: TextField(
                                  controller: c,
                                  style: GoogleFonts.inter(fontSize: 12),
                                  decoration: InputDecoration(
                                    hintText: h,
                                    hintStyle: GoogleFonts.inter(fontSize: 11, color: Colors.grey),
                                    filled: true,
                                    fillColor: fillColor,
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                  ),
                                ),
                              );
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(children: [
                              mCell(row['name']!, 3, 'Medicine'),
                              const SizedBox(width: 5),
                              mCell(row['dose']!, 2, 'Dose'),
                              const SizedBox(width: 5),
                              mCell(row['freq']!, 2, 'Freq'),
                              const SizedBox(width: 5),
                              mCell(row['dur']!, 2, 'Days'),
                              if (_medicineRows.length > 1) ...[
                                const SizedBox(width: 4),
                                GestureDetector(
                                  onTap: () => _removeMedicineRow(i),
                                  child: const Icon(Icons.remove_circle_outline, color: Color(0xFFEF4444), size: 20),
                                ),
                              ],
                            ]),
                          );
                        }),
                      ],
                    )),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
            AnimatedPadding(
              duration: const Duration(milliseconds: 150),
              curve: Curves.easeOut,
              padding: EdgeInsets.only(bottom: keyboardHeight),
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
                decoration: BoxDecoration(
                  color: cardColor,
                  border: Border(top: BorderSide(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0))),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.06), blurRadius: 8, offset: const Offset(0, -3))],
                ),
                child: SafeArea(
                  top: false,
                  child: SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF4F46E5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: _isSubmitting ? null : _submitDischarge,
                      icon: _isSubmitting
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.file_download_done_rounded, color: Colors.white),
                      label: Text(
                        _isSubmitting ? 'Processing...' : (_isOpd ? 'Generate OPD Visit Slip' : 'Generate Discharge Summary'),
                        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}