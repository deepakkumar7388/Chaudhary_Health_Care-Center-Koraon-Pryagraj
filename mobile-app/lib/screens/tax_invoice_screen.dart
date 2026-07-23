import 'package:flutter/material.dart';
import 'billing_screen.dart';

/// TaxInvoiceScreen is an alias to [BillingScreen] for the Tax Invoice & Ledger module.
class TaxInvoiceScreen extends StatelessWidget {
  final Map<String, dynamic> patient;
  const TaxInvoiceScreen({super.key, required this.patient});

  @override
  Widget build(BuildContext context) {
    return BillingScreen(patient: patient);
  }
}
