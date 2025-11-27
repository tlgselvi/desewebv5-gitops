/**
 * IoT React Query Hooks
 * 
 * Provides type-safe data fetching hooks for IoT functionality.
 * Uses React Query for caching, background updates, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { iotService, CreateDevicePayload } from "@/services/iot";
import { Device, TelemetryData, Alert } from "@/types/iot";
import { toast } from "sonner";

// =============================================================================
// QUERY KEYS
// =============================================================================

export const iotQueryKeys = {
  all: ['iot'] as const,
  devices: () => [...iotQueryKeys.all, 'devices'] as const,
  device: (id: string) => [...iotQueryKeys.all, 'device', id] as const,
  telemetry: (deviceId: string) => [...iotQueryKeys.all, 'telemetry', deviceId] as const,
  alerts: () => [...iotQueryKeys.all, 'alerts'] as const,
  deviceAlerts: (deviceId: string) => [...iotQueryKeys.all, 'alerts', deviceId] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Hook to fetch all IoT devices
 */
export function useDevices() {
  return useQuery({
    queryKey: iotQueryKeys.devices(),
    queryFn: iotService.getDevices,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch a single device
 */
export function useDevice(deviceId: string | undefined) {
  return useQuery({
    queryKey: iotQueryKeys.device(deviceId!),
    queryFn: () => iotService.getDevice(deviceId!),
    enabled: !!deviceId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch telemetry data with polling support
 * 
 * @param deviceId - Device ID to fetch telemetry for
 * @param options - Optional configuration
 */
export function useTelemetry(
  deviceId: string | undefined,
  options?: {
    pollingInterval?: number; // ms, default 5000
    enabled?: boolean;
    limit?: number;
  }
) {
  const { pollingInterval = 5000, enabled = true, limit } = options || {};

  return useQuery({
    queryKey: iotQueryKeys.telemetry(deviceId!),
    queryFn: () => iotService.getTelemetry(deviceId!, { limit }),
    enabled: !!deviceId && enabled,
    staleTime: pollingInterval / 2, // Half of polling interval
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false, // Don't poll when tab is inactive
  });
}

/**
 * Hook to fetch all alerts
 */
export function useAlerts() {
  return useQuery({
    queryKey: iotQueryKeys.alerts(),
    queryFn: iotService.getAlerts,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

/**
 * Hook to fetch alerts for a specific device
 */
export function useDeviceAlerts(deviceId: string | undefined) {
  return useQuery({
    queryKey: iotQueryKeys.deviceAlerts(deviceId!),
    queryFn: () => iotService.getDeviceAlerts(deviceId!),
    enabled: !!deviceId,
    staleTime: 30 * 1000,
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Hook to create a new device
 */
export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDevicePayload) => iotService.createDevice(data),
    onSuccess: (newDevice) => {
      // Invalidate devices list to trigger refetch
      queryClient.invalidateQueries({ queryKey: iotQueryKeys.devices() });
      
      // Optionally, add the new device to the cache optimistically
      queryClient.setQueryData<Device[]>(iotQueryKeys.devices(), (old) => {
        if (!old) return [newDevice];
        return [...old, newDevice];
      });

      toast.success("Cihaz başarıyla oluşturuldu", {
        description: `${newDevice.name} sisteme eklendi.`,
      });
    },
    onError: (error) => {
      toast.error("Cihaz oluşturulamadı", {
        description: error instanceof Error ? error.message : "Bir hata oluştu",
      });
    },
  });
}

/**
 * Hook to resolve an alert
 */
export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => iotService.resolveAlert(alertId),
    onSuccess: (resolvedAlert) => {
      // Invalidate alerts to trigger refetch
      queryClient.invalidateQueries({ queryKey: iotQueryKeys.alerts() });
      
      toast.success("Uyarı çözüldü", {
        description: "Uyarı başarıyla kapatıldı.",
      });
    },
    onError: (error) => {
      toast.error("Uyarı çözülemedi", {
        description: error instanceof Error ? error.message : "Bir hata oluştu",
      });
    },
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to get device statistics from cached data
 */
export function useDeviceStats() {
  const { data: devices = [] } = useDevices();

  return {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    error: devices.filter(d => d.status === 'error').length,
    maintenance: devices.filter(d => d.status === 'maintenance').length,
  };
}

/**
 * Prefetch devices data
 * Call this to warm the cache before navigation
 */
export function usePrefetchDevices() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: iotQueryKeys.devices(),
      queryFn: iotService.getDevices,
      staleTime: 60 * 1000,
    });
  };
}

