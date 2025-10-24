# 🚀 Postman Workflow Setup Guide

## Quick Start: Automated API Flows

**Yes! Postman can absolutely create automated flows where finishing registration automatically continues with the next action!**

## 📁 Workflow Collections

### 🎯 **Complete User Journey** (`complete-user-journey.json`)
**Full end-to-end workflow - Perfect for comprehensive testing**
```
Register → Login → Create Tenant → Create Event → Generate QR → Check Attendance → Generate Report
```
- **Duration**: ~30 seconds
- **Use Case**: Complete system validation
- **Auto-generates**: Unique test data for each run

### ⚡ **Quick Onboarding** (`quick-onboarding.json`)
**Fast user setup - Perfect for user registration testing**
```
Register → Login → Create Tenant → Setup Complete
```
- **Duration**: ~10 seconds  
- **Use Case**: User onboarding validation
- **Perfect for**: Testing registration flow

### 📅 **Event Management** (`event-management.json`)
**Event-focused workflow - Assumes user exists**
```
Login → Create Event → Generate QR → Check Attendance → Validate
```
- **Duration**: ~15 seconds
- **Use Case**: Event creation and management
- **Requires**: Existing user credentials

### 📊 **Reporting Workflow** (`reporting-workflow.json`)
**Report generation and distribution**
```
Login → Generate Attendance Report → Generate Analytics → List Reports → Send Notification
```
- **Duration**: ~10 seconds
- **Use Case**: Report generation testing
- **Requires**: Existing data

## 🔧 Setup Instructions

### 1. Import Collections
```bash
# Import any workflow collection into Postman
1. Open Postman
2. Click "Import" 
3. Select workflow JSON file
4. Import workflow-environment.json
```

### 2. Configure Environment
```json
{
  "baseUrl": "https://your-api-domain.com",
  "testEmail": "auto-generated",
  "testPassword": "WorkflowTest123!"
}
```

### 3. Run Automated Flow
```bash
# Method 1: Collection Runner (Recommended)
1. Click "Runner" in Postman
2. Select your workflow collection
3. Select "Workflow Environment"
4. Click "Run Collection"
5. Watch the magic happen! ✨

# Method 2: Manual Step-by-Step
1. Run first request manually
2. Each request auto-triggers the next
3. Monitor console for progress

# Method 3: Postman Flows (Pro Feature)
1. Create new Flow
2. Import collection requests
3. Connect visually
4. Run automated flow
```

## ✨ Automated Flow Features

### 🔄 **Auto-Continuation**
- ✅ **Success**: Automatically continues to next API
- ❌ **Failure**: Stops immediately with clear error message
- 🔍 **Validation**: Each step validates response before continuing

### 📊 **Smart Data Management**
```javascript
// Auto-generates unique test data
testEmail: "journey1703123456@example.com"
organizationName: "Journey Org 1703123456"
workflowId: "journey_1703123456"

// Extracts and stores data between requests
userId → tenantId → eventId → attendanceId → reportId
```

### 🎯 **Real-time Monitoring**
```
🚀 Starting Complete User Journey: journey_1703123456
📝 Executing: User Registration
✅ Registration complete. User ID: usr_abc123
➡️  Proceeding to login...
🔐 Executing: User Login  
✅ Login complete. Token acquired.
➡️  Proceeding to tenant creation...
```

### 🛡️ **Error Handling**
```javascript
// Automatic error detection and stopping
if (pm.response.code !== 201) {
    console.log('❌ Registration failed. Stopping workflow.');
    postman.setNextRequest(null); // Stops here
}
```

## 🎮 Usage Examples

### Example 1: Test Complete User Journey
```bash
1. Import "complete-user-journey.json"
2. Set baseUrl in environment
3. Run Collection Runner
4. Result: Full user journey tested in 30 seconds
```

### Example 2: Quick User Registration Test
```bash
1. Import "quick-onboarding.json"  
2. Run Collection Runner
3. Result: User registered and tenant created in 10 seconds
```

### Example 3: Event Management Testing
```bash
1. Import "event-management.json"
2. Ensure you have existing user credentials
3. Run Collection Runner  
4. Result: Event created and attendance tested in 15 seconds
```

## 🔧 Customization Options

### Modify Test Data
```javascript
// In environment or pre-request script
pm.globals.set('testEmail', 'custom@example.com');
pm.globals.set('organizationName', 'Custom Org Name');
```

### Add Custom Validation
```javascript
// In test script
pm.test('Custom validation', () => {
    pm.expect(response.data.customField).to.equal('expectedValue');
});
```

### Configure Delays
```javascript
// Add delay between requests
setTimeout(() => {
    postman.setNextRequest('Next Request');
}, 1000); // 1 second delay
```

### Conditional Branching
```javascript
// Branch based on response
if (data.user.role === 'admin') {
    postman.setNextRequest('Admin Flow');
} else {
    postman.setNextRequest('User Flow');
}
```

## 🚨 Troubleshooting

### Common Issues

#### ❌ "Request not found"
**Solution**: Ensure request names match exactly in `setNextRequest()`

#### ❌ "Token expired"
**Solution**: Workflows include auto-refresh logic

#### ❌ "Environment variables missing"
**Solution**: Import `workflow-environment.json`

#### ❌ "Workflow stops unexpectedly"
**Solution**: Check console logs for error messages

### Debug Mode
```javascript
// Add to pre-request script for debugging
console.log('Current request:', pm.info.requestName);
console.log('Variables:', {
    userId: pm.globals.get('userId'),
    tenantId: pm.globals.get('tenantId'),
    eventId: pm.globals.get('eventId')
});
```

## 🎯 Best Practices

### 1. **Environment Management**
- Use separate environments for different stages
- Keep sensitive data in environment variables
- Use global variables for workflow data

### 2. **Error Handling**
- Always check response status before continuing
- Log meaningful error messages
- Use `postman.setNextRequest(null)` to stop on errors

### 3. **Data Generation**
- Generate unique test data for each run
- Clean up test data after workflow completion
- Use realistic test data for better validation

### 4. **Monitoring**
- Add progress logging to track workflow execution
- Include timing information for performance monitoring
- Use meaningful test names and descriptions

## 🎉 Ready to Go!

Your automated workflows are now ready! Each workflow will:

1. ✅ **Auto-generate** unique test data
2. ✅ **Auto-continue** through each step on success  
3. ✅ **Auto-stop** on any failure with clear error messages
4. ✅ **Auto-extract** and pass data between requests
5. ✅ **Auto-validate** responses at each step

**Start with the Complete User Journey workflow for the full experience!** 🚀