import { Request, Response, NextFunction } from 'express';
import { hrService } from './service.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  // @ts-ignore - user attached by middleware
  const organizationId = (req.user as any)?.organizationId || 'default-org-id';
  
  const department = await hrService.createDepartment(organizationId, name);
  res.status(201).json(department);
});

export const getDepartments = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const organizationId = (req.user as any)?.organizationId || 'default-org-id';
  const departments = await hrService.getDepartments(organizationId);
  res.json(departments);
});

export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const organizationId = req.user?.organizationId;
  const employee = await hrService.createEmployee({ ...req.body, organizationId });
  res.status(201).json(employee);
});

export const getEmployees = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const organizationId = (req.user as any)?.organizationId || 'default-org-id';
  const employees = await hrService.getEmployees(organizationId);
  res.json(employees);
});

export const createPayroll = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const organizationId = req.user?.organizationId;
  const payroll = await hrService.createPayroll({ ...req.body, organizationId });
  res.status(201).json(payroll);
});

export const getPayrolls = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const organizationId = (req.user as any)?.organizationId || 'default-org-id';
  const { period } = req.query;
  const payrolls = await hrService.getPayrolls(organizationId, period as string);
  res.json(payrolls);
});

