"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, RefreshCcw } from "lucide-react";
import { authenticatedGet } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface ExchangeRate {
  code: string;
  name: string;
  buying: number;
  selling: number;
}

export function ExchangeRatesCard() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const data = await authenticatedGet<ExchangeRate[]>("/api/v1/finance/exchange-rates");
      // Filter major currencies for the dashboard widget
      const majorRates = data.filter(r => ['USD', 'EUR', 'GBP'].includes(r.code));
      setRates(majorRates);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch exchange rates", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    // Refresh every 5 minutes
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Döviz Kurları (TCMB)</CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchRates} className="h-8 w-8">
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading && rates.length === 0 ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {rates.map((rate) => (
              <div key={rate.code} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-bold text-xs">
                    {rate.code}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{rate.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Alış: {rate.buying.toFixed(4)}
                    </p>
                  </div>
                </div>
                <div className="font-bold text-sm">
                  {rate.selling.toFixed(4)} ₺
                </div>
              </div>
            ))}
            {lastUpdated && (
                <p className="text-[10px] text-right text-muted-foreground pt-2">
                    Son Güncelleme: {lastUpdated.toLocaleTimeString()}
                </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

