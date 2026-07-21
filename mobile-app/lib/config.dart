import 'package:flutter/foundation.dart';

// ==================== API CONFIGURATION ====================
// Production server on Render — always used for Release build
const String _productionUrl = 'https://chaudhary-hms-api-h7nl.onrender.com/api/';

// Local WiFi server — only for debug/development testing on same network
// Change this IP to your local machine's IP when testing locally
const String _localWifiUrl = 'http://10.66.157.102:5000/api/';

/// Returns the API base URL:
/// - kDebugMode = true  → local WiFi (so hot-reload works during development)
/// - Release/Profile    → production Render server (real users always hit this)
String get apiBaseUrl => kDebugMode ? _localWifiUrl : _productionUrl;

/// Use this anywhere you need just the production base (e.g. avatar URLs)
const String productionBaseUrl = 'https://chaudhary-hms-api-h7nl.onrender.com';
