import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../services/api_service.dart';

class BillingScreen extends StatefulWidget {
  final Map<String, dynamic> patient;
  const BillingScreen({super.key, required this.patient});

  @override
  State<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends State<BillingScreen> {
  Map<String, dynamic>? _billing;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadBilling();
  }

  Future<void> _loadBilling() async {
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.getBilling(widget.patient['_id']);
      if (result['success'] == true) {
        _billing = result['billing'] != null ? Map<String, dynamic>.from(result['billing']) : null;
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _addPayment() async {
    final amountController = TextEditingController();
    final modeController = TextEditingController(text: 'Cash');
    final noteController = TextEditingController();

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40, height: 4,
                    decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Add Payment', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700)),
                Text(widget.patient['name'] ?? '', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondaryLight)),
                const SizedBox(height: 20),

                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Amount (₹) *',
                    prefixIcon: Icon(Icons.currency_rupee, size: 20),
                    hintText: 'Enter amount',
                  ),
                ),
                const SizedBox(height: 14),

                DropdownButtonFormField<String>(
                  value: modeController.text,
                  decoration: const InputDecoration(
                    labelText: 'Payment Mode',
                    prefixIcon: Icon(Icons.payment_outlined, size: 20),
                  ),
                  items: ['Cash', 'UPI', 'Card', 'Net Banking', 'Other']
                      .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                      .toList(),
                  onChanged: (v) => modeController.text = v ?? 'Cash',
                ),
                const SizedBox(height: 14),

                TextField(
                  controller: noteController,
                  decoration: const InputDecoration(
                    labelText: 'Note (optional)',
                    prefixIcon: Icon(Icons.note_outlined, size: 20),
                    hintText: 'Payment description',
                  ),
                ),
                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      final amount = double.tryParse(amountController.text.trim());
                      if (amount == null || amount <= 0) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(content: Text('Please enter a valid amount'), backgroundColor: AppColors.error),
                        );
                        return;
                      }
                      try {
                        await ApiService.addPayment(widget.patient['_id'], {
                          'amount': amount,
                          'mode': modeController.text,
                          'note': noteController.text.trim(),
                        });
                        if (ctx.mounted) Navigator.pop(ctx, true);
                      } catch (e) {
                        if (ctx.mounted) {
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            const SnackBar(content: Text('Failed to add payment'), backgroundColor: AppColors.error),
                          );
                        }
                      }
                    },
                    icon: const Icon(Icons.check),
                    label: const Text('Add Payment'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (result == true) _loadBilling();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Billing')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addPayment,
        icon: const Icon(Icons.add),
        label: const Text('Add Payment'),
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _billing == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.receipt_long_outlined, size: 64, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                      const SizedBox(height: 16),
                      Text('No billing data found', style: GoogleFonts.inter(fontSize: 16, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadBilling,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      // Bill Summary Card
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Bill Summary', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 16),
                              _BillRow(label: 'Total Bill', value: '₹${_billing!['totalBill'] ?? 0}', isTotal: true),
                              _BillRow(label: 'Total Paid', value: '₹${_billing!['totalPaid'] ?? 0}', color: AppColors.accent),
                              _BillRow(label: 'Pending', value: '₹${_billing!['pendingAmount'] ?? 0}', color: AppColors.error),
                              const SizedBox(height: 12),
                              // Status Badge
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  color: ((_billing!['paymentStatus'] ?? 'Pending') == 'Paid' ? AppColors.accent : AppColors.warning).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  (_billing!['paymentStatus'] ?? 'Pending').toString().toUpperCase(),
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: (_billing!['paymentStatus'] ?? 'Pending') == 'Paid' ? AppColors.accent : AppColors.warning,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(duration: 400.ms),

                      const SizedBox(height: 24),

                      // Payment History
                      Text('Payment History', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 12),

                      if (_billing!['payments'] == null || (_billing!['payments'] as List).isEmpty)
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Center(
                              child: Text('No payments recorded', style: GoogleFonts.inter(fontSize: 14, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight)),
                            ),
                          ),
                        )
                      else
                        ...(_billing!['payments'] as List).asMap().entries.map((entry) {
                          final i = entry.key;
                          final payment = entry.value;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: AppColors.accent.withValues(alpha: 0.1),
                                child: const Icon(Icons.currency_rupee, color: AppColors.accent, size: 18),
                              ),
                              title: Text('₹${payment['amount'] ?? 0}', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
                              subtitle: Text(
                                '${payment['mode'] ?? 'Cash'} • ${_formatDate(payment['date'])}',
                                style: GoogleFonts.inter(fontSize: 12, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                              ),
                              trailing: payment['note']?.toString().isNotEmpty == true
                                  ? Tooltip(message: payment['note'], child: const Icon(Icons.info_outline, size: 18))
                                  : null,
                            ),
                          ).animate().fadeIn(delay: (i * 80).ms, duration: 400.ms);
                        }),

                      const SizedBox(height: 80),
                    ],
                  ),
                ),
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return '';
    try {
      final dt = DateTime.parse(date.toString());
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return date.toString();
    }
  }
}

class _BillRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  final bool isTotal;

  const _BillRow({required this.label, required this.value, this.color, this.isTotal = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondaryLight)),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: isTotal ? 20 : 15,
              fontWeight: isTotal ? FontWeight.w800 : FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
