import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  
  // База данных
  database: {
    url: process.env.DATABASE_URL || "postgresql://pmac_user:pmac_password@localhost:5432/pmac_assistant",
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  
  // Weaviate
  weaviate: {
    url: process.env.WEAVIATE_URL || "http://localhost:8080",
  },
  
  // PMAC
  pmac: {
    mode: (process.env.PMAC_MODE || "simulation") as "real" | "simulation",
    connection: {
      type: (process.env.PMAC_CONNECTION_TYPE || "ethernet") as "ethernet" | "serial" | "usb",
      host: process.env.PMAC_HOST || "localhost",
      port: parseInt(process.env.PMAC_PORT || "1025", 10),
      device: process.env.PMAC_DEVICE,
      baudRate: parseInt(process.env.PMAC_BAUDRATE || "115200", 10),
    },
    simulation: {
      dataFile: process.env.PMAC_SIMULATION_DATA_FILE,
      responseDelay: parseInt(process.env.PMAC_SIMULATION_DELAY || "100", 10),
    },
  },
  
  // PMAC Control Service
  pmacControl: {
    enabled: process.env.PMAC_CONTROL_ENABLED !== 'false',
    host: process.env.PMAC_CONTROL_HOST || 'localhost',
    port: parseInt(process.env.PMAC_CONTROL_PORT || '3001', 10),
    timeout: parseInt(process.env.PMAC_CONTROL_TIMEOUT || '5000', 10),
    maxRetries: parseInt(process.env.PMAC_CONTROL_MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.PMAC_CONTROL_RETRY_DELAY || '1000', 10),
  },
  
  // AI Models
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4",
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "4000", 10),
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || "claude-3-sonnet-20240229",
      maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || "4000", 10),
    },
  },
  
  // Логирование
  logging: {
    level: process.env.LOG_LEVEL || "info",
    format: process.env.LOG_FORMAT || "json",
  },
  
  // Безопасность
  security: {
    jwtSecret: process.env.JWT_SECRET || "your-secret-key",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
    corsOrigin: process.env.CORS_ORIGIN || "*",
  },
} as const;
