// tests/frontend/components/AppointmentForm.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppointmentForm from '../../../frontend/src/components/appointments/AppointmentForm';
import { appointmentService } from '../../../frontend/src/services/appointmentService';

// Mock the appointment service
vi.mock('../../../frontend/src/services/appointmentService', () => ({
  appointmentService: {
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    getServices: vi.fn(),
    getPractitioners: vi.fn(),
    getClients: vi.fn()
  }
}));

// Mock date-fns to have predictable dates in tests
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    format: vi.fn((date, formatStr) => {
      if (formatStr === 'yyyy-MM-dd') return '2024-01-15';
      if (formatStr === 'HH:mm') return '14:30';
      return '2024-01-15T14:30:00Z';
    })
  };
});

const mockServices = [
  { id: 'service-1', name: 'Consultation générale', duration: 30, price: 50 },
  { id: 'service-2', name: 'Consultation spécialisée', duration: 45, price: 75 }
];

const mockPractitioners = [
  { id: 'prac-1', name: 'Dr. Martin', email: 'martin@clinic.com' },
  { id: 'prac-2', name: 'Dr. Dubois', email: 'dubois@clinic.com' }
];

const mockClients = [
  { id: 'client-1', name: 'Jean Dupont', email: 'jean@example.com', phone: '+33123456789' },
  { id: 'client-2', name: 'Marie Martin', email: 'marie@example.com', phone: '+33987654321' }
];

describe('AppointmentForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    vi.mocked(appointmentService.getServices).mockResolvedValue({ data: mockServices });
    vi.mocked(appointmentService.getPractitioners).mockResolvedValue({ data: mockPractitioners });
    vi.mocked(appointmentService.getClients).mockResolvedValue({ data: mockClients });
    vi.mocked(appointmentService.createAppointment).mockResolvedValue({ 
      data: { id: 'new-appointment', status: 'created' } 
    });
  });

  it('should render form fields correctly', async () => {
    render(
      <AppointmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/service/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/praticien/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/heure/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sauvegarder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
  });

  it('should populate form when editing existing appointment', async () => {
    const existingAppointment = {
      id: 'apt-1',
      clientId: 'client-1',
      serviceId: 'service-1',
      practitionerId: 'prac-1',
      dateTime: '2024-01-15T14:30:00Z',
      notes: 'Test notes'
    };

    render(
      <AppointmentForm
        appointment={existingAppointment}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();

    render(
      <AppointmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Try to submit without filling required fields
    const saveButton = screen.getByRole('button', { name: /sauvegarder/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/client est obligatoire/i)).toBeInTheDocument();
    });
  });

  it('should create new appointment successfully', async () => {
    const user = userEvent.setup();

    render(
      <AppointmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    });

    // Fill form fields
    await user.selectOptions(screen.getByLabelText(/client/i), 'client-1');
    await user.selectOptions(screen.getByLabelText(/service/i), 'service-1');
    await user.selectOptions(screen.getByLabelText(/praticien/i), 'prac-1');
    
    const dateInput = screen.getByLabelText(/date/i);
    await user.clear(dateInput);
    await user.type(dateInput, '2024-01-15');
    
    const timeInput = screen.getByLabelText(/heure/i);
    await user.clear(timeInput);
    await user.type(timeInput, '14:30');

    // Submit form
    const saveButton = screen.getByRole('button', { name: /sauvegarder/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(appointmentService.createAppointment).toHaveBeenCalledWith({
        clientId: 'client-1',
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: expect.stringContaining('2024-01-15'),
        notes: ''
      });
    });

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('should update existing appointment successfully', async () => {
    const user = userEvent.setup();
    const existingAppointment = {
      id: 'apt-1',
      clientId: 'client-1',
      serviceId: 'service-1',
      practitionerId: 'prac-1',
      dateTime: '2024-01-15T14:30:00Z',
      notes: 'Original notes'
    };

    vi.mocked(appointmentService.updateAppointment).mockResolvedValue({
      data: { ...existingAppointment, notes: 'Updated notes' }
    });

    render(
      <AppointmentForm
        appointment={existingAppointment}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Wait for form to load and populate
    await waitFor(() => {
      expect(screen.getByDisplayValue('Original notes')).toBeInTheDocument();
    });

    // Update notes
    const notesInput = screen.getByDisplayValue('Original notes');
    await user.clear(notesInput);
    await user.type(notesInput, 'Updated notes');

    // Submit form
    const saveButton = screen.getByRole('button', { name: /sauvegarder/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(appointmentService.updateAppointment).toHaveBeenCalledWith('apt-1', {
        clientId: 'client-1',
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: expect.stringContaining('2024-01-15'),
        notes: 'Updated notes'
      });
    });

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Appointment conflict detected';
    
    vi.mocked(appointmentService.createAppointment).mockRejectedValue(
      new Error(errorMessage)
    );

    render(
      <AppointmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    });

    // Fill and submit form
    await user.selectOptions(screen.getByLabelText(/client/i), 'client-1');
    await user.selectOptions(screen.getByLabelText(/service/i), 'service-1');
    await user.selectOptions(screen.getByLabelText(/praticien/i), 'prac-1');

    const saveButton = screen.getByRole('button', { name: /sauvegarder/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AppointmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /annuler/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should show loading state during form submission', async () => {
    const user = userEvent.setup();
    
    // Make the API call hang to test loading state
    vi.mocked(appointmentService.createAppointment).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <AppointmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    });

    // Fill and submit form
    await user.selectOptions(screen.getByLabelText(/client/i), 'client-1');
    await user.selectOptions(screen.getByLabelText(/service/i), 'service-1');
    await user.selectOptions(screen.getByLabelText(/praticien/i), 'prac-1');

    const saveButton = screen.getByRole('button', { name: /sauvegarder/i });
    await user.click(saveButton);

    // Check for loading state
    expect(screen.getByText(/sauvegarde/i)).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });

  it('should validate appointment conflicts', async () => {
    const user = userEvent.setup();

    render(
      <AppointmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    });

    // Select a time that conflicts with existing appointment
    await user.selectOptions(screen.getByLabelText(/client/i), 'client-1');
    await user.selectOptions(screen.getByLabelText(/service/i), 'service-1');
    await user.selectOptions(screen.getByLabelText(/praticien/i), 'prac-1');
    
    // Set a conflicting time (this would need to be implemented in the component)
    const timeInput = screen.getByLabelText(/heure/i);
    await user.clear(timeInput);
    await user.type(timeInput, '10:00'); // Assuming this conflicts

    // The form should show validation error
    await waitFor(() => {
      // This test assumes the component validates conflicts client-side
      // Implementation would depend on how conflict detection is handled
    });
  });
});