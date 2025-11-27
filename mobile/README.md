# DESE Mobile App

React Native mobile application for iOS and Android.

## 🚀 Quick Start

### Prerequisites
- Node.js 20.19+
- pnpm 8.x
- iOS: Xcode 15+ (macOS only)
- Android: Android Studio with Android SDK

### Installation

```bash
# Install dependencies
pnpm install

# iOS (macOS only)
cd ios && pod install && cd ..

# Run iOS
pnpm ios

# Run Android
pnpm android
```

## 📱 Features

- ✅ Authentication (Login/Logout)
- ✅ Dashboard with metrics
- ✅ AI Chat (RAG integrated)
- ✅ Semantic Search
- ✅ Profile Management

## 🏗️ Project Structure

```
mobile/
├── src/
│   ├── components/      # Reusable components
│   ├── screens/         # Screen components
│   ├── navigation/      # Navigation configuration
│   ├── services/        # API clients, storage
│   ├── store/           # Zustand stores
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Utilities
│   ├── constants/       # Constants, config
│   └── types/           # TypeScript types
├── ios/                 # iOS native code
├── android/             # Android native code
└── package.json
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```env
API_BASE_URL=http://localhost:3000/api/v1
API_TIMEOUT=30000
```

## 📚 Documentation

- [Setup Guide](../docs/MOBILE_APP_SETUP.md)
- [Quick Start Guide](../docs/AI_MOBILE_QUICK_START.md)

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage
```

## 📦 Building

### iOS
```bash
cd ios && xcodebuild -workspace DeseMobileApp.xcworkspace -scheme DeseMobileApp
```

### Android
```bash
cd android && ./gradlew assembleRelease
```

## 🐛 Troubleshooting

See [Mobile App Setup Guide](../docs/MOBILE_APP_SETUP.md) for troubleshooting tips.
