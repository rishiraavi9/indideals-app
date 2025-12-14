#!/bin/bash

# IndiaDeals Mobile App Setup Verification Script
# Run this to verify your mobile app is properly configured

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

check_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Start verification
clear
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════╗
║   IndiaDeals Mobile Setup Verification   ║
╚═══════════════════════════════════════════╝
EOF
echo -e "${NC}"

# 1. Check Node.js and npm
print_header "1. Checking Development Environment"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed: $NODE_VERSION"
else
    check_fail "Node.js not installed"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm installed: $NPM_VERSION"
else
    check_fail "npm not installed"
fi

# 2. Check project structure
print_header "2. Checking Project Structure"

if [ -f "frontend/package.json" ]; then
    check_pass "Frontend package.json exists"
else
    check_fail "Frontend package.json not found"
fi

if [ -f "frontend/capacitor.config.ts" ]; then
    check_pass "Capacitor config exists"
else
    check_fail "Capacitor config not found"
fi

if [ -d "frontend/android" ]; then
    check_pass "Android project exists"
else
    check_fail "Android project not found"
fi

if [ -d "frontend/ios" ]; then
    check_pass "iOS project exists"
else
    check_fail "iOS project not found"
fi

# 3. Check Capacitor dependencies
print_header "3. Checking Capacitor Dependencies"

cd frontend

if grep -q "@capacitor/core" package.json; then
    check_pass "@capacitor/core in dependencies"
else
    check_fail "@capacitor/core not found in package.json"
fi

if grep -q "@capacitor/android" package.json; then
    check_pass "@capacitor/android in dependencies"
else
    check_fail "@capacitor/android not found in package.json"
fi

if grep -q "@capacitor/ios" package.json; then
    check_pass "@capacitor/ios in dependencies"
else
    check_fail "@capacitor/ios not found in package.json"
fi

# Check plugins
PLUGINS=(
    "@capacitor/app"
    "@capacitor/haptics"
    "@capacitor/push-notifications"
    "@capacitor/share"
    "@capacitor/splash-screen"
    "@capacitor/status-bar"
)

for plugin in "${PLUGINS[@]}"; do
    if grep -q "$plugin" package.json; then
        check_pass "$plugin installed"
    else
        check_warn "$plugin not found"
    fi
done

# 4. Check build scripts
print_header "4. Checking Build Scripts"

if grep -q "build:mobile" package.json; then
    check_pass "build:mobile script exists"
else
    check_fail "build:mobile script not found"
fi

if grep -q "cap:sync" package.json; then
    check_pass "cap:sync script exists"
else
    check_fail "cap:sync script not found"
fi

# 5. Check native features integration
print_header "5. Checking Native Features Integration"

if [ -f "src/utils/capacitor.ts" ]; then
    check_pass "Capacitor utilities file exists"
else
    check_fail "src/utils/capacitor.ts not found"
fi

if [ -f "src/App.tsx" ]; then
    if grep -q "initializeCapacitor" src/App.tsx; then
        check_pass "App.tsx initializes Capacitor"
    else
        check_warn "App.tsx doesn't initialize Capacitor"
    fi
else
    check_fail "src/App.tsx not found"
fi

# 6. Check Android configuration
print_header "6. Checking Android Configuration"

if [ -f "android/app/build.gradle" ]; then
    check_pass "Android build.gradle exists"

    if grep -q "com.indideals.app" android/app/build.gradle; then
        check_pass "Application ID configured"
    else
        check_warn "Application ID not found"
    fi

    if grep -q "versionName" android/app/build.gradle; then
        VERSION=$(grep "versionName" android/app/build.gradle | awk '{print $2}' | tr -d '"')
        check_pass "Version name: $VERSION"
    fi
else
    check_fail "android/app/build.gradle not found"
fi

if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
    check_pass "AndroidManifest.xml exists"

    if grep -q "POST_NOTIFICATIONS" android/app/src/main/AndroidManifest.xml; then
        check_pass "Push notification permission added"
    else
        check_warn "Push notification permission not found"
    fi
else
    check_fail "AndroidManifest.xml not found"
fi

# 7. Check iOS configuration
print_header "7. Checking iOS Configuration"

if [ -f "ios/App/App/Info.plist" ]; then
    check_pass "iOS Info.plist exists"

    if grep -q "remote-notification" ios/App/App/Info.plist; then
        check_pass "Background modes configured"
    else
        check_warn "Background modes not found"
    fi

    if grep -q "NSPhotoLibraryUsageDescription" ios/App/App/Info.plist; then
        check_pass "Privacy descriptions added"
    else
        check_warn "Privacy descriptions not found"
    fi
else
    check_fail "ios/App/App/Info.plist not found"
fi

# 8. Check GitHub Actions
print_header "8. Checking CI/CD Configuration"

cd ..

if [ -f ".github/workflows/android-build.yml" ]; then
    check_pass "Android build workflow exists"
else
    check_warn "GitHub Actions workflow not found"
fi

# 9. Check documentation
print_header "9. Checking Documentation"

DOCS=(
    "MOBILE_APP_SETUP.md"
    "MOBILE_APP_COMPLETE.md"
    "MOBILE_DEPLOYMENT_GUIDE.md"
    "frontend/README.mobile.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "$doc exists"
    else
        check_warn "$doc not found"
    fi
done

# 10. Check helper script
print_header "10. Checking Helper Scripts"

if [ -f "frontend/mobile-dev.sh" ]; then
    check_pass "mobile-dev.sh exists"

    if [ -x "frontend/mobile-dev.sh" ]; then
        check_pass "mobile-dev.sh is executable"
    else
        check_warn "mobile-dev.sh is not executable (run: chmod +x frontend/mobile-dev.sh)"
    fi
else
    check_warn "mobile-dev.sh not found"
fi

# 11. Check if web app can build
print_header "11. Testing Build Process"

cd frontend

check_info "Testing npm build..."
if npm run build &> /dev/null; then
    check_pass "Web app builds successfully"
else
    check_fail "Web app build failed"
fi

# 12. Optional: Check for Android Studio / Xcode
print_header "12. Checking Optional Tools"

if command -v java &> /dev/null; then
    JAVA_VERSION=$(java --version 2>&1 | head -n 1)
    check_pass "Java installed: $JAVA_VERSION"
else
    check_info "Java not installed (optional for local Android builds)"
fi

if [ -d "$HOME/Library/Android/sdk" ] || [ -n "$ANDROID_HOME" ]; then
    check_pass "Android SDK found"
else
    check_info "Android SDK not found (not needed for GitHub Actions builds)"
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v xcodebuild &> /dev/null; then
        XCODE_VERSION=$(xcodebuild -version | head -n 1)
        check_pass "Xcode installed: $XCODE_VERSION"
    else
        check_info "Xcode not installed (needed for iOS development)"
    fi
fi

# Summary
print_header "Verification Summary"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          ✅ All Checks Passed!           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Your mobile app is ready to build!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Push to GitHub: git push"
    echo "2. Go to GitHub → Actions"
    echo "3. Download APK from artifacts"
    echo "4. Install on Android device"
    echo ""
    echo -e "${BLUE}Or run locally:${NC}"
    echo "cd frontend && ./mobile-dev.sh"
else
    echo -e "${RED}╔═══════════════════════════════════════════╗${NC}"
    echo -e "${RED}║     ❌ $ERRORS Error(s) Found              ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}Please fix the errors above before proceeding.${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS Warning(s) found (non-critical)${NC}"
fi

echo ""
exit $ERRORS
