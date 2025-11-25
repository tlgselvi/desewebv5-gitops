import { db } from '@/db/index.js';
import { employees, departments, payrolls } from '@/db/schema/hr.js';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface CreateEmployeeDTO {
  organizationId: string;
  departmentId?: string;
  firstName: string;
  lastName: string;
  tckn: string;
  email: string;
  phone?: string;
  title?: string;
  startDate: string; // YYYY-MM-DD
  salaryAmount: number;
  salaryCurrency?: string;
}

interface CreatePayrollDTO {
  organizationId: string;
  employeeId: string;
  period: string; // YYYY-MM
  bonus?: number;
  overtimePay?: number;
}

export class HRService {
  
  // --- DEPARTMENTS ---

  async createDepartment(organizationId: string, name: string) {
    const [dept] = await db.insert(departments).values({
      organizationId,
      name
    }).returning();
    return dept;
  }

  async getDepartments(organizationId: string) {
    return await db.select().from(departments).where(eq(departments.organizationId, organizationId));
  }

  // --- EMPLOYEES ---

  async createEmployee(data: CreateEmployeeDTO) {
    const [emp] = await db.insert(employees).values({
      id: uuidv4(),
      organizationId: data.organizationId,
      departmentId: data.departmentId,
      firstName: data.firstName,
      lastName: data.lastName,
      tckn: data.tckn,
      email: data.email,
      phone: data.phone,
      title: data.title,
      startDate: data.startDate,
      salaryAmount: data.salaryAmount.toString(),
      salaryCurrency: data.salaryCurrency || 'TRY'
    }).returning();
    return emp;
  }

  async getEmployees(organizationId: string) {
    return await db.select().from(employees).where(eq(employees.organizationId, organizationId));
  }

  async getEmployee(id: string) {
    const [emp] = await db.select().from(employees).where(eq(employees.id, id));
    return emp;
  }

  // --- PAYROLL & SALARY CALCULATION (TR COMPLIANCE) ---

  /**
   * Calculate Net Salary from Gross Salary (Simplified TR Logic)
   * Not: Gerçek hesaplamada kümülatif vergi matrahı gerekir.
   * Bu MVP sürümü sadece %15 ilk dilim vergisini baz alır.
   */
  calculateSalary(grossAmount: number) {
    const sgkWorkerRate = 0.14;
    const unemploymentWorkerRate = 0.01;
    const stampTaxRate = 0.00759;
    const incomeTaxRate = 0.15; // 1. Dilim

    const sgkWorkerShare = grossAmount * sgkWorkerRate;
    const unemploymentWorkerShare = grossAmount * unemploymentWorkerRate;
    
    const incomeTaxBase = grossAmount - (sgkWorkerShare + unemploymentWorkerShare);
    const incomeTax = incomeTaxBase * incomeTaxRate;
    
    const stampTax = grossAmount * stampTaxRate;
    
    const totalDeductions = sgkWorkerShare + unemploymentWorkerShare + incomeTax + stampTax;
    const netSalary = grossAmount - totalDeductions;

    // Employer Costs
    const sgkEmployerRate = 0.205; // 5 Puanlık indirim ile (%15.5 + %5) - Normalde %20.5 alınır teşviksiz
    const unemploymentEmployerRate = 0.02;

    const sgkEmployerShare = grossAmount * sgkEmployerRate;
    const unemploymentEmployerShare = grossAmount * unemploymentEmployerRate;

    return {
      grossSalary: grossAmount,
      sgkWorkerShare,
      unemploymentWorkerShare,
      incomeTax,
      stampTax,
      netSalary,
      sgkEmployerShare,
      unemploymentEmployerShare
    };
  }

  async createPayroll(data: CreatePayrollDTO) {
    // 1. Çalışanı bul
    const emp = await this.getEmployee(data.employeeId);
    if (!emp) throw new Error('Employee not found');

    const grossSalary = parseFloat(emp.salaryAmount);
    const bonus = data.bonus || 0;
    const overtime = data.overtimePay || 0;
    
    const totalGross = grossSalary + bonus + overtime;

    // 2. Maaş Hesapla
    const calc = this.calculateSalary(totalGross);

    // 3. Bordro Kaydı Oluştur
    const [payroll] = await db.insert(payrolls).values({
      id: uuidv4(),
      organizationId: data.organizationId,
      employeeId: data.employeeId,
      period: data.period,
      
      grossSalary: calc.grossSalary.toFixed(2),
      bonus: bonus.toFixed(2),
      overtimePay: overtime.toFixed(2),
      
      sgkWorkerShare: calc.sgkWorkerShare.toFixed(2),
      unemploymentWorkerShare: calc.unemploymentWorkerShare.toFixed(2),
      incomeTax: calc.incomeTax.toFixed(2),
      stampTax: calc.stampTax.toFixed(2),
      
      sgkEmployerShare: calc.sgkEmployerShare.toFixed(2),
      unemploymentEmployerShare: calc.unemploymentEmployerShare.toFixed(2),
      
      netSalary: calc.netSalary.toFixed(2),
      status: 'draft'
    }).returning();

    return payroll;
  }

  async getPayrolls(organizationId: string, period?: string) {
    let query = db.select().from(payrolls).where(eq(payrolls.organizationId, organizationId));
    
    if (period) {
      query = db.select().from(payrolls).where(and(
        eq(payrolls.organizationId, organizationId),
        eq(payrolls.period, period)
      ));
    }

    return await query.orderBy(desc(payrolls.createdAt));
  }
}

export const hrService = new HRService();

