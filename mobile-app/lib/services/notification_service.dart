import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import 'api_service.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static io.Socket? _socket;
  static final ValueNotifier<int> unreadCountNotifier = ValueNotifier<int>(0);
  static bool _isInitialized = false;

  /// Initialize local notification channels & Socket.IO realtime listener
  static Future<void> init() async {
    if (_isInitialized) return;
    _isInitialized = true;

    // 1. Android & iOS Notification Settings
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: DarwinInitializationSettings(),
    );

    await _notificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        debugPrint('[Notification] User tapped notification: ${details.payload}');
      },
    );

    // 2. Request Android 13+ Notification Permission
    if (!kIsWeb) {
      final androidImplementation = _notificationsPlugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      if (androidImplementation != null) {
        await androidImplementation.requestNotificationsPermission();
      }
    }

    // 3. Sync initial unread count
    await refreshUnreadCount();

    // 4. Connect to Realtime Socket.IO
    connectSocket();
  }

  /// Connect to backend Socket.IO for instant live push alerts
  static void connectSocket() {
    try {
      if (_socket != null && _socket!.connected) return;

      final serverUrl = productionBaseUrl;
      debugPrint('[Socket.IO] Connecting to $serverUrl');

      _socket = io.io(
        serverUrl,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .build(),
      );

      _socket!.onConnect((_) {
        debugPrint('[Socket.IO] Connected to live hospital server!');
        final userRole = ApiService.token != null ? 'all' : 'all';
        _socket!.emit('join', {'role': userRole});
      });

      // ── Event: Patient Admitted ──
      _socket!.on('patient:admitted', (data) {
        debugPrint('[Socket.IO] Event: patient:admitted $data');
        final name = data['name'] ?? 'Patient';
        final type = data['patient_type'] ?? 'IPD';
        final bed = data['bed_no'] != null ? ' (Bed: ${data['bed_no']})' : '';
        final doc = data['doctor_assigned'] != null ? ' under Dr. ${data['doctor_assigned']}' : '';

        showSystemNotification(
          id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
          title: '🏥 New $type Admission: $name',
          body: 'Patient admitted$bed$doc.',
        );
        unreadCountNotifier.value++;
      });

      // ── Event: Patient Discharged ──
      _socket!.on('patient:discharged', (data) {
        debugPrint('[Socket.IO] Event: patient:discharged $data');
        final name = data['name'] ?? 'Patient';

        showSystemNotification(
          id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
          title: '📋 Patient Discharged: $name',
          body: 'Patient has been officially discharged from hospital.',
        );
        unreadCountNotifier.value++;
      });

      // ── Event: Billing Payment Received ──
      _socket!.on('billing:paid', (data) {
        debugPrint('[Socket.IO] Event: billing:paid $data');
        final name = data['name'] ?? 'Patient';
        final amount = data['amount'] ?? '0';

        showSystemNotification(
          id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
          title: '💳 Payment Received: ₹$amount',
          body: 'Received from $name.',
        );
        unreadCountNotifier.value++;
      });

      _socket!.onDisconnect((_) {
        debugPrint('[Socket.IO] Disconnected from hospital server');
      });

      _socket!.onError((err) {
        debugPrint('[Socket.IO] Error: $err');
      });
    } catch (e) {
      debugPrint('[Socket.IO] Init Error: $e');
    }
  }

  /// Show native Android Status Bar / Notification Tray banner
  static Future<void> showSystemNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    if (kIsWeb) return; // Browsers use web notifications

    const androidDetails = AndroidNotificationDetails(
      'hospital_alerts_channel',
      'Hospital Alerts & Admissions',
      channelDescription: 'Real-time alerts for patient admissions, discharges and billing',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      playSound: true,
      styleInformation: BigTextStyleInformation(''),
    );

    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(presentAlert: true, presentSound: true),
    );

    await _notificationsPlugin.show(
      id,
      title,
      body,
      notificationDetails,
      payload: payload,
    );
  }

  /// Calculate and refresh unread badge count from live backend
  static Future<void> refreshUnreadCount() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedRead = (prefs.getStringList('read_notification_ids') ?? []).toSet();
      final res = await ApiService.getNotifications();

      if (res['success'] == true && res['notifications'] != null) {
        final List rawList = res['notifications'];
        int unread = 0;
        for (var raw in rawList) {
          final id = raw['id']?.toString() ?? '';
          if (!savedRead.contains(id)) {
            unread++;
          }
        }
        unreadCountNotifier.value = unread;
      }
    } catch (_) {}
  }
}
