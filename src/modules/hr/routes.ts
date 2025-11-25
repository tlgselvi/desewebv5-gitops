import { Router, type Router as ExpressRouter } from 'express';
import * as controller from './controller.js';
import { authenticate, authorize } from '@/middleware/auth.js';

const router: ExpressRouter = Router();

router.use(authenticate);

// Departments
router.post('/departments', authorize(['admin', 'hr']), controller.createDepartment);
router.get('/departments', authorize(['admin', 'hr']), controller.getDepartments);

// Employees
router.post('/employees', authorize(['admin', 'hr']), controller.createEmployee);
router.get('/employees', authorize(['admin', 'hr']), controller.getEmployees);

// Payrolls
router.post('/payrolls', authorize(['admin', 'hr']), controller.createPayroll);
router.get('/payrolls', authorize(['admin', 'hr']), controller.getPayrolls);

export default router;

