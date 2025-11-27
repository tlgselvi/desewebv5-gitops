/**
 * HR Types
 * 
 * Type definitions for human resources and payroll operations.
 */

// =============================================================================
// EMPLOYEE TYPES
// =============================================================================

/**
 * Employee status
 */
export type EmployeeStatus = 'active' | 'terminated' | 'on_leave' | 'suspended';

/**
 * Employment type
 */
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';

/**
 * Employee record
 */
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  tckn: string;
  email: string;
  phone?: string;
  title?: string;
  departmentId?: string;
  departmentName?: string;
  managerId?: string;
  startDate: string;
  endDate?: string;
  salaryAmount: number;
  salaryCurrency: string;
  employmentType?: EmploymentType;
  status: EmployeeStatus;
  avatar?: string;
  address?: string;
  emergencyContact?: string;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create employee payload
 */
export interface CreateEmployeeDTO {
  firstName: string;
  lastName: string;
  tckn: string;
  email: string;
  phone?: string;
  title?: string;
  departmentId?: string;
  startDate: string;
  salaryAmount: number;
  salaryCurrency?: string;
  employmentType?: EmploymentType;
}

/**
 * Update employee payload
 */
export interface UpdateEmployeeDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  departmentId?: string;
  salaryAmount?: number;
  salaryCurrency?: string;
  status?: EmployeeStatus;
}

// =============================================================================
// DEPARTMENT TYPES
// =============================================================================

/**
 * Department record
 */
export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  managerId?: string;
  parentId?: string;
  employeeCount?: number;
  organizationId: string;
}

// =============================================================================
// PAYROLL TYPES
// =============================================================================

/**
 * Payroll status
 */
export type PayrollStatus = 'draft' | 'calculated' | 'approved' | 'paid';

/**
 * Payroll record
 */
export interface Payroll {
  id: string;
  employeeId: string;
  employeeName?: string;
  period: string; // YYYY-MM
  grossSalary: number;
  netSalary: number;
  taxAmount: number;
  sgkEmployee: number;
  sgkEmployer: number;
  bonus?: number;
  overtimePay?: number;
  deductions?: number;
  status: PayrollStatus;
  paymentDate?: string;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create payroll payload
 */
export interface CreatePayrollDTO {
  employeeId: string;
  period: string; // YYYY-MM
  bonus?: number;
  overtimePay?: number;
  deductions?: number;
}

/**
 * Payroll summary for a period
 */
export interface PayrollSummary {
  period: string;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalSgk: number;
  employeeCount: number;
}

// =============================================================================
// LEAVE TYPES
// =============================================================================

/**
 * Leave type
 */
export type LeaveType = 
  | 'annual'
  | 'sick'
  | 'maternity'
  | 'paternity'
  | 'unpaid'
  | 'other';

/**
 * Leave status
 */
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * Leave request
 */
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
}

// =============================================================================
// ATTENDANCE TYPES
// =============================================================================

/**
 * Attendance record
 */
export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  overtime?: number;
  status: 'present' | 'absent' | 'late' | 'half_day';
  notes?: string;
}

