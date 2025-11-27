# 📱 Mobile App Store Deployment Guide

**DESE EA PLAN v7.0 - Mobile App**  
**Oluşturulma Tarihi:** 27 Kasım 2025

---

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [iOS App Store](#ios-app-store)
3. [Google Play Store](#google-play-store)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Version Management](#version-management)

---

## 🎯 Genel Bakış

### App Bilgileri

| Platform | Bundle ID | Min Version |
|----------|-----------|-------------|
| iOS | com.dese.eaplan | iOS 14.0+ |
| Android | com.dese.eaplan | Android 8.0+ (API 26) |

### Checklist

#### Pre-Deployment
- [ ] App icons (all sizes)
- [ ] Splash screens
- [ ] Screenshots (all device sizes)
- [ ] App description (TR/EN)
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Support URL
- [ ] Marketing URL

---

## 🍎 iOS App Store

### 1. Apple Developer Account Setup

```bash
# Required accounts
- Apple Developer Program ($99/year)
- App Store Connect access
```

### 2. Certificates & Provisioning

```bash
# Install Fastlane
gem install fastlane

# Initialize Fastlane
cd mobile/ios
fastlane init

# Generate certificates
fastlane match development
fastlane match appstore
```

### 3. App Store Connect Configuration

```ruby
# mobile/ios/fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    increment_build_number(xcodeproj: "DeseEAPlan.xcodeproj")
    
    build_app(
      scheme: "DeseEAPlan",
      export_method: "app-store",
      output_directory: "./build",
      output_name: "DeseEAPlan.ipa"
    )
    
    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
  end
  
  desc "Deploy to App Store"
  lane :release do
    build_app(
      scheme: "DeseEAPlan",
      export_method: "app-store"
    )
    
    upload_to_app_store(
      submit_for_review: true,
      automatic_release: true,
      force: true,
      skip_screenshots: false,
      skip_metadata: false
    )
  end
end
```

### 4. App Store Metadata

```ruby
# mobile/ios/fastlane/Fastfile (metadata)
lane :metadata do
  deliver(
    app_identifier: "com.dese.eaplan",
    submit_for_review: false,
    skip_binary_upload: true,
    skip_screenshots: false,
    
    # App Information
    name: {
      "tr" => "DESE EA Plan",
      "en-US" => "DESE EA Plan"
    },
    subtitle: {
      "tr" => "Kurumsal Yönetim Platformu",
      "en-US" => "Enterprise Management Platform"
    },
    description: {
      "tr" => "DESE EA Plan, işletmenizi tek bir platformdan yönetmenizi sağlar. Finans, CRM, Envanter, İK ve IoT modülleri ile tam entegre kurumsal çözüm.",
      "en-US" => "DESE EA Plan lets you manage your business from a single platform. Fully integrated enterprise solution with Finance, CRM, Inventory, HR, and IoT modules."
    },
    keywords: {
      "tr" => "erp, crm, finans, muhasebe, stok, envanter, ik, insan kaynakları, iot, akıllı havuz",
      "en-US" => "erp, crm, finance, accounting, inventory, stock, hr, human resources, iot, smart pool"
    },
    
    # URLs
    support_url: "https://support.dese.ai",
    marketing_url: "https://dese.ai",
    privacy_url: "https://dese.ai/privacy",
    
    # Rating
    primary_category: "Business",
    secondary_category: "Productivity"
  )
end
```

### 5. Screenshots

Required sizes:
- iPhone 6.7" (1290 x 2796)
- iPhone 6.5" (1284 x 2778)
- iPhone 5.5" (1242 x 2208)
- iPad Pro 12.9" (2048 x 2732)

---

## 🤖 Google Play Store

### 1. Google Play Console Setup

```bash
# Required
- Google Play Developer Account ($25 one-time)
- Google Cloud Service Account (for API)
```

### 2. Service Account Setup

```bash
# Create service account in Google Cloud Console
# Download JSON key file
# Grant access in Google Play Console: Users & Permissions > Invite new user
```

### 3. Fastlane Configuration

```ruby
# mobile/android/fastlane/Fastfile
default_platform(:android)

platform :android do
  desc "Build and upload to Internal Testing"
  lane :internal do
    gradle(
      task: "bundle",
      build_type: "Release"
    )
    
    upload_to_play_store(
      track: "internal",
      aab: "app/build/outputs/bundle/release/app-release.aab",
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end
  
  desc "Promote to Beta"
  lane :beta do
    upload_to_play_store(
      track: "internal",
      track_promote_to: "beta"
    )
  end
  
  desc "Deploy to Production"
  lane :release do
    gradle(
      task: "bundle",
      build_type: "Release"
    )
    
    upload_to_play_store(
      track: "production",
      aab: "app/build/outputs/bundle/release/app-release.aab",
      rollout: "0.1"  # 10% rollout
    )
  end
  
  desc "Full rollout"
  lane :full_rollout do
    upload_to_play_store(
      track: "production",
      rollout: "1.0"
    )
  end
end
```

### 4. Play Store Metadata

```
mobile/android/fastlane/metadata/android/
├── tr-TR/
│   ├── title.txt
│   ├── short_description.txt
│   ├── full_description.txt
│   └── changelogs/
│       └── default.txt
├── en-US/
│   ├── title.txt
│   ├── short_description.txt
│   ├── full_description.txt
│   └── changelogs/
│       └── default.txt
└── images/
    ├── icon.png
    ├── featureGraphic.png
    └── phoneScreenshots/
        ├── 1_dashboard.png
        ├── 2_finance.png
        ├── 3_crm.png
        └── 4_iot.png
```

### 5. App Signing

```bash
# Generate upload key
keytool -genkey -v -keystore upload-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# Configure in build.gradle
android {
    signingConfigs {
        release {
            storeFile file("upload-key.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias "upload"
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/mobile-deploy.yml
name: Mobile App Deployment

on:
  push:
    tags:
      - 'mobile-v*'
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to deploy'
        required: true
        type: choice
        options:
          - ios
          - android
          - both
      track:
        description: 'Release track'
        required: true
        type: choice
        options:
          - internal
          - beta
          - production

jobs:
  ios:
    if: ${{ github.event.inputs.platform == 'ios' || github.event.inputs.platform == 'both' || startsWith(github.ref, 'refs/tags/') }}
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: mobile/ios
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd mobile
          npm install
          cd ios
          pod install
      
      - name: Setup certificates
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_URL: ${{ secrets.MATCH_GIT_URL }}
        run: |
          cd mobile/ios
          bundle exec fastlane match appstore --readonly
      
      - name: Build and upload
        env:
          APP_STORE_CONNECT_API_KEY_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          APP_STORE_CONNECT_API_KEY_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_KEY: ${{ secrets.ASC_KEY }}
        run: |
          cd mobile/ios
          bundle exec fastlane ${{ github.event.inputs.track || 'beta' }}

  android:
    if: ${{ github.event.inputs.platform == 'android' || github.event.inputs.platform == 'both' || startsWith(github.ref, 'refs/tags/') }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          working-directory: mobile/android
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd mobile
          npm install
      
      - name: Decode keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.KEYSTORE_BASE64 }}
        run: |
          echo $KEYSTORE_BASE64 | base64 -d > mobile/android/app/upload-key.jks
      
      - name: Build and upload
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
          PLAY_STORE_JSON_KEY: ${{ secrets.PLAY_STORE_JSON_KEY }}
        run: |
          cd mobile/android
          echo $PLAY_STORE_JSON_KEY > play-store-key.json
          bundle exec fastlane ${{ github.event.inputs.track || 'internal' }}
```

---

## 📊 Version Management

### Semantic Versioning

```
MAJOR.MINOR.PATCH (Build)
1.0.0 (1)
```

### Version Bump Script

```bash
#!/bin/bash
# scripts/mobile/bump-version.sh

VERSION_TYPE=$1  # major, minor, patch

# Read current version
CURRENT=$(cat mobile/package.json | jq -r '.version')
IFS='.' read -ra PARTS <<< "$CURRENT"

MAJOR=${PARTS[0]}
MINOR=${PARTS[1]}
PATCH=${PARTS[2]}

case $VERSION_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

# Update package.json
jq ".version = \"$NEW_VERSION\"" mobile/package.json > tmp.json && mv tmp.json mobile/package.json

# Update iOS
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $NEW_VERSION" mobile/ios/DeseEAPlan/Info.plist

# Update Android
sed -i "s/versionName \".*\"/versionName \"$NEW_VERSION\"/" mobile/android/app/build.gradle

echo "Version bumped to $NEW_VERSION"
```

---

## 📝 Release Checklist

### Pre-Release
- [ ] All tests passing
- [ ] Version number updated
- [ ] Changelog updated
- [ ] Screenshots updated (if UI changed)
- [ ] Privacy policy updated (if needed)

### iOS Release
- [ ] Archive built successfully
- [ ] TestFlight build uploaded
- [ ] Internal testing completed
- [ ] External beta testing completed
- [ ] App Store submission
- [ ] Review approved
- [ ] Phased release configured

### Android Release
- [ ] AAB built successfully
- [ ] Internal testing track upload
- [ ] Closed beta testing
- [ ] Open beta testing
- [ ] Production release (staged rollout)
- [ ] Full rollout

### Post-Release
- [ ] Monitor crash reports
- [ ] Monitor reviews
- [ ] Respond to user feedback
- [ ] Plan hotfix if needed

---

**Son Güncelleme:** 27 Kasım 2025

