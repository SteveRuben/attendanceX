# Postman Automated Workflows Guide

## 🎯 Overview

Yes! Postman supports automated workflows through several powerful features that allow you to chain API requests together and create complete user journey testing.

## 🔄 Workflow Features Available

### 1. **Collection Runner**
- Run entire collections or folders automatically
- Set iteration counts and delays
- Pass data between requests
- Generate comprehensive test reports

### 2. **Request Chaining with `postman.setNextRequest()`**
- Automatically trigger the next request
- Conditional flow control based on responses
- Skip requests based on test results
- Create complex branching workflows

### 3. **Pre-request & Test Scripts**
- Extract data from responses automatically
- Set environment variables dynamically
- Implement retry logic and error handling
- Add delays and conditional logic

### 4. **Newman CLI**
- Run workflows from command line
- Integrate with CI/CD pipelines
- Schedule automated runs
- Generate detailed reports

## 📋 Available Workflows

### 🎯 Complete User Onboarding
**File**: `workflow-complete-onboarding.json`
**Flow**: Register → Login → Create Tenant → Setup Profile → Create Event → Check-in → Report

**Steps**:
1. **Register New User** - Creates account with random email
2. **Create Organization/Tenant** - Sets up multi-tenant context
3. **Update User Profile** - Completes profile setup
4. **Create First Event** - Creates a test event
5. **Generate QR Code** - Creates QR code for event
6. **Check-in to Event** - Simulates attendance
7. **Generate Report** - Creates attendance report
8. **Workflow Summary** - Shows all created resources

### 📅 Event Management Workflow
**File**: `workflow-event-management.json`
**Flow**: Login → Create Event → Generate QR → Check-in → Analytics

**Steps**:
1. **Login** - Authenticate with existing user
2. **Create Event** - Creates new event
3. **Generate QR Code** - Creates QR for attendance
4. **Simulate Check-in** - Records attendance
5. **Get Analytics** - Retrieves event metrics
6. **Summary** - Shows workflow results

### 💳 Billing Management Workflow
**File**: `workflow-billing-management.json`
**Flow**: Login → Dashboard → Plans → Usage → History → Summary

**Steps**:
1. **Login** - Authenticate user
2. **Get Billing Dashboard** - Load billing overview
3. **Get Available Plans** - View subscription options
4. **Get Usage Stats** - Monitor resource usage
5. **Get Billing History** - Review past invoices
6. **Summary** - Complete billing overview

## 🚀 How to Use Workflows

### Method 1: Collection Runner (Recommended)
1. **Import workflow collection** into Postman
2. **Configure environment** variables
3. **Right-click collection** → "Run collection"
4. **Set iterations** and delays as needed
5. **Click "Run"** to start automated workflow
6. **Monitor progress** in real-time
7. **Review results** and generated data

### Method 2: Manual Sequential Execution
1. **Import workflow collection**
2. **Run first request** manually
3. **Postman automatically triggers** next request
4. **Watch the flow** execute automatically
5. **Check console logs** for progress updates

### Method 3: Newman CLI (Advanced)
```bash
# Install Newman
npm install -g newman

# Run complete onboarding workflow
newman run workflow-complete-onboarding.json -e postman-environment.json

# Run with custom data
newman run workflow-event-management.json -e postman-environment.json --iteration-data data.json

# Generate HTML report
newman run workflow-billing-management.json -e postman-environment.json -r html --reporter-html-export report.html
```

## 🔧 Workflow Configuration

### Environment Variables Required
```json
{
  "baseUrl": "https://your-api-domain.com/api",
  "testEmail": "existing-user@example.com",
  "testPassword": "ExistingUserPassword123!",
  "workflowEmail": "workflow-test@example.com",
  "workflowPassword": "WorkflowTest123!"
}
```

### Dynamic Variables Used
- `{{$randomInt}}` - Random integers for unique data
- `{{$randomEmail}}` - Random email addresses
- `{{$isoTimestamp}}` - Current ISO timestamp
- `{{$randomDateRecent}}` - Recent random date

## 🎛️ Advanced Workflow Features

### Conditional Flow Control
```javascript
// In test script
if (pm.response.code === 200) {
    postman.setNextRequest("Success Path");
} else {
    postman.setNextRequest("Error Handling");
}
```

### Data Extraction & Storage
```javascript
// Extract and store response data
const data = pm.response.json();
pm.globals.set('extractedId', data.id);
pm.globals.set('extractedToken', data.token);
```

### Error Handling & Retry Logic
```javascript
// Retry failed requests
if (pm.response.code !== 200) {
    const retryCount = pm.globals.get('retryCount') || 0;
    if (retryCount < 3) {
        pm.globals.set('retryCount', retryCount + 1);
        postman.setNextRequest(pm.info.requestName); // Retry same request
    } else {
        postman.setNextRequest("Error Handler");
    }
}
```

### Delays and Timing
```javascript
// Add delay before next request
setTimeout(() => {
    postman.setNextRequest("Next Request");
}, 2000); // 2 second delay
```

## 📊 Workflow Monitoring

### Console Logging
Each workflow includes comprehensive logging:
- **Step completion** status
- **Data extraction** results
- **Error messages** and debugging info
- **Progress indicators** and summaries
- **Final results** and next steps

### Test Assertions
- **Response validation** for each step
- **Data integrity** checks
- **Workflow completion** verification
- **Resource creation** validation

## 🎯 Custom Workflow Creation

### Creating Your Own Workflow

1. **Plan the Flow**
   ```
   Step 1: Authentication
   Step 2: Setup/Configuration
   Step 3: Core Operations
   Step 4: Validation/Verification
   Step 5: Cleanup/Summary
   ```

2. **Add Request Chaining**
   ```javascript
   // In test script of each request
   if (success) {
       postman.setNextRequest("Next Step Name");
   } else {
       postman.setNextRequest("Error Handler");
   }
   ```

3. **Extract Required Data**
   ```javascript
   // Store data for next requests
   const response = pm.response.json();
   pm.globals.set('resourceId', response.data.id);
   ```

4. **Add Error Handling**
   ```javascript
   // Handle failures gracefully
   if (pm.response.code >= 400) {
       console.log('❌ Step failed: ' + pm.response.json().error);
       postman.setNextRequest("Cleanup");
   }
   ```

## 🧪 Testing Scenarios

### Complete User Journey
- **New User Registration** → Profile Setup → Organization Creation → Feature Usage
- **Existing User Login** → Context Switch → Daily Operations → Logout

### Feature Testing Flows
- **Event Lifecycle** → Create → Invite → Attend → Report → Archive
- **Billing Cycle** → Subscribe → Use → Monitor → Upgrade → Pay

### Error Recovery Flows
- **Authentication Failure** → Retry → Password Reset → Re-authenticate
- **Permission Denied** → Role Check → Request Access → Retry

## 📈 Benefits of Automated Workflows

### ✅ Quality Assurance
- **End-to-end testing** of complete user journeys
- **Integration testing** across multiple services
- **Regression testing** with consistent scenarios
- **Performance testing** of workflow timing

### ✅ Development Efficiency
- **Rapid testing** of new features
- **Automated setup** of test data
- **Consistent test environments** across team
- **Reduced manual testing** effort

### ✅ Documentation & Training
- **Live API examples** for new developers
- **User journey documentation** with real requests
- **Integration examples** for frontend developers
- **Troubleshooting guides** with working solutions

## 🔗 Integration Options

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Run API Workflows
  run: |
    newman run workflow-complete-onboarding.json \
      -e postman-environment.json \
      --reporters cli,json \
      --reporter-json-export results.json
```

### Monitoring Integration
- **Schedule workflows** to run periodically
- **Monitor API health** with automated flows
- **Alert on failures** in critical workflows
- **Track performance** over time

## 🎉 Getting Started

1. **Import a workflow collection** (e.g., `workflow-complete-onboarding.json`)
2. **Configure environment** with your API details
3. **Use Collection Runner** to execute the full workflow
4. **Watch the magic happen** as requests chain together automatically!

The workflows will handle authentication, data extraction, error handling, and provide detailed logging throughout the entire process.

---

**Ready to automate your API testing! 🚀**