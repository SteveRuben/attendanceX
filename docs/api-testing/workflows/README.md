# Postman Automated Workflows

This folder contains automated Postman workflows that chain API requests together for complete user journeys.

## 🔄 Available Workflows

### 1. Complete User Journey
**File**: `complete-user-journey.json`
- Register → Login → Create Tenant → Create Event → Check Attendance → Generate Report
- **Duration**: ~30 seconds
- **Use Case**: End-to-end testing of core functionality

### 2. Quick Onboarding Flow
**File**: `quick-onboarding.json`
- Register → Login → Create Tenant → Setup Complete
- **Duration**: ~10 seconds
- **Use Case**: User registration and basic setup

### 3. Event Management Flow
**File**: `event-management.json`
- Login → Create Event → Generate QR → Manage Attendance
- **Duration**: ~15 seconds
- **Use Case**: Event creation and attendance tracking

### 4. Reporting Workflow
**File**: `reporting-workflow.json`
- Login → Generate Reports → Send Notifications
- **Duration**: ~10 seconds
- **Use Case**: Report generation and distribution

## 🚀 How to Use

### Import and Setup
1. Import any workflow collection into Postman
2. Import `workflow-environment.json` 
3. Set your `baseUrl` in the environment
4. Run using Collection Runner

### Automated Flow Features
- ✅ **Auto-continues** to next API on success
- ✅ **Stops immediately** on any failure
- ✅ **Extracts data** automatically (IDs, tokens)
- ✅ **Generates unique test data** for each run
- ✅ **Real-time logging** shows progress
- ✅ **Error handling** with clear messages

### Running Workflows
1. **Collection Runner**: Run entire workflow automatically
2. **Manual Step-by-Step**: Run individual requests
3. **Postman Flows**: Visual workflow builder (Pro feature)

## 📊 Monitoring
Each workflow includes:
- Response time tracking
- Success/failure rates
- Data extraction validation
- Error logging and debugging

## 🔧 Customization
- Modify test data in environment variables
- Add custom assertions in test scripts
- Adjust delays between requests
- Configure retry logic for failed requests