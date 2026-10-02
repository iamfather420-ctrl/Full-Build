#!/bin/bash

# 1. Update and install dependencies
echo "Updating packages and installing dependencies..."
pkg update -y && pkg upgrade -y
pkg install -y openjdk-21 wget unzip git

# 2. Check for Android SDK (Simplified check)
if [ ! -d "$HOME/android-sdk" ]; then
    echo "Android SDK not found. Please install using a trusted installer."
    # Example: wget -O ~/install-android-sdk.sh https://raw.githubusercontent.com/Sohil876/termux-sdk-installer/main/installer.sh
    exit 1
fi

# 3. Configure Gradle Environment
# Set this to your specific path
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# 4. Automate Node.js dependency installation (if applicable)
if [ -f "package.json" ]; then
    echo "Node.js project detected. Installing dependencies..."
    pkg install -y nodejs
    npm install
fi

# 5. Fix AAPT2 issues (common in Termux)
# Ensure the path below matches your actual build-tools version
AAPT2_PATH=$(ls $ANDROID_HOME/build-tools/*/aapt2 | tail -n 1)
mkdir -p ~/.gradle
echo "android.aapt2FromMavenOverride=$AAPT2_PATH" > ~/.gradle/gradle.properties

# 6. Run the build
echo "Starting APK build..."
if [ -f "./gradlew" ]; then
    chmod +x gradlew
    ./gradlew assembleDebug --no-daemon
else
    echo "gradlew wrapper not found. Using globally installed gradle..."
    gradle assembleDebug --no-daemon
fi

echo "Build complete. Check build/outputs/apk/debug/ for your APK."
