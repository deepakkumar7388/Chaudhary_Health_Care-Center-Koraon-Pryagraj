import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../services/api_service.dart';

class DailyNotesScreen extends StatefulWidget {
  final Map<String, dynamic> patient;
  const DailyNotesScreen({super.key, required this.patient});

  @override
  State<DailyNotesScreen> createState() => _DailyNotesScreenState();
}

class _DailyNotesScreenState extends State<DailyNotesScreen> {
  List<dynamic> _notes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  Future<void> _loadNotes() async {
    setState(() => _isLoading = true);
    try {
      _notes = await ApiService.getDailyNotes(widget.patient['_id']);
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _addNote() async {
    final noteController = TextEditingController();
    final medicineController = TextEditingController();
    final vitalBpController = TextEditingController();
    final vitalTempController = TextEditingController();

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Add Daily Note', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700)),
                Text(widget.patient['name'] ?? '', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondaryLight)),
                const SizedBox(height: 20),

                TextField(
                  controller: noteController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Patient condition, observations...',
                    labelText: 'Notes *',
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 14),

                TextField(
                  controller: medicineController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    hintText: 'Medicine names, dosage...',
                    labelText: 'Medicines',
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 14),

                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: vitalBpController,
                        decoration: const InputDecoration(
                          hintText: '120/80',
                          labelText: 'BP',
                          prefixIcon: Icon(Icons.favorite_outline, size: 20),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: vitalTempController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: '98.6',
                          labelText: 'Temp (°F)',
                          prefixIcon: Icon(Icons.thermostat_outlined, size: 20),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      if (noteController.text.trim().isEmpty) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(content: Text('Please enter notes'), backgroundColor: AppColors.error),
                        );
                        return;
                      }
                      try {
                        await ApiService.addDailyNote(widget.patient['_id'], {
                          'note': noteController.text.trim(),
                          'medicines': medicineController.text.trim(),
                          'vitals': {
                            'bp': vitalBpController.text.trim(),
                            'temperature': vitalTempController.text.trim(),
                          },
                        });
                        if (ctx.mounted) Navigator.pop(ctx, true);
                      } catch (e) {
                        if (ctx.mounted) {
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            const SnackBar(content: Text('Failed to add note'), backgroundColor: AppColors.error),
                          );
                        }
                      }
                    },
                    icon: const Icon(Icons.save),
                    label: const Text('Save Note'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (result == true) _loadNotes();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('Daily Notes'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addNote,
        icon: const Icon(Icons.add),
        label: const Text('Add Note'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notes.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.note_outlined, size: 64, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                      const SizedBox(height: 16),
                      Text('No daily notes yet', style: GoogleFonts.inter(fontSize: 16, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight)),
                      const SizedBox(height: 8),
                      Text('Tap + to add a new note', style: GoogleFonts.inter(fontSize: 13, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadNotes,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: _notes.length,
                    itemBuilder: (context, index) {
                      final note = _notes[index];
                      final noteText = note['note'] ?? '';
                      final medicines = note['medicines'] ?? '';
                      final vitals = note['vitals'];
                      final createdAt = note['createdAt'] ?? '';

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.calendar_today, size: 14, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                                  const SizedBox(width: 6),
                                  Text(
                                    _formatDate(createdAt),
                                    style: GoogleFonts.inter(fontSize: 12, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),

                              Text(noteText, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500)),

                              if (medicines.toString().isNotEmpty) ...[
                                const SizedBox(height: 10),
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.accent.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Icon(Icons.medication_outlined, size: 16, color: AppColors.accent),
                                      const SizedBox(width: 8),
                                      Expanded(child: Text(medicines.toString(), style: GoogleFonts.inter(fontSize: 12, color: AppColors.accent, fontWeight: FontWeight.w500))),
                                    ],
                                  ),
                                ),
                              ],

                              if (vitals != null && (vitals['bp']?.toString().isNotEmpty == true || vitals['temperature']?.toString().isNotEmpty == true)) ...[
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    if (vitals['bp']?.toString().isNotEmpty == true)
                                      _VitalChip(icon: Icons.favorite, label: 'BP', value: vitals['bp'].toString()),
                                    if (vitals['temperature']?.toString().isNotEmpty == true) ...[
                                      const SizedBox(width: 10),
                                      _VitalChip(icon: Icons.thermostat, label: 'Temp', value: '${vitals['temperature']}°F'),
                                    ],
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      ).animate().fadeIn(delay: (index * 80).ms, duration: 400.ms);
                    },
                  ),
                ),
    );
  }

  String _formatDate(dynamic date) {
    if (date == null || date.toString().isEmpty) return '';
    try {
      final dt = DateTime.parse(date.toString());
      final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return '${dt.day} ${months[dt.month - 1]} ${dt.year}, ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return date.toString();
    }
  }
}

class _VitalChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _VitalChip({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.info.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.info),
          const SizedBox(width: 4),
          Text('$label: $value', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.info)),
        ],
      ),
    );
  }
}
