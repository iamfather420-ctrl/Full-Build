# Android client

Build on a machine with Android SDK, Java 17+, and Gradle:

```bash
gradle assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

The client is a thin native Android shell for the shared AI OS runtime. It checks `http://127.0.0.1:8787` by default; use an intent extra named `AI_OS_ENDPOINT` to point it at a LAN or hosted runtime.
