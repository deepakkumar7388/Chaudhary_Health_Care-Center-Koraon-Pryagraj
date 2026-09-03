import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class NotificationItem {
  final String id;
  final String title;
  final String message;
  final String timestamp;
  final String type; // 'success', 'info', 'warning'
  final String category; // 'admission', 'discharge', 'security', 'system'
  bool isRead;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.timestamp,
    required this.type,
    this.category = 'system',
    this.isRead = false,
  });
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _isLoading = true;
  List<NotificationItem> _notifications = [];
  Set<String> _readIds = {};

  @override
  void initState() {
    super.initState();
    _loadReadStateAndFetch();
  }

  Future<void> _loadReadStateAndFetch() async {
    final prefs = await SharedPreferences.getInstance();
    final savedRead = prefs.getStringList('read_notification_ids') ?? [];
    _readIds = savedRead.toSet();
    await _fetchNotifications();
  }

  String _formatRelativeTime(dynamic rawTime) {
    if (rawTime == null) return 'Recent';
    try {
      final dt = DateTime.tryParse(rawTime.toString());
      if (dt == null) return rawTime.toString();
      final diff = DateTime.now().difference(dt);

      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays == 1) return 'Yesterday';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return 'Recent';
    }
  }

  Future<void> _fetchNotifications() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.getNotifications();
      if (res['success'] == true && res['notifications'] != null) {
        final List rawList = res['notifications'];
        final List<NotificationItem> items = [];

        for (var raw in rawList) {
          final id = raw['id']?.toString() ?? '';
          items.add(NotificationItem(
            id: id,
            title: raw['title']?.toString() ?? 'Hospital Notification',
            message: raw['message']?.toString() ?? '',
            timestamp: _formatRelativeTime(raw['timestamp']),
            type: raw['type']?.toString() ?? 'info',
            category: raw['category']?.toString() ?? 'system',
            isRead: _readIds.contains(id),
          ));
        }

        setState(() {
          _notifications = items;
        });
      }
    } catch (e) {
      debugPrint('Error fetching notifications: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _markAllAsRead() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      for (var n in _notifications) {
        n.isRead = true;
        _readIds.add(n.id);
      }
    });
    await prefs.setStringList('read_notification_ids', _readIds.toList());
  }

  Future<void> _markAsRead(String id) async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      final index = _notifications.indexWhere((n) => n.id == id);
      if (index != -1) {
        _notifications[index].isRead = true;
        _readIds.add(id);
      }
    });
    await prefs.setStringList('read_notification_ids', _readIds.toList());
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final backgroundColor = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8F9FA);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: backgroundColor,
        appBar: AppBar(
          backgroundColor: isDark ? const Color(0xFF0F172A) : Colors.white,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: IconButton(
            icon: Icon(Icons.arrow_back_ios_new_rounded, color: isDark ? Colors.white : const Color(0xFF1E293B), size: 20),
            onPressed: () => Navigator.pop(context),
          ),
          title: Row(
            children: [
              Text(
                'Notifications & Alerts',
                style: GoogleFonts.inter(
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 8),
              if (_notifications.any((n) => !n.isRead))
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_notifications.where((n) => !n.isRead).length} NEW',
                    style: GoogleFonts.inter(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                  ),
                ),
            ],
          ),
          actions: [
            if (_notifications.any((n) => !n.isRead))
              TextButton.icon(
                onPressed: _markAllAsRead,
                icon: const Icon(Icons.done_all_rounded, size: 16, color: Color(0xFF4F46E5)),
                label: Text(
                  'Mark all read',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF4F46E5)),
                ),
              ),
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)))
            : RefreshIndicator(
                color: const Color(0xFF4F46E5),
                onRefresh: _fetchNotifications,
                child: _notifications.isEmpty ? _buildEmptyState(isDark) : _buildNotificationList(isDark),
              ),
      ),
    );
  }

  Widget _buildNotificationList(bool isDark) {
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: _notifications.length,
      itemBuilder: (context, index) {
        final item = _notifications[index];
        return _buildNotificationTile(item, isDark);
      },
    );
  }

  Widget _buildNotificationTile(NotificationItem item, bool isDark) {
    Color iconColor;
    IconData iconData;

    switch (item.category) {
      case 'admission':
        iconColor = const Color(0xFF3B82F6); // Blue
        iconData = Icons.personal_injury_outlined;
        break;
      case 'clinical':
        iconColor = const Color(0xFF8B5CF6); // Purple
        iconData = Icons.medical_information_outlined;
        break;
      case 'discharge':
        iconColor = const Color(0xFF10B981); // Green
        iconData = Icons.assignment_turned_in_outlined;
        break;
      case 'security':
        iconColor = const Color(0xFFF59E0B); // Amber
        iconData = Icons.shield_outlined;
        break;
      case 'system':
      default:
        iconColor = item.type == 'warning'
            ? const Color(0xFFEF4444)
            : item.type == 'success'
                ? const Color(0xFF10B981)
                : const Color(0xFF6366F1);
        iconData = item.type == 'warning'
            ? Icons.warning_amber_rounded
            : item.type == 'success'
                ? Icons.check_circle_outline_rounded
                : Icons.notifications_active_outlined;
        break;
    }

    final cardColor = isDark ? const Color(0xFF1E293B) : Colors.white;
    final unreadBgColor = isDark ? const Color(0xFF1E293B) : const Color(0xFFF5F3FF);
    final borderColor = isDark ? Colors.white10 : const Color(0xFFF1F5F9);

    return GestureDetector(
      onTap: () => _markAsRead(item.id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: item.isRead ? cardColor : unreadBgColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: item.isRead ? borderColor : const Color(0xFFC7D2FE), width: item.isRead ? 1 : 1.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(iconData, color: iconColor, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: item.isRead ? FontWeight.w600 : FontWeight.w800,
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Row(
                        children: [
                          if (!item.isRead)
                            Container(
                              margin: const EdgeInsets.only(right: 6),
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Color(0xFF4F46E5),
                                shape: BoxShape.circle,
                              ),
                            ),
                          Text(
                            item.timestamp,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: item.isRead ? FontWeight.w500 : FontWeight.w700,
                              color: item.isRead ? const Color(0xFF94A3B8) : const Color(0xFF4F46E5),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.message,
                    style: GoogleFonts.inter(
                      fontSize: 12.5,
                      height: 1.4,
                      fontWeight: FontWeight.w400,
                      color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? Colors.white12 : const Color(0xFFF1F5F9),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.notifications_off_outlined,
              size: 48,
              color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'No New Notifications',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.white : const Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Patient admissions and system events will appear here.',
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}
