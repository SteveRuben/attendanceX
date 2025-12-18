import { DocumentData, DocumentSnapshot } from 'firebase-admin/firestore';
import { BaseModel, ValidationError } from './base.model';
import { Employee, LeaveType } from '../common/types';
import { DEFAULT_LEAVE_BALANCES } from '../common/constants';

export class EmployeeModel extends BaseModel<Employee> {
  constructor(data: Partial<Employee>) {
    // Initialiser les soldes de congés par défaut si non fournis
    const employeeData = {
      ...data,
      leaveBalances: data.leaveBalances || { ...DEFAULT_LEAVE_BALANCES },
      isActive: data.isActive !== undefined ? data.isActive : true,
      requiresGeolocation: data.requiresGeolocation !== undefined ? data.requiresGeolocation : false,
      locationRadius: data.locationRadius || 100
    };

    super(employeeData);
  }

  // Getters spécifiques
  get userId(): string {
    return this.data.userId;
  }

  get employeeId(): string {
    return this.data.employeeId;
  }

  get tenantId(): string {
    return this.data.tenantId;
  }

  get departmentId(): string | undefined {
    return this.data.departmentId;
  }

  get position(): string {
    return this.data.position;
  }

  get hireDate(): Date {
    return this.data.hireDate;
  }

  get workScheduleId(): string | undefined {
    return this.data.workScheduleId;
  }

  get isActive(): boolean {
    return this.data.isActive;
  }

  get workEmail(): string | undefined {
    return this.data.workEmail;
  }

  get workPhone(): string | undefined {
    return this.data.workPhone;
  }

  get requiresGeolocation(): boolean {
    return this.data.requiresGeolocation;
  }

  get locationRadius(): number | undefined {
    return this.data.locationRadius;
  }

  get leaveBalances(): Record<LeaveType, number> {
    return this.data.leaveBalances;
  }

  get allowedLocations() {
    return this.data.allowedLocations;
  }

  // Méthodes de gestion des soldes de congés
  public getLeaveBalance(leaveType: LeaveType): number {
    return this.data.leaveBalances[leaveType] || 0;
  }

  public updateLeaveBalance(leaveType: LeaveType, amount: number): void {
    if (!this.data.leaveBalances) {
      this.data.leaveBalances = { ...DEFAULT_LEAVE_BALANCES };
    }
    
    const currentBalance = this.data.leaveBalances[leaveType] || 0;
    const newBalance = currentBalance + amount;
    
    if (newBalance < 0) {
      throw new ValidationError(`Insufficient leave balance for ${leaveType}. Current: ${currentBalance}, Requested: ${Math.abs(amount)}`);
    }
    
    this.data.leaveBalances[leaveType] = newBalance;
    this.updateTimestamp();
  }

  public deductLeaveBalance(leaveType: LeaveType, days: number): void {
    this.updateLeaveBalance(leaveType, -days);
  }

  public addLeaveBalance(leaveType: LeaveType, days: number): void {
    this.updateLeaveBalance(leaveType, days);
  }

  public resetLeaveBalances(newBalances?: Partial<Record<LeaveType, number>>): void {
    this.data.leaveBalances = {
      ...DEFAULT_LEAVE_BALANCES,
      ...newBalances
    };
    this.updateTimestamp();
  }

  // Méthodes de gestion des horaires
  public assignWorkSchedule(scheduleId: string): void {
    this.data.workScheduleId = scheduleId;
    this.updateTimestamp();
  }

  public removeWorkSchedule(): void {
    this.data.workScheduleId = undefined;
    this.updateTimestamp();
  }

  // Méthodes de gestion de la géolocalisation
  public enableGeolocation(radius?: number): void {
    this.data.requiresGeolocation = true;
    if (radius !== undefined) {
      this.data.locationRadius = radius;
    }
    this.updateTimestamp();
  }

  public disableGeolocation(): void {
    this.data.requiresGeolocation = false;
    this.updateTimestamp();
  }

  public updateLocationSettings(settings: {
    requiresGeolocation?: boolean;
    locationRadius?: number;
    allowedLocations?: Array<{ latitude: number; longitude: number; accuracy?: number; timestamp?: Date }>;
  }): void {
    if (settings.requiresGeolocation !== undefined) {
      this.data.requiresGeolocation = settings.requiresGeolocation;
    }
    if (settings.locationRadius !== undefined) {
      this.data.locationRadius = settings.locationRadius;
    }
    if (settings.allowedLocations !== undefined) {
      this.data.allowedLocations = settings.allowedLocations;
    }
    this.updateTimestamp();
  }

  // Méthodes de statut
  public activate(): void {
    this.data.isActive = true;
    this.updateTimestamp();
  }

  public deactivate(): void {
    this.data.isActive = false;
    this.updateTimestamp();
  }

  public updateContactInfo(workEmail?: string, workPhone?: string): void {
    if (workEmail !== undefined) {
      if (workEmail && !BaseModel.validateEmail(workEmail)) {
        throw new ValidationError('Invalid work email format');
      }
      this.data.workEmail = workEmail;
    }
    
    if (workPhone !== undefined) {
      if (workPhone && !BaseModel.validatePhoneNumber(workPhone)) {
        throw new ValidationError('Invalid work phone format');
      }
      this.data.workPhone = workPhone;
    }
    
    this.updateTimestamp();
  }

  // Validation
  public async validate(): Promise<boolean> {
    try {
      // Validation des champs requis
      BaseModel.validateRequired(this.data, [
        'userId',
        'employeeId',
        'organizationId',
        'position',
        'hireDate',
        'isActive',
        'requiresGeolocation',
        'leaveBalances'
      ]);

      // Validation de l'ID employé (unique dans l'organisation)
      if (!this.data.employeeId || this.data.employeeId.trim().length === 0) {
        throw new ValidationError('Employee ID is required');
      }

      // Validation de la position
      if (!this.data.position || this.data.position.trim().length === 0) {
        throw new ValidationError('Position is required');
      }

      // Validation de la date d'embauche
      if (!BaseModel.validateDate(this.data.hireDate)) {
        throw new ValidationError('Invalid hire date');
      }

      // La date d'embauche ne peut pas être dans le futur
      if (this.data.hireDate > new Date()) {
        throw new ValidationError('Hire date cannot be in the future');
      }

      // Validation de l'email professionnel si fourni
      if (this.data.workEmail && !BaseModel.validateEmail(this.data.workEmail)) {
        throw new ValidationError('Invalid work email format');
      }

      // Validation du téléphone professionnel si fourni
      if (this.data.workPhone && !BaseModel.validatePhoneNumber(this.data.workPhone)) {
        throw new ValidationError('Invalid work phone format');
      }

      // Validation du rayon de localisation
      if (this.data.locationRadius !== undefined) {
        if (this.data.locationRadius < 1 || this.data.locationRadius > 1000) {
          throw new ValidationError('Location radius must be between 1 and 1000 meters');
        }
      }

      // Validation des soldes de congés
      if (this.data.leaveBalances) {
        Object.entries(this.data.leaveBalances).forEach(([leaveType, balance]) => {
          if (typeof balance !== 'number' || balance < 0) {
            throw new ValidationError(`Invalid leave balance for ${leaveType}: must be a non-negative number`);
          }
        });
      }

      // Validation des localisations autorisées
      if (this.data.allowedLocations) {
        this.data.allowedLocations.forEach((location, index) => {
          if (typeof location.latitude !== 'number' || 
              location.latitude < -90 || location.latitude > 90) {
            throw new ValidationError(`Invalid latitude for allowed location ${index + 1}`);
          }
          if (typeof location.longitude !== 'number' || 
              location.longitude < -180 || location.longitude > 180) {
            throw new ValidationError(`Invalid longitude for allowed location ${index + 1}`);
          }
        });
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Employee validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Conversion vers Firestore
  public toFirestore(): DocumentData {
    const data = {
      userId: this.data.userId,
      employeeId: this.data.employeeId,
      tenantId: this.data.tenantId,
      departmentId: this.data.departmentId || null,
      position: this.data.position,
      hireDate: this.data.hireDate,
      workScheduleId: this.data.workScheduleId || null,
      isActive: this.data.isActive,
      workEmail: this.data.workEmail || null,
      workPhone: this.data.workPhone || null,
      allowedLocations: this.data.allowedLocations || null,
      locationRadius: this.data.locationRadius || null,
      requiresGeolocation: this.data.requiresGeolocation,
      leaveBalances: this.data.leaveBalances,
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt,
      createdBy: this.data.createdBy,
      updatedBy: this.data.updatedBy || null
    };

    return this.convertDatesToFirestore(data);
  }

  // Création depuis Firestore
  public static fromFirestore(doc: DocumentSnapshot): EmployeeModel | null {
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    const convertedData = {
      id: doc.id,
      ...data
    };

    // Conversion des timestamps Firestore en dates
    const employeeData = new EmployeeModel({}).convertDatesFromFirestore(convertedData) as Employee;

    return new EmployeeModel(employeeData);
  }

  // Méthodes utilitaires
  public getFullInfo(): {
    employee: Employee;
    totalLeaveBalance: number;
    activeLeaveTypes: LeaveType[];
  } {
    const totalBalance = Object.values(this.data.leaveBalances).reduce((sum, balance) => sum + balance, 0);
    const activeLeaveTypes = Object.entries(this.data.leaveBalances)
      .filter(([, balance]) => balance > 0)
      .map(([leaveType]) => leaveType as LeaveType);

    return {
      employee: this.getData(),
      totalLeaveBalance: totalBalance,
      activeLeaveTypes
    };
  }

  public canTakeLeave(leaveType: LeaveType, days: number): boolean {
    const currentBalance = this.getLeaveBalance(leaveType);
    return currentBalance >= days;
  }

  public getWorkingYears(): number {
    const now = new Date();
    const hireDate = this.data.hireDate;
    const diffTime = Math.abs(now.getTime() - hireDate.getTime());
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
    return diffYears;
  }

  // Méthode pour l'API
  public toAPI(): Partial<Employee> {
    const apiData = super.toAPI();
    return {
      ...apiData,
      workingYears: this.getWorkingYears()
    };
  }
}