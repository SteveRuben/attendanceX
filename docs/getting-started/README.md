# 🚀 Getting Started with AttendanceX

Welcome to AttendanceX! This comprehensive guide will help you set up, configure, and start using the platform in minutes. AttendanceX is now fully TypeScript-powered with zero compilation errors and enhanced enterprise features.

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Quick Installation](#-quick-installation)
3. [Configuration](#-configuration)
4. [First Run](#-first-run)
5. [Basic Usage](#-basic-usage)
6. [Advanced Features](#-advanced-features)
7. [Next Steps](#-next-steps)

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** >= 8.0.0 (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

### Optional but Recommended
- **Firebase CLI** >= 12.0.0 (for backend development)
- **VS Code** with recommended extensions
- **Docker** >= 20.0.0 (for containerized deployment)

### System Requirements
- **OS**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Internet connection for initial setup

## ⚡ Quick Installation

### Option 1: One-Command Setup (Recommended)

```bash
# Clone and setup everything automatically
curl -fsSL https://raw.githubusercontent.com/SteveRuben/attendanceX/main/scripts/quick-setup.sh | bash
```

This script will:
- Clone the repository
- Install all dependencies (backend + frontend)
- Set up environment configuration
- Initialize Firebase emulators
- Start development servers

### Option 2: Manual Setup

```bash
# 1. Clone the repository
git clone https://github.com/SteveRuben/attendanceX.git
cd attendanceX

# 2. Install all dependencies
npm run install:all

# 3. Copy environment template
cp .env.example .env.local

# 4. Start development servers
npm run dev
```

### Option 3: Docker Setup

```bash
# Clone and run with Docker
git clone https://github.com/SteveRuben/attendanceX.git
cd attendanceX
docker-compose up -d
```

## ⚙️ Configuration

### 1. Environment Variables

Edit `.env.local` with your configuration:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Multi-Tenant Configuration
ENABLE_MULTI_TENANT=true
DEFAULT_TENANT_SETTINGS={"timezone":"UTC","currency":"USD"}

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@your-domain.com

# Development Settings
NODE_ENV=development
PORT=5001
CORS_ORIGIN=http://localhost:3000
ENABLE_API_DOCS=true
```

### 2. Firebase Setup

If you're using Firebase (recommended):

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Select your Firebase project
firebase use --add
```

### 3. Database Setup

For development, Firebase emulators are used automatically. For production:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Authentication
4. Enable Storage
5. Copy your config to `.env.local`

## 🎯 First Run

### 1. Start Development Servers

```bash
# Start both backend and frontend
npm run dev

# Or start separately:
npm run dev:backend   # Backend on :5001
npm run dev:frontend  # Frontend on :3000
```

### 2. Verify Installation

Open your browser and check these URLs:

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | [http://localhost:3000](http://localhost:3000) | ✅ Next.js App |
| **Backend API** | [http://localhost:5001/api/health](http://localhost:5001/api/health) | ✅ Express API |
| **API Documentation** | [http://localhost:5001/api/docs](http://localhost:5001/api/docs) | ✅ Swagger UI |
| **Firebase Emulator** | [http://localhost:4000](http://localhost:4000) | ✅ Database UI |

### 3. Create Your First Organization

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. Click "Sign Up" to create an account
3. Fill in your organization details:
   - **Organization Name**: Your company name
   - **Admin Email**: Your email address
   - **Admin Password**: Secure password
   - **Timezone**: Your local timezone
   - **Currency**: Your preferred currency
4. Verify your email (check console in development)
5. Complete the onboarding process

### 4. TypeScript Compilation Check

Verify that the backend compiles without errors:

```bash
# Check TypeScript compilation
cd backend/functions
npm run build

# Should show: "✅ Compilation successful - 0 errors"
```

## 📚 Basic Usage

### 1. Multi-Tenant Setup

AttendanceX is built with multi-tenancy from the ground up:

#### Understanding Tenants
- Each **organization** is a separate tenant
- Complete data isolation between tenants
- Tenant-specific branding and settings
- Role-based access control within each tenant

#### Tenant Context
All API calls automatically include tenant context:
```bash
# API calls include tenant information
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "X-Tenant-ID: your-tenant-id" \
     http://localhost:5001/api/users
```

### 1. User Management

#### Create Your First User
```bash
# Using the API
curl -X POST http://localhost:5001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "employee@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "employee"
  }'
```

#### Or use the Web Interface
1. Go to **Users** → **Add User**
2. Fill in user details
3. Assign role and permissions
4. Send invitation email

### 2. Attendance Tracking

#### Set Up Attendance Policies
1. Navigate to **Settings** → **Attendance**
2. Configure work hours and policies
3. Set up geofencing (optional)
4. Enable biometric authentication (optional)

#### First Check-In
```bash
# Via API
curl -X POST http://localhost:5001/api/attendance/checkin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "note": "Starting work day"
  }'
```

#### Or use the Mobile/Web App
1. Open the app on your device
2. Click **Check In**
3. Allow location access (if enabled)
4. Add optional note
5. Confirm check-in

### 3. Customer Management (CRM)

#### Add Your First Customer
1. Go to **CRM** → **Customers**
2. Click **Add Customer**
3. Fill in customer information
4. Add tags and custom fields
5. Save customer profile

#### Create an Appointment
1. Navigate to **Calendar** → **New Appointment**
2. Select customer and service
3. Choose date and time
4. Add location and notes
5. Send confirmation email

### 4. Sales & Products

#### Set Up Your Product Catalog
1. Go to **Sales** → **Products**
2. Click **Add Product**
3. Enter product details and pricing
4. Upload product images
5. Set inventory levels

#### Create Your First Order
1. Navigate to **Sales** → **Orders**
2. Click **New Order**
3. Select customer and products
4. Apply discounts if needed
5. Generate invoice

## 🔧 Advanced Configuration

### 1. OAuth Integrations

#### Google Workspace Integration
```bash
# Enable Google Calendar sync
curl -X POST http://localhost:5001/api/integrations/oauth/google \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "scopes": ["calendar", "contacts"],
    "redirectUri": "http://localhost:3000/integrations/callback"
  }'
```

#### Microsoft 365 Integration
1. Go to **Settings** → **Integrations**
2. Click **Connect Microsoft 365**
3. Authorize the application
4. Configure sync settings

### 2. Webhooks Setup

```bash
# Register a webhook
curl -X POST http://localhost:5001/api/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/attendancex",
    "events": ["user.created", "attendance.checkin"],
    "secret": "your-webhook-secret"
  }'
```

### 3. Custom Branding

1. Navigate to **Settings** → **Branding**
2. Upload your company logo
3. Set primary and secondary colors
4. Customize email templates
5. Configure domain settings

## 🧪 Testing Your Setup

### 1. Run Test Suite

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:backend
npm run test:frontend
npm run test:e2e
```

### 2. API Testing with Postman

1. Import our Postman collection:
   ```bash
   curl -o attendancex.postman_collection.json \
     https://api.attendancex.com/postman/collection.json
   ```

2. Import environment variables:
   ```bash
   curl -o attendancex.postman_environment.json \
     https://api.attendancex.com/postman/environment.json
   ```

3. Update environment with your local URLs and tokens

### 3. Load Testing

```bash
# Install k6 for load testing
npm install -g k6

# Run basic load test
k6 run tests/load/basic-api.js
```

## 🚀 Next Steps

### 1. Production Deployment

Ready to deploy? Check our deployment guides:

- **[Docker Deployment](../deployment/docker.md)**
- **[Firebase Hosting](../deployment/firebase.md)**
- **[AWS Deployment](../deployment/aws.md)**
- **[Custom Server](../deployment/custom-server.md)**

### 2. Advanced Features

Explore advanced functionality:

- **[AI Analytics](../features/ai-analytics.md)**
- **[Workflow Automation](../features/workflows.md)**
- **[Custom Integrations](../features/integrations.md)**
- **[Mobile Apps](../features/mobile-apps.md)**

### 3. Customization

Make AttendanceX your own:

- **[Custom Themes](../customization/themes.md)**
- **[Plugin Development](../customization/plugins.md)**
- **[API Extensions](../customization/api-extensions.md)**
- **[White Labeling](../customization/white-label.md)**

### 4. Community & Support

Join our community:

- 💬 **[Discord Community](https://discord.gg/attendancex)**
- 🐛 **[Report Issues](https://github.com/SteveRuben/attendanceX/issues)**
- 💡 **[Feature Requests](https://github.com/SteveRuben/attendanceX/discussions)**
- 📧 **[Email Support](mailto:support@attendancex.com)**

## 🆘 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill processes on ports 3000 and 5001
npx kill-port 3000 5001

# Or use different ports
PORT=3001 npm run dev:frontend
PORT=5002 npm run dev:backend
```

#### Firebase Emulator Issues
```bash
# Reset Firebase emulators
firebase emulators:kill
rm -rf .firebase/
firebase emulators:start
```

#### Node.js Version Issues
```bash
# Use Node Version Manager
nvm install 18
nvm use 18

# Or update Node.js directly
npm install -g n
n 18
```

#### Permission Errors
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Windows: Run as Administrator
```

### Getting Help

If you encounter issues:

1. **Check the logs**: Look at console output for error messages
2. **Search existing issues**: [GitHub Issues](https://github.com/SteveRuben/attendanceX/issues)
3. **Ask the community**: [GitHub Discussions](https://github.com/SteveRuben/attendanceX/discussions)
4. **Contact support**: [support@attendancex.com](mailto:support@attendancex.com)

## 📖 Additional Resources

- **[Architecture Overview](../architecture/README.md)**
- **[API Documentation](../api/README.md)**
- **[Security Guide](../security/README.md)**
- **[Contributing Guide](../../CONTRIBUTING.md)**
- **[FAQ](../faq/README.md)**

---

**Congratulations! 🎉** You've successfully set up AttendanceX. Start exploring the features and building your organization's workflow.

*Need help? Join our [Discord community](https://discord.gg/attendancex) or check our [documentation](../README.md).*