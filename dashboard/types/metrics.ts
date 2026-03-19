export interface DataPoint {
  timestamp: string; // ISO 8601
  time: string; // HH:mm for display
  value: number;
}

export interface ServiceMetrics {
  cpuUtilization: DataPoint[];
  cpuCores: DataPoint[];
  memoryUtilization: DataPoint[];
  memoryUsed: DataPoint[];
  podRestarts: DataPoint[];
  uptime: DataPoint[];
}

export type MetricsResponse = Record<string, ServiceMetrics>;
