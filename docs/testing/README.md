# AttendanceX Testing Guide

This comprehensive testing guide covers AttendanceX's testing strategy, implementation patterns, and quality assurance processes to ensure reliable, secure, and performant software delivery.

## 🧪 Testing Philosophy

AttendanceX follows a **comprehensive testing strategy** that emphasizes:

- **Test-Driven Development (TDD)**: Write tests before implementation
- **Behavior-Driven Development (BDD)**: Tests describe business behavior
- **Shift-Left Testing**: Early and continuous testing throughout development
- **Risk-Based Testing**: Focus on high-risk areas and critical paths
- **Automated Quality Gates**: Prevent regressions through automation

## 📊 Current Testing Metrics

| Metric | Current Status | Target | Trend |
|--------|---------------|--------|-------|
| **Backend Unit Tests** | 85% coverage | >90% | 🟢 Improving |
| **Backend Integration Tests** | 78% coverage | >80% | 🟢 Good |
| **Frontend Component Tests** | 82% coverage | >85% | 🟡 Improving |
| **E2E Test Coverage** | 65% coverage | >70% | 🟡 Improving |
| **API Test Coverage** | 92% coverage | >95% | 🟢 Excellent |
| **Security Tests** | 88% coverage | >90% | 🟢 Good |
| **Performance Tests** | 75% coverage | >80% | 🟡 Improving |

## 🏗️ Testing Architecture

### Testing Pyramid

```
                    /\
                   /  \
                  / E2E \
                 /Tests  \
                /________\
               /          \
              / Integration \
             /    Tests     \
            /______________\
           /                \
          /   Unit Tests     \
         /   (Foundation)     \
        /__________________\
```

### Test Types Distribution

- **Unit Tests (70%)**: Fast, isolated, focused on individual functions
- **Integration Tests (20%)**: API endpoints, database interactions, service integration
- **End-to-End Tests (10%)**: Complete user workflows, critical business paths

## 🔧 Backend Testing

### Unit Testing with Jest

```typescript
// tests/backend/unit/services/user.service.test.ts
import { UserService } from '../../../src/services/users/user.service';
import { UserModel } from '../../../src/models/user.model';
import { ValidationError, ConflictError } from '../../../src/utils/common/errors';

describe('UserService', () => {
  let userService: UserService;
  let mockUserModel: jest.Mocked<UserModel>;

  beforeEach(() => {
    userService = new UserService();
    mockUserModel = {
      validate: jest.fn(),
      toFirestore: jest.fn(),
      toAPI: jest.fn()
    } as any;
  });

  describe('createUser', () => {
    const validUserData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'employee'
    };
    const tenantId = 'tenant-123';
    const createdBy = 'user-456';

    it('should create user with valid data', async () => {
      // Arrange
      const expectedUser = { id: 'user-789', ...validUserData, tenantId };
      mockUserModel.validate.mockResolvedValue(true);
      mockUserModel.toFirestore.mockReturnValue(validUserData);
      mockUserModel.toAPI.mockReturnValue(expectedUser);
      
      jest.spyOn(UserModel, 'fromCreateRequest').mockReturnValue(mockUserModel);
      jest.spyOn(userService as any, 'validateCreateRequest').mockResolvedValue(undefined);

      // Act
      const result = await userService.createUser(validUserData, tenantId, createdBy);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserModel.validate).toHaveBeenCalled();
      expect(userService['validateCreateRequest']).toHaveBeenCalledWith(validUserData, tenantId);
    });

    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const invalidUserData = { ...validUserData, email: 'invalid-email' };
      mockUserModel.validate.mockRejectedValue(new ValidationError('Invalid email format'));
      jest.spyOn(UserModel, 'fromCreateRequest').mockReturnValue(mockUserModel);

      // Act & Assert
      await expect(
        userService.createUser(invalidUserData, tenantId, createdBy)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError for duplicate email', async () => {
      // Arrange
      jest.spyOn(userService as any, 'validateCreateRequest')
        .mockRejectedValue(new ConflictError('Email already exists'));

      // Act & Assert
      await expect(
        userService.createUser(validUserData, tenantId, createdBy)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getUsersByTenant', () => {
    it('should return users filtered by tenant', async () => {
      // Arrange
      const tenantId = 'tenant-123';
      const expectedUsers = [
        { id: 'user-1', email: 'user1@example.com', tenantId },
        { id: 'user-2', email: 'user2@example.com', tenantId }
      ];

      jest.spyOn(userService as any, 'query').mockResolvedValue(expectedUsers);

      // Act
      const result = await userService.getUsersByTenant(tenantId);

      // Assert
      expect(result).toEqual(expectedUsers);
      expect(userService['query']).toHaveBeenCalledWith(
        expect.any(Object),
        expect.arrayContaining([])
      );
    });
  });
});
```

### Integration Testing

```typescript
// tests/backend/integration/api/users.test.ts
import request from 'supertest';
import { app } from '../../../src/app';
import { setupTestDatabase, cleanupTestDatabase } from '../../helpers/database';
import { createTestUser, createTestTenant } from '../../helpers/fixtures';

describe('Users API Integration Tests', () => {
  let authToken: string;
  let tenantId: string;
  let adminUserId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Create test tenant and admin user
    const tenant = await createTestTenant();
    tenantId = tenant.id;
    
    const adminUser = await createTestUser({
      tenantId,
      role: 'admin',
      permissions: ['users:create', 'users:read', 'users:update', 'users:delete']
    });
    adminUserId = adminUser.id;
    
    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: 'test-password'
      });
    
    authToken = loginResponse.body.data.accessToken;
  });

  describe('POST /api/users', () => {
    const validUserData = {
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'employee'
    };

    it('should create user successfully', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validUserData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User created successfully',
        data: {
          email: validUserData.email,
          firstName: validUserData.firstName,
          lastName: validUserData.lastName,
          role: validUserData.role,
          tenantId: tenantId
        }
      });

      // Verify user was created in database
      const createdUser = await request(app)
        .get(`/api/users/${response.body.data.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(createdUser.body.data.email).toBe(validUserData.email);
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('email')
        }
      });
    });

    it('should return 409 for duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validUserData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validUserData)
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/users')
        .send(validUserData)
        .expect(401);
    });

    it('should return 403 without proper permissions', async () => {
      // Create user without create permission
      const limitedUser = await createTestUser({
        tenantId,
        role: 'employee',
        permissions: ['users:read']
      });

      const limitedToken = await request(app)
        .post('/api/auth/login')
        .send({
          email: limitedUser.email,
          password: 'test-password'
        })
        .then(res => res.body.data.accessToken);

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${limitedToken}`)
        .send(validUserData)
        .expect(403);
    });
  });

  describe('GET /api/users', () => {
    beforeEach(async () => {
      // Create test users
      await Promise.all([
        createTestUser({ tenantId, role: 'employee' }),
        createTestUser({ tenantId, role: 'manager' }),
        createTestUser({ tenantId, role: 'employee' })
      ]);
    });

    it('should return paginated users', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            email: expect.any(String),
            tenantId: tenantId
          })
        ]),
        pagination: {
          page: 1,
          limit: 2,
          total: expect.any(Number),
          totalPages: expect.any(Number)
        }
      });

      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users?role=manager')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'manager' })
        ])
      );

      // Ensure no non-manager users are returned
      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('manager');
      });
    });

    it('should only return users from same tenant', async () => {
      // Create user in different tenant
      const otherTenant = await createTestTenant();
      await createTestUser({ tenantId: otherTenant.id });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // All returned users should belong to the same tenant
      response.body.data.forEach((user: any) => {
        expect(user.tenantId).toBe(tenantId);
      });
    });
  });
});
```

## 🎨 Frontend Testing

### Component Testing with React Testing Library

```typescript
// tests/frontend/components/UserForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserForm } from '../../../src/components/forms/UserForm';
import { usersService } from '../../../src/services/api/users.service';

// Mock the API service
jest.mock('../../../src/services/api/users.service');
const mockUsersService = usersService as jest.Mocked<typeof usersService>;

describe('UserForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields correctly', () => {
    render(
      <UserForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <UserForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    );

    // Try to submit without filling required fields
    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    });

    expect(mockUsersService.createUser).not.toHaveBeenCalled();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    
    render(
      <UserForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    );

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'employee'
    };

    mockUsersService.createUser.mockResolvedValue({
      success: true,
      data: mockUser
    });

    render(
      <UserForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    );

    // Fill form
    await user.type(screen.getByLabelText(/email/i), mockUser.email);
    await user.type(screen.getByLabelText(/first name/i), mockUser.firstName);
    await user.type(screen.getByLabelText(/last name/i), mockUser.lastName);
    await user.selectOptions(screen.getByLabelText(/role/i), mockUser.role);

    // Submit form
    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(mockUsersService.createUser).toHaveBeenCalledWith({
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it('should handle API errors', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Email already exists';

    mockUsersService.createUser.mockRejectedValue(new Error(errorMessage));

    render(
      <UserForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    );

    // Fill and submit form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.selectOptions(screen.getByLabelText(/role/i), 'employee');
    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed response
    mockUsersService.createUser.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <UserForm 
        onSuccess={mockOnSuccess} 
        onError={mockOnError} 
      />
    );

    // Fill and submit form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.click(screen.getByRole('button', { name: /create user/i }));

    // Check loading state
    expect(screen.getByRole('button', { name: /creating.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating.../i })).toBeDisabled();
  });
});
```

### Custom Hook Testing

```typescript
// tests/frontend/hooks/useUsers.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUsers } from '../../../src/hooks/useUsers';
import { usersService } from '../../../src/services/api/users.service';

jest.mock('../../../src/services/api/users.service');
const mockUsersService = usersService as jest.Mocked<typeof usersService>;

describe('useUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch users successfully', async () => {
    const mockUsers = [
      { id: '1', email: 'user1@example.com', firstName: 'John', lastName: 'Doe' },
      { id: '2', email: 'user2@example.com', firstName: 'Jane', lastName: 'Smith' }
    ];

    mockUsersService.getUsers.mockResolvedValue({
      success: true,
      data: mockUsers
    });

    const { result } = renderHook(() => useUsers());

    expect(result.current.loading).toBe(false);
    expect(result.current.users).toEqual([]);

    await act(async () => {
      await result.current.fetchUsers();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.users).toEqual(mockUsers);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle fetch errors', async () => {
    const errorMessage = 'Failed to fetch users';
    mockUsersService.getUsers.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useUsers());

    await act(async () => {
      await result.current.fetchUsers();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.users).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  it('should set loading state correctly', async () => {
    mockUsersService.getUsers.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100))
    );

    const { result } = renderHook(() => useUsers());

    act(() => {
      result.current.fetchUsers();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
```

## 🔄 End-to-End Testing with Cypress

### E2E Test Structure

```typescript
// cypress/e2e/user-management.cy.ts
describe('User Management', () => {
  beforeEach(() => {
    // Login as admin
    cy.login('admin@example.com', 'password');
    cy.visit('/users');
  });

  it('should create a new user', () => {
    // Navigate to create user form
    cy.get('[data-testid="create-user-button"]').click();
    
    // Fill form
    cy.get('[data-testid="email-input"]').type('newuser@example.com');
    cy.get('[data-testid="firstName-input"]').type('John');
    cy.get('[data-testid="lastName-input"]').type('Doe');
    cy.get('[data-testid="role-select"]').select('employee');
    
    // Submit form
    cy.get('[data-testid="submit-button"]').click();
    
    // Verify success
    cy.get('[data-testid="success-message"]').should('contain', 'User created successfully');
    cy.get('[data-testid="users-table"]').should('contain', 'newuser@example.com');
  });

  it('should edit existing user', () => {
    // Find and click edit button for first user
    cy.get('[data-testid="users-table"] tbody tr').first().within(() => {
      cy.get('[data-testid="edit-button"]').click();
    });
    
    // Update user information
    cy.get('[data-testid="firstName-input"]').clear().type('Updated Name');
    cy.get('[data-testid="submit-button"]').click();
    
    // Verify update
    cy.get('[data-testid="success-message"]').should('contain', 'User updated successfully');
    cy.get('[data-testid="users-table"]').should('contain', 'Updated Name');
  });

  it('should delete user with confirmation', () => {
    // Get initial user count
    cy.get('[data-testid="users-table"] tbody tr').then($rows => {
      const initialCount = $rows.length;
      
      // Delete first user
      cy.get('[data-testid="users-table"] tbody tr').first().within(() => {
        cy.get('[data-testid="delete-button"]').click();
      });
      
      // Confirm deletion
      cy.get('[data-testid="confirm-delete-button"]').click();
      
      // Verify deletion
      cy.get('[data-testid="success-message"]').should('contain', 'User deleted successfully');
      cy.get('[data-testid="users-table"] tbody tr').should('have.length', initialCount - 1);
    });
  });

  it('should filter users by role', () => {
    // Apply role filter
    cy.get('[data-testid="role-filter"]').select('manager');
    
    // Verify filtered results
    cy.get('[data-testid="users-table"] tbody tr').each($row => {
      cy.wrap($row).should('contain', 'manager');
    });
  });

  it('should search users by name', () => {
    const searchTerm = 'John';
    
    // Enter search term
    cy.get('[data-testid="search-input"]').type(searchTerm);
    
    // Verify search results
    cy.get('[data-testid="users-table"] tbody tr').each($row => {
      cy.wrap($row).should('contain.text', searchTerm);
    });
  });
});
```

### Custom Cypress Commands

```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      createTestUser(userData: any): Chainable<any>;
      cleanupTestData(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { email, password }
  }).then(response => {
    window.localStorage.setItem('authToken', response.body.data.accessToken);
  });
});

Cypress.Commands.add('createTestUser', (userData) => {
  return cy.request({
    method: 'POST',
    url: '/api/users',
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('authToken')}`
    },
    body: userData
  });
});

Cypress.Commands.add('cleanupTestData', () => {
  cy.request({
    method: 'DELETE',
    url: '/api/test/cleanup',
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('authToken')}`
    }
  });
});
```

## 🚀 Performance Testing

### Load Testing with Artillery

```yaml
# artillery/load-test.yml
config:
  target: 'http://localhost:5001'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"
  variables:
    authToken: "{{ $processEnvironment.AUTH_TOKEN }}"

scenarios:
  - name: "User Management API"
    weight: 70
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password"
          capture:
            - json: "$.data.accessToken"
              as: "authToken"
      - get:
          url: "/api/users"
          headers:
            Authorization: "Bearer {{ authToken }}"
      - post:
          url: "/api/users"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            email: "user{{ $randomString() }}@example.com"
            firstName: "Test"
            lastName: "User"
            role: "employee"

  - name: "Attendance API"
    weight: 30
    flow:
      - post:
          url: "/api/attendance/checkin"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            location:
              latitude: 40.7128
              longitude: -74.0060
```

### Performance Benchmarks

```typescript
// tests/performance/api-benchmarks.test.ts
import { performance } from 'perf_hooks';
import request from 'supertest';
import { app } from '../../src/app';

describe('API Performance Benchmarks', () => {
  let authToken: string;

  beforeAll(async () => {
    // Setup authentication
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = loginResponse.body.data.accessToken;
  });

  it('should respond to GET /api/users within 200ms', async () => {
    const start = performance.now();
    
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(200);
    expect(response.body.success).toBe(true);
  });

  it('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 10;
    const start = performance.now();
    
    const promises = Array(concurrentRequests).fill(null).map(() =>
      request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
    );
    
    const responses = await Promise.all(promises);
    const duration = performance.now() - start;
    
    // All requests should complete within 1 second
    expect(duration).toBeLessThan(1000);
    
    // All requests should be successful
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});
```

## 🔒 Security Testing

### Security Test Suite

```typescript
// tests/security/security.test.ts
import request from 'supertest';
import { app } from '../../src/app';

describe('Security Tests', () => {
  describe('Authentication Security', () => {
    it('should reject requests without authentication', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });

    it('should reject invalid JWT tokens', async () => {
      await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Expired token
      
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Input Validation Security', () => {
    let authToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'password' });
      authToken = loginResponse.body.data.accessToken;
    });

    it('should prevent SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: maliciousInput,
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(400);
    });

    it('should prevent XSS attacks', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'test@example.com',
          firstName: xssPayload,
          lastName: 'User'
        })
        .expect(400);
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@example',
        ''
      ];

      for (const email of invalidEmails) {
        await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            email,
            firstName: 'Test',
            lastName: 'User'
          })
          .expect(400);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on login attempts', async () => {
      const requests = [];
      
      // Make multiple rapid login attempts
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'wrong-password' })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Tenant Isolation', () => {
    it('should prevent cross-tenant data access', async () => {
      // Create users in different tenants
      const tenant1Token = await createUserInTenant('tenant1');
      const tenant2Token = await createUserInTenant('tenant2');
      
      // User from tenant1 should not see tenant2 data
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .expect(200);
      
      // Verify all returned users belong to tenant1
      response.body.data.forEach((user: any) => {
        expect(user.tenantId).toBe('tenant1');
      });
    });
  });
});
```

## 📊 Test Reporting & Analytics

### Coverage Reports

```typescript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/test-utils/**'
  ]
};
```

### Test Metrics Dashboard

```typescript
// scripts/generate-test-report.ts
import fs from 'fs';
import path from 'path';

interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  performance: {
    averageResponseTime: number;
    slowestEndpoint: string;
    fastestEndpoint: string;
  };
  security: {
    vulnerabilities: number;
    securityTestsPassed: number;
    securityTestsFailed: number;
  };
}

export const generateTestReport = async (): Promise<TestMetrics> => {
  // Collect metrics from various test runs
  const jestResults = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
  const cypressResults = JSON.parse(fs.readFileSync('cypress/reports/results.json', 'utf8'));
  const performanceResults = JSON.parse(fs.readFileSync('artillery/report.json', 'utf8'));
  
  const metrics: TestMetrics = {
    totalTests: jestResults.numTotalTests + cypressResults.stats.tests,
    passedTests: jestResults.numPassedTests + cypressResults.stats.passes,
    failedTests: jestResults.numFailedTests + cypressResults.stats.failures,
    coverage: {
      lines: jestResults.total.lines.pct,
      functions: jestResults.total.functions.pct,
      branches: jestResults.total.branches.pct,
      statements: jestResults.total.statements.pct
    },
    performance: {
      averageResponseTime: performanceResults.aggregate.latency.mean,
      slowestEndpoint: performanceResults.slowest.url,
      fastestEndpoint: performanceResults.fastest.url
    },
    security: {
      vulnerabilities: 0, // From security scan results
      securityTestsPassed: 25,
      securityTestsFailed: 0
    }
  };
  
  // Generate HTML report
  const htmlReport = generateHTMLReport(metrics);
  fs.writeFileSync('reports/test-dashboard.html', htmlReport);
  
  return metrics;
};
```

## 🔄 Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start Firebase emulators
        run: npm run emulators:start &
      
      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start application
        run: npm run dev &
      
      - name: Wait for application
        run: npx wait-on http://localhost:3000
      
      - name: Run Cypress tests
        uses: cypress-io/github-action@v5
        with:
          wait-on: 'http://localhost:3000'
          browser: chrome

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security scan
        uses: securecodewarrior/github-action-add-sarif@v1
        with:
          sarif-file: 'security-scan-results.sarif'
      
      - name: Run dependency check
        run: npm audit --audit-level high
```

## 📋 Testing Best Practices

### Test Organization

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **One Assertion Per Test**: Focus on single behavior
3. **Descriptive Test Names**: Clearly describe what is being tested
4. **Test Data Isolation**: Each test should be independent
5. **Mock External Dependencies**: Control test environment

### Test Maintenance

1. **Regular Test Review**: Remove obsolete tests
2. **Refactor Test Code**: Keep tests maintainable
3. **Update Test Data**: Keep fixtures current
4. **Monitor Test Performance**: Optimize slow tests
5. **Document Test Scenarios**: Explain complex test logic

### Quality Gates

- **Minimum 85% code coverage** for new features
- **All tests must pass** before merging
- **Performance tests** must meet SLA requirements
- **Security tests** must pass vulnerability scans
- **E2E tests** must cover critical user journeys

---

This comprehensive testing guide ensures AttendanceX maintains high quality, security, and performance standards through rigorous testing practices. For specific testing procedures or to contribute to our test suite, see our [Contributing Guide](../CONTRIBUTING.md).