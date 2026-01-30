# 🚀 Backend AttendanceX - Getting Started

## Quick Start

### Prerequisites
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project configured

### Development Setup

1. **Install Dependencies**
```bash
cd backend/functions
npm install
```

2. **Configure Environment**
```bash
# Copy example env file
cp .env.example .env

# Add your Firebase credentials
# Edit .env with your project settings
```

3. **Start Development Server**
```bash
# From backend directory
./start-emulators.sh

# Or use Firebase CLI directly
firebase emulators:start
```

The emulators will start on:
- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- Auth: http://localhost:9099
- UI: http://localhost:4000

---

## 📦 Available Commands

### Development
```bash
# Start emulators
firebase emulators:start

# Start with specific emulators only
firebase emulators:start --only functions,firestore

# Build TypeScript
cd functions && npm run build

# Watch mode
cd functions && npm run build:watch
```

### Testing
```bash
# Run all tests
cd functions && npm test

# Run with coverage
cd functions && npm run test:coverage

# Run specific test file
cd functions && npm test -- path/to/test.spec.ts
```

### Deployment
```bash
# Deploy everything
firebase deploy

# Deploy functions only
firebase deploy --only functions

# Deploy firestore rules
firebase deploy --only firestore:rules

# Deploy firestore indexes
firebase deploy --only firestore:indexes
```

---

## 🗂️ Project Structure

```
backend/
├── functions/
│   ├── src/              # TypeScript source code
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # HTTP request handlers
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data models
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utility functions
│   ├── package.json
│   └── tsconfig.json
├── firebase.json         # Firebase configuration
├── firestore.rules       # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── storage.rules         # Storage security rules
└── start-emulators.sh    # Emulator start script
```

---

## 🔧 Configuration Files

### firebase.json
Main Firebase configuration for hosting, functions, firestore, and emulators.

### firestore.rules
Security rules for Firestore database. Always test rules before deploying to production.

### firestore.indexes.json
Composite indexes for complex queries. Auto-generated when needed.

### functions/.env
Environment variables for local development (not committed to git).

Required variables:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
```

---

## 🚀 Deployment Guide

### Before Deploying

1. **Run Tests**
```bash
cd functions && npm test
```

2. **Build TypeScript**
```bash
cd functions && npm run build
```

3. **Check Linting**
```bash
cd functions && npm run lint
```

### Deploy to Production

```bash
# Login to Firebase
firebase login

# Select project
firebase use production

# Deploy
firebase deploy
```

### Deploy to Staging

```bash
firebase use staging
firebase deploy
```

---

## 🐛 Troubleshooting

### Emulators Won't Start

```bash
# Kill existing processes
pkill -f firebase

# Clear cache
firebase emulators:kill
rm -rf ~/.cache/firebase/emulators

# Restart
firebase emulators:start
```

### Build Errors

```bash
# Clean and rebuild
cd functions
rm -rf lib node_modules
npm install
npm run build
```

### Firestore Connection Issues

```bash
# Check credentials
echo $GOOGLE_APPLICATION_CREDENTIALS
```

### Port Already in Use

```bash
# Find process using port 5001
lsof -i :5001

# Kill process
kill -9 <PID>
```

---

## 📚 Additional Resources

### Documentation
- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

### API Documentation
API endpoints are documented in the source code using JSDoc comments.

---

## 🔐 Security Notes

- Never commit `.env` files or service account keys
- Always use environment variables for sensitive data
- Test security rules thoroughly before deploying
- Use Firebase App Check in production
- Enable rate limiting on public endpoints

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Check Firebase console logs
3. Review error messages in emulator UI

---

**Happy Coding! 🎉**
