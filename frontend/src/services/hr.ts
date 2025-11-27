/**
 * HR Service
 * 
 * Handles all HR and payroll API operations.
 * Errors are properly propagated to allow React Query to handle them.
 */

import { authenticatedGet, authenticatedPost, authenticatedPut } from "@/lib/api";
import { logger } from "@/lib/logger";
import type {
  Employee,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  Department,
  Payroll,
  CreatePayrollDTO,
  PayrollSummary,
  EmployeeStatus,
} from "@/types/hr";

// Re-export types for backward compatibility
export type {
  Employee,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  Department,
  Payroll,
  CreatePayrollDTO,
  PayrollSummary,
  EmployeeStatus,
} from "@/types/hr";

export interface HRPayroll {
  id: string;
  employeeId: string;
  period: string;
  grossSalary: number;
  netSalary: number;
  sgkWorkerShare: number;
  incomeTax: number;
  status: 'draft' | 'approved' | 'paid';
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  managerId?: string;
}

// =============================================================================
// SERVICE
// =============================================================================

export const hrService = {
  /**
   * Get all employees
   * @throws {ApiError} When request fails
   */
  async getEmployees(filters?: { status?: string; departmentId?: string }): Promise<Employee[]> {
    try {
      let url = "/api/v1/hr/employees";
      
      if (filters) {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.departmentId) params.append('departmentId', filters.departmentId);
        
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }
      
      return await authenticatedGet<Employee[]>(url);
    } catch (error) {
      logger.error("Failed to fetch employees", error, { filters });
      throw error;
    }
  },

  /**
   * Get a single employee by ID
   * @throws {ApiError} When request fails or employee not found
   */
  async getEmployee(employeeId: string): Promise<Employee> {
    try {
      return await authenticatedGet<Employee>(`/api/v1/hr/employees/${employeeId}`);
    } catch (error) {
      logger.error("Failed to fetch employee", error, { employeeId });
      throw error;
    }
  },

  /**
   * Create a new employee
   * @throws {ApiError} When request fails or validation error
   */
  async createEmployee(data: CreateEmployeeDTO): Promise<Employee> {
    try {
      return await authenticatedPost<Employee>("/api/v1/hr/employees", data);
    } catch (error) {
      logger.error("Failed to create employee", error, { data });
      throw error;
    }
  },

  /**
   * Update an employee
   * @throws {ApiError} When request fails or validation error
   */
  async updateEmployee(employeeId: string, data: Partial<CreateEmployeeDTO>): Promise<Employee> {
    try {
      return await authenticatedPut<Employee>(`/api/v1/hr/employees/${employeeId}`, data);
    } catch (error) {
      logger.error("Failed to update employee", error, { employeeId, data });
      throw error;
    }
  },

  /**
   * Create payroll for an employee
   * @throws {ApiError} When request fails or validation error
   */
  async createPayroll(data: CreatePayrollDTO): Promise<Payroll> {
    try {
      return await authenticatedPost<Payroll>("/api/v1/hr/payrolls", data);
    } catch (error) {
      logger.error("Failed to create payroll", error, { data });
      throw error;
    }
  },

  /**
   * Get payrolls, optionally filtered by period
   * @throws {ApiError} When request fails
   */
  async getPayrolls(period?: string): Promise<Payroll[]> {
    try {
      const url = period ? `/api/v1/hr/payrolls?period=${period}` : "/api/v1/hr/payrolls";
      return await authenticatedGet<Payroll[]>(url);
    } catch (error) {
      logger.error("Failed to fetch payrolls", error, { period });
      throw error;
    }
  },

  /**
   * Get all departments
   * @throws {ApiError} When request fails
   */
  async getDepartments(): Promise<Department[]> {
    try {
      return await authenticatedGet<Department[]>("/api/v1/hr/departments");
    } catch (error) {
      logger.error("Failed to fetch departments", error);
      throw error;
    }
  },
};

export default hrService;
