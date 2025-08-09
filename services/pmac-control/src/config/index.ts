import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export interface PMACControlConfig {
  server: {
    port: number;
    host: string;
  };
  pmac: {
    mode: 'simulation' | 'real';
    connection: {
      type: 'tcp' | 'serial' | 'usb';
      host?: string;
      port?: number;
      serialPort?: string;
      baudRate?: number;
    };
    simulation: {
      responseDelay: number;
      errorRate: number;
      variableUpdateInterval: number;
    };
    safety: {
      criticalVariables: string[];
      maxValueThreshold: number;
      minValueThreshold: number;
    };
  };
  logging: {
    level: string;
    directory: string;
  };
}

export const config: PMACControlConfig = {
  server: {
    port: parseInt(process.env.PMAC_CONTROL_PORT || '3001'),
    host: process.env.PMAC_CONTROL_HOST || '0.0.0.0',
  },
  pmac: {
    mode: (process.env.PMAC_MODE as 'simulation' | 'real') || 'simulation',
    connection: {
      type: (process.env.PMAC_CONNECTION_TYPE as 'tcp' | 'serial' | 'usb') || 'tcp',
      host: process.env.PMAC_HOST || 'localhost',
      port: parseInt(process.env.PMAC_PORT || '1025'),
      serialPort: process.env.PMAC_SERIAL_PORT || '/dev/ttyUSB0',
      baudRate: parseInt(process.env.PMAC_BAUD_RATE || '9600'),
    },
    simulation: {
      responseDelay: parseInt(process.env.PMAC_SIM_DELAY || '100'),
      errorRate: parseFloat(process.env.PMAC_SIM_ERROR_RATE || '0.01'),
      variableUpdateInterval: parseInt(process.env.PMAC_SIM_UPDATE_INTERVAL || '1000'),
    },
    safety: {
      criticalVariables: (process.env.PMAC_CRITICAL_VARS || 'P1,P2,P3,I1,I2,I3').split(','),
      maxValueThreshold: parseFloat(process.env.PMAC_MAX_VALUE || '10000'),
      minValueThreshold: parseFloat(process.env.PMAC_MIN_VALUE || '-10000'),
    },
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIR || './logs',
  },
};
