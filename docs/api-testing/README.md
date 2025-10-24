# Attendance-X API Postman Collection

## Overview

This comprehensive Postman collection provides complete test coverage for all Attendance-X API endpoints. It includes automated authentication, environment management, and test scripts for quality assurance.

## 🚀 Quick Start

### 1. Import Collection & Environment

1. **Import the main collection**: `postman-collection.json`
2. **Import the environment**: `postman-environment.json`
3. **Import individual endpoint collections** (optional for modular testing):
   - `postman-auth-endpoints.json` - Authentication endpoints
   - `postman-user-endpoints.json` - User management
   - `postman-tenant-endpoints.json` - Multi-tenant operations
   - `postman-event-endpoints.json` - Event management
   - `postman-attendance-endpoints.json` - Attendance tracking
   - `postman-notification-endpoints.json` - Notifications
   - `postman-billing-endpoints.json` - Billing & subscriptions
   - `postman-report-endpoints.json` - Reports & analytics
   - `postman-system-endpoints.json` - System health & utilities
   - `postman-campaign-endpoints.json` - Email campaigns
   - `postman-branding-endpoints.json` - Tenant branding
   - `postman-resolution-endpoints.json` - Issue resolution
   - `postman-appointment-endpoints.json` - Appointment scheduling
   - `postman-integration-endpoints.json` - Third-party integrations
   - `postman-qrcode-endpoints.json` - QR code management

### 2. Configure Environment

Update the environment variables in Postman:

```json
{
  "baseUrl": "https://your-api-domain.com/api",
  "testEmail": "your-test-user@example.com",
  "testPassword": "YourTestPassword123!"
}
```

### 3. Authentication Flow

1. **Run the Login request** first to obtain access tokens
2. **Tokens are automatically stored** in environment variables
3. **Auto-refresh** is handled by pre-request scripts
4. **All subsequent requests** use the stored tokens automatically

## 📋 Collection Structure

### 🔐 Authentication
- **Login** - Authenticate and get tokens
- **Register** - Create new user account
- **Refresh Token** - Renew access token
- **Forgot/Reset Password** - Password recovery flow
- **2FA Setup/Verify** - Two-factor authentication
- **Logout/Logout All** - Session management

### 👤 Users
- **Profile Management** - Get/update user profile
- **User CRUD** - Create, read, update users
- **Role Management** - Change user roles and permissions
- **Status Management** - Activate/suspend users
- **Search & Filtering** - Find users with various criteria

### 🏢 Multi-Tenant
- **Tenant Creation** - Register new organizations
- **Context Switching** - Change active tenant
- **Access Validation** - Verify tenant permissions
- **Tenant Listing** - Get user's accessible tenants

### 📅 Events
- **Event CRUD** - Create, read, update, delete events
- **Event Search** - Advanced search and filtering
- **Conflict Detection** - Check scheduling conflicts
- **Participant Management** - Add/remove event participants
- **Event Analytics** - Get event statistics and insights
- **Bulk Operations** - Mass event operations

### ✅ Attendance
- **Check-in/Check-out** - Record attendance
- **Attendance Tracking** - View attendance records
- **Validation** - Approve/reject attendance
- **Bulk Operations** - Mass attendance management
- **Analytics** - Attendance patterns and statistics
- **Export** - Generate attendance reports

### 🔔 Notifications
- **Send Notifications** - Individual and bulk messaging
- **Notification Management** - Read, mark, delete notifications
- **Preferences** - Configure notification settings
- **Templates** - Manage notification templates
- **Delivery Tracking** - Monitor notification delivery
- **Push Configuration** - Setup push notifications

### 💳 Billing
- **Dashboard** - Billing overview and metrics
- **Plan Management** - View and change subscription plans
- **Invoice Management** - View and pay invoices
- **Usage Tracking** - Monitor resource usage
- **Overage Management** - Handle usage overages
- **Subscription Lifecycle** - Cancel/modify subscriptions

### 📊 Reports
- **Report Generation** - Create various report types
- **Report Management** - List, download, delete reports
- **Scheduled Reports** - Automate report generation
- **Templates** - Manage report templates
- **Analytics** - Report usage statistics
- **Export Formats** - PDF, Excel, CSV support

### 📧 Email Campaigns
- **Campaign Management** - Create, update, delete campaigns
- **Content Management** - HTML/text content and templates
- **Recipient Management** - Target audiences and segmentation
- **Scheduling** - Send immediately or schedule for later
- **Analytics** - Open rates, click rates, engagement metrics
- **A/B Testing** - Test different campaign variations

### 🎨 Branding
- **Theme Management** - Custom colors, fonts, logos
- **CSS Generation** - Dynamic stylesheet creation
- **Preset Themes** - Apply predefined brand themes
- **Asset Management** - Upload and manage brand assets

### 🔧 Resolutions
- **Issue Tracking** - Create and manage resolution tasks
- **Assignment** - Assign tasks to team members
- **Progress Tracking** - Monitor task completion
- **Comments** - Collaborate on issue resolution
- **Analytics** - Resolution metrics and reporting

### 📅 Appointments
- **Scheduling** - Create and manage appointments
- **Availability** - Check and manage time slots
- **Public Booking** - Client-facing booking interface
- **Status Management** - Confirm, cancel, complete appointments
- **Practitioner Management** - Manage service providers

### 🔗 Integrations
- **OAuth Management** - Connect third-party services
- **Sync Settings** - Configure data synchronization
- **Connection Testing** - Verify integration health
- **History Tracking** - Monitor sync activities
- **Provider Support** - Google, Microsoft, Slack, Zoom

### 📱 QR Codes
- **Generation** - Create event-specific QR codes
- **Validation** - Verify QR code authenticity
- **Security** - Time windows, location restrictions
- **Analytics** - Usage statistics and patterns
- **Management** - Regenerate, deactivate codes

### 🔧 System & Health
- **Health Checks** - API health monitoring
- **System Status** - Service availability
- **API Information** - Endpoint documentation
- **Metrics** - System performance data

## 🔧 Advanced Features

### Automatic Token Management

The collection includes pre-request scripts that:
- **Auto-refresh tokens** before expiry
- **Handle token rotation** securely
- **Manage token storage** in environment variables
- **Retry failed requests** with fresh tokens

### Test Automation

Each request includes test scripts that:
- **Validate response status** codes
- **Check response structure** and data types
- **Extract and store** important values (IDs, tokens)
- **Verify business logic** and data integrity
- **Generate test reports** for QA analysis

### Environment Variables

Dynamic variables are automatically managed:
- `{{accessToken}}` - JWT access token
- `{{refreshToken}}` - JWT refresh token
- `{{userId}}` - Current user ID
- `{{tenantId}}` - Active tenant ID
- `{{eventId}}` - Sample event ID
- `{{attendanceId}}` - Sample attendance ID
- `{{campaignId}}` - Sample campaign ID
- `{{resolutionId}}` - Sample resolution ID
- `{{appointmentId}}` - Sample appointment ID
- `{{integrationId}}` - Sample integration ID

## 🧪 Testing Scenarios

### Complete User Journey
1. **Register** new user account
2. **Verify email** (if required)
3. **Login** and get tokens
4. **Create tenant** organization
5. **Switch context** to new tenant
6. **Create events** and invite participants
7. **Record attendance** for events
8. **Generate reports** and analytics
9. **Manage billing** and subscriptions
10. **Set up integrations** and branding
11. **Create campaigns** and send notifications

### Error Handling Tests
- **Invalid credentials** authentication
- **Expired token** scenarios
- **Permission denied** access
- **Rate limiting** behavior
- **Validation errors** for malformed data
- **Network timeout** handling

### Performance Testing
- **Concurrent requests** simulation
- **Large dataset** operations
- **Bulk operations** performance
- **Report generation** timing
- **Search performance** with filters

## 📊 Quality Assurance

### Test Coverage
- ✅ **100% endpoint coverage** - All API routes tested
- ✅ **Authentication flows** - All auth scenarios
- ✅ **CRUD operations** - Create, read, update, delete
- ✅ **Error scenarios** - Invalid inputs and edge cases
- ✅ **Permission testing** - Role-based access control
- ✅ **Data validation** - Input/output validation

### Automated Assertions
- **Response time** validation (< 2s for most endpoints)
- **Status code** verification
- **Response schema** validation
- **Data integrity** checks
- **Security header** validation
- **Rate limiting** compliance

## 🔒 Security Testing

### Authentication Security
- **JWT token validation** and expiry
- **Refresh token rotation** security
- **Password strength** requirements
- **2FA implementation** testing
- **Session management** security

### Authorization Testing
- **Role-based access** control
- **Tenant isolation** verification
- **Permission boundaries** testing
- **Data access** restrictions
- **API endpoint** protection

## 📈 Monitoring & Analytics

### Performance Metrics
- **Response times** per endpoint
- **Success/failure rates** tracking
- **Error distribution** analysis
- **Load testing** results
- **Bottleneck identification**

### Usage Analytics
- **Endpoint popularity** metrics
- **Feature adoption** tracking
- **User behavior** patterns
- **Error frequency** analysis
- **Performance trends** over time

## 🛠️ Customization

### Adding New Tests
1. **Create new request** in appropriate folder
2. **Add test scripts** for validation
3. **Update environment** variables if needed
4. **Document test scenarios** in comments
5. **Include error handling** tests

### Modifying Existing Tests
1. **Update request parameters** as needed
2. **Modify test assertions** for new requirements
3. **Update documentation** and comments
4. **Test thoroughly** before deployment
5. **Version control** changes appropriately

## 🚨 Troubleshooting

### Common Issues

**Authentication Failures**
- Verify `baseUrl` is correct
- Check `testEmail` and `testPassword` values
- Ensure user account exists and is active
- Verify API is accessible from your network

**Token Expiry Issues**
- Check token refresh logic in pre-request scripts
- Verify refresh token is valid
- Ensure system clock is synchronized
- Check token expiry settings

**Permission Errors**
- Verify user has required permissions
- Check tenant context is set correctly
- Ensure user is member of target tenant
- Validate role assignments

**Network Issues**
- Check API server availability
- Verify network connectivity
- Check firewall and proxy settings
- Validate SSL certificates

### Debug Mode
Enable Postman console to see:
- **Pre-request script** execution logs
- **Test script** results and failures
- **Network requests** and responses
- **Variable values** and changes
- **Error messages** and stack traces

## 📞 Support

For issues with the Postman collection:
1. **Check this documentation** first
2. **Review Postman console** for errors
3. **Verify environment** configuration
4. **Test individual requests** in isolation
5. **Contact development team** with specific error details

## 🔄 Updates

This collection is maintained alongside the API development:
- **Version controlled** with the API codebase
- **Updated automatically** with new endpoints
- **Tested continuously** in CI/CD pipeline
- **Documented changes** in release notes
- **Backward compatibility** maintained when possible

---

**Happy Testing! 🚀**