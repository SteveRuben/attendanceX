#!/bin/bash
echo "Starting Firebase Emulators..."

# Set environment variables for emulators
export FIRESTORE_EMULATOR_HOST=localhost:8080
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
export FUNCTIONS_EMULATOR=true

# Start Firebase emulators
firebase emulators:start --only functions,firestore,auth