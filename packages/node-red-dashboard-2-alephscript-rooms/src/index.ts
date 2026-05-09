export interface RoomsPackageConfig {
  mode: 'external' | 'managed-port' | 'same-origin';
  namespace: string;
  pollIntervalMs: number;
}

export const VERSION = '0.2.0'