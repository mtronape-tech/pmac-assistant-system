import dotenv from "dotenv";

dotenv.config();

export interface Config {
  server: {
    port: number;
    host: string;
  };
  pmac: {
    host: string;
    port: number;
    enabled: boolean;
  };
  pmacControl: {
    host: string;
    port: number;
    enabled: boolean;
  };
  knowledge: {
    url: string;
    enabled: boolean;
  };
  analytics: {
    url: string;
    enabled: boolean;
  };
  dataCollection: {
    url: string;
    enabled: boolean;
  };
}

export const config: Config = {
  server: {
    port: parseInt(process.env.PORT || "3004", 10),
    host: process.env.HOST || "localhost",
  },
  pmac: {
    host: process.env.PMAC_HOST || "localhost",
    port: parseInt(process.env.PMAC_PORT || "1025", 10),
    enabled: process.env.PMAC_ENABLED !== 'false',
  },
  pmacControl: {
    host: process.env.PMAC_CONTROL_HOST || "localhost",
    port: parseInt(process.env.PMAC_CONTROL_PORT || "3001", 10),
    enabled: process.env.PMAC_CONTROL_ENABLED !== 'false',
  },
  knowledge: {
    url: process.env.KNOWLEDGE_BASE_URL || "http://localhost:3005",
    enabled: process.env.KNOWLEDGE_BASE_ENABLED !== 'false',
  },
  analytics: {
    url: process.env.ANALYTICS_URL || "http://localhost:3003",
    enabled: process.env.ANALYTICS_ENABLED !== 'false',
  },
  dataCollection: {
    url: process.env.DATA_COLLECTION_URL || "http://localhost:3002",
    enabled: process.env.DATA_COLLECTION_ENABLED !== 'false',
  },
};
