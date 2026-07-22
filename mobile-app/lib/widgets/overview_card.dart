import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class OverviewCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? iconColor;
  final VoidCallback? onTap;

  const OverviewCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.iconColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 110,
      margin: const EdgeInsets.only(right: 12),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          splashColor: Colors.white24,
          child: Ink(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFE0F2FE), Color(0xFFBAE6FD)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF38BDF8).withValues(alpha: 0.2),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: (iconColor ?? const Color(0xFF0284C7)).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, size: 18, color: iconColor ?? const Color(0xFF0284C7)),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      value,
                      style: GoogleFonts.poppins(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF0F172A),
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      label,
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF0284C7),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
