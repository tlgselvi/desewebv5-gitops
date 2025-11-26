"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Database, 
  Mail, 
  Save,
  ArrowRight,
  Link2
} from "lucide-react"
import { toast } from "sonner"

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    organizationName: "",
    organizationEmail: "",
    timezone: "Europe/Istanbul",
    language: "tr",
    currency: "TRY",
    notifications: {
      email: true,
      push: false,
      sms: false,
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
    },
  })

  const handleSave = async () => {
    try {
      setIsLoading(true)
      // TODO: API call to save settings
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulated API call
      toast.success("Ayarlar başarıyla kaydedildi")
    } catch (error) {
      toast.error("Ayarlar kaydedilirken bir hata oluştu")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ayarlar</h1>
        <p className="text-muted-foreground">
          Hesap, bildirimler ve güvenlik ayarlarınızı buradan yönetebilirsiniz.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Genel Ayarlar */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Genel Ayarlar</CardTitle>
            </div>
            <CardDescription>
              Organizasyon bilgileri ve temel tercihler
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organizasyon Adı</Label>
              <Input
                id="orgName"
                placeholder="Şirket Adı"
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgEmail">E-posta</Label>
              <Input
                id="orgEmail"
                type="email"
                placeholder="info@example.com"
                value={formData.organizationEmail}
                onChange={(e) => setFormData({ ...formData, organizationEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Saat Dilimi</Label>
              <select
                id="timezone"
                className="w-full p-2 border rounded-md bg-background"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              >
                <option value="Europe/Istanbul">İstanbul (GMT+3)</option>
                <option value="Europe/London">Londra (GMT+0)</option>
                <option value="America/New_York">New York (GMT-5)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Para Birimi</Label>
              <select
                id="currency"
                className="w-full p-2 border rounded-md bg-background"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="TRY">₺ Türk Lirası</option>
                <option value="USD">$ US Dollar</option>
                <option value="EUR">€ Euro</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Bildirimler */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Bildirimler</CardTitle>
            </div>
            <CardDescription>
              Bildirim tercihlerinizi yönetin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notif">E-posta Bildirimleri</Label>
                <p className="text-sm text-muted-foreground">
                  Önemli güncellemeler için e-posta al
                </p>
              </div>
              <Switch
                id="email-notif"
                checked={formData.notifications.email}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    notifications: { ...formData.notifications, email: checked },
                  })
                }
              />
            </div>
            <div className="border-t" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notif">Push Bildirimleri</Label>
                <p className="text-sm text-muted-foreground">
                  Tarayıcı bildirimleri gönder
                </p>
              </div>
              <Switch
                id="push-notif"
                checked={formData.notifications.push}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    notifications: { ...formData.notifications, push: checked },
                  })
                }
              />
            </div>
            <div className="border-t" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms-notif">SMS Bildirimleri</Label>
                <p className="text-sm text-muted-foreground">
                  Kritik uyarılar için SMS gönder
                </p>
              </div>
              <Switch
                id="sms-notif"
                checked={formData.notifications.sms}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    notifications: { ...formData.notifications, sms: checked },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Güvenlik */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Güvenlik</CardTitle>
            </div>
            <CardDescription>
              Hesap güvenliği ayarları
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="2fa">İki Faktörlü Doğrulama</Label>
                <p className="text-sm text-muted-foreground">
                  Hesabınızı ekstra güvenlik katmanı ile koruyun
                </p>
              </div>
              <Switch
                id="2fa"
                checked={formData.security.twoFactor}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    security: { ...formData.security, twoFactor: checked },
                  })
                }
              />
            </div>
            <div className="border-t" />
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Oturum Zaman Aşımı (dakika)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="5"
                max="480"
                value={formData.security.sessionTimeout}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    security: {
                      ...formData.security,
                      sessionTimeout: parseInt(e.target.value) || 30,
                    },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Entegrasyonlar */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              <CardTitle>Entegrasyonlar</CardTitle>
            </div>
            <CardDescription>
              Harici servis bağlantıları
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Banka, E-Fatura ve diğer harici servis entegrasyonlarını yönetin.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/settings/integrations">
                Entegrasyonları Yönet
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Kaydet Butonu */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </Button>
      </div>
    </div>
  )
}

