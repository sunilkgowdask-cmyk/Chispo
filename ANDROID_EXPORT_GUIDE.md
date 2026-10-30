# Chispo - Android APK Packaging & Export Guide

This repository is fully configured and ready for **Android APK & AAB (Google Play Bundle)** packaging using **Capacitor 8** and the native Android Gradle toolchain.

---

## 📱 Project Summary

- **App Name**: `Chispo`
- **Application ID / Package Name**: `com.chispo.app`
- **Native Android Directory**: `/android`
- **Web Build Target**: `/dist`
- **Web App Manifest**: `/public/manifest.json`
- **Launcher Icon**: `/public/icon.svg` & `/android/app/src/main/res/`
- **Offline Capability**: Built-in on-device prompt synthesis engine (generates 8K photographic prompts even with zero internet).

---

## 🚀 Option 1: Build APK via Command Line (Fastest)

If you have Java / Android SDK installed on your machine:

```bash
# 1. Install dependencies
npm install

# 2. Build the web app and sync assets into the Android native folder
npm run cap:build

# 3. Navigate into the android folder and build the debug APK
cd android
./gradlew assembleDebug
```

> **APK Output Location:**  
> The compiled APK file will be at:  
> `android/app/build/outputs/apk/debug/app-debug.apk`

You can transfer this `.apk` file directly to your Android device via USB, Google Drive, or WhatsApp, tap it, and install it immediately.

---

## 🛠️ Option 2: Open in Android Studio (Visual GUI & Emulator)

```bash
# 1. Build and sync latest web assets
npm run cap:build

# 2. Launch Android Studio directly
npm run cap:open
# or run:
npx cap open android
```

In Android Studio:
1. Wait for Gradle to finish indexing.
2. Select an emulator or plug in your physical Android phone (with USB Debugging enabled).
3. Click the green **Run (▶)** button to install and test directly on device.
4. To export the APK: Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. Android Studio will show a popup with a **"locate"** link pointing directly to `app-debug.apk`.

---

## 📦 Option 3: Generate Signed Release APK / AAB for Google Play Store

To publish Chispo to the Google Play Store or distribute an official signed release APK:

### 1. Generate a Keystore (One-Time)
```bash
keytool -genkey -v -keystore chispo-release.keystore -alias chispo -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Configure signing in `android/app/build.gradle`
Add your keystore credentials in the `signingConfigs` block:
```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file("chispo-release.keystore")
            storePassword "YOUR_PASSWORD"
            keyAlias "chispo"
            keyPassword "YOUR_PASSWORD"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 3. Build Signed Bundle or APK
```bash
cd android
# Build Google Play App Bundle (.aab):
./gradlew bundleRelease

# Or build standalone Signed Release APK (.apk):
./gradlew assembleRelease
```

The output file will be located at:
- `android/app/build/outputs/bundle/release/app-release.aab` (For Google Play Store Console)
- `android/app/build/outputs/apk/release/app-release.apk` (For direct distribution)

---

## 🌐 Option 4: Instant WebAPK Installation (Zero Setup on Android Phone)

Because Chispo is equipped with a modern `manifest.json` and mobile PWA meta tags:

1. Open the Chispo web URL in **Google Chrome** or **Samsung Internet** on your Android phone.
2. Tap the **Three Dots menu (⋮)** in the browser's top-right corner.
3. Tap **"Install App"** (or **"Add to Home Screen"**).
4. Android's WebAPK service will automatically synthesize and install a native application package on your home screen with full screen viewport, splash screen, and app drawer icon.

---

## ⚙️ Capacitor & Android Project Files Reference

- `capacitor.config.json`: Master bridge configuration (App ID, app name, background color, web assets folder).
- `android/app/src/main/AndroidManifest.xml`: Android app permissions (INTERNET) and launch intent filters.
- `android/app/src/main/res/values/strings.xml`: User-facing application labels and URL schemes.
- `android/app/src/main/res/values/colors.xml`: Dark purple branding colors (`#0B0813`, `#7C3AED`).
- `android/app/src/main/assets/public/`: Bundled offline HTML/JS/CSS web assets.
