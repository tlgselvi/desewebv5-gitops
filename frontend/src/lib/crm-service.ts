/**
 * CRM Service
 * Provides CRM functionality with mock data
 */

import { Deal, Customer, DealStage } from "./dtos/crm.dto";

// Mock customers
const mockCustomers: Customer[] = [
  { id: "1", name: "Acme Corporation", email: "info@acme.com", phone: "+90 212 555 0101", company: "Acme Corp" },
  { id: "2", name: "TechStart A.Ş.", email: "contact@techstart.com", phone: "+90 216 555 0202", company: "TechStart" },
  { id: "3", name: "GlobalTech Ltd.", email: "sales@globaltech.com", phone: "+90 232 555 0303", company: "GlobalTech" },
  { id: "4", name: "Innovate Solutions", email: "hello@innovate.com", phone: "+90 312 555 0404", company: "Innovate" },
  { id: "5", name: "Digital Ventures", email: "info@digitalventures.com", phone: "+90 212 555 0505", company: "Digital Ventures" },
  { id: "6", name: "Smart Systems", email: "contact@smartsystems.com", phone: "+90 216 555 0606", company: "Smart Systems" },
  { id: "7", name: "Future Works", email: "sales@futureworks.com", phone: "+90 232 555 0707", company: "Future Works" },
  { id: "8", name: "Cloud Innovations", email: "info@cloudinnovations.com", phone: "+90 312 555 0808", company: "Cloud Innovations" },
  { id: "9", name: "Data Dynamics", email: "contact@datadynamics.com", phone: "+90 212 555 0909", company: "Data Dynamics" },
  { id: "10", name: "NextGen Solutions", email: "hello@nextgen.com", phone: "+90 216 555 1010", company: "NextGen" },
];

// Mock deals - 50 adet gerçekçi fırsat
const mockDeals: Omit<Deal, "customer">[] = [
  { id: "1", customerId: "1", title: "Enterprise Lisans Anlaşması", value: 250000, stage: "Lead", contactPerson: "Ahmet Yılmaz", createdAt: "2024-01-10T10:00:00Z", updatedAt: "2024-01-15T14:30:00Z" },
  { id: "2", customerId: "2", title: "Yazılım Geliştirme Projesi", value: 180000, stage: "Contacted", contactPerson: "Ayşe Demir", createdAt: "2024-01-08T09:00:00Z", updatedAt: "2024-01-14T16:20:00Z" },
  { id: "3", customerId: "3", title: "Cloud Migration Hizmeti", value: 320000, stage: "Proposal", contactPerson: "Mehmet Kaya", createdAt: "2024-01-05T08:00:00Z", updatedAt: "2024-01-13T11:45:00Z" },
  { id: "4", customerId: "4", title: "ERP Entegrasyonu", value: 150000, stage: "Closed", contactPerson: "Fatma Şahin", createdAt: "2023-12-20T10:00:00Z", updatedAt: "2024-01-12T15:00:00Z" },
  { id: "5", customerId: "5", title: "Dijital Dönüşüm Danışmanlığı", value: 220000, stage: "Lead", contactPerson: "Ali Çelik", createdAt: "2024-01-12T11:00:00Z", updatedAt: "2024-01-15T10:15:00Z" },
  { id: "6", customerId: "6", title: "Mobil Uygulama Geliştirme", value: 95000, stage: "Contacted", contactPerson: "Zeynep Arslan", createdAt: "2024-01-09T09:30:00Z", updatedAt: "2024-01-14T13:20:00Z" },
  { id: "7", customerId: "7", title: "Siber Güvenlik Çözümü", value: 280000, stage: "Proposal", contactPerson: "Mustafa Öztürk", createdAt: "2024-01-07T08:15:00Z", updatedAt: "2024-01-13T14:30:00Z" },
  { id: "8", customerId: "8", title: "AI/ML Platform Entegrasyonu", value: 350000, stage: "Lead", contactPerson: "Elif Yıldız", createdAt: "2024-01-11T10:45:00Z", updatedAt: "2024-01-15T09:00:00Z" },
  { id: "9", customerId: "9", title: "Veri Analitik Platformu", value: 195000, stage: "Contacted", contactPerson: "Can Aydın", createdAt: "2024-01-08T14:00:00Z", updatedAt: "2024-01-14T16:45:00Z" },
  { id: "10", customerId: "10", title: "E-ticaret Platformu", value: 175000, stage: "Proposal", contactPerson: "Selin Kara", createdAt: "2024-01-06T11:30:00Z", updatedAt: "2024-01-13T10:20:00Z" },
  { id: "11", customerId: "1", title: "Yıllık Bakım Anlaşması", value: 45000, stage: "Closed", contactPerson: "Ahmet Yılmaz", createdAt: "2023-12-15T09:00:00Z", updatedAt: "2024-01-10T12:00:00Z" },
  { id: "12", customerId: "2", title: "API Entegrasyon Hizmeti", value: 125000, stage: "Lead", contactPerson: "Ayşe Demir", createdAt: "2024-01-13T08:00:00Z", updatedAt: "2024-01-15T11:30:00Z" },
  { id: "13", customerId: "3", title: "DevOps Danışmanlığı", value: 165000, stage: "Contacted", contactPerson: "Mehmet Kaya", createdAt: "2024-01-10T10:00:00Z", updatedAt: "2024-01-14T15:15:00Z" },
  { id: "14", customerId: "4", title: "Web Sitesi Yenileme", value: 75000, stage: "Proposal", contactPerson: "Fatma Şahin", createdAt: "2024-01-05T13:00:00Z", updatedAt: "2024-01-13T09:45:00Z" },
  { id: "15", customerId: "5", title: "CRM Sistemi Kurulumu", value: 110000, stage: "Lead", contactPerson: "Ali Çelik", createdAt: "2024-01-14T09:00:00Z", updatedAt: "2024-01-15T08:30:00Z" },
  { id: "16", customerId: "6", title: "IoT Platform Entegrasyonu", value: 240000, stage: "Contacted", contactPerson: "Zeynep Arslan", createdAt: "2024-01-09T11:00:00Z", updatedAt: "2024-01-14T14:00:00Z" },
  { id: "17", customerId: "7", title: "Blockchain Çözümü", value: 400000, stage: "Proposal", contactPerson: "Mustafa Öztürk", createdAt: "2024-01-07T09:30:00Z", updatedAt: "2024-01-13T16:20:00Z" },
  { id: "18", customerId: "8", title: "Microservices Mimari", value: 290000, stage: "Lead", contactPerson: "Elif Yıldız", createdAt: "2024-01-12T10:00:00Z", updatedAt: "2024-01-15T10:45:00Z" },
  { id: "19", customerId: "9", title: "Big Data Analizi", value: 210000, stage: "Contacted", contactPerson: "Can Aydın", createdAt: "2024-01-08T15:00:00Z", updatedAt: "2024-01-14T17:30:00Z" },
  { id: "20", customerId: "10", title: "Eğitim ve Danışmanlık", value: 85000, stage: "Proposal", contactPerson: "Selin Kara", createdAt: "2024-01-06T12:00:00Z", updatedAt: "2024-01-13T11:15:00Z" },
  { id: "21", customerId: "1", title: "Yedekleme Çözümü", value: 60000, stage: "Closed", contactPerson: "Ahmet Yılmaz", createdAt: "2023-12-18T08:00:00Z", updatedAt: "2024-01-11T13:00:00Z" },
  { id: "22", customerId: "2", title: "Container Orchestration", value: 185000, stage: "Lead", contactPerson: "Ayşe Demir", createdAt: "2024-01-13T09:00:00Z", updatedAt: "2024-01-15T12:00:00Z" },
  { id: "23", customerId: "3", title: "API Gateway Kurulumu", value: 140000, stage: "Contacted", contactPerson: "Mehmet Kaya", createdAt: "2024-01-10T11:00:00Z", updatedAt: "2024-01-14T15:45:00Z" },
  { id: "24", customerId: "4", title: "Content Management Sistemi", value: 98000, stage: "Proposal", contactPerson: "Fatma Şahin", createdAt: "2024-01-05T14:00:00Z", updatedAt: "2024-01-13T10:00:00Z" },
  { id: "25", customerId: "5", title: "Sosyal Medya Yönetimi", value: 55000, stage: "Lead", contactPerson: "Ali Çelik", createdAt: "2024-01-14T10:00:00Z", updatedAt: "2024-01-15T09:15:00Z" },
  { id: "26", customerId: "6", title: "E-posta Pazarlama Platformu", value: 72000, stage: "Contacted", contactPerson: "Zeynep Arslan", createdAt: "2024-01-09T12:00:00Z", updatedAt: "2024-01-14T14:30:00Z" },
  { id: "27", customerId: "7", title: "Video Konferans Çözümü", value: 135000, stage: "Proposal", contactPerson: "Mustafa Öztürk", createdAt: "2024-01-07T10:00:00Z", updatedAt: "2024-01-13T16:45:00Z" },
  { id: "28", customerId: "8", title: "Dokümantasyon Sistemi", value: 88000, stage: "Lead", contactPerson: "Elif Yıldız", createdAt: "2024-01-12T11:00:00Z", updatedAt: "2024-01-15T11:00:00Z" },
  { id: "29", customerId: "9", title: "Proje Yönetim Aracı", value: 105000, stage: "Contacted", contactPerson: "Can Aydın", createdAt: "2024-01-08T16:00:00Z", updatedAt: "2024-01-14T18:00:00Z" },
  { id: "30", customerId: "10", title: "Müşteri Destek Sistemi", value: 92000, stage: "Proposal", contactPerson: "Selin Kara", createdAt: "2024-01-06T13:00:00Z", updatedAt: "2024-01-13T12:00:00Z" },
  { id: "31", customerId: "1", title: "Güvenlik Denetimi", value: 78000, stage: "Closed", contactPerson: "Ahmet Yılmaz", createdAt: "2023-12-22T09:00:00Z", updatedAt: "2024-01-12T14:00:00Z" },
  { id: "32", customerId: "2", title: "Performans Optimizasyonu", value: 155000, stage: "Lead", contactPerson: "Ayşe Demir", createdAt: "2024-01-13T10:00:00Z", updatedAt: "2024-01-15T12:30:00Z" },
  { id: "33", customerId: "3", title: "Load Balancing Çözümü", value: 120000, stage: "Contacted", contactPerson: "Mehmet Kaya", createdAt: "2024-01-10T12:00:00Z", updatedAt: "2024-01-14T16:00:00Z" },
  { id: "34", customerId: "4", title: "SEO Optimizasyonu", value: 65000, stage: "Proposal", contactPerson: "Fatma Şahin", createdAt: "2024-01-05T15:00:00Z", updatedAt: "2024-01-13T10:30:00Z" },
  { id: "35", customerId: "5", title: "Sosyal Ağ Entegrasyonu", value: 48000, stage: "Lead", contactPerson: "Ali Çelik", createdAt: "2024-01-14T11:00:00Z", updatedAt: "2024-01-15T09:45:00Z" },
  { id: "36", customerId: "6", title: "Ödeme Gateway Entegrasyonu", value: 112000, stage: "Contacted", contactPerson: "Zeynep Arslan", createdAt: "2024-01-09T13:00:00Z", updatedAt: "2024-01-14T14:45:00Z" },
  { id: "37", customerId: "7", title: "Çoklu Dil Desteği", value: 95000, stage: "Proposal", contactPerson: "Mustafa Öztürk", createdAt: "2024-01-07T11:00:00Z", updatedAt: "2024-01-13T17:00:00Z" },
  { id: "38", customerId: "8", title: "Raporlama Sistemi", value: 128000, stage: "Lead", contactPerson: "Elif Yıldız", createdAt: "2024-01-12T12:00:00Z", updatedAt: "2024-01-15T11:15:00Z" },
  { id: "39", customerId: "9", title: "Otomasyon Çözümü", value: 175000, stage: "Contacted", contactPerson: "Can Aydın", createdAt: "2024-01-08T17:00:00Z", updatedAt: "2024-01-14T18:15:00Z" },
  { id: "40", customerId: "10", title: "Mobil Ödeme Sistemi", value: 142000, stage: "Proposal", contactPerson: "Selin Kara", createdAt: "2024-01-06T14:00:00Z", updatedAt: "2024-01-13T12:30:00Z" },
  { id: "41", customerId: "1", title: "Yedekleme ve Kurtarma", value: 68000, stage: "Closed", contactPerson: "Ahmet Yılmaz", createdAt: "2023-12-25T08:00:00Z", updatedAt: "2024-01-13T15:00:00Z" },
  { id: "42", customerId: "2", title: "Monitoring ve Alerting", value: 118000, stage: "Lead", contactPerson: "Ayşe Demir", createdAt: "2024-01-13T11:00:00Z", updatedAt: "2024-01-15T13:00:00Z" },
  { id: "43", customerId: "3", title: "Log Yönetim Sistemi", value: 102000, stage: "Contacted", contactPerson: "Mehmet Kaya", createdAt: "2024-01-10T13:00:00Z", updatedAt: "2024-01-14T16:15:00Z" },
  { id: "44", customerId: "4", title: "A/B Testing Platformu", value: 87000, stage: "Proposal", contactPerson: "Fatma Şahin", createdAt: "2024-01-05T16:00:00Z", updatedAt: "2024-01-13T11:00:00Z" },
  { id: "45", customerId: "5", title: "Kullanıcı Analitik Aracı", value: 108000, stage: "Lead", contactPerson: "Ali Çelik", createdAt: "2024-01-14T12:00:00Z", updatedAt: "2024-01-15T10:00:00Z" },
  { id: "46", customerId: "6", title: "Chatbot Entegrasyonu", value: 76000, stage: "Contacted", contactPerson: "Zeynep Arslan", createdAt: "2024-01-09T14:00:00Z", updatedAt: "2024-01-14T15:00:00Z" },
  { id: "47", customerId: "7", title: "Voice Assistant", value: 195000, stage: "Proposal", contactPerson: "Mustafa Öztürk", createdAt: "2024-01-07T12:00:00Z", updatedAt: "2024-01-13T17:15:00Z" },
  { id: "48", customerId: "8", title: "AR/VR Çözümü", value: 310000, stage: "Lead", contactPerson: "Elif Yıldız", createdAt: "2024-01-12T13:00:00Z", updatedAt: "2024-01-15T11:30:00Z" },
  { id: "49", customerId: "9", title: "Blockchain Entegrasyonu", value: 265000, stage: "Contacted", contactPerson: "Can Aydın", createdAt: "2024-01-08T18:00:00Z", updatedAt: "2024-01-14T18:30:00Z" },
  { id: "50", customerId: "10", title: "Quantum Computing Hazırlığı", value: 500000, stage: "Proposal", contactPerson: "Selin Kara", createdAt: "2024-01-06T15:00:00Z", updatedAt: "2024-01-13T13:00:00Z" },
];

/**
 * Get all deals with customer information
 */
export async function getDeals(): Promise<Deal[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Map deals with customer data
  return mockDeals.map((deal) => {
    const customer = mockCustomers.find((c) => c.id === deal.customerId);
    return {
      ...deal,
      customer: customer || {
        id: deal.customerId,
        name: "Bilinmeyen Müşteri",
        company: "Bilinmeyen Şirket",
      },
    };
  });
}

/**
 * Update deal stage (for drag & drop)
 */
export async function updateDealStage(dealId: string, newStage: DealStage): Promise<void> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));
  
  // In real app, this would make an API call
  const dealIndex = mockDeals.findIndex((d) => d.id === dealId);
  if (dealIndex !== -1) {
    mockDeals[dealIndex].stage = newStage;
    mockDeals[dealIndex].updatedAt = new Date().toISOString();
  }
}

/**
 * CRM Service object
 */
export const crmService = {
  getDeals,
  updateDealStage,
};

