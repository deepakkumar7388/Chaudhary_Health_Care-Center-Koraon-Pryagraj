import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../services/api_service.dart';

class AddPatientScreen extends StatefulWidget {
  const AddPatientScreen({super.key});

  @override
  State<AddPatientScreen> createState() => _AddPatientScreenState();
}

class _AddPatientScreenState extends State<AddPatientScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();

  String _patientType = 'IPD';
  bool _isLoading = false;

  // Focus Nodes for field highlighting
  final _nameFocus = FocusNode();
  final _ageFocus = FocusNode();
  final _guardianFocus = FocusNode();
  final _mobileFocus = FocusNode();
  final _emailFocus = FocusNode();
  final _addressFocus = FocusNode();
  final _problemFocus = FocusNode();
  final _feeFocus = FocusNode();

  // Controllers
  final _nameController = TextEditingController();
  final _ageController = TextEditingController();
  final _guardianController = TextEditingController();
  final _mobileController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _problemController = TextEditingController();
  final _consultationFeeController = TextEditingController(text: '500');

  // Selections
  String? _gender; // Null by default so user selects first
  String? _bedNumber;
  String _department = 'General Medicine';
  String _doctorAssigned = 'Dr. Bhoopendra Chaudhary';

  List<String> _allAvailableBeds = [];
  List<String> _filteredBeds = [];
  bool _isLoadingBeds = false;

  final List<String> _doctors = [
    'Dr. Bhoopendra Chaudhary',
    'Dr. S. K. Singh',
    'Dr. Ananya Sharma',
    'Dr. Rajesh Verma',
  ];
  final List<String> _departments = [
    'General Medicine',
    'Orthopedics',
    'Pediatrics',
    'Gynecology',
    'Cardiology',
    'ICU',
  ];

  @override
  void initState() {
    super.initState();
    _fetchBeds();
    for (final fn in [
      _nameFocus, _ageFocus, _guardianFocus, _mobileFocus,
      _emailFocus, _addressFocus, _problemFocus, _feeFocus,
    ]) {
      fn.addListener(() => setState(() {}));
    }
  }

  Future<void> _fetchBeds() async {
    setState(() => _isLoadingBeds = true);
    try {
      final res = await ApiService.getAvailableBeds();
      if (res['success'] == true && res['beds'] != null) {
        _allAvailableBeds = List<String>.from(res['beds']);
      } else {
        _allAvailableBeds = [
          'Male-G1', 'Male-G2', 'Male-G3', 'Male-G4',
          'Female-G1', 'Female-G2', 'Female-G3', 'Female-G4',
          'ICU-1', 'ICU-2', 'Private-1', 'Private-2'
        ];
      }
    } catch (_) {
      _allAvailableBeds = [
        'Male-G1', 'Male-G2', 'Male-G3', 'Male-G4',
        'Female-G1', 'Female-G2', 'Female-G3', 'Female-G4',
        'ICU-1', 'ICU-2', 'Private-1', 'Private-2'
      ];
    }
    _filterBedsByGender();
    if (mounted) setState(() => _isLoadingBeds = false);
  }

  void _filterBedsByGender() {
    if (_gender == null || _gender!.isEmpty) {
      _filteredBeds = [];
      _bedNumber = null;
      return;
    }

    final gender = _gender!;
    List<String> list = [];

    if (gender == 'Male') {
      list = _allAvailableBeds.where((b) => b.startsWith('Male-G')).toList();
    } else if (gender == 'Female') {
      list = _allAvailableBeds.where((b) => b.startsWith('Female-G')).toList();
    } else {
      list = _allAvailableBeds.where((b) => b.startsWith('Male-G') || b.startsWith('Female-G')).toList();
    }

    final icu = _allAvailableBeds.where((b) => b.startsWith('ICU-')).toList();
    final pvt = _allAvailableBeds.where((b) => b.startsWith('Private-')).toList();

    list.addAll(icu);
    list.addAll(pvt);

    _filteredBeds = list;
    if (_bedNumber != null && !_filteredBeds.contains(_bedNumber)) {
      _bedNumber = null;
    }
  }

  void _onGenderChanged(String? newGender) {
    setState(() {
      _gender = newGender;
      _filterBedsByGender();
    });
  }

  // ── COLORS (matching home screen sky-blue theme) ──
  static const Color _bg = Color(0xFFF0F9FF);
  static const Color _primary = Color(0xFF0284C7);
  static const Color _fieldFill = Colors.white;
  static const Color _labelColor = Color(0xFF475569);
  static const Color _hintColor = Color(0xFF94A3B8);
  static const Color _textDark = Color(0xFF0F172A);
  static const LinearGradient _blueGradient = LinearGradient(
    colors: [Color(0xFF0284C7), Color(0xFF38BDF8)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );



  @override
  void dispose() {
    for (final fn in [
      _nameFocus, _ageFocus, _guardianFocus, _mobileFocus,
      _emailFocus, _addressFocus, _problemFocus, _feeFocus,
    ]) {
      fn.dispose();
    }
    for (final c in [
      _nameController, _ageController, _guardianController,
      _mobileController, _emailController, _addressController,
      _problemController, _consultationFeeController,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _resetForm() {
    _nameController.clear();
    _ageController.clear();
    _guardianController.clear();
    _mobileController.clear();
    _emailController.clear();
    _addressController.clear();
    _problemController.clear();
    _consultationFeeController.text = '500';
    setState(() {
      _gender = 'Male';
      _bedNumber = 'Bed 101';
      _department = 'General Medicine';
      _doctorAssigned = 'Dr. Bhoopendra Chaudhary';
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      final isOpd = _patientType == 'OPD';

      if (!isOpd) {
        if (_gender == null || _gender!.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Please select Gender first', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
              backgroundColor: AppColors.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
          return;
        }
        if (_bedNumber == null || _bedNumber!.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Please select a Bed Number for IPD Admission', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
              backgroundColor: AppColors.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
          return;
        }
      }

      final fee = isOpd
          ? (double.tryParse(_consultationFeeController.text.trim()) ?? 500.0)
          : 0.0;
      final data = {
        'name': _nameController.text.trim(),
        'age': int.tryParse(_ageController.text.trim()) ?? 0,
        'gender': _gender ?? 'Male',
        'mobile': _mobileController.text.trim(),
        'address': _addressController.text.trim(),
        'problem': _problemController.text.trim(),
        'patient_type': _patientType,
        'status': 'Admitted',
        if (!isOpd) ...{
          'guardian_name': _guardianController.text.trim(),
          'email': _emailController.text.trim().isNotEmpty
              ? _emailController.text.trim()
              : null,
          'bed_no': _bedNumber,
          'doctor_assigned': _doctorAssigned,
        },
        if (isOpd) ...{
          'guardian_name': _guardianController.text.trim(),
          'department': _department,
          'doctor_assigned': _doctorAssigned,
          'doctorFees': fee,
          'totalBill': fee,
          'pending_amount': fee,
          'payment_status': fee > 0 ? 'Paid' : 'Pending',
        },
      };

      final result = await ApiService.createPatient(data);
      if (!mounted) return;
      if (result['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isOpd
                  ? 'OPD Patient Registered! ID: ${result['patient']?['patient_id'] ?? ''}'
                  : 'IPD Patient Admitted! ID: ${result['patient']?['patient_id'] ?? ''}',
              style: GoogleFonts.inter(fontWeight: FontWeight.w600),
            ),
            backgroundColor: _primary,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
        Navigator.pop(context, true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Failed to register patient'),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Error: Cannot connect to server'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.backgroundDark : _bg;

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: GestureDetector(
          onTap: () => FocusScope.of(context).unfocus(),
          child: Column(
            children: [
              _buildTopHeader(isDark),
              Expanded(
                child: Form(
                  key: _formKey,
                  child: ListView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
                    children: [
                      _buildToggle(isDark),
                      const SizedBox(height: 24),
                      if (_patientType == 'IPD') ..._buildIpdFields(isDark)
                      else ..._buildOpdFields(isDark),
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
              ),
              _buildBottomBar(isDark),
            ],
          ),
        ),
      ),
    );
  }

  // ── HEADER ──
  Widget _buildTopHeader(bool isDark) {
    return Container(
      color: isDark ? AppColors.surfaceDark : Colors.white,
      padding: const EdgeInsets.fromLTRB(4, 6, 16, 6),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: Icon(
              Icons.arrow_back_ios_new_rounded,
              size: 20,
              color: isDark ? Colors.white : _textDark,
            ),
          ),
          Expanded(
            child: Text(
              'Register New Patient',
              style: GoogleFonts.inter(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : _textDark,
                letterSpacing: -0.4,
              ),
            ),
          ),
          // IPD / OPD pill badge in header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              gradient: _blueGradient,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: _primary.withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Text(
              _patientType,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── PROFESSIONAL IPD/OPD SEGMENTED TABS ──
  Widget _buildToggle(bool isDark) {
    return Row(
      children: [
        _toggleTab(
          type: 'IPD',
          label: 'IPD Admission',
          subtitle: 'Indoor Patient',
          icon: Icons.hotel_rounded,
          isDark: isDark,
        ),
        const SizedBox(width: 12),
        _toggleTab(
          type: 'OPD',
          label: 'OPD Visit',
          subtitle: 'Outpatient',
          icon: Icons.person_rounded,
          isDark: isDark,
        ),
      ],
    );
  }

  Widget _toggleTab({
    required String type,
    required String label,
    required String subtitle,
    required IconData icon,
    required bool isDark,
  }) {
    final isActive = _patientType == type;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _patientType = type),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            gradient: isActive ? _blueGradient : null,
            color: isActive ? null : (isDark ? AppColors.surfaceDark : Colors.white),
            borderRadius: BorderRadius.circular(16),
            border: isActive
                ? null
                : Border.all(
                    color: isDark
                        ? Colors.white12
                        : const Color(0xFFE2E8F0),
                    width: 1.5,
                  ),
            boxShadow: isActive
                ? [
                    BoxShadow(
                      color: _primary.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    )
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    )
                  ],
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: isActive
                      ? Colors.white.withValues(alpha: 0.2)
                      : (isDark ? Colors.white10 : const Color(0xFFE0F2FE)),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: isActive
                      ? Colors.white
                      : (isDark ? Colors.white54 : _primary),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isActive
                      ? Colors.white
                      : (isDark ? Colors.white : _textDark),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── IPD FORM ──
  List<Widget> _buildIpdFields(bool isDark) => [
        _softField(
          label: 'Full Name',
          required: true,
          controller: _nameController,
          focusNode: _nameFocus,
          nextFocus: _ageFocus,
          icon: Icons.person_outline_rounded,
          hint: 'Patient\'s full name',
          isDark: isDark,
          cap: TextCapitalization.words,
        ),
        Row(
          children: [
            Expanded(
              child: _softField(
                label: 'Age',
                required: true,
                controller: _ageController,
                focusNode: _ageFocus,
                nextFocus: _guardianFocus,
                icon: Icons.calendar_today_rounded,
                hint: 'Years',
                isDark: isDark,
                keyboard: TextInputType.number,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: _softDropdown(
                label: 'Gender *',
                value: _gender,
                items: const ['Male', 'Female', 'Other'],
                icon: Icons.wc_rounded,
                isDark: isDark,
                onChanged: _onGenderChanged,
              ),
            ),
          ],
        ),
        _softField(
          label: 'Guardian Name',
          required: true,
          controller: _guardianController,
          focusNode: _guardianFocus,
          nextFocus: _mobileFocus,
          icon: Icons.family_restroom_rounded,
          hint: 'Guardian / relative name',
          isDark: isDark,
          cap: TextCapitalization.words,
        ),
        _softField(
          label: 'Mobile Number',
          required: true,
          controller: _mobileController,
          focusNode: _mobileFocus,
          nextFocus: _emailFocus,
          icon: Icons.phone_outlined,
          hint: '10-digit mobile',
          isDark: isDark,
          keyboard: TextInputType.phone,
          maxLen: 10,
        ),
        _softField(
          label: 'Email Address',
          controller: _emailController,
          focusNode: _emailFocus,
          nextFocus: _addressFocus,
          icon: Icons.email_outlined,
          hint: 'Optional',
          isDark: isDark,
          keyboard: TextInputType.emailAddress,
        ),
        _softDropdown(
          label: 'Bed Number *',
          value: _bedNumber,
          items: _filteredBeds,
          icon: Icons.bed_rounded,
          isDark: isDark,
          enabled: _gender != null && _filteredBeds.isNotEmpty,
          hintText: _gender == null ? 'Select Gender First' : (_isLoadingBeds ? 'Loading Beds...' : 'Select Bed'),
          onChanged: (v) => setState(() => _bedNumber = v),
        ),
        _softField(
          label: 'Full Address',
          required: true,
          controller: _addressController,
          focusNode: _addressFocus,
          nextFocus: _problemFocus,
          icon: Icons.location_on_outlined,
          hint: 'Street, city, state',
          isDark: isDark,
          maxLines: 2,
          cap: TextCapitalization.words,
        ),
        _softField(
          label: 'Condition / Problem',
          controller: _problemController,
          focusNode: _problemFocus,
          icon: Icons.medical_services_outlined,
          hint: 'Describe the patient\'s condition',
          isDark: isDark,
          maxLines: 2,
          cap: TextCapitalization.sentences,
          action: TextInputAction.done,
        ),
        _softDropdown(
          label: 'Assigned Doctor',
          value: _doctorAssigned,
          items: _doctors,
          icon: Icons.medical_information_rounded,
          isDark: isDark,
          onChanged: (v) => setState(() => _doctorAssigned = v!),
        ),
      ];

  // ── OPD FORM ──
  List<Widget> _buildOpdFields(bool isDark) => [
        _softField(
          label: 'Full Name',
          required: true,
          controller: _nameController,
          focusNode: _nameFocus,
          nextFocus: _ageFocus,
          icon: Icons.person_outline_rounded,
          hint: 'Patient\'s full name',
          isDark: isDark,
          cap: TextCapitalization.words,
        ),
        Row(
          children: [
            Expanded(
              child: _softField(
                label: 'Age',
                required: true,
                controller: _ageController,
                focusNode: _ageFocus,
                nextFocus: _addressFocus,
                icon: Icons.calendar_today_rounded,
                hint: 'Years',
                isDark: isDark,
                keyboard: TextInputType.number,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(child: _softDropdown(label: 'Gender', value: _gender, items: ['Male', 'Female', 'Other'], icon: Icons.wc_rounded, isDark: isDark, onChanged: (v) => setState(() => _gender = v!))),
          ],
        ),
        _softField(
          label: 'Full Address',
          required: true,
          controller: _addressController,
          focusNode: _addressFocus,
          nextFocus: _problemFocus,
          icon: Icons.location_on_outlined,
          hint: 'Street, city, state',
          isDark: isDark,
          maxLines: 2,
          cap: TextCapitalization.words,
        ),
        _softField(
          label: 'Condition / Problem',
          required: true,
          controller: _problemController,
          focusNode: _problemFocus,
          icon: Icons.medical_services_outlined,
          hint: 'Describe the condition',
          isDark: isDark,
          maxLines: 2,
          cap: TextCapitalization.sentences,
        ),
        _softDropdown(
          label: 'Department',
          value: _department,
          items: _departments,
          icon: Icons.local_hospital_outlined,
          isDark: isDark,
          onChanged: (v) => setState(() => _department = v!),
        ),
        _softDropdown(
          label: 'Assigned Doctor',
          value: _doctorAssigned,
          items: _doctors,
          icon: Icons.medical_information_rounded,
          isDark: isDark,
          onChanged: (v) => setState(() => _doctorAssigned = v!),
        ),
        _softField(
          label: 'Consultation Fee (₹)',
          controller: _consultationFeeController,
          focusNode: _feeFocus,
          nextFocus: _mobileFocus,
          icon: Icons.currency_rupee_rounded,
          hint: 'Amount in ₹',
          isDark: isDark,
          keyboard: TextInputType.number,
        ),
        _softField(
          label: 'Mobile Number',
          controller: _mobileController,
          focusNode: _mobileFocus,
          icon: Icons.phone_outlined,
          hint: 'Optional',
          isDark: isDark,
          keyboard: TextInputType.phone,
          maxLen: 10,
          action: TextInputAction.done,
        ),
      ];

  // ── SOFT FIELD BUILDER WITH PROPER M3 OUTLINE FLOATING LABEL ──
  Widget _softField({
    required String label,
    required TextEditingController controller,
    required FocusNode focusNode,
    FocusNode? nextFocus,
    required String hint,
    required bool isDark,
    IconData? icon,
    bool required = false,
    TextInputType keyboard = TextInputType.text,
    TextCapitalization cap = TextCapitalization.none,
    TextInputAction action = TextInputAction.next,
    int maxLines = 1,
    int? maxLen,
  }) {
    final isFocused = focusNode.hasFocus;
    final fillColor = isDark ? AppColors.surfaceDark : _fieldFill;
    final focusBorder = _primary;
    final displayLabel = required ? '$label *' : label;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        focusNode: focusNode,
        keyboardType: keyboard,
        textCapitalization: cap,
        textInputAction: action,
        maxLines: maxLines,
        maxLength: maxLen,
        style: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: isDark ? Colors.white : _textDark,
        ),
        decoration: InputDecoration(
          filled: true,
          fillColor: fillColor,
          labelText: displayLabel,
          labelStyle: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: isFocused
                ? focusBorder
                : (isDark ? AppColors.textSecondaryDark : _labelColor),
          ),
          floatingLabelStyle: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: isFocused
                ? focusBorder
                : (isDark ? Colors.white70 : _labelColor),
          ),
          hintText: isFocused ? hint : null,
          hintStyle: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w400,
            color: isDark ? Colors.white38 : _hintColor,
          ),
          prefixIcon: icon != null
              ? Icon(
                  icon,
                  size: 19,
                  color: isFocused
                      ? focusBorder
                      : (isDark ? Colors.white38 : _hintColor),
                )
              : null,
          counterText: '',
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(
              color: isDark ? Colors.white12 : const Color(0xFFE2E8F0),
              width: 1.2,
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(
              color: isDark ? Colors.white12 : const Color(0xFFE2E8F0),
              width: 1.2,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: focusBorder, width: 2.0),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: AppColors.error, width: 1.2),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: AppColors.error, width: 2.0),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          errorStyle: GoogleFonts.inter(fontSize: 11, color: AppColors.error),
        ),
        onFieldSubmitted: (_) {
          if (nextFocus != null) {
            FocusScope.of(context).requestFocus(nextFocus);
          } else {
            FocusScope.of(context).unfocus();
          }
        },
        validator: required
            ? (v) => (v == null || v.trim().isEmpty) ? 'Required' : null
            : null,
      ),
    );
  }

  // ── SOFT DROPDOWN BUILDER WITH PROPER M3 OUTLINE FLOATING LABEL ──
  Widget _softDropdown({
    required String label,
    required String? value,
    required List<String> items,
    required bool isDark,
    required ValueChanged<String?>? onChanged,
    IconData? icon,
    bool enabled = true,
    String? hintText,
  }) {
    final fillColor = isDark ? AppColors.surfaceDark : _fieldFill;
    final focusBorder = _primary;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: DropdownButtonFormField<String>(
        initialValue: value,
        isExpanded: true,
        icon: Icon(
          Icons.keyboard_arrow_down_rounded,
          color: isDark ? Colors.white54 : _hintColor,
        ),
        style: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: isDark ? Colors.white : _textDark,
        ),
        dropdownColor: isDark ? AppColors.surfaceDark : Colors.white,
        decoration: InputDecoration(
          filled: true,
          fillColor: enabled ? fillColor : (isDark ? Colors.white10 : const Color(0xFFF1F5F9)),
          labelText: label,
          hintText: hintText,
          labelStyle: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: isDark ? AppColors.textSecondaryDark : _labelColor,
          ),
          floatingLabelStyle: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: focusBorder,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(
              color: isDark ? Colors.white12 : const Color(0xFFE2E8F0),
              width: 1.2,
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(
              color: isDark ? Colors.white12 : const Color(0xFFE2E8F0),
              width: 1.2,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: focusBorder, width: 2.0),
          ),
          prefixIcon: icon != null
              ? Icon(icon, size: 19, color: isDark ? Colors.white38 : _hintColor)
              : null,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
        items: items.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
        onChanged: enabled ? onChanged : null,
      ),
    );
  }

  // ── STICKY BOTTOM BAR ──
  Widget _buildBottomBar(bool isDark) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            // ── Reset Button (left, outlined) ──
            SizedBox(
              height: 52,
              child: OutlinedButton(
                onPressed: _isLoading ? null : _resetForm,
                style: OutlinedButton.styleFrom(
                  foregroundColor: isDark ? Colors.white54 : _labelColor,
                  side: BorderSide(
                    color: isDark ? Colors.white24 : const Color(0xFFCBD5E1),
                    width: 1.5,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                ),
                child: Row(
                  children: [
                    Icon(Icons.refresh_rounded, size: 18,
                        color: isDark ? Colors.white54 : _labelColor),
                    const SizedBox(width: 6),
                    Text(
                      'Reset',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            // ── Submit Button (right, gradient fill) ──
            Expanded(
              child: GestureDetector(
                onTap: _isLoading ? null : _submit,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: _isLoading ? null : _blueGradient,
                    color: _isLoading ? Colors.grey.shade300 : null,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: _isLoading
                        ? null
                        : [
                            BoxShadow(
                              color: _primary.withValues(alpha: 0.35),
                              blurRadius: 14,
                              offset: const Offset(0, 5),
                            ),
                          ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (_isLoading)
                        const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation(Colors.white),
                          ),
                        )
                      else
                        Icon(
                          _patientType == 'IPD'
                              ? Icons.hotel_rounded
                              : Icons.person_add_alt_1_rounded,
                          color: Colors.white,
                          size: 19,
                        ),
                      const SizedBox(width: 8),
                      Text(
                        _isLoading
                            ? 'Registering...'
                            : (_patientType == 'IPD'
                                ? 'Admit Patient'
                                : 'Register OPD'),
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: _isLoading ? Colors.grey : Colors.white,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ],
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
