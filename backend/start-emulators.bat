@echo off
echo Starting Firebase Emulators...

REM Set environment variables for emulators
set FIRESTORE_EMULATOR_HOST=localhost:8080
set FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
set FUNCTIONS_EMULATOR=true

REM Start Firebase emulators
firebase emulators:start --only functions,firestore,auth

pause