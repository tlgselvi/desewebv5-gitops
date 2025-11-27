import { Router, type Router as ExpressRouter } from 'express';
import * as controller from './controller.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { requireModulePermission } from '@/middleware/rbac.js';
import { setRLSContextMiddleware } from '@/middleware/rls.js';

const router: ExpressRouter = Router();

/**
 * @swagger
 * tags:
 *   name: HR
 *   description: Human Resources Management (HRBot - Departments, Employees, Payroll)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Department:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organizationId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         managerId:
 *           type: string
 *           format: uuid
 *     CreateDepartmentDTO:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         managerId:
 *           type: string
 *           format: uuid
 *     Employee:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organizationId:
 *           type: string
 *           format: uuid
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *         departmentId:
 *           type: string
 *           format: uuid
 *         position:
 *           type: string
 *         hireDate:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [active, on_leave, terminated]
 *     CreateEmployeeDTO:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - departmentId
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         departmentId:
 *           type: string
 *           format: uuid
 *         position:
 *           type: string
 *         hireDate:
 *           type: string
 *           format: date
 *     Payroll:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organizationId:
 *           type: string
 *           format: uuid
 *         employeeId:
 *           type: string
 *           format: uuid
 *         period:
 *           type: string
 *         grossSalary:
 *           type: number
 *         netSalary:
 *           type: number
 *         deductions:
 *           type: number
 *         status:
 *           type: string
 *           enum: [draft, processed, paid]
 *     CreatePayrollDTO:
 *       type: object
 *       required:
 *         - employeeId
 *         - period
 *         - grossSalary
 *       properties:
 *         employeeId:
 *           type: string
 *           format: uuid
 *         period:
 *           type: string
 *         grossSalary:
 *           type: number
 *         deductions:
 *           type: number
 */

router.use(authenticate);
router.use(setRLSContextMiddleware); // Set RLS context for tenant isolation
// Module-based RBAC: HR modülü için read permission gerekli
router.use(requireModulePermission('hr', 'read'));

/**
 * @swagger
 * /api/v1/hr/departments:
 *   post:
 *     summary: Create a new department
 *     tags: [HR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDepartmentDTO'
 *     responses:
 *       201:
 *         description: Department created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// Departments
router.post('/departments', requireModulePermission('hr', 'write'), controller.createDepartment);

/**
 * @swagger
 * /api/v1/hr/departments:
 *   get:
 *     summary: Get all departments
 *     tags: [HR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of departments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Department'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/departments', controller.getDepartments);

/**
 * @swagger
 * /api/v1/hr/employees:
 *   post:
 *     summary: Create a new employee
 *     tags: [HR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEmployeeDTO'
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// Employees
router.post('/employees', requireModulePermission('hr', 'write'), controller.createEmployee);

/**
 * @swagger
 * /api/v1/hr/employees:
 *   get:
 *     summary: Get all employees
 *     tags: [HR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by department ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, on_leave, terminated]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Employee'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/employees', controller.getEmployees);

/**
 * @swagger
 * /api/v1/hr/payrolls:
 *   post:
 *     summary: Create a new payroll record
 *     tags: [HR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePayrollDTO'
 *     responses:
 *       201:
 *         description: Payroll created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payroll'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// Payrolls
router.post('/payrolls', requireModulePermission('hr', 'write'), controller.createPayroll);

/**
 * @swagger
 * /api/v1/hr/payrolls:
 *   get:
 *     summary: Get all payroll records
 *     tags: [HR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by employee ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Filter by period (e.g., "2024-01")
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, processed, paid]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of payroll records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payroll'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/payrolls', controller.getPayrolls);

export default router;

