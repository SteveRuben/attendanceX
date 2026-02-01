#!/bin/bash

# Backend Authentication API Test Script
# This script starts Firebase emulators and runs Cypress tests for authentication

echo "🚀 Starting Backend Authentication Tests"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found. Please install it first:${NC}"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if Cypress is installed
if [ ! -d "node_modules/cypress" ]; then
    echo -e "${YELLOW}⚠️  Cypress not found. Installing dependencies...${NC}"
    npm install
fi

# Step 1: Build backend functions
echo -e "\n${YELLOW}📦 Building backend functions...${NC}"
cd backend/functions
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
cd ../..
echo -e "${GREEN}✅ Build successful${NC}"

# Step 2: Start Firebase emulators in background
echo -e "\n${YELLOW}🔥 Starting Firebase emulators...${NC}"
cd backend
firebase emulators:start --only functions,firestore,auth &
EMULATOR_PID=$!
cd ..

# Wait for emulators to start
echo -e "${YELLOW}⏳ Waiting for emulators to be ready...${NC}"
sleep 10

# Check if emulators are running
if ! ps -p $EMULATOR_PID > /dev/null; then
    echo -e "${RED}❌ Failed to start emulators${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Emulators started (PID: $EMULATOR_PID)${NC}"

# Step 3: Run Cypress tests
echo -e "\n${YELLOW}🧪 Running Cypress tests...${NC}"
npx cypress run --spec "cypress/e2e/backend-auth-api.cy.js" --headless

# Capture test result
TEST_RESULT=$?

# Step 4: Stop emulators
echo -e "\n${YELLOW}🛑 Stopping emulators...${NC}"
kill $EMULATOR_PID
wait $EMULATOR_PID 2>/dev/null
echo -e "${GREEN}✅ Emulators stopped${NC}"

# Step 5: Show results
echo -e "\n========================================"
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed${NC}"
fi
echo "========================================"

exit $TEST_RESULT
