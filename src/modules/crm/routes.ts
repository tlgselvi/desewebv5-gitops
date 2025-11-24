import { Router } from 'express';
import { crmController } from './controller.js';
import { authenticate } from '@/middleware/auth.js';

const router = Router();

router.use(authenticate);

// Deals
router.get('/kanban', (req, res) => crmController.getKanban(req, res));
router.post('/deals', (req, res) => crmController.createDeal(req, res));
router.put('/deals/:id/stage', (req, res) => crmController.moveDeal(req, res));

// Activities
router.post('/activities', (req, res) => crmController.createActivity(req, res));

// WhatsApp
router.post('/whatsapp/send', (req, res) => crmController.sendWhatsApp(req, res));

// Contacts
// ... contacts controller eklenebilir ...

export const crmRoutes = router;
