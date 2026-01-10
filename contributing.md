# Contributing to AttendanceX 🤝

Thank you for your interest in contributing to AttendanceX! This document provides guidelines and information for contributors.

## 🌟 Ways to Contribute

- 🐛 **Bug Reports** - Help us identify and fix issues
- ✨ **Feature Requests** - Suggest new functionality
- 📝 **Documentation** - Improve guides and API docs
- 🧪 **Testing** - Add test coverage and quality assurance
- 💻 **Code Contributions** - Implement features and fixes
- 🎨 **Design** - Improve UI/UX and user experience

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git
- Firebase CLI
- Basic knowledge of TypeScript, React, and Firebase

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/attendanceX.git
   cd attendanceX
   ```

2. **Install Dependencies**
   ```bash
   npm run install:all
   ```

3. **Set Up Environment**
   ```bash
   cp .env.example .env.local
   # Configure your environment variables
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📋 Development Guidelines

### Code Standards

- **TypeScript**: Use strict mode with proper typing
- **ESLint**: Follow the configured linting rules
- **Prettier**: Use for consistent code formatting
- **Conventional Commits**: Follow commit message conventions

### Project Structure

```
├── backend/functions/src/
│   ├── controllers/     # API route handlers
│   ├── services/        # Business logic
│   ├── models/          # Data models and validation
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript type definitions
├── frontend-v2/src/
│   ├── components/      # React components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript types
└── docs/                # Documentation
```

### Coding Conventions

#### TypeScript

```typescript
// ✅ Good: Proper typing and naming
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

const getUserProfile = async (userId: string): Promise<UserProfile> => {
  // Implementation
};

// ❌ Bad: Any types and unclear naming
const getUser = async (id: any): Promise<any> => {
  // Implementation
};
```

#### React Components

```typescript
// ✅ Good: Proper component structure
interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({ 
  user, 
  onEdit, 
  className 
}) => {
  return (
    <div className={cn("user-card", className)}>
      {/* Component content */}
    </div>
  );
};

// ❌ Bad: No types and unclear structure
export const UserCard = ({ user, onEdit }) => {
  // Implementation
};
```

### Testing Requirements

- **Unit Tests**: Required for all new functions and components
- **Integration Tests**: Required for API endpoints
- **E2E Tests**: Required for critical user flows
- **Minimum Coverage**: 80% for new code

#### Test Examples

```typescript
// Unit test example
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      const result = await userService.createUser(userData);
      
      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
    });

    it('should throw error for invalid email', async () => {
      const userData = { email: 'invalid-email', name: 'Test User' };
      
      await expect(userService.createUser(userData))
        .rejects.toThrow('Invalid email format');
    });
  });
});
```

## 🔄 Contribution Workflow

### 1. Issue Creation

Before starting work, create or find an existing issue:

- **Bug Report**: Use the bug report template
- **Feature Request**: Use the feature request template
- **Documentation**: Create a documentation issue

### 2. Branch Strategy

```bash
# Create a feature branch
git checkout -b feature/user-profile-enhancement

# Create a bugfix branch
git checkout -b fix/authentication-error

# Create a documentation branch
git checkout -b docs/api-documentation-update
```

### 3. Development Process

1. **Write Tests First** (TDD approach recommended)
2. **Implement Feature/Fix**
3. **Update Documentation**
4. **Run Quality Checks**

```bash
# Run tests
npm run test

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run build
npm run build
```

### 4. Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature
git commit -m "feat: add user profile editing functionality"

# Bug fix
git commit -m "fix: resolve authentication token expiration issue"

# Documentation
git commit -m "docs: update API documentation for user endpoints"

# Refactoring
git commit -m "refactor: improve user service error handling"

# Tests
git commit -m "test: add unit tests for user authentication"
```

### 5. Pull Request Process

1. **Create Pull Request** with descriptive title and description
2. **Link Related Issues** using keywords (fixes #123, closes #456)
3. **Add Screenshots** for UI changes
4. **Request Review** from maintainers
5. **Address Feedback** and make necessary changes

#### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] Documentation updated
```

## 🧪 Testing Guidelines

### Running Tests

```bash
# All tests
npm run test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Structure

```typescript
// Test file naming: *.test.ts or *.spec.ts
describe('Component/Service Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('method/functionality', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

## 📚 Documentation Standards

### Code Documentation

```typescript
/**
 * Creates a new user in the system
 * @param userData - The user data to create
 * @param tenantId - The tenant ID for multi-tenant isolation
 * @returns Promise resolving to the created user
 * @throws {ValidationError} When user data is invalid
 * @throws {ConflictError} When email already exists
 */
export const createUser = async (
  userData: CreateUserRequest,
  tenantId: string
): Promise<User> => {
  // Implementation
};
```

### API Documentation

All API endpoints must be documented with OpenAPI/Swagger:

```typescript
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
```

## 🚀 Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] Release notes prepared

## 🎯 Areas for Contribution

### High Priority

- 🤖 **AI/ML Features** - Predictive analytics and automation
- 📱 **Mobile Apps** - Native iOS and Android applications
- 🔗 **Integrations** - Third-party service integrations
- 🧪 **Test Coverage** - Increase test coverage to 90%+

### Medium Priority

- 🎨 **UI/UX Improvements** - Design system enhancements
- 📊 **Analytics Dashboard** - Advanced reporting features
- 🔒 **Security Enhancements** - Additional security measures
- 🌍 **Internationalization** - Multi-language support

### Good First Issues

Look for issues labeled `good first issue` or `help wanted` for beginner-friendly contributions.

## 💬 Communication

### Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time chat (coming soon)
- **Email**: maintainers@attendancex.com

### Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive environment for all contributors.

## 🏆 Recognition

Contributors will be recognized in:

- **README.md** contributors section
- **CHANGELOG.md** for significant contributions
- **GitHub releases** acknowledgments
- **Annual contributor highlights**

## 📞 Getting Help

If you need help or have questions:

1. Check existing [documentation](docs/)
2. Search [GitHub Issues](https://github.com/SteveRuben/attendanceX/issues)
3. Ask in [GitHub Discussions](https://github.com/SteveRuben/attendanceX/discussions)
4. Contact maintainers via email

## 🙏 Thank You

Thank you for contributing to AttendanceX! Your efforts help make this project better for everyone. Every contribution, no matter how small, is valuable and appreciated.

---

**Happy Contributing! 🚀**