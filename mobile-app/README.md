# Chaudhary Health Care Center - Mobile App (Flutter)

This folder is dedicated to the development of the cross-platform mobile application (Android & iOS) using **Flutter**.

## Why Flutter?
1. **Declarative UI**: Very similar to Kotlin's Jetpack Compose. Easy to learn if you know a little Kotlin.
2. **High Performance**: Compiles to native machine code (no JavaScript bridge), making transitions and animations extremely smooth.
3. **Single Codebase**: Write once in Dart, deploy to both Android and iOS.

---

## 🚀 How to Setup and Run

### 1. Install Flutter SDK
1. Download the Flutter SDK from the [Official Flutter Website](https://docs.flutter.dev/get-started/install/windows).
2. Extract it and add the `flutter/bin` folder path to your system's Environment Variables (PATH).
3. Run `flutter doctor` in your command prompt to verify the installation and see what dependencies are missing (like Android Studio).

### 2. Initialize the App
Open your terminal in this directory (`c:/MY_PROJECTS/HP/mobile-app`) and run:
```bash
flutter create --org com.chaudhary.hms --project-name chc_hms ./
```
*(This command will initialize a new Flutter project in this directory)*

### 3. Run the App
To start the application on a connected device (Android Phone / Emulator):
```bash
flutter run
```

### 4. Code Structure
* **`lib/main.dart`**: The main entry point of the application.
* **`pubspec.yaml`**: Used to manage dependencies, fonts, and assets (similar to package.json in Node).

---

## 🔌 Connecting to Backend API
Add the `http` package in `pubspec.yaml` and use the following URL config:

```dart
// lib/config.dart
import 'package:flutter/foundation.dart';

const String localApiUrl = 'http://10.0.2.2:5000/api/'; // 10.0.2.2 points to local PC from Android emulator
const String prodApiUrl = 'https://chaudhary-health-care-center-koraon-bbw0.onrender.com/api/';

String get apiBaseUrl => kDebugMode ? localApiUrl : prodApiUrl;
```
