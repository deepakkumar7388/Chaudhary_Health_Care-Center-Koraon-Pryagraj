import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';

class RadarChartWidget extends StatelessWidget {
  final bool isDark;

  const RadarChartWidget({
    super.key,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
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
                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.radar_rounded, size: 16, color: Color(0xFF10B981)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Hospital Performance Radar',
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : const Color(0xFF1E293B),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildLegendDot('Target', const Color(0xFFF59E0B)),
              const SizedBox(width: 16),
              _buildLegendDot('Actual', const Color(0xFF10B981)),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 165,
            child: RadarChart(
              RadarChartData(
                radarShape: RadarShape.polygon,
                radarBorderData: const BorderSide(color: Color(0xFF10B981), width: 1.5),
                gridBorderData: BorderSide(
                  color: isDark ? Colors.white24 : const Color(0xFFE2E8F0),
                  width: 1,
                ),
                tickBorderData: const BorderSide(color: Colors.transparent),
                ticksTextStyle: const TextStyle(color: Colors.transparent),
                titlePositionPercentageOffset: 0.15,
                getTitle: (index, angle) {
                  const titles = ['Admissions', 'OPD', 'IPD', 'Billing', 'Discharges', 'Surgeries'];
                  return RadarChartTitle(
                    text: titles[index % titles.length],
                  );
                },
                dataSets: [
                  RadarDataSet(
                    fillColor: const Color(0xFFFBBF24).withValues(alpha: 0.60),
                    borderColor: const Color(0xFFF59E0B),
                    entryRadius: 3,
                    borderWidth: 2,
                    dataEntries: const [
                      RadarEntry(value: 8.5),
                      RadarEntry(value: 7.0),
                      RadarEntry(value: 9.0),
                      RadarEntry(value: 6.5),
                      RadarEntry(value: 8.0),
                      RadarEntry(value: 7.5),
                    ],
                  ),
                  RadarDataSet(
                    fillColor: const Color(0xFF10B981).withValues(alpha: 0.35),
                    borderColor: const Color(0xFF10B981),
                    entryRadius: 3,
                    borderWidth: 2,
                    dataEntries: const [
                      RadarEntry(value: 6.0),
                      RadarEntry(value: 8.5),
                      RadarEntry(value: 5.5),
                      RadarEntry(value: 8.0),
                      RadarEntry(value: 6.5),
                      RadarEntry(value: 9.0),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendDot(String label, Color color) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 5),
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: color),
        ),
      ],
    );
  }
}
