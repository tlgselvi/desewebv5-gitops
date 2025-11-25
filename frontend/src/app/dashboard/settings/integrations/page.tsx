"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, Save } from "lucide-react";
import { integrationService, type Integration } from "@/services/integrations";
import { toast } from "sonner";

export default function IntegrationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeTab, setActiveTab] = useState("banking");

  // Form states for Banking
  const [bankingProvider, setBankingProvider] = useState("isbank");
  const [bankingApiKey, setBankingApiKey] = useState("");
  const [bankingApiSecret, setBankingApiSecret] = useState("");
  const [bankingAutoSync, setBankingAutoSync] = useState(false);
  const [bankingIntegrationId, setBankingIntegrationId] = useState<string | null>(null);

  // Form states for E-Invoice
  const [einvoiceProvider, setEinvoiceProvider] = useState("foriba");
  const [einvoiceApiKey, setEinvoiceApiKey] = useState("");
  const [einvoiceApiSecret, setEinvoiceApiSecret] = useState("");
  const [einvoiceSandbox, setEinvoiceSandbox] = useState(true);
  const [einvoiceIntegrationId, setEinvoiceIntegrationId] = useState<string | null>(null);

  // Load existing integrations
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setIsLoading(true);
      const data = await integrationService.list();
      setIntegrations(data);

      // Pre-fill forms with existing integrations
      const bankingIntegration = data.find(i => i.category === 'banking' && i.isActive);
      if (bankingIntegration) {
        setBankingIntegrationId(bankingIntegration.id);
        setBankingProvider(bankingIntegration.provider);
        // Don't show encrypted values
      }

      const einvoiceIntegration = data.find(i => i.category === 'einvoice' && i.isActive);
      if (einvoiceIntegration) {
        setEinvoiceIntegrationId(einvoiceIntegration.id);
        setEinvoiceProvider(einvoiceIntegration.provider);
        setEinvoiceSandbox(einvoiceIntegration.config?.sandbox !== false);
      }
    } catch (error) {
      console.error("Failed to load integrations", error);
      toast.error("Entegrasyonlar yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBanking = async () => {
    try {
      setIsLoading(true);
      const data = {
        provider: bankingProvider,
        category: 'banking' as const,
        apiKey: bankingApiKey,
        apiSecret: bankingApiSecret,
        config: {
          autoSync: bankingAutoSync,
          sandbox: true, // Default to sandbox
        },
      };

      if (bankingIntegrationId) {
        // Update existing
        await integrationService.update(bankingIntegrationId, data);
        toast.success("Banka entegrasyonu güncellendi");
      } else {
        // Create new
        const integration = await integrationService.create(data);
        setBankingIntegrationId(integration.id);
        toast.success("Banka entegrasyonu oluşturuldu");
      }
      
      await loadIntegrations();
    } catch (error) {
      console.error("Failed to save banking integration", error);
      toast.error("Banka entegrasyonu kaydedilirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBanking = async () => {
    if (!bankingIntegrationId) {
      toast.error("Önce entegrasyonu kaydedin");
      return;
    }

    try {
      setIsLoading(true);
      const result = await integrationService.testConnection(bankingIntegrationId);
      if (result.success) {
        toast.success("Bağlantı testi başarılı!");
      } else {
        toast.error(`Bağlantı testi başarısız: ${result.message}`);
      }
    } catch (error) {
      console.error("Failed to test banking connection", error);
      toast.error("Bağlantı testi sırasında bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEinvoice = async () => {
    try {
      setIsLoading(true);
      const data = {
        provider: einvoiceProvider,
        category: 'einvoice' as const,
        apiKey: einvoiceApiKey,
        apiSecret: einvoiceApiSecret,
        config: {
          sandbox: einvoiceSandbox,
        },
      };

      if (einvoiceIntegrationId) {
        // Update existing
        await integrationService.update(einvoiceIntegrationId, data);
        toast.success("E-Fatura entegrasyonu güncellendi");
      } else {
        // Create new
        const integration = await integrationService.create(data);
        setEinvoiceIntegrationId(integration.id);
        toast.success("E-Fatura entegrasyonu oluşturuldu");
      }
      
      await loadIntegrations();
    } catch (error) {
      console.error("Failed to save e-invoice integration", error);
      toast.error("E-Fatura entegrasyonu kaydedilirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEinvoice = async () => {
    if (!einvoiceIntegrationId) {
      toast.error("Önce entegrasyonu kaydedin");
      return;
    }

    try {
      setIsLoading(true);
      const result = await integrationService.testConnection(einvoiceIntegrationId);
      if (result.success) {
        toast.success("Bağlantı testi başarılı!");
      } else {
        toast.error(`Bağlantı testi başarısız: ${result.message}`);
      }
    } catch (error) {
      console.error("Failed to test e-invoice connection", error);
      toast.error("Bağlantı testi sırasında bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Entegrasyon Ayarları</h3>
        <p className="text-sm text-muted-foreground">
          Banka, E-Fatura ve diğer harici servis bağlantılarını buradan yönetebilirsiniz.
        </p>
      </div>

      <Tabs defaultValue="banking" className="space-y-4">
        <TabsList>
          <TabsTrigger value="banking">Banka Hesapları</TabsTrigger>
          <TabsTrigger value="einvoice">E-Fatura</TabsTrigger>
          <TabsTrigger value="payment">Ödeme Sistemi</TabsTrigger>
          <TabsTrigger value="notification">Bildirimler</TabsTrigger>
        </TabsList>

        {/* Banka Entegrasyonu */}
        <TabsContent value="banking">
          <Card>
            <CardHeader>
              <CardTitle>Banka API Bağlantısı</CardTitle>
              <CardDescription>
                Hesap hareketlerini otomatik çekmek için banka API bilgilerinizi girin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Banka Seçimi</Label>
                  <select 
                    className="w-full p-2 border rounded-md bg-background"
                    value={bankingProvider}
                    onChange={(e) => setBankingProvider(e.target.value)}
                  >
                    <option value="isbank">Türkiye İş Bankası</option>
                    <option value="garanti">Garanti BBVA</option>
                    <option value="ziraat">Ziraat Bankası</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>API Key / Client ID</Label>
                  <Input 
                    type="password" 
                    placeholder="••••••••"
                    value={bankingApiKey}
                    onChange={(e) => setBankingApiKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input 
                    type="password" 
                    placeholder="••••••••"
                    value={bankingApiSecret}
                    onChange={(e) => setBankingApiSecret(e.target.value)}
                  />
                </div>
                {bankingIntegrationId && (
                  <div className="space-y-2">
                    <Label>Durum</Label>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Aktif
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Switch 
                  checked={bankingAutoSync}
                  onCheckedChange={setBankingAutoSync}
                />
                <span>Otomatik Senkronizasyon</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleTestBanking}
                  disabled={isLoading || !bankingIntegrationId}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test Et
                </Button>
                <Button 
                  onClick={handleSaveBanking}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Kaydet
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* E-Fatura Entegrasyonu */}
        <TabsContent value="einvoice">
          <Card>
            <CardHeader>
              <CardTitle>E-Fatura Entegratör Bilgileri</CardTitle>
              <CardDescription>
                GİB uyumlu faturalar kesmek için entegratör bilgilerinizi girin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                   <Label>Entegratör Firma</Label>
                   <select 
                     className="w-full p-2 border rounded-md bg-background"
                     value={einvoiceProvider}
                     onChange={(e) => setEinvoiceProvider(e.target.value)}
                   >
                     <option value="foriba">Foriba (Sovos)</option>
                     <option value="logo">Logo Yazılım</option>
                     <option value="uyumsoft">Uyumsoft</option>
                   </select>
                </div>
                 <div className="space-y-2">
                  <Label>Kullanıcı Adı (API User)</Label>
                  <Input 
                    placeholder="api_user_123"
                    value={einvoiceApiKey}
                    onChange={(e) => setEinvoiceApiKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Şifre</Label>
                  <Input 
                    type="password" 
                    placeholder="••••••••"
                    value={einvoiceApiSecret}
                    onChange={(e) => setEinvoiceApiSecret(e.target.value)}
                  />
                </div>
                {einvoiceIntegrationId && (
                  <div className="space-y-2">
                    <Label>Durum</Label>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Aktif
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                 <Badge variant="outline" className={einvoiceSandbox ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-green-50 text-green-700 border-green-200"}>
                   <AlertCircle className="w-3 h-3 mr-1" />
                   {einvoiceSandbox ? "Test Ortamı" : "Production"}
                 </Badge>
                 <Switch 
                   checked={einvoiceSandbox}
                   onCheckedChange={setEinvoiceSandbox}
                 />
                 <span>Sandbox Modu</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleTestEinvoice}
                  disabled={isLoading || !einvoiceIntegrationId}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Bağlantıyı Kontrol Et
                </Button>
                <Button 
                  onClick={handleSaveEinvoice}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Kaydet
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

