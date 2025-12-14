#!/bin/bash

# IndiaDeals Mobile Development Helper Script
# This script provides shortcuts for common mobile development tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Functions
build_web() {
    print_header "Building Web App"
    npm run build
    print_success "Web app built successfully"
}

sync_all() {
    print_header "Syncing to All Platforms"
    npx cap sync
    print_success "Synced to Android and iOS"
}

sync_android() {
    print_header "Syncing to Android"
    npx cap sync android
    print_success "Synced to Android"
}

sync_ios() {
    print_header "Syncing to iOS"
    npx cap sync ios
    print_success "Synced to iOS"
}

build_and_sync() {
    build_web
    sync_all
}

open_android() {
    print_header "Opening Android Project"
    print_info "This requires Android Studio to be installed"
    npx cap open android
}

open_ios() {
    print_header "Opening iOS Project"
    print_info "This requires Xcode to be installed (Mac only)"
    npx cap open ios
}

run_android() {
    print_header "Running on Android Device"
    print_info "Make sure your Android device is connected via USB"
    npx cap run android
}

run_ios() {
    print_header "Running on iOS Device"
    print_info "Make sure your iPhone is connected via USB (Mac only)"
    npx cap run ios
}

clean_all() {
    print_header "Cleaning Build Artifacts"

    print_info "Cleaning web build..."
    rm -rf dist

    print_info "Cleaning Android build..."
    cd android && ./gradlew clean && cd ..

    print_success "Clean complete"
}

update_plugins() {
    print_header "Updating Capacitor Plugins"
    npm update @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios
    npm update @capacitor/app @capacitor/haptics @capacitor/push-notifications
    npm update @capacitor/share @capacitor/splash-screen @capacitor/status-bar
    npx cap sync
    print_success "Plugins updated"
}

check_environment() {
    print_header "Checking Development Environment"

    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js: $NODE_VERSION"
    else
        print_error "Node.js not found"
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm: $NPM_VERSION"
    else
        print_error "npm not found"
    fi

    # Check Java (for Android)
    if command -v java &> /dev/null; then
        JAVA_VERSION=$(java --version 2>&1 | head -n 1)
        print_success "Java: $JAVA_VERSION"
    else
        print_info "Java not found (needed for Android builds)"
    fi

    # Check Android Studio
    if [ -d "$HOME/Library/Android/sdk" ] || [ -d "$ANDROID_HOME" ]; then
        print_success "Android SDK found"
    else
        print_info "Android SDK not found (needed for local Android builds)"
    fi

    # Check Xcode (Mac only)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v xcodebuild &> /dev/null; then
            XCODE_VERSION=$(xcodebuild -version | head -n 1)
            print_success "Xcode: $XCODE_VERSION"
        else
            print_info "Xcode not found (needed for iOS builds)"
        fi
    fi

    # Check Capacitor
    if [ -f "capacitor.config.ts" ]; then
        print_success "Capacitor configured"
    else
        print_error "Capacitor not configured"
    fi
}

show_app_info() {
    print_header "App Information"

    if [ -f "capacitor.config.ts" ]; then
        echo -e "${BLUE}App ID:${NC} com.indideals.app"
        echo -e "${BLUE}App Name:${NC} IndiaDeals"

        if [ -f "android/app/build.gradle" ]; then
            VERSION=$(grep "versionName" android/app/build.gradle | awk '{print $2}' | tr -d '"')
            VERSION_CODE=$(grep "versionCode" android/app/build.gradle | awk '{print $2}')
            echo -e "${BLUE}Version:${NC} $VERSION ($VERSION_CODE)"
        fi
    else
        print_error "Capacitor not configured"
    fi
}

# Main menu
show_menu() {
    clear
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════╗"
    echo "║   IndiaDeals Mobile Development Helper   ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
    echo "1)  Build web app"
    echo "2)  Build web + sync to mobile"
    echo "3)  Sync to all platforms"
    echo "4)  Sync to Android only"
    echo "5)  Sync to iOS only"
    echo "6)  Open Android project (Android Studio)"
    echo "7)  Open iOS project (Xcode)"
    echo "8)  Run on Android device"
    echo "9)  Run on iOS device"
    echo "10) Clean build artifacts"
    echo "11) Update Capacitor plugins"
    echo "12) Check development environment"
    echo "13) Show app information"
    echo "0)  Exit"
    echo ""
    read -p "Enter your choice: " choice

    case $choice in
        1) build_web ;;
        2) build_and_sync ;;
        3) sync_all ;;
        4) sync_android ;;
        5) sync_ios ;;
        6) open_android ;;
        7) open_ios ;;
        8) run_android ;;
        9) run_ios ;;
        10) clean_all ;;
        11) update_plugins ;;
        12) check_environment ;;
        13) show_app_info ;;
        0)
            print_success "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac

    echo ""
    read -p "Press Enter to continue..."
    show_menu
}

# Check if running with arguments
if [ $# -eq 0 ]; then
    show_menu
else
    case $1 in
        build) build_web ;;
        sync) sync_all ;;
        sync-android) sync_android ;;
        sync-ios) sync_ios ;;
        build-sync) build_and_sync ;;
        open-android) open_android ;;
        open-ios) open_ios ;;
        run-android) run_android ;;
        run-ios) run_ios ;;
        clean) clean_all ;;
        update) update_plugins ;;
        check) check_environment ;;
        info) show_app_info ;;
        *)
            echo "Unknown command: $1"
            echo ""
            echo "Available commands:"
            echo "  build         - Build web app"
            echo "  sync          - Sync to all platforms"
            echo "  sync-android  - Sync to Android"
            echo "  sync-ios      - Sync to iOS"
            echo "  build-sync    - Build web + sync"
            echo "  open-android  - Open Android project"
            echo "  open-ios      - Open iOS project"
            echo "  run-android   - Run on Android device"
            echo "  run-ios       - Run on iOS device"
            echo "  clean         - Clean build artifacts"
            echo "  update        - Update Capacitor plugins"
            echo "  check         - Check environment"
            echo "  info          - Show app info"
            echo ""
            echo "Run without arguments for interactive menu"
            exit 1
            ;;
    esac
fi
