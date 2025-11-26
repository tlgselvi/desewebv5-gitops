import { db } from '@/db/index.js';
import { 
  organizations, 
  users, 
  accounts, invoices, invoiceItems, transactions,
  contacts, deals,
  products, warehouses, stockLevels, stockMovements,
  devices, telemetry,
  employees, departments, payrolls
} from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger.js';

const SEED_ORG_NAME = 'Demo Enterprise Corp';
const SEED_ORG_SLUG = 'demo-enterprise-corp';

async function seed() {
  // Check if seeding should be skipped
  if (process.env.SKIP_SEED === 'true' || process.env.SKIP_SEED === '1') {
    logger.info('⏭️  SKIP_SEED is set, skipping data seeding...');
    return;
  }

  logger.info('🌱 Starting data seeding...');

  try {
    // 1. Create Organization
    logger.info('Creating organization...');
    
    let orgId: string;
    const existingOrgs = await db.select().from(organizations).where(eq(organizations.name, SEED_ORG_NAME));
    
    if (existingOrgs.length > 0) {
      orgId = existingOrgs[0].id;
      logger.info(`✅ Organization already exists: ${orgId}`);
      logger.info('   Skipping seed - data already present');
      return;
    } else {
      const [newOrg] = await db.insert(organizations).values({
        id: uuidv4(),
        name: SEED_ORG_NAME,
        slug: SEED_ORG_SLUG,
        taxId: '1234567890',
        subscriptionTier: 'enterprise'
      }).returning();
      
      if (!newOrg) {
        throw new Error('Failed to create organization');
      }
      
      orgId = newOrg.id;
      logger.info(`Created organization: ${orgId}`);
    }

    // 2. Create Departments (HR)
    logger.info('Creating departments...');
    const depts = ['Yönetim', 'IT & Yazılım', 'Satış & Pazarlama', 'İnsan Kaynakları', 'Operasyon'];
    const deptIds: Record<string, string> = {};

    for (const deptName of depts) {
      const [dept] = await db.insert(departments).values({
        organizationId: orgId,
        name: deptName
      }).returning();
      
      if (!dept) {
        throw new Error(`Failed to create department: ${deptName}`);
      }
      
      deptIds[deptName] = dept.id;
    }

    // 3. Create Employees (HR)
    logger.info('Creating employees...');
    const employeesData = [
      { firstName: 'Ahmet', lastName: 'Yılmaz', title: 'Genel Müdür', salary: 85000, dept: 'Yönetim' },
      { firstName: 'Ayşe', lastName: 'Demir', title: 'Senior Developer', salary: 65000, dept: 'IT & Yazılım' },
      { firstName: 'Mehmet', lastName: 'Kaya', title: 'Satış Müdürü', salary: 55000, dept: 'Satış & Pazarlama' },
      { firstName: 'Zeynep', lastName: 'Çelik', title: 'HR Uzmanı', salary: 42000, dept: 'İnsan Kaynakları' },
      { firstName: 'Can', lastName: 'Öztürk', title: 'Saha Operatörü', salary: 35000, dept: 'Operasyon' },
    ];

    for (const emp of employeesData) {
      await db.insert(employees).values({
        id: uuidv4(),
        organizationId: orgId,
        departmentId: deptIds[emp.dept],
        firstName: emp.firstName,
        lastName: emp.lastName,
        tckn: Math.floor(10000000000 + Math.random() * 90000000000).toString(),
        email: `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@demo.com`,
        title: emp.title,
        startDate: new Date(2024, 0, 1).toISOString(),
        salaryAmount: emp.salary.toString(),
        salaryCurrency: 'TRY',
        status: 'active'
      });
    }

    // 4. Create Warehouses (Inventory)
    logger.info('Creating warehouses...');
    const [mainWarehouse] = await db.insert(warehouses).values({
      id: uuidv4(),
      organizationId: orgId,
      name: 'Merkez Depo',
      location: 'İstanbul/Ataşehir',
      isMain: true
    }).returning();

    if (!mainWarehouse) {
      throw new Error('Failed to create warehouse');
    }

    // 5. Create Products (Inventory)
    logger.info('Creating products...');
    const productsData = [
      { name: 'PH Düzenleyici (Sıvı)', sku: 'CHEM-PH-001', price: 450, stock: 150, unit: 'Litre', category: 'Kimyasal' },
      { name: 'Klor Granül (%56)', sku: 'CHEM-CL-002', price: 850, stock: 45, unit: 'Kg', category: 'Kimyasal' },
      { name: 'Yosun Önleyici', sku: 'CHEM-ALG-003', price: 320, stock: 200, unit: 'Litre', category: 'Kimyasal' },
      { name: 'Havuz Pompası 1.5HP', sku: 'EQP-PUMP-001', price: 12500, stock: 5, unit: 'Adet', category: 'Ekipman' },
      { name: 'Kum Filtresi 600mm', sku: 'EQP-FILT-001', price: 8750, stock: 3, unit: 'Adet', category: 'Ekipman' },
      { name: 'Test Kiti (Damlalı)', sku: 'ACC-TEST-001', price: 150, stock: 50, unit: 'Adet', category: 'Aksesuar' },
      { name: 'Havuz Kepçesi', sku: 'ACC-NET-001', price: 250, stock: 25, unit: 'Adet', category: 'Aksesuar' },
      { name: 'Dozaj Pompası', sku: 'EQP-DOSE-001', price: 4500, stock: 8, unit: 'Adet', category: 'Ekipman' },
    ];

    for (const prod of productsData) {
      const [product] = await db.insert(products).values({
        id: uuidv4(),
        organizationId: orgId,
        name: prod.name,
        sku: prod.sku,
        description: `${prod.name} - Standart Kalite`,
        category: prod.category,
        unit: prod.unit,
        salesPrice: prod.price.toString(),
        purchasePrice: (prod.price * 0.7).toString(), // %30 kar marjı varsayımı
        taxRate: 20,
        currency: 'TRY',
        minStockLevel: 10
      }).returning();

      if (!product) {
        throw new Error(`Failed to create product: ${prod.name}`);
      }

      // Initial Stock Level
      await db.insert(stockLevels).values({
        id: uuidv4(),
        organizationId: orgId,
        productId: product.id,
        warehouseId: mainWarehouse.id,
        quantity: prod.stock.toString()
      });
    }

    // 6. Create Accounts (Finance)
    logger.info('Creating accounts...');
    const accountsData = [
      { code: '120.001', name: 'Mavi Otel & Resort', type: 'asset' },
      { code: '120.002', name: 'Site Yönetimi A.Ş.', type: 'asset' },
      { code: '320.001', name: 'ABC Kimya Ltd.', type: 'liability' },
    ];

    const accountIds: string[] = [];
    for (const acc of accountsData) {
      const [account] = await db.insert(accounts).values({
        id: uuidv4(),
        organizationId: orgId,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        currency: 'TRY',
        balance: '0.00'
      }).returning();
      
      if (!account) {
        throw new Error(`Failed to create account: ${acc.name}`);
      }
      
      accountIds.push(account.id);
    }

    // 7. Create Contacts (CRM)
    logger.info('Creating contacts...');
    const contactsData = [
      { firstName: 'Ali', lastName: 'Bey', company: 'Grand Hotel', email: 'ali@grandhotel.com' },
      { firstName: 'Selin', lastName: 'Hanım', company: 'Villa Projesi', email: 'selin@villaproj.com' },
      { firstName: 'Yönetim', lastName: '', company: 'Site Havuzu Yenileme', email: 'yonetim@site.com' },
    ];

    for (const contact of contactsData) {
      await db.insert(contacts).values({
        id: uuidv4(),
        organizationId: orgId,
        firstName: contact.firstName,
        lastName: contact.lastName || null,
        companyName: contact.company,
        email: contact.email,
        source: 'web'
      });
    }

    // 8. Create IoT Devices
    logger.info('Creating IoT devices...');
    const devicesData = [
      { name: 'Mavi Otel - Büyük Havuz', type: 'controller', status: 'online' },
      { name: 'Mavi Otel - Çocuk Havuzu', type: 'sensor', status: 'online' },
      { name: 'Site A Blok Havuzu', type: 'controller', status: 'offline' },
    ];

    for (const dev of devicesData) {
      const [device] = await db.insert(devices).values({
        id: uuidv4(),
        organizationId: orgId,
        name: dev.name,
        type: dev.type,
        status: dev.status,
        serialNumber: `DEV-${Math.floor(Math.random() * 10000)}`,
        firmwareVersion: '1.2.0'
      }).returning();

      if (!device) {
        throw new Error(`Failed to create device: ${dev.name}`);
      }

      // Generate telemetry for online devices
      if (dev.status === 'online') {
        const now = new Date();
        // Last 24 hours data points (every hour)
        for (let i = 0; i < 24; i++) {
          const time = new Date(now.getTime() - i * 60 * 60 * 1000);
          await db.insert(telemetry).values({
            organizationId: orgId,
            deviceId: device.id,
            timestamp: time,
            data: {
              temperature: 24 + Math.random() * 2, // 24-26 C
              ph: 7.2 + (Math.random() * 0.4 - 0.2), // 7.0-7.4
              orp: 650 + Math.random() * 50,
              flow: 100
            }
          });
        }
      }
    }

    logger.info('✅ Seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
