// Локальные типы для PMAC Control Service
// Дублируем типы из @pmac/shared-types для избежания проблем с зависимостями

export type PMACVariableType = 'P' | 'Q' | 'I' | 'M' | 'L';

export interface PMACVariable {
  type: PMACVariableType;
  address: number;
  value: number | string | boolean;
  description: string;
  units?: string;
  range?: {
    min: number;
    max: number;
  };
  readOnly: boolean;
  category: 'motion' | 'io' | 'system' | 'user' | 'coordinate';
  lastUpdated: Date;
}

export interface PMACStatus {
  controllerState: 'idle' | 'running' | 'error' | 'homing' | 'programming';
  communicationStatus: 'connected' | 'disconnected' | 'error';
  coordinates: Record<string, number>;
  variables: {
    P: Record<number, number>;
    Q: Record<number, number>;
    I: Record<number, number>;
    M: Record<number, number>;
    L: Record<number, number>;
  };
  axes: Record<string, AxisStatus>;
  drives: DriveStatus[];
  system: SystemInfo;
}

export interface AxisStatus {
  position: number;
  velocity: number;
  followingError: number;
  status: 'enabled' | 'disabled' | 'error' | 'homing';
  limits: {
    positive: boolean;
    negative: boolean;
  };
}

export interface DriveStatus {
  id: number;
  name: string;
  axis: string;
  converterState: 'OK' | 'ERROR';
  operationPermission: boolean;
  fanOn: boolean;
  dynamicBraking: boolean;
  error: boolean;
  state: 'O' | 'L' | 'H' | '1'; // O-норма, L-нет питания, H-подано питание, 1-ошибка
  trackingStatus: 'Ось в слежении' | 'Нет питания' | 'Подано питание' | 'Ошибка';
  current: number; // ток в амперах
  temperature: number; // температура в градусах Цельсия
  lastUpdated: Date;
}

export interface SystemInfo {
  temperature: number;
  voltage: number;
  errorCodes: string[];
  uptime: number;
}

export interface PMACDataPoint {
  timestamp: Date;
  variables: Record<string, number>;
  coordinates: Record<string, number>;
  status: string;
  metadata: {
    source: string;
    quality: 'good' | 'uncertain' | 'bad';
    errorCodes: string[];
  };
}

export interface PMACConnection {
  id: string;
  name: string;
  type: 'tcp' | 'serial' | 'usb' | 'simulation';
  host?: string;
  port?: number;
  serialPort?: string;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
  settings: {
    timeout: number;
    retries: number;
    protocol: string;
  };
}
