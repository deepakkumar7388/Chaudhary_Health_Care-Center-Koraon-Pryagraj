import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';

class EditBillLineItemsScreen extends StatefulWidget {
  final Map<String, dynamic> patient;
  final Map<String, dynamic>? billing;

  const EditBillLineItemsScreen({
    super.key,
    required this.patient,
    this.billing,
  });

  @override
  State<EditBillLineItemsScreen> createState() => _EditBillLineItemsScreenState();
}

class _EditBillLineItemsScreenState extends State<EditBillLineItemsScreen> {
  late List<dynamic> _currentItems;
  late final List<String> _standardServices;
  final Map<String, Map<String, TextEditingController>> _itemControllers = {};
  late TextEditingController _discountController;
  late TextEditingController _searchController;
  String _filterQuery = '';
  bool _isSaving = false;

  // Mapping old DB spelling typos to clean corrected names
  static const Map<String, String> _spellingMap = {
    'DRASSING CHARGE': 'DRESSING CHARGE',
    'BloodInfusion Charge': 'Blood Infusion Charge',
    'OPRATION THEATER CHARGE': 'OPERATION THEATER CHARGE',
    'DILEVARY /DNC /Streech CHARGE': 'DELIVERY / DNC / STITCH CHARGE',
    'X RAY CHARGE-': 'X-RAY CHARGE',
  };

  @override
  void initState() {
    super.initState();
    _currentItems = widget.billing?['items'] != null ? List<dynamic>.from(widget.billing!['items']) : [];
    
    _standardServices = [
      "DR. FEES",
      "OXYGEN CHARGE",
      "NEBULIZER CHARGE",
      "MONITOR CHARGE",
      "SYRINGE PUMP CHARGE",
      "SUCTION CHARGE",
      "NURSING CHARGE",
      "RMO CHARGE",
      "ANESTHETIC CHARGE",
      "OPERATION THEATER CHARGE",
      "ECG CHARGE",
      "Advance Medicine Charge",
      "EMERGENCY MEDICINE CHARGE",
      "DELIVERY / DNC / STITCH CHARGE",
      "EMERGENCY BABY CARE / PHOTOTHERAPY",
      "X-RAY CHARGE",
      "DRESSING CHARGE",
      "STORE MEDICINE CHARGE",
      "Blood Infusion Charge",
      "CONSULTATION FEE",
    ];

    // Initialize item controllers with normalization for old typos
    for (var svc in _standardServices) {
      final existing = _currentItems.firstWhere((i) {
        final rawName = (i['name'] ?? '').toString();
        final normalized = _spellingMap[rawName] ?? rawName;
        return normalized.toUpperCase() == svc.toUpperCase();
      }, orElse: () => null);

      _itemControllers[svc] = {
        'fee': TextEditingController(text: existing != null ? (existing['fee']?.toString() ?? '') : ''),
        'days': TextEditingController(text: existing != null ? (existing['days']?.toString() ?? '1') : '1'),
      };
    }

    _discountController = TextEditingController(text: widget.billing?['discount']?.toString() ?? '0');
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _discountController.dispose();
    _searchController.dispose();
    _itemControllers.forEach((_, ctrls) {
      ctrls['fee']?.dispose();
      ctrls['days']?.dispose();
    });
    super.dispose();
  }

  double _calcGrandTotal() {
    double total = 0;
    _itemControllers.forEach((name, ctrls) {
      double f = double.tryParse(ctrls['fee']!.text.trim()) ?? 0;
      double d = double.tryParse(ctrls['days']!.text.trim()) ?? 1;
      total += (f * d);
    });
    return total;
  }

  Future<void> _saveBill() async {
    if (_isSaving) return;
    setState(() => _isSaving = true);

    final List<Map<String, dynamic>> updatedItems = [];
    double newGrandTotal = 0;

    _itemControllers.forEach((name, ctrls) {
      double fee = double.tryParse(ctrls['fee']!.text.trim()) ?? 0;
      double days = double.tryParse(ctrls['days']!.text.trim()) ?? 1;
      if (fee > 0) {
        updatedItems.add({
          'name': name,
          'fee': fee,
          'days': days,
        });
        newGrandTotal += (fee * days);
      }
    });

    double disc = double.tryParse(_discountController.text.trim()) ?? 0;
    double paid = double.tryParse(widget.billing?['totalPaid']?.toString() ?? '0') ?? 0;
    double pending = (newGrandTotal - disc - paid).clamp(0, double.infinity);

    final billingPayload = {
      'items': updatedItems,
      'discount': disc.toInt(),
      'totalBill': newGrandTotal.toInt(),
      'pendingAmount': pending.toInt(),
      'paymentStatus': pending <= 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending'),
    };

    try {
      await ApiService.saveBilling(widget.patient['_id'] ?? widget.patient['id'] ?? '', billingPayload);
    } catch (_) {}

    if (mounted) {
      setState(() => _isSaving = false);
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final grandTotal = _calcGrandTotal();
    final discount = double.tryParse(_discountController.text.trim()) ?? 0;
    final netPayable = (grandTotal - discount).clamp(0, double.infinity);

    final filteredServices = _standardServices
        .where((s) => s.toLowerCase().contains(_filterQuery.toLowerCase()))
        .toList();

    const primaryBlue = Color(0xFF0284C7);
    final bgColor = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8F9FA);
    final cardBg = isDark ? const Color(0xFF1E293B) : Colors.white;
    final textColor = isDark ? const Color(0xFFF8FAFC) : const Color(0xFF0F172A);
    final mutedText = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: Text(
          'Edit Bill Line Items',
          style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 18, color: textColor),
        ),
        backgroundColor: cardBg,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: textColor),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          TextButton.icon(
            onPressed: _isSaving ? null : _saveBill,
            icon: _isSaving 
              ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: primaryBlue))
              : const Icon(Icons.check_circle_rounded, color: primaryBlue, size: 20),
            label: Text(
              'Save',
              style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 14, color: primaryBlue),
            ),
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // 📊 TOP SECTION: Summary & Search (Separated cleanly without overlap)
            SingleChildScrollView(
              physics: const NeverScrollableScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. TOP SUMMARY CARD (Compact Header)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Estimated Net Payable',
                                    style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: mutedText),
                                  ),
                                  Text(
                                    '₹${netPayable.toInt()}',
                                    style: GoogleFonts.poppins(fontSize: 19, fontWeight: FontWeight.w800, color: primaryBlue),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: primaryBlue.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Text(
                                  'Gross: ₹${grandTotal.toInt()}',
                                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: primaryBlue),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _discountController,
                                  keyboardType: TextInputType.number,
                                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: textColor),
                                  decoration: InputDecoration(
                                    labelText: 'Discount Amount (₹)',
                                    labelStyle: GoogleFonts.inter(fontSize: 11, color: mutedText),
                                    prefixIcon: const Icon(Icons.local_offer_outlined, size: 16, color: Color(0xFFF59E0B)),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10),
                                      borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10),
                                      borderSide: BorderSide(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10),
                                      borderSide: const BorderSide(color: primaryBlue, width: 1.5),
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    isDense: true,
                                    fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                                    filled: true,
                                  ),
                                  onChanged: (_) => setState(() {}),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 10),

                    // 2. PILL-SHAPED SEARCH BAR
                    TextField(
                      controller: _searchController,
                      style: GoogleFonts.inter(fontSize: 13, color: textColor),
                      decoration: InputDecoration(
                        hintText: 'Search charges (e.g. Oxygen, ICU, Dressing)...',
                        hintStyle: GoogleFonts.inter(fontSize: 13, color: mutedText),
                        prefixIcon: const Icon(Icons.search_rounded, size: 20, color: primaryBlue),
                        suffixIcon: _filterQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded, size: 18),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _filterQuery = '');
                                },
                              )
                            : null,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(30),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        isDense: true,
                        filled: true,
                        fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                      ),
                      onChanged: (val) => setState(() => _filterQuery = val),
                    ),

                    // CRITICAL FIX: Explicit vertical spacing before the scrollable list below
                    const SizedBox(height: 14),
                  ],
                ),
              ),
            ),

            // 💳 3. BILL LINE ITEMS (Decluttered cards without inner nested boxes)
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                itemCount: filteredServices.length,
                itemBuilder: (context, idx) {
                  final svcName = filteredServices[idx];
                  final feeCtrl = _itemControllers[svcName]!['fee']!;
                  final daysCtrl = _itemControllers[svcName]!['days']!;

                  final fee = double.tryParse(feeCtrl.text.trim()) ?? 0;
                  final days = double.tryParse(daysCtrl.text.trim()) ?? 1;
                  final subtotal = fee * days;
                  final isActive = subtotal > 0;

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isActive 
                            ? primaryBlue.withValues(alpha: 0.5) 
                            : (isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                        width: isActive ? 1.5 : 1.0,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Card Header Row: Item Title & Right Aligned Subtotal
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Expanded(
                              child: Text(
                                svcName,
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: textColor,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '₹${subtotal.toInt()}',
                              style: GoogleFonts.inter(
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                color: isActive ? primaryBlue : mutedText,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // Inputs Row: Rate per day & Days / Qty with clean, non-nested styling
                        Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: TextField(
                                controller: feeCtrl,
                                keyboardType: TextInputType.number,
                                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: textColor),
                                decoration: InputDecoration(
                                  labelText: 'Rate per day (₹)',
                                  labelStyle: GoogleFonts.inter(fontSize: 11, color: mutedText),
                                  prefixText: '₹ ',
                                  prefixStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: primaryBlue),
                                  isDense: true,
                                  filled: true,
                                  fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: BorderSide(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: BorderSide(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: const BorderSide(color: primaryBlue, width: 1.5),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                ),
                                onChanged: (_) => setState(() {}),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              flex: 2,
                              child: TextField(
                                controller: daysCtrl,
                                keyboardType: TextInputType.number,
                                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: textColor),
                                decoration: InputDecoration(
                                  labelText: 'Days / Qty',
                                  labelStyle: GoogleFonts.inter(fontSize: 11, color: mutedText),
                                  isDense: true,
                                  filled: true,
                                  fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: BorderSide(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: BorderSide(color: isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: const BorderSide(color: primaryBlue, width: 1.5),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                                ),
                                onChanged: (_) => setState(() {}),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),

      // 🔘 4. STICKY BOTTOM ACTION BUTTON
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(
          color: cardBg,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: SizedBox(
            height: 54,
            child: ElevatedButton.icon(
              onPressed: _isSaving ? null : _saveBill,
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryBlue,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 2,
              ),
              icon: _isSaving 
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                : const Icon(Icons.save_rounded, color: Colors.white, size: 20),
              label: Text(
                _isSaving ? 'Saving Charges...' : 'Save Bill Charges',
                style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 16, color: Colors.white),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
