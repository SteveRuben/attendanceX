# AttendanceX API Examples

This document provides practical examples for common AttendanceX API operations. All examples include complete request/response cycles with real-world scenarios.

## 🔐 Authentication Examples

### Complete Login Flow

```javascript
// 1. Login and get tokens
const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@company.com',
    password: 'SecurePassword123!'
  })
});

const { data } = await loginResponse.json();
const { accessToken, refreshToken, user } = data;

// Store tokens securely
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

console.log('Logged in as:', user.name);
```

### Token Refresh Implementation

```javascript
class AttendanceXClient {
  constructor(baseUrl = 'http://localhost:5001/api') {
    this.baseUrl = baseUrl;
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Handle token expiration
    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      headers.Authorization = `Bearer ${this.accessToken}`;
      response = await fetch(url, { ...options, headers });
    }

    return response;
  }

  async refreshAccessToken() {
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    const { data } = await response.json();
    this.accessToken = data.accessToken;
    localStorage.setItem('accessToken', this.accessToken);
  }
}

// Usage
const client = new AttendanceXClient();
const users = await client.makeRequest('/users');
```

## 🏢 Organization Management Examples

### Complete Organization Setup

```javascript
// Create organization during registration
const createOrganization = async (orgData) => {
  const response = await fetch('http://localhost:5001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // User details
      email: 'ceo@newcompany.com',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'CEO',
      
      // Organization details
      organizationName: 'New Company Inc',
      industry: 'Technology',
      size: '10-50',
      timezone: 'America/New_York',
      currency: 'USD'
    })
  });

  const result = await response.json();
  console.log('Organization created:', result.data.organization);
  return result;
};

// Update organization settings
const updateOrgSettings = async (token) => {
  const response = await fetch('http://localhost:5001/api/organizations/current', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      settings: {
        workingHours: {
          start: '09:00',
          end: '17:00',
          timezone: 'America/New_York'
        },
        attendancePolicy: {
          requireLocation: true,
          allowMobileCheckin: true,
          gracePeriodMinutes: 15
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          webhookUrl: 'https://company.com/webhooks/attendance'
        }
      }
    })
  });

  return response.json();
};
```

### Bulk User Invitation

```javascript
const inviteMultipleUsers = async (token, invitations) => {
  const results = [];
  
  for (const invitation of invitations) {
    try {
      const response = await fetch('http://localhost:5001/api/organizations/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: invitation.email,
          role: invitation.role,
          department: invitation.department,
          message: `Welcome to ${invitation.department}! Please join our team.`
        })
      });

      const result = await response.json();
      results.push({ email: invitation.email, success: result.success });
      
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.push({ email: invitation.email, success: false, error: error.message });
    }
  }

  return results;
};

// Usage
const invitations = [
  { email: 'dev1@company.com', role: 'employee', department: 'Engineering' },
  { email: 'dev2@company.com', role: 'employee', department: 'Engineering' },
  { email: 'manager@company.com', role: 'manager', department: 'Engineering' }
];

const results = await inviteMultipleUsers(token, invitations);
console.log('Invitation results:', results);
```

## ⏰ Attendance Tracking Examples

### Smart Check-In with Location Validation

```javascript
class AttendanceTracker {
  constructor(apiClient) {
    this.client = apiClient;
    this.officeLocation = { lat: 40.7128, lng: -74.0060 }; // NYC office
    this.maxDistance = 100; // meters
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }),
        error => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  async checkIn(note = '') {
    try {
      // Get current location
      const location = await this.getCurrentLocation();
      
      // Validate location (optional - server can also validate)
      const distance = this.calculateDistance(
        location.latitude, location.longitude,
        this.officeLocation.lat, this.officeLocation.lng
      );

      if (distance > this.maxDistance) {
        console.warn(`Distance from office: ${Math.round(distance)}m`);
      }

      // Perform check-in
      const response = await this.client.makeRequest('/attendance/checkin', {
        method: 'POST',
        body: JSON.stringify({
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy
          },
          note,
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Checked in successfully at', new Date().toLocaleTimeString());
        return result.data;
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('❌ Check-in failed:', error.message);
      throw error;
    }
  }

  async checkOut(note = '') {
    try {
      const location = await this.getCurrentLocation();
      
      const response = await this.client.makeRequest('/attendance/checkout', {
        method: 'POST',
        body: JSON.stringify({
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy
          },
          note,
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Checked out successfully at', new Date().toLocaleTimeString());
        return result.data;
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('❌ Check-out failed:', error.message);
      throw error;
    }
  }
}

// Usage
const tracker = new AttendanceTracker(client);

// Check in with automatic location
await tracker.checkIn('Starting productive day!');

// Check out later
await tracker.checkOut('Great day completed!');
```

### Attendance Analytics Dashboard

```javascript
class AttendanceDashboard {
  constructor(apiClient) {
    this.client = apiClient;
  }

  async getTeamAttendance(startDate, endDate, department = null) {
    const params = new URLSearchParams({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      groupBy: 'user',
      includeStats: 'true'
    });

    if (department) {
      params.append('department', department);
    }

    const response = await this.client.makeRequest(`/attendance?${params}`);
    const result = await response.json();

    return this.processAttendanceData(result.data);
  }

  processAttendanceData(rawData) {
    const stats = {
      totalEmployees: 0,
      presentToday: 0,
      averageHours: 0,
      lateArrivals: 0,
      earlyDepartures: 0,
      attendanceRate: 0
    };

    const employeeStats = rawData.records.reduce((acc, record) => {
      if (!acc[record.userId]) {
        acc[record.userId] = {
          name: record.user.name,
          department: record.user.department,
          totalHours: 0,
          daysPresent: 0,
          lateCount: 0,
          records: []
        };
      }

      acc[record.userId].records.push(record);
      
      if (record.checkoutTime) {
        const hours = (new Date(record.checkoutTime) - new Date(record.checkinTime)) / (1000 * 60 * 60);
        acc[record.userId].totalHours += hours;
        acc[record.userId].daysPresent++;
      }

      // Check if late (after 9:00 AM)
      const checkinTime = new Date(record.checkinTime);
      const nineAM = new Date(checkinTime);
      nineAM.setHours(9, 0, 0, 0);
      
      if (checkinTime > nineAM) {
        acc[record.userId].lateCount++;
        stats.lateArrivals++;
      }

      return acc;
    }, {});

    stats.totalEmployees = Object.keys(employeeStats).length;
    stats.presentToday = Object.values(employeeStats).filter(emp => 
      emp.records.some(r => new Date(r.checkinTime).toDateString() === new Date().toDateString())
    ).length;

    const totalHours = Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalHours, 0);
    const totalDays = Object.values(employeeStats).reduce((sum, emp) => sum + emp.daysPresent, 0);
    stats.averageHours = totalDays > 0 ? totalHours / totalDays : 0;
    stats.attendanceRate = (stats.presentToday / stats.totalEmployees) * 100;

    return { stats, employeeStats };
  }

  async generateReport(startDate, endDate) {
    const data = await this.getTeamAttendance(startDate, endDate);
    
    const report = {
      period: `${startDate.toDateString()} - ${endDate.toDateString()}`,
      summary: data.stats,
      topPerformers: Object.values(data.employeeStats)
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 5),
      attendanceIssues: Object.values(data.employeeStats)
        .filter(emp => emp.lateCount > 3)
        .sort((a, b) => b.lateCount - a.lateCount)
    };

    return report;
  }
}

// Usage
const dashboard = new AttendanceDashboard(client);

// Get last 30 days attendance
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

const report = await dashboard.generateReport(startDate, endDate);
console.log('Attendance Report:', report);
```

## 👥 CRM Integration Examples

### Complete Customer Lifecycle Management

```javascript
class CRMManager {
  constructor(apiClient) {
    this.client = apiClient;
  }

  async createCustomerWithHistory(customerData) {
    // Create customer
    const customerResponse = await this.client.makeRequest('/customers', {
      method: 'POST',
      body: JSON.stringify({
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone,
        company: customerData.company,
        industry: customerData.industry,
        source: customerData.source || 'website',
        tags: customerData.tags || [],
        customFields: customerData.customFields || {}
      })
    });

    const customer = await customerResponse.json();
    
    if (!customer.success) {
      throw new Error(customer.error.message);
    }

    // Add initial interaction
    await this.addInteraction(customer.data.id, {
      type: 'note',
      subject: 'Customer Created',
      content: `New customer added from ${customerData.source}`,
      date: new Date().toISOString()
    });

    // Schedule follow-up if needed
    if (customerData.scheduleFollowup) {
      await this.scheduleFollowup(customer.data.id, customerData.followupDate);
    }

    return customer.data;
  }

  async addInteraction(customerId, interaction) {
    return this.client.makeRequest(`/customers/${customerId}/interactions`, {
      method: 'POST',
      body: JSON.stringify(interaction)
    });
  }

  async scheduleFollowup(customerId, followupDate) {
    return this.client.makeRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        title: 'Follow-up Call',
        startTime: followupDate,
        endTime: new Date(new Date(followupDate).getTime() + 30 * 60000), // 30 min
        type: 'call',
        status: 'scheduled'
      })
    });
  }

  async updateCustomerStage(customerId, stage, notes) {
    const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'];
    
    if (!stages.includes(stage)) {
      throw new Error(`Invalid stage: ${stage}`);
    }

    // Update customer
    const updateResponse = await this.client.makeRequest(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify({
        stage,
        lastContactDate: new Date().toISOString()
      })
    });

    // Add stage change interaction
    await this.addInteraction(customerId, {
      type: 'stage_change',
      subject: `Stage Updated to ${stage}`,
      content: notes || `Customer moved to ${stage} stage`,
      date: new Date().toISOString()
    });

    return updateResponse.json();
  }

  async getSalesMetrics(startDate, endDate) {
    const params = new URLSearchParams({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      includeMetrics: 'true'
    });

    const response = await this.client.makeRequest(`/analytics/sales?${params}`);
    return response.json();
  }
}

// Usage example
const crm = new CRMManager(client);

// Create a new lead
const newCustomer = await crm.createCustomerWithHistory({
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane.smith@techcorp.com',
  phone: '+1-555-0123',
  company: 'TechCorp Inc',
  industry: 'Technology',
  source: 'website_form',
  tags: ['enterprise', 'hot_lead'],
  customFields: {
    companySize: '100-500',
    budget: '$50,000',
    timeline: 'Q1 2024'
  },
  scheduleFollowup: true,
  followupDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
});

// Move through sales stages
await crm.updateCustomerStage(newCustomer.id, 'qualified', 'Passed initial screening');
await crm.updateCustomerStage(newCustomer.id, 'proposal', 'Sent detailed proposal');
```

## 📅 Advanced Appointment Scheduling

```javascript
class AppointmentScheduler {
  constructor(apiClient) {
    this.client = apiClient;
  }

  async findAvailableSlots(date, duration = 60, serviceType = null) {
    const params = new URLSearchParams({
      date: date.toISOString().split('T')[0],
      duration: duration.toString()
    });

    if (serviceType) {
      params.append('serviceType', serviceType);
    }

    const response = await this.client.makeRequest(`/appointments/availability?${params}`);
    return response.json();
  }

  async createAppointmentWithReminders(appointmentData) {
    // Create the appointment
    const response = await this.client.makeRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        customerId: appointmentData.customerId,
        title: appointmentData.title,
        description: appointmentData.description,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        location: appointmentData.location,
        serviceType: appointmentData.serviceType,
        assignedTo: appointmentData.assignedTo,
        reminders: [
          { type: 'email', minutesBefore: 24 * 60 }, // 1 day
          { type: 'email', minutesBefore: 60 },      // 1 hour
          { type: 'sms', minutesBefore: 15 }         // 15 minutes
        ]
      })
    });

    const appointment = await response.json();

    if (appointment.success) {
      // Send confirmation email
      await this.sendConfirmationEmail(appointment.data);
      
      // Add to calendar integration if enabled
      await this.syncToExternalCalendar(appointment.data);
    }

    return appointment;
  }

  async sendConfirmationEmail(appointment) {
    return this.client.makeRequest('/notifications/email', {
      method: 'POST',
      body: JSON.stringify({
        to: appointment.customer.email,
        template: 'appointment_confirmation',
        data: {
          customerName: appointment.customer.name,
          appointmentDate: new Date(appointment.startTime).toLocaleDateString(),
          appointmentTime: new Date(appointment.startTime).toLocaleTimeString(),
          location: appointment.location,
          serviceType: appointment.serviceType
        }
      })
    });
  }

  async syncToExternalCalendar(appointment) {
    // Sync to Google Calendar if integration is enabled
    return this.client.makeRequest('/integrations/calendar/sync', {
      method: 'POST',
      body: JSON.stringify({
        appointmentId: appointment.id,
        provider: 'google',
        calendarId: 'primary'
      })
    });
  }

  async rescheduleAppointment(appointmentId, newStartTime, reason) {
    const newEndTime = new Date(new Date(newStartTime).getTime() + 60 * 60 * 1000); // +1 hour

    const response = await this.client.makeRequest(`/appointments/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        startTime: newStartTime,
        endTime: newEndTime,
        rescheduleReason: reason
      })
    });

    const result = await response.json();

    if (result.success) {
      // Send reschedule notification
      await this.client.makeRequest('/notifications/email', {
        method: 'POST',
        body: JSON.stringify({
          to: result.data.customer.email,
          template: 'appointment_rescheduled',
          data: {
            customerName: result.data.customer.name,
            oldDate: new Date(result.data.originalStartTime).toLocaleDateString(),
            newDate: new Date(newStartTime).toLocaleDateString(),
            newTime: new Date(newStartTime).toLocaleTimeString(),
            reason: reason
          }
        })
      });
    }

    return result;
  }
}

// Usage
const scheduler = new AppointmentScheduler(client);

// Find available slots for tomorrow
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const availableSlots = await scheduler.findAvailableSlots(tomorrow, 60, 'consultation');
console.log('Available slots:', availableSlots.data);

// Book an appointment
const appointment = await scheduler.createAppointmentWithReminders({
  customerId: 'customer_123',
  title: 'Product Consultation',
  description: 'Discuss product requirements and pricing',
  startTime: availableSlots.data[0].startTime,
  endTime: availableSlots.data[0].endTime,
  location: 'Conference Room A',
  serviceType: 'consultation',
  assignedTo: 'user_456'
});
```

## 🔗 Integration Examples

### Google Calendar Bidirectional Sync

```javascript
class CalendarIntegration {
  constructor(apiClient) {
    this.client = apiClient;
  }

  async connectGoogleCalendar(authCode) {
    const response = await this.client.makeRequest('/integrations/oauth/google/callback', {
      method: 'POST',
      body: JSON.stringify({
        code: authCode,
        scopes: ['calendar'],
        redirectUri: window.location.origin + '/integrations/callback'
      })
    });

    return response.json();
  }

  async syncAppointmentsToGoogle() {
    // Get all appointments for the next 30 days
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const appointmentsResponse = await this.client.makeRequest(
      `/appointments?startDate=${new Date().toISOString()}&endDate=${endDate.toISOString()}`
    );
    
    const appointments = await appointmentsResponse.json();

    const syncResults = [];

    for (const appointment of appointments.data) {
      try {
        const syncResponse = await this.client.makeRequest('/integrations/calendar/events', {
          method: 'POST',
          body: JSON.stringify({
            provider: 'google',
            calendarId: 'primary',
            event: {
              summary: appointment.title,
              description: appointment.description,
              start: { dateTime: appointment.startTime },
              end: { dateTime: appointment.endTime },
              location: appointment.location,
              attendees: [
                { email: appointment.customer.email, displayName: appointment.customer.name }
              ]
            },
            attendanceXId: appointment.id
          })
        });

        const result = await syncResponse.json();
        syncResults.push({ appointmentId: appointment.id, success: result.success });
      } catch (error) {
        syncResults.push({ appointmentId: appointment.id, success: false, error: error.message });
      }
    }

    return syncResults;
  }

  async handleWebhook(webhookData) {
    // Handle incoming webhook from Google Calendar
    switch (webhookData.eventType) {
      case 'event.created':
        return this.handleExternalEventCreated(webhookData.event);
      case 'event.updated':
        return this.handleExternalEventUpdated(webhookData.event);
      case 'event.deleted':
        return this.handleExternalEventDeleted(webhookData.event);
      default:
        console.log('Unhandled webhook event:', webhookData.eventType);
    }
  }

  async handleExternalEventCreated(event) {
    // Create corresponding appointment in AttendanceX
    const response = await this.client.makeRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        title: event.summary,
        description: event.description,
        startTime: event.start.dateTime,
        endTime: event.end.dateTime,
        location: event.location,
        externalId: event.id,
        source: 'google_calendar'
      })
    });

    return response.json();
  }
}

// Usage
const calendarIntegration = new CalendarIntegration(client);

// Connect Google Calendar (after OAuth flow)
const connection = await calendarIntegration.connectGoogleCalendar(authorizationCode);

// Sync existing appointments
const syncResults = await calendarIntegration.syncAppointmentsToGoogle();
console.log('Sync results:', syncResults);
```

## 📊 Real-time Analytics Examples

```javascript
class RealTimeAnalytics {
  constructor(apiClient) {
    this.client = apiClient;
    this.websocket = null;
    this.listeners = new Map();
  }

  connect() {
    const wsUrl = 'ws://localhost:5001/ws/analytics';
    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      console.log('Connected to real-time analytics');
      this.authenticate();
    };

    this.websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.websocket.onclose = () => {
      console.log('Disconnected from analytics');
      // Reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };
  }

  authenticate() {
    const token = localStorage.getItem('accessToken');
    this.websocket.send(JSON.stringify({
      type: 'auth',
      token: token
    }));
  }

  subscribe(metric, callback) {
    if (!this.listeners.has(metric)) {
      this.listeners.set(metric, []);
    }
    this.listeners.get(metric).push(callback);

    // Subscribe to metric updates
    this.websocket.send(JSON.stringify({
      type: 'subscribe',
      metric: metric
    }));
  }

  handleMessage(data) {
    if (data.type === 'metric_update') {
      const callbacks = this.listeners.get(data.metric) || [];
      callbacks.forEach(callback => callback(data.value, data.timestamp));
    }
  }

  async getDashboardData() {
    const response = await this.client.makeRequest('/analytics/dashboard');
    const data = await response.json();

    return {
      attendance: {
        present: data.data.attendance.present,
        total: data.data.attendance.total,
        rate: (data.data.attendance.present / data.data.attendance.total * 100).toFixed(1)
      },
      sales: {
        today: data.data.sales.today,
        thisMonth: data.data.sales.thisMonth,
        growth: data.data.sales.growth
      },
      customers: {
        total: data.data.customers.total,
        new: data.data.customers.new,
        active: data.data.customers.active
      }
    };
  }
}

// Usage
const analytics = new RealTimeAnalytics(client);

// Connect to real-time updates
analytics.connect();

// Subscribe to attendance updates
analytics.subscribe('attendance.current', (value, timestamp) => {
  document.getElementById('attendance-count').textContent = value;
  console.log(`Attendance updated: ${value} at ${new Date(timestamp)}`);
});

// Subscribe to sales updates
analytics.subscribe('sales.today', (value, timestamp) => {
  document.getElementById('sales-today').textContent = `$${value.toLocaleString()}`;
});

// Get initial dashboard data
const dashboardData = await analytics.getDashboardData();
console.log('Dashboard data:', dashboardData);
```

These examples demonstrate real-world usage patterns and best practices for integrating with the AttendanceX API. Each example includes error handling, proper authentication, and follows the API conventions outlined in the main documentation.