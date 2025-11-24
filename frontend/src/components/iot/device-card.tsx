"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Device } from "@/types/iot";
import { Wifi, WifiOff, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeviceCardProps {
  device: Device;
  onClick?: (device: Device) => void;
  isSelected?: boolean;
}

export function DeviceCard({ device, onClick, isSelected }: DeviceCardProps) {
  const isOnline = device.status === 'online';

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:border-primary transition-colors",
        isSelected && "border-primary ring-1 ring-primary"
      )}
      onClick={() => onClick?.(device)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium truncate max-w-[150px]" title={device.name}>
          {device.name}
        </CardTitle>
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mt-2">
          <div className="text-xs text-muted-foreground">
            {device.serialNumber}
          </div>
          <Badge variant={isOnline ? "default" : "secondary"} className={cn("text-[10px]", isOnline && "bg-green-600 hover:bg-green-700")}>
            {device.status.toUpperCase()}
          </Badge>
        </div>
        <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <Activity className="h-3 w-3" />
          {device.type}
        </div>
      </CardContent>
    </Card>
  );
}

