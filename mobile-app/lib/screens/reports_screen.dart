import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';
import '../services/api_service.dart';
import '../services/role_access.dart';
import '../widgets/app_snackbar.dart';
import '../widgets/overview_card.dart';
import '../widgets/radar_chart_widget.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  bool _isLoading = true;
  List<dynamic> _allPatients = [];
  final Map<String, dynamic> _billingMap = {};

  String _dateFilter = 'all'; // all, today, weekly, monthly, custom
  DateTime? _customFrom;
  DateTime? _customTo;
  
  String _categoryFilter = 'all'; // all, OPD, IPD
  String _surgeryFilter = 'all'; // all, surgery, normal
  String _doctorFilter = 'all';

  List<String> _doctorOptions = ['all'];

  final _chartPageController = PageController(viewportFraction: 1.0);
  int _chartPage = 0;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  @override
  void dispose() {
    _chartPageController.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.getPatients();
      _allPatients = res;
      
      final docs = <String>{};
      for (var p in _allPatients) {
        if (p['doctor_assigned'] != null && p['doctor_assigned'].toString().trim().isNotEmpty) {
          docs.add(p['doctor_assigned'].toString().trim());
        }
      }
      _doctorOptions = ['all', ...docs.toList()..sort()];

      if (RoleAccess.isAdminLevel) {
        final bRes = await ApiService.getAllBillings();
        if (bRes['success'] == true) {
          final billings = bRes['billings'] as List<dynamic>? ?? [];
          for (var b in billings) {
            _billingMap[b['patient_id']] = b;
          }
        }
      }
    } catch (e) {
      if (mounted) AppSnackBar.showTopSnack(context, 'Failed to fetch reports data', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<dynamic> _getFilteredPatients() {
    final now = DateTime.now();
    return _allPatients.where((p) {
      if (p['isDeleted'] == true) return false;

      if (_categoryFilter != 'all') {
        final type = p['patient_type'] ?? 'IPD';
        if (type != _categoryFilter) return false;
      }

      final isSurgery = p['surgeries'] != null && (p['surgeries'] as List).isNotEmpty;
      if (_surgeryFilter == 'surgery' && !isSurgery) return false;
      if (_surgeryFilter == 'normal' && isSurgery) return false;

      if (_doctorFilter != 'all') {
        final doc = (p['doctor_assigned'] ?? '').toString().trim().toLowerCase();
        if (doc != _doctorFilter.toLowerCase()) return false;
      }

      if (_dateFilter != 'all') {
        final dateStr = p['admission_date'] ?? p['createdAt'];
        if (dateStr == null) return false;
        final pDate = DateTime.tryParse(dateStr);
        if (pDate == null) return false;

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

  Map<String, dynamic> _calculateMetrics(List<dynamic> filteredPatients) {
    int admitted = 0;
    int discharged = 0;
    int surgeryCount = 0;
    
    double totalBillAmount = 0;
    double totalDiscount = 0;
    double totalCollection = 0;
    double totalPendingAmount = 0;
    int paidBillsCount = 0;
    int pendingBillsCount = 0;

    for (var p in filteredPatients) {
      final status = (p['status'] ?? '').toString().toLowerCase();
      if (status == 'admitted') admitted++;
      if (status == 'discharged') discharged++;

      if (p['surgeries'] != null && (p['surgeries'] as List).isNotEmpty) {
        surgeryCount++;
      }

      if (RoleAccess.isAdminLevel) {
        final rec = _billingMap[p['patient_id'] ?? p['_id']];
        double totalPaid = 0;
        if (rec != null && rec['payments'] != null) {
          for (var pay in rec['payments']) {
            totalPaid += double.tryParse(pay['amount']?.toString() ?? '0') ?? 0;
          }
        }
        totalCollection += totalPaid;

        double discount = 0;
        if (rec != null) {
          discount = double.tryParse(rec['discount']?.toString() ?? '0') ?? 0;
        }
        totalDiscount += discount;
        
        double totalBill = double.tryParse(p['totalBill']?.toString() ?? '0') ?? 0;
        totalBillAmount += totalBill;
        
        double netPayable = (totalBill - discount) > 0 ? (totalBill - discount) : 0;
        
        double remaining = 0;
        if (p['pending_amount'] != null) {
           remaining = double.tryParse(p['pending_amount'].toString()) ?? 0;
        } else {
           remaining = (netPayable - totalPaid) > 0 ? (netPayable - totalPaid) : 0;
        }

        if (remaining <= 0 && netPayable > 0) {
          paidBillsCount++;
        } else if (remaining > 0) {
          pendingBillsCount++;
          totalPendingAmount += remaining;
        }
      }
    }

    return {
      'totalPatients': filteredPatients.length,
      'admitted': admitted,
      'discharged': discharged,
      'surgeries': surgeryCount,
      'totalRevenue': totalBillAmount,
      'totalDiscount': totalDiscount,
      'totalCollection': totalCollection,
      'totalPendingAmount': totalPendingAmount,
      'paidBillsCount': paidBillsCount,
      'pendingBillsCount': pendingBillsCount,
    };
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

  Future<String> _getLogoBase64() async {
    try {
      final ByteData bytes = await rootBundle.load('assets/app-logo.png');
      final Uint8List list = bytes.buffer.asUint8List();
      return base64Encode(list);
    } catch (_) {
      return '';
    }
  }

  Future<void> _printReport(List<dynamic> patients, Map<String, dynamic> metrics) async {
    final logoBase64 = await _getLogoBase64();
    final logoDataUrl = logoBase64.isNotEmpty ? 'data:image/png;base64,$logoBase64' : '';
    final now = DateTime.now();
    final dateStr = DateFormat('dd/MM/yyyy hh:mm a').format(now);
    final filterText = 'Period: ${_dateFilter.toUpperCase()} | Category: ${_categoryFilter.toUpperCase()} | Doctor: ${_doctorFilter.toUpperCase()}';

    String patientsHtml = '';
    for (int i = 0; i < patients.length; i++) {
      final p = patients[i];
      final admDate = p['admission_date'] != null ? DateFormat('dd/MM/yy').format(DateTime.parse(p['admission_date'])) : '-';
      patientsHtml += '''
        <tr>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">${i + 1}</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">${p['patient_id']}</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${p['name']}</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">${p['age']}/${p['gender']}</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">${p['patient_type']}</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">${p['status']}</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">$admDate</td>
        </tr>
      ''';
    }

    String financialHtml = '';
    if (RoleAccess.isAdminLevel) {
      financialHtml = '''
        <div class="section-title">Financial Summary</div>
        <table>
          <tr>
            <td style="padding: 4px;"><div class="stat-box"><div class="stat-label">Total Revenue</div><div class="stat-val" style="color: #0d9488;">₹${metrics['totalRevenue'].toInt()}</div></div></td>
            <td style="padding: 4px;"><div class="stat-box"><div class="stat-label">Discount Given</div><div class="stat-val" style="color: #d97706;">₹${metrics['totalDiscount'].toInt()}</div></div></td>
            <td style="padding: 4px;"><div class="stat-box"><div class="stat-label">Net Pending</div><div class="stat-val" style="color: #e11d48;">₹${metrics['totalPendingAmount'].toInt()}</div></div></td>
            <td style="padding: 4px;"><div class="stat-box"><div class="stat-label">Total Collection</div><div class="stat-val" style="color: #059669;">₹${metrics['totalCollection'].toInt()}</div></div></td>
          </tr>
        </table>
      ''';
    }

    final htmlContent = '''
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; padding: 20px; font-size: 11px; }
          .h-title { font-size: 22px; font-weight: 900; color: #1e3a8a; margin: 0; letter-spacing: 0.5px; }
          .section-title { font-size: 12px; font-weight: 800; color: #f8fafc; background-color: #0f172a; padding: 5px 10px; margin-top: 15px; margin-bottom: 10px; text-transform: uppercase; }
          .stat-box { border: 1px solid #cbd5e1; padding: 10px; text-align: center; border-radius: 6px; }
          .stat-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; }
          .stat-val { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f1f5f9; padding: 8px; text-align: left; font-weight: 800; font-size: 10px; color: #475569; border-bottom: 2px solid #cbd5e1; }
        </style>
      </head>
      <body>
        <table style="margin-bottom: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">
          <tr>
            <td style="width: 70px;">
              ${logoDataUrl.isNotEmpty ? '<img src="$logoDataUrl" style="width: 60px; height: 60px;" />' : ''}
            </td>
            <td style="text-align: center;">
              <div class="h-title">CHAUDHARY HEALTH CARE CENTER</div>
              <div style="font-size: 11px; font-weight: 700; color: #dc2626; margin-top: 4px;">GANDHI CHAURAHA, MEJA WALI ROAD, KORAON-PRAYAGRAJ 212306</div>
            </td>
            <td style="width: 70px; text-align: right; font-size: 9px; color: #64748b;">
              Generated on:<br><strong style="color: #0f172a;">$dateStr</strong>
            </td>
          </tr>
        </table>

        <div style="text-align: center; font-size: 16px; font-weight: 900; text-decoration: underline; margin-bottom: 5px;">ANALYTICS & PERFORMANCE REPORT</div>
        <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-bottom: 20px;">$filterText</div>

        <div class="section-title">Overview Metrics</div>
        <table>
          <tr>
            <td style="padding: 4px;"><div class="stat-box"><div class="stat-label">Total Patients</div><div class="stat-val">${metrics['totalPatients']}</div></div></td>
            <td style="padding: 4px;"><div class="stat-box"><div class="stat-label">Admitted (IPD)</div><div class="stat-val">${metrics['admitted']}</div></div></td>
            <td style="padding: 4px;"><div class="stat-box"><div class="stat-label">Discharged</div><div class="stat-val">${metrics['discharged']}</div></div></td>
            <td style="padding: 4px;"><div class="stat-box"><div class="stat-label">Surgeries</div><div class="stat-val">${metrics['surgeries']}</div></div></td>
          </tr>
        </table>

        $financialHtml

        <div class="section-title">Patient List</div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 90px;">Patient ID</th>
              <th>Name</th>
              <th style="width: 60px;">Age/Sex</th>
              <th style="width: 50px;">Type</th>
              <th style="width: 70px;">Status</th>
              <th style="width: 70px; text-align: center;">Adm Date</th>
            </tr>
          </thead>
          <tbody>
            $patientsHtml
          </tbody>
        </table>

      </body>
      </html>
    ''';

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async {
        return await Printing.convertHtml(format: format, html: htmlContent);
      },
      name: 'Analytics_Report_CHCC_\${now.millisecondsSinceEpoch}.pdf',
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
    
    final filteredPatients = _getFilteredPatients();
    final metrics = _calculateMetrics(filteredPatients);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: bg,
        appBar: AppBar(
          backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, size: 18),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text('Reports & Analytics', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: isDark ? Colors.white : const Color(0xFF0F172A))),
          actions: [
            IconButton(
              icon: const Icon(Icons.print_rounded, size: 20),
              onPressed: () => _printReport(filteredPatients, metrics),
            ),
            IconButton(
              icon: const Icon(Icons.refresh_rounded, size: 22),
              onPressed: _fetchData,
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: _isLoading 
          ? const Center(child: CircularProgressIndicator())
          : CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 16, bottom: 20),
                    child: _buildFilters(isDark),
                  ),
                ),
                SliverToBoxAdapter(
                  child: _buildMetricCards(isDark, metrics),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: _buildChartsGrid(isDark, filteredPatients, metrics),
                  ),
                ),
              ],
            ),
      ),
    );
  }

  Widget _buildFilters(bool isDark) {
    return SizedBox(
      height: 38,
      child: ListView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: [
          _buildFilterChip(Icons.calendar_today_rounded, 'Period', _dateFilter, ['all', 'today', 'weekly', 'monthly', 'custom'], (v) {
            setState(() => _dateFilter = v);
            if (v == 'custom') _showCustomDateRangePicker();
          }, isDark),
          if (_dateFilter == 'custom') ...[
            const SizedBox(width: 8),
            _buildCustomDateChip(isDark),
          ],
          const SizedBox(width: 8),
          _buildFilterChip(Icons.category_rounded, 'Category', _categoryFilter, ['all', 'OPD', 'IPD'], (v) => setState(() => _categoryFilter = v), isDark),
          const SizedBox(width: 8),
          _buildFilterChip(Icons.person_rounded, 'Doctor', _doctorFilter, _doctorOptions, (v) => setState(() => _doctorFilter = v), isDark),
          const SizedBox(width: 8),
          _buildFilterChip(Icons.local_hospital_rounded, 'Surgery', _surgeryFilter, ['all', 'surgery', 'normal'], (v) => setState(() => _surgeryFilter = v), isDark),
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

  Widget _buildMetricCards(bool isDark, Map<String, dynamic> metrics) {
    final isAdmin = RoleAccess.isAdminLevel;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Text(
            'Analytics Overview',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: isDark ? Colors.white : const Color(0xFF1E293B),
              letterSpacing: -0.2,
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 100,
          child: ListView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.only(left: 20, right: 8),
            children: [
              OverviewCard(
                icon: Icons.people_alt_rounded,
                label: 'Total Patients',
                value: '${metrics['totalPatients']}',
                iconColor: const Color(0xFF2563EB),
              ),
              OverviewCard(
                icon: Icons.local_hospital_rounded,
                label: 'Surgery Cases',
                value: '${metrics['surgeries']}',
                iconColor: const Color(0xFF8B5CF6),
              ),
              OverviewCard(
                icon: Icons.hotel_rounded,
                label: 'Admitted',
                value: '${metrics['admitted']}',
                iconColor: const Color(0xFFE11D48),
              ),
              OverviewCard(
                icon: Icons.task_alt_rounded,
                label: 'Discharged',
                value: '${metrics['discharged']}',
                iconColor: const Color(0xFF059669),
              ),
            ],
          ),
        ),
        if (isAdmin) ...[
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              'Financial Overview',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : const Color(0xFF1E293B),
                letterSpacing: -0.2,
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 100,
            child: ListView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.only(left: 20, right: 8),
              children: [
                OverviewCard(
                  icon: Icons.account_balance_wallet_rounded,
                  label: 'Revenue',
                  value: '₹${metrics['totalRevenue'].toInt()}',
                  iconColor: const Color(0xFF10B981),
                ),
                OverviewCard(
                  icon: Icons.receipt_long_rounded,
                  label: 'Pending',
                  value: '₹${metrics['totalPendingAmount'].toInt()}',
                  iconColor: const Color(0xFFEF4444),
                ),
                OverviewCard(
                  icon: Icons.check_circle_outline_rounded,
                  label: 'Paid Bills',
                  value: '${metrics['paidBillsCount']}',
                  iconColor: const Color(0xFF059669),
                ),
                OverviewCard(
                  icon: Icons.warning_amber_rounded,
                  label: 'Unpaid Bills',
                  value: '${metrics['pendingBillsCount']}',
                  iconColor: const Color(0xFFD97706),
                ),
              ],
            ),
          ),
        ]
      ],
    );
  }

  Widget _buildChartsGrid(bool isDark, List<dynamic> patients, Map<String, dynamic> metrics) {
    final isAdmin = RoleAccess.isAdminLevel;
    final chartCount = isAdmin ? 5 : 2;
    
    return Column(
      children: [
        SizedBox(
          height: 330,
          child: PageView(
            controller: _chartPageController,
            onPageChanged: (i) => setState(() => _chartPage = i),
            physics: const BouncingScrollPhysics(),
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: _buildChartContainer(
                  isDark, 
                  'Patient Trends (OPD/IPD)', 
                  Icons.show_chart_rounded,
                  const Color(0xFF3B82F6),
                  _buildTrendChart(isDark, patients)
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: _buildChartContainer(
                  isDark, 
                  'Patient Category Mix', 
                  Icons.pie_chart_rounded,
                  const Color(0xFF8B5CF6),
                  _buildPatientMixChart(isDark, metrics)
                ),
              ),
              if (isAdmin) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: _buildChartContainer(
                    isDark, 
                    'Revenue Collection', 
                    Icons.bar_chart_rounded,
                    const Color(0xFF10B981),
                    _buildRevenueChart(isDark, metrics)
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: _buildChartContainer(
                    isDark, 
                    'Payment Status', 
                    Icons.donut_large_rounded,
                    const Color(0xFFF59E0B),
                    _buildPaymentStatusChart(isDark, metrics)
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: RadarChartWidget(isDark: isDark),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(chartCount, (i) => AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            margin: const EdgeInsets.symmetric(horizontal: 4),
            width: _chartPage == i ? 20 : 7,
            height: 7,
            decoration: BoxDecoration(
              color: _chartPage == i
                  ? const Color(0xFF2563EB)
                  : (isDark ? Colors.white24 : const Color(0xFFCBD5E1)),
              borderRadius: BorderRadius.circular(4),
            ),
          )),
        ),
      ],
    );
  }

  Widget _buildChartContainer(bool isDark, String title, IconData icon, Color iconColor, Widget chart) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white12 : const Color(0xFFF1F5F9), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 16, color: iconColor),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title, 
                  style: GoogleFonts.inter(
                    fontSize: 14, 
                    fontWeight: FontWeight.w800, 
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    letterSpacing: -0.2,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(child: chart),
        ],
      ),
    );
  }

  Widget _buildTrendChart(bool isDark, List<dynamic> patients) {
    if (patients.isEmpty) return Center(child: Text('No Data', style: GoogleFonts.inter(color: Colors.grey)));

    Map<String, int> opdCounts = {};
    Map<String, int> ipdCounts = {};
    Set<String> dates = {};

    for (var p in patients) {
      final dateStr = p['admission_date'] ?? p['createdAt'];
      if (dateStr == null) continue;
      final dt = DateTime.tryParse(dateStr);
      if (dt == null) continue;
      final dKey = DateFormat('MM-dd').format(dt);
      dates.add(dKey);

      if ((p['patient_type'] ?? 'IPD') == 'OPD') {
        opdCounts[dKey] = (opdCounts[dKey] ?? 0) + 1;
      } else {
        ipdCounts[dKey] = (ipdCounts[dKey] ?? 0) + 1;
      }
    }

    var sortedDates = dates.toList()..sort();
    if (sortedDates.length > 15) {
      sortedDates = sortedDates.sublist(sortedDates.length - 15);
    }

    if (sortedDates.isEmpty) return Center(child: Text('No Data', style: GoogleFonts.inter(color: Colors.grey)));

    List<FlSpot> opdSpots = [];
    List<FlSpot> ipdSpots = [];
    double maxY = 0;

    for (int i = 0; i < sortedDates.length; i++) {
      final dKey = sortedDates[i];
      final oC = (opdCounts[dKey] ?? 0).toDouble();
      final iC = (ipdCounts[dKey] ?? 0).toDouble();
      opdSpots.add(FlSpot(i.toDouble(), oC));
      ipdSpots.add(FlSpot(i.toDouble(), iC));
      if (oC > maxY) maxY = oC;
      if (iC > maxY) maxY = iC;
    }

    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxY > 5 ? (maxY/5) : 1,
          getDrawingHorizontalLine: (value) => FlLine(
            color: isDark ? Colors.white10 : const Color(0xFFF1F5F9),
            strokeWidth: 1,
            dashArray: [4, 4],
          ),
        ),
        titlesData: FlTitlesData(
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (v, meta) {
                final idx = v.toInt();
                if (idx < 0 || idx >= sortedDates.length) return const SizedBox();
                return Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(sortedDates[idx], style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600)),
                );
              },
              reservedSize: 22,
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 32,
              getTitlesWidget: (value, meta) {
                if (value == 0) return const SizedBox();
                return Text(value.toInt().toString(), style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600));
              }
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        minX: 0,
        maxX: (sortedDates.length - 1).toDouble(),
        minY: 0,
        maxY: maxY + (maxY * 0.2),
        lineBarsData: [
          LineChartBarData(
            spots: opdSpots,
            isCurved: true,
            color: const Color(0xFF10B981),
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true, 
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF10B981).withValues(alpha: 0.2),
                  const Color(0xFF10B981).withValues(alpha: 0.0),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          LineChartBarData(
            spots: ipdSpots,
            isCurved: true,
            color: const Color(0xFF6366F1),
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true, 
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF6366F1).withValues(alpha: 0.2),
                  const Color(0xFF6366F1).withValues(alpha: 0.0),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPatientMixChart(bool isDark, Map<String, dynamic> metrics) {
    int surg = metrics['surgeries'] as int;
    int normal = (metrics['totalPatients'] as int) - surg;
    if (surg == 0 && normal == 0) return Center(child: Text('No Data', style: GoogleFonts.inter(color: Colors.grey)));

    return PieChart(
      PieChartData(
        sectionsSpace: 4,
        centerSpaceRadius: 60,
        sections: [
          PieChartSectionData(
            value: surg.toDouble(),
            color: const Color(0xFF8B5CF6),
            title: surg > 0 ? '$surg\nSurg' : '',
            radius: 50,
            titleStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
            badgeWidget: _buildBadge('Surgery', const Color(0xFF8B5CF6)),
            badgePositionPercentageOffset: 1.3,
          ),
          PieChartSectionData(
            value: normal.toDouble(),
            color: const Color(0xFF3B82F6),
            title: normal > 0 ? '$normal\nNorm' : '',
            radius: 50,
            titleStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
            badgeWidget: _buildBadge('Normal', const Color(0xFF3B82F6)),
            badgePositionPercentageOffset: 1.3,
          ),
        ],
      ),
    );
  }

  Widget _buildBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4, offset: const Offset(0, 2))
        ],
      ),
      child: Text(text, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
    );
  }

  Widget _buildRevenueChart(bool isDark, Map<String, dynamic> metrics) {
    double rev = metrics['totalRevenue'];
    double pend = metrics['totalPendingAmount'];
    if (rev == 0 && pend == 0) return Center(child: Text('No Data', style: GoogleFonts.inter(color: Colors.grey)));

    double maxVal = rev > pend ? rev : pend;

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: maxVal + (maxVal * 0.2),
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            getTooltipColor: (group) => isDark ? Colors.white : const Color(0xFF1E293B),
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              return BarTooltipItem(
                '₹${rod.toY.toInt()}',
                GoogleFonts.inter(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              );
            },
          ),
        ),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                switch (value.toInt()) {
                  case 0: return Padding(padding: const EdgeInsets.only(top: 8), child: Text('Paid', style: GoogleFonts.inter(color: const Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w600)));
                  case 1: return Padding(padding: const EdgeInsets.only(top: 8), child: Text('Pending', style: GoogleFonts.inter(color: const Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w600)));
                  default: return const SizedBox();
                }
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 45,
              getTitlesWidget: (value, meta) {
                if (value == 0) return const SizedBox();
                return Text('₹${(value/1000).toStringAsFixed(0)}k', style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600));
              }
            ),
          ),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxVal > 4 ? (maxVal/4) : 1,
          getDrawingHorizontalLine: (value) => FlLine(
            color: isDark ? Colors.white10 : const Color(0xFFF1F5F9),
            strokeWidth: 1,
            dashArray: [4, 4],
          ),
        ),
        borderData: FlBorderData(show: false),
        barGroups: [
          BarChartGroupData(
            x: 0,
            barRods: [BarChartRodData(
              toY: rev, 
              gradient: const LinearGradient(colors: [Color(0xFF34D399), Color(0xFF059669)], begin: Alignment.bottomCenter, end: Alignment.topCenter), 
              width: 40, 
              borderRadius: const BorderRadius.vertical(top: Radius.circular(8))
            )],
          ),
          BarChartGroupData(
            x: 1,
            barRods: [BarChartRodData(
              toY: pend, 
              gradient: const LinearGradient(colors: [Color(0xFFF87171), Color(0xFFDC2626)], begin: Alignment.bottomCenter, end: Alignment.topCenter), 
              width: 40, 
              borderRadius: const BorderRadius.vertical(top: Radius.circular(8))
            )],
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentStatusChart(bool isDark, Map<String, dynamic> metrics) {
    int paid = metrics['paidBillsCount'] ?? 0;
    int pend = metrics['pendingBillsCount'] ?? 0;
    if (paid == 0 && pend == 0) return Center(child: Text('No Data', style: GoogleFonts.inter(color: Colors.grey)));

    return PieChart(
      PieChartData(
        sectionsSpace: 4,
        centerSpaceRadius: 60,
        sections: [
          PieChartSectionData(
            value: paid.toDouble(),
            color: const Color(0xFF10B981),
            title: paid > 0 ? '$paid\nPaid' : '',
            radius: 50,
            titleStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
            badgeWidget: _buildBadge('Paid', const Color(0xFF10B981)),
            badgePositionPercentageOffset: 1.3,
          ),
          PieChartSectionData(
            value: pend.toDouble(),
            color: const Color(0xFFF59E0B),
            title: pend > 0 ? '$pend\nUnpaid' : '',
            radius: 50,
            titleStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
            badgeWidget: _buildBadge('Unpaid', const Color(0xFFF59E0B)),
            badgePositionPercentageOffset: 1.3,
          ),
        ],
      ),
    );
  }
}
