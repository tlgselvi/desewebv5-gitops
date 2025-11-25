import { authenticatedGet, authenticatedPost } from "@/lib/api";

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  tckn: string;
  email: string;
  phone?: string;
  title?: string;
  departmentId?: string;
  startDate: string;
  salaryAmount: number;
  salaryCurrency: string;
  status: 'active' | 'terminated' | 'on_leave';
}

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
}

export interface CreatePayrollDTO {
  employeeId: string;
  period: string; // YYYY-MM
  bonus?: number;
  overtimePay?: number;
}

export interface Payroll {
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

export const hrService = {
  async getEmployees(): Promise<Employee[]> {
    return await authenticatedGet<Employee[]>("/api/v1/hr/employees");
  },

  async createEmployee(data: CreateEmployeeDTO): Promise<Employee> {
    return await authenticatedPost<Employee>("/api/v1/hr/employees", data);
  },

  async createPayroll(data: CreatePayrollDTO): Promise<Payroll> {
    return await authenticatedPost<Payroll>("/api/v1/hr/payrolls", data);
  },

  async getPayrolls(period?: string): Promise<Payroll[]> {
    const url = period ? `/api/v1/hr/payrolls?period=${period}` : "/api/v1/hr/payrolls";
    return await authenticatedGet<Payroll[]>(url);
  }
};

