// ==================== API CONFIGURATION ====================
// Production live server on Render (Connected to MongoDB Database)
const String _productionUrl = 'https://chaudhary-hms-api-h7nl.onrender.com/api/';

/// Returns the API base URL connected to live MongoDB
String get apiBaseUrl => _productionUrl;

/// Use this anywhere you need just the production base (e.g. avatar URLs)
const String productionBaseUrl = 'https://chaudhary-hms-api-h7nl.onrender.com';
