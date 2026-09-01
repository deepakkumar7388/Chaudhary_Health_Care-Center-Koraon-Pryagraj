import 'package:flutter/foundation.dart';

// ==================== API CONFIGURATION ====================
/// Set this to `true` to connect directly to the Live Production server (Render).
/// Set this to `false` to connect to your local backend server during development.
const bool useLiveServer = false;

// 1. Production server on Render
const String _productionUrl = 'https://chaudhary-hms-api-h7nl.onrender.com/api/';

// 2. Localhost server for Web Browser / Windows Desktop
const String _localhostUrl = 'http://localhost:5000/api/';

// 3. Local WiFi server for physical Android / iOS testing over same network
const String _localWifiUrl = 'http://10.166.116.102:5000/api/';

/// Returns the API base URL:
/// - In Release mode or when `useLiveServer == true` → Production Render server
/// - In Web Browser (Chrome/Edge) during debug → Localhost (http://localhost:5000/api/)
/// - In Mobile debug → Local WiFi / Localhost
String get apiBaseUrl {
  if (useLiveServer) {
    return _productionUrl;
  }
  if (kIsWeb) {
    return _localhostUrl;
  }
  return _localWifiUrl;
}

/// Base URL for static assets (e.g. avatars, uploads) and Socket.IO connection
String get productionBaseUrl {
  if (useLiveServer) {
    return 'https://chaudhary-hms-api-h7nl.onrender.com';
  }
  if (kIsWeb) {
    return 'http://localhost:5000';
  }
  return 'http://10.166.116.102:5000';
}
