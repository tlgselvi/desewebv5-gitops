# Mobile App Setup Guide

## Prerequisites

- Node.js 20.19+
- pnpm 8.x
- iOS: Xcode 15+ (macOS only)
- Android: Android Studio with Android SDK
- React Native CLI: `npm install -g react-native-cli`

## Initial Setup

### 1. Install Dependencies

```bash
cd mobile
pnpm install
```

### 2. iOS Setup (macOS only)

```bash
cd ios
pod install
cd ..
```

### 3. Android Setup

Ensure Android SDK is installed and `ANDROID_HOME` is set:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 4. Environment Configuration

Create `mobile/.env`:

```env
API_BASE_URL=http://localhost:3000/api/v1
API_TIMEOUT=30000
```

## Running the App

### Development Mode

```bash
# Start Metro bundler
pnpm start

# Run on iOS (separate terminal)
pnpm ios

# Run on Android (separate terminal)
pnpm android
```

### Production Build

#### iOS

```bash
cd ios
xcodebuild -workspace DeseMobileApp.xcworkspace \
  -scheme DeseMobileApp \
  -configuration Release \
  -archivePath build/DeseMobileApp.xcarchive \
  archive
```

#### Android

```bash
cd android
./gradlew assembleRelease
```

## Project Structure

```
mobile/
├── src/
│   ├── components/      # Reusable components
│   ├── screens/         # Screen components
│   ├── navigation/      # Navigation config
│   ├── services/        # API clients
│   ├── store/           # Zustand stores
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Utilities
│   ├── constants/       # Constants
│   └── types/           # TypeScript types
├── ios/                 # iOS native code
├── android/            # Android native code
└── package.json
```

## Features

- ✅ Authentication (Login/Logout)
- ✅ Dashboard with metrics
- ✅ AI Chat (RAG integrated)
- ✅ Semantic Search
- ✅ Profile Management

## Troubleshooting

### Metro Bundler Issues

```bash
# Clear cache
pnpm start --reset-cache
```

### iOS Build Issues

```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Android Build Issues

```bash
cd android
./gradlew clean
cd ..
```

### Module Resolution Issues

```bash
# Clear watchman
watchman watch-del-all

# Clear Metro cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage
```

## Code Quality

```bash
# Lint
pnpm lint

# Format
pnpm format
```

