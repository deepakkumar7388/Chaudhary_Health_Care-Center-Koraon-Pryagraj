import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';
import '../services/api_service.dart';
import '../widgets/app_snackbar.dart';
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
  final TextEditingController _symptomsCtrl = TextEditingController();
  final TextEditingController _diagnosisCtrl = TextEditingController();
  final TextEditingController _adviceCtrl = TextEditingController();
  final List<Map<String, TextEditingController>> _medicineRows = [];
  bool _isMedicalCertMode = true;

  final List<String> _symptomTags = [
    'Fever', 'High Grade Fever', 'Low Grade Fever', 'Chills & Rigor', 
    'Cough', 'Dry Cough', 'Productive Cough', 'Cold', 'Sore Throat', 
    'Breathlessness', 'Chest Pain', 'Palpitations', 
    'Abdominal Pain', 'Nausea', 'Vomiting', 'Loose Motions', 'Constipation', 
    'Burning Micturition', 'Headache', 'Bodyache', 'Joint Pain', 'Backache', 
    'Weakness', 'Giddiness', 'Loss of Appetite', 'Weight Loss', 
    'Trauma', 'Road Traffic Accident (RTA)', 'Swelling', 'Rash', 'Itching', 'Jaundice'
  ];
  
  final List<String> _diagnosisTags = [
    'Viral Fever', 'Dengue Fever', 'Typhoid Fever', 'Malaria', 'Chikungunya', 
    'URI', 'LRTI', 'Pneumonia', 'Asthma', 'COPD', 
    'Hypertension', 'Diabetes Mellitus', 'Hypothyroidism', 
    'Acute Gastroenteritis', 'Food Poisoning', 'Appendicitis', 'Cholelithiasis (Gallstones)', 
    'Renal Calculus (Kidney Stones)', 'Urinary Tract Infection (UTI)', 'Anemia', 
    'Jaundice', 'Hepatitis', 'Tuberculosis (TB)', 
    'Gynecomastia', 'Hernia', 'Hydrocele', 'Hemorrhoids (Piles)', 'Fissure in Ano', 'Fistula', 
    'Normal Delivery', 'LSCS (C-Section)', 'Fibroid Uterus', 'Ovarian Cyst', 'PCOD', 
    'Cataract', 'Conjunctivitis', 'Tonsillitis', 'Sinusitis', 
    'Cellulitis', 'Abscess', 'Fracture', 'Sprain', 
    'Osteoarthritis', 'Rheumatoid Arthritis', 'Sciatica', 'Migraine', 'Epilepsy', 
    'Dermatitis', 'Scabies', 'Eczema'
  ];
  
  final List<String> _adviceTags = [
    'Bed rest', 'Complete bed rest', 'Soft diet', 'Liquid diet', 'Normal diet', 
    'Diabetic diet', 'Low salt diet', 'Eat fiber-rich food', 
    'Drink plenty of fluids', 'Boil water before drinking', 'Avoid cold items & ice cream',
    'Avoid spicy & oily food', 'Avoid smoking & alcohol',
    'Maintain hygiene', 'Keep wound clean and dry', 'Dressing change every alternate day', 
    'Suture removal after 7 days', 'Sitz bath 2 times a day',
    'Take medicines regularly', 'Continue prescribed medications', 
    'Warm saline gargles', 'Steam inhalation', 'Deep breathing exercises',
    'Elevate affected limb', 'Apply ice pack', 'Hot water fomentation',
    'Avoid lifting heavy weights', 'No strenuous exercise', 'Avoid bending forward',
    'Regular blood sugar monitoring', 'Regular BP monitoring', 'Physiotherapy advised',
    'Review in OPD after 3 days', 'Review in OPD after 5 days', 'Review in OPD after 7 days', 
    'Review with investigations', 'Review immediately if emergency'
  ];

  final List<Map<String, String>> _medicinePresets = [
    {'name': 'Tab Paracetamol', 'dose': '500mg', 'freq': '1-1-1', 'dur': '3 Days'},
    {'name': 'Tab Pantocid (Pantoprazole)', 'dose': '40mg', 'freq': '1-0-0 (Empty Stomach)', 'dur': '5 Days'},
    {'name': 'Tab Azee (Azithromycin)', 'dose': '500mg', 'freq': '1-0-0', 'dur': '3 Days'},
    {'name': 'Tab Cefixime', 'dose': '200mg', 'freq': '1-0-1', 'dur': '5 Days'},
    {'name': 'Cap Amoxicillin', 'dose': '500mg', 'freq': '1-1-1', 'dur': '5 Days'},
    {'name': 'Tab Diclofenac', 'dose': '50mg', 'freq': '1-0-1 (After Meals)', 'dur': '3 Days'},
    {'name': 'Tab Cetirizine', 'dose': '10mg', 'freq': '0-0-1 (Night)', 'dur': '5 Days'},
    {'name': 'Syp Corex / Cofils', 'dose': '10ml', 'freq': '1-1-1', 'dur': '5 Days'},
    {'name': 'Tab Metformin', 'dose': '500mg', 'freq': '1-0-1', 'dur': '15 Days'},
    {'name': 'Tab Amlodipine', 'dose': '5mg', 'freq': '1-0-0', 'dur': '15 Days'},
    {'name': 'Cap Omez', 'dose': '20mg', 'freq': '1-0-0 (Empty Stomach)', 'dur': '5 Days'},
    {'name': 'Tab B-Complex', 'dose': '1 Tab', 'freq': '1-0-0', 'dur': '10 Days'},
    {'name': 'Tab Calcium + D3', 'dose': '1 Tab', 'freq': '1-0-0', 'dur': '15 Days'},
    {'name': 'ORS Sachet', 'dose': '1 pkt in 1L water', 'freq': 'Sip continuously', 'dur': '3 Days'},
  ];

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
    _symptomsCtrl.dispose(); _diagnosisCtrl.dispose(); _adviceCtrl.dispose();
    for (var r in _medicineRows) { r['name']?.dispose(); r['dose']?.dispose(); r['freq']?.dispose(); r['dur']?.dispose(); }
    super.dispose();
  }

  void _addMedicineRow({Map<String, String>? preset}) {
    setState(() {
      _medicineRows.add({
        'name': TextEditingController(text: preset != null ? preset['name'] : ''),
        'dose': TextEditingController(text: preset != null ? preset['dose'] : ''),
        'freq': TextEditingController(text: preset != null ? preset['freq'] : ''),
        'dur': TextEditingController(text: preset != null ? preset['dur'] : ''),
      });
    });
  }

  void _removeMedicineRow(int i) {
    if (_medicineRows.length <= 1) return;
    setState(() { final r = _medicineRows.removeAt(i); r['name']?.dispose(); r['dose']?.dispose(); r['freq']?.dispose(); r['dur']?.dispose(); });
  }

  void _addTag(TextEditingController ctrl, String tag) {
    final t = ctrl.text.trim();
    if (t.isEmpty) {
      ctrl.text = tag;
    } else {
      ctrl.text = '$t, $tag';
    }
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
    if (!_isMedicalCertMode && summary.isEmpty) {
      _showSnack('Please enter treatment summary / clinical notes', isError: true);
      return;
    }
    if (_isMedicalCertMode && (_symptomsCtrl.text.trim().isEmpty || _diagnosisCtrl.text.trim().isEmpty)) {
      _showSnack('Please enter Symptoms and Diagnosis', isError: true);
      return;
    }
    final patientId = (_selectedPatient!['patient_id'] ?? _selectedPatient!['_id'] ?? '').toString();

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
      if (!_isMedicalCertMode) {
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
      }

      final currentUser = await ApiService.getSavedUser();
      final userName = currentUser?['name'] ?? 'Mobile User';

      final payload = <String, dynamic>{
        'id': 'D${DateTime.now().millisecondsSinceEpoch}',
        'patientId': patientId,
        'doctorName': _doctorCtrl.text.trim(),
        'dischargeDate': _dateCtrl.text.trim(),
        'dischargeTime': _timeCtrl.text.trim(),
        'diagnosis': _isMedicalCertMode ? _diagnosisCtrl.text.trim() : '',
        'summary': _isMedicalCertMode ? '' : summary,
        'advisedMedicines': meds,
        'isMedicalCert': _isMedicalCertMode,
        'symptoms': _isMedicalCertMode ? _symptomsCtrl.text.trim() : '',
        'advice': _isMedicalCertMode ? _adviceCtrl.text.trim() : '',
        'dischargedBy': userName,
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

    final bool isMedCert = payload['isMedicalCert'] == true;
    final String medCertHtml = isMedCert ? '''
      <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
        <span style="font-size: 24px; font-weight: bold; text-decoration: underline; color: #334155; letter-spacing: 1px;">MEDICAL CERTIFICATE</span>
      </div>
      <div style="text-align: center; font-size: 18px; line-height: 2.2; color: #1e293b; padding: 0 20px;">
        This is to certify that <strong>$patientName</strong> Age:-<strong>$age y/$gender</strong><br>
        Add :- <strong>$address</strong><br>
        Patient consulted with C/O <strong>${payload['symptoms']}</strong>.<br>
        All required investigations have been done.<br>
        Final diagnosis is <u><strong>${payload['diagnosis']}</strong></u>.<br>
        Treatment in Chaudhary Health Care Center, Koraon, Prayagraj dt.- <strong>${payload['dischargeDate']}</strong>.<br>
        Further advice to <strong>${payload['advice']}</strong>.
      </div>
      <div style="margin-top: 80px; text-align: right;">
        <div style="display: inline-block; text-align: center; width: 220px; border-top: 1px solid #0f172a; padding-top: 6px; font-size: 13px; font-weight: 800;">
          ${payload['doctorName']}<br>
          <span style="font-size: 11px; font-weight: 400; color: #475569;">Signature</span>
        </div>
      </div>
    ''' : '';

    final String fullDischargeHtml = !isMedCert ? '''
      <div style="padding: 10px 30px;">
        <div style="text-align: right; margin-bottom: 15px;">
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
      </div>
    ''' : '';

    final htmlContent = '''
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; line-height: 1.4; }
          .header-table { width: 100%; border-collapse: collapse; }
          .h-title { font-size: 32px; font-weight: 900; color: #1e3a8a; margin: 0; letter-spacing: -0.5px; line-height: 1.1; white-space: nowrap; }
          .h-sub { font-size: 13px; font-weight: 700; color: #dc2626; margin-top: 4px; }
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
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 90px; text-align: left; vertical-align: middle;">
              ${logoDataUrl.isNotEmpty ? '<img src="$logoDataUrl" style="width: 80px; height: 80px; border-radius: 50%;" />' : ''}
            </td>
            <td style="vertical-align: middle; text-align: center;">
              <div class="h-title">CHAUDHARY HEALTH CARE CENTER</div>
              <div style="font-size: 13px; font-weight: 700; color: #dc2626; margin-top: 4px;">GANDHI CHAURAHA, MEJA WALI ROAD, KORAON-PRAYAGRAJ 212306</div>
            </td>
            <td style="width: 90px; text-align: right; vertical-align: middle;">
              <!-- Placeholder for right logo if needed -->
            </td>
          </tr>
        </table>
        <table style="width: 100%; margin-top: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 15px;">
          <tr>
            <td style="text-align: left; vertical-align: top;">
              <div style="font-size: 16px; font-weight: 900; color: #1e3a8a;">Dr. B.K. Chaudhary</div>
              <div style="font-size: 12.5px; font-weight: 700; color: #dc2626; margin-top: 2px;">(M.D. Medicine)</div>
            </td>
            <td style="text-align: right; font-size: 11px; color: #475569; line-height: 1.4; vertical-align: top; font-weight: 600;">
              Consulting Timing : 10:00 am to 2:00 pm<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 5:00 pm to 8:00 pm
            </td>
          </tr>
        </table>
        
        $medCertHtml
        $fullDischargeHtml

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
              payload['isMedicalCert'] == true 
                  ? 'Medical Certificate Generated' 
                  : (_isOpd ? 'OPD Visit Slip Generated' : 'Discharge Summary Generated'),
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
              if (payload['isMedicalCert'] == true) ...[
                Text('Medical Certificate:', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 12)),
                Text('Symptoms: ${payload['symptoms']}', style: GoogleFonts.inter(fontSize: 12)),
                Text('Diagnosis: ${payload['diagnosis']}', style: GoogleFonts.inter(fontSize: 12)),
                Text('Advice: ${payload['advice']}', style: GoogleFonts.inter(fontSize: 12)),
              ] else ...[
                Text(_isOpd ? 'Clinical Notes:' : 'Treatment Summary:', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 12)),
                Text(payload['summary'] ?? '', style: GoogleFonts.inter(fontSize: 12)),
              ],
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
    AppSnackBar.showTopSnack(context, msg, isError: isError);
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

    Widget _chipList(List<String> tags, TextEditingController ctrl) => SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: tags.map((t) => Padding(
              padding: const EdgeInsets.only(right: 6),
              child: ActionChip(
                label: Text(t, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600)),
                backgroundColor: isDark ? const Color(0xFF334155) : const Color(0xFFE0E7FF),
                side: BorderSide.none,
                padding: const EdgeInsets.all(4),
                onPressed: () => _addTag(ctrl, t),
              ),
            )).toList(),
          ),
        );

    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;

    return Scaffold(
      resizeToAvoidBottomInset: false,
      backgroundColor: bg,
      appBar: AppBar(
        systemOverlayStyle: isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
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
                    // Mode Toggle
                    card(Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _isMedicalCertMode = true),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: _isMedicalCertMode ? const Color(0xFF4F46E5) : fillColor,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              alignment: Alignment.center,
                              child: Text('Medical Certificate', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: _isMedicalCertMode ? Colors.white : Colors.grey)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _isMedicalCertMode = false),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: !_isMedicalCertMode ? const Color(0xFF4F46E5) : fillColor,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              alignment: Alignment.center,
                              child: Text(_isOpd ? 'Detailed Prescription' : 'Full Discharge', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: !_isMedicalCertMode ? Colors.white : Colors.grey)),
                            ),
                          ),
                        ),
                      ],
                    )),
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
                        
                        if (_isMedicalCertMode) ...[
                          lbl('Symptoms (C/O) *'),
                          const SizedBox(height: 6),
                          _chipList(_symptomTags, _symptomsCtrl),
                          TextField(controller: _symptomsCtrl, style: GoogleFonts.inter(fontSize: 13), decoration: dec(hint: 'e.g. Left side chest pain')),
                          const SizedBox(height: 12),
                          lbl('Diagnosis / Treatment *'),
                          const SizedBox(height: 6),
                          _chipList(_diagnosisTags, _diagnosisCtrl),
                          TextField(controller: _diagnosisCtrl, style: GoogleFonts.inter(fontSize: 13), decoration: dec(hint: 'e.g. Operated for Gynecomastia')),
                          const SizedBox(height: 12),
                          lbl('Advice / Recommendations'),
                          const SizedBox(height: 6),
                          _chipList(_adviceTags, _adviceCtrl),
                          TextField(controller: _adviceCtrl, style: GoogleFonts.inter(fontSize: 13), decoration: dec(hint: 'e.g. Bed rest')),
                        ] else ...[
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
                      ],
                    )),
                    if (!_isMedicalCertMode) card(Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Advised Medicines', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w800)),
                            TextButton.icon(
                              onPressed: () => _addMedicineRow(),
                              icon: const Icon(Icons.add, size: 16),
                              label: Text('Add Blank Row', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Row(
                            children: _medicinePresets.map((preset) => Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: ActionChip(
                                avatar: const Icon(Icons.medical_services_outlined, size: 14, color: Color(0xFF16A34A)),
                                label: Text(preset['name']!, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600)),
                                backgroundColor: isDark ? const Color(0xFF14532D) : const Color(0xFFDCFCE7),
                                side: BorderSide.none,
                                padding: const EdgeInsets.all(4),
                                onPressed: () => _addMedicineRow(preset: preset),
                              ),
                            )).toList(),
                          ),
                        ),
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
                              const SizedBox(width: 4),
                              GestureDetector(
                                onTap: () => _removeMedicineRow(i),
                                child: const Icon(Icons.remove_circle_outline, color: Color(0xFFEF4444), size: 20),
                              ),
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