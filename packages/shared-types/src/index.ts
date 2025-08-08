// PMAC Variable Types
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

// PMAC Status
export interface PMACStatus {
  controllerState: 'idle' | 'running' | 'error' | 'homing' | 'programming';
  communicationStatus: 'connected' | 'disconnected' | 'error';
  coordinates: Record<string, number>;
  variables: {
    P: Record<number, number>;  // Program variables (1-8192)
    Q: Record<number, number>;  // Coordinate variables (1-8192)
    I: Record<number, number>;  // I/O variables (1-8192)
    M: Record<number, number>;  // Motion variables (1-8192)
    L: Record<number, number>;  // Local variables (1-8192)
  };
  axes: Record<string, AxisStatus>;
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

export interface SystemInfo {
  temperature: number;
  voltage: number;
  errorCodes: string[];
  uptime: number;
}

// Data Collection
export interface PMACDataPoint {
  timestamp: Date;
  machineId: string;
  variables?: Record<string, Record<number, number>>;
  coordinates?: Record<string, number>;
  axes?: Record<string, AxisStatus>;
  system?: SystemInfo;
  quality: 'good' | 'warning' | 'error';
}

export interface CollectionConfig {
  frequency: number; // Hz
  variables: {
    P: number[];      // Program variables to collect
    Q: number[];      // Coordinate variables to collect
    I: number[];      // I/O variables to collect
    M: number[];      // Motion variables to collect
    L: number[];      // Local variables to collect
  };
  coordinates: string[]; // ['x', 'y', 'z', 'a', 'b', 'c']
  axes: {
    enabled: boolean;
    position: boolean;
    velocity: boolean;
    followingError: boolean;
    status: boolean;
  };
  system: {
    temperature: boolean;
    voltage: boolean;
    errorCodes: boolean;
  };
  filters: {
    minChange: number;
    deadband: number;
  };
  storage: {
    retention: number; // days
    compression: boolean;
    aggregation: 'none' | 'average' | 'minmax';
  };
}

// Knowledge Base
export interface Document {
  id: string;
  title: string;
  content: string;
  metadata: DocumentMetadata;
  embeddings: number[];
  chunks: DocumentChunk[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentMetadata {
  title: string;
  type: 'manual' | 'reference' | 'tutorial' | 'configuration';
  category: string;
  tags: string[];
  machineType?: string;
  version: string;
  language: string;
}

export interface DocumentChunk {
  id: string;
  content: string;
  embeddings: number[];
  pageNumber?: number;
  section?: string;
  startIndex: number;
  endIndex: number;
}

export interface AIResponse {
  answer: string;
  confidence: number;
  sources: DocumentReference[];
  relatedTopics: string[];
  recommendations?: string[];
}

export interface DocumentReference {
  documentId: string;
  title: string;
  pageNumber?: number;
  section?: string;
  relevanceScore: number;
}

// Analytics
export interface ChartConfig {
  type: 'line' | 'scatter' | 'histogram' | 'heatmap' | 'realtime';
  title: string;
  parameters: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  options: {
    xLabel: string;
    yLabel: string;
    grid: boolean;
    legend: boolean;
    colors?: string[];
  };
  realtime?: {
    updateInterval: number;
    maxPoints: number;
  };
}

export interface TrendAnalysis {
  trends: {
    parameter: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: number;
    confidence: number;
  }[];
  correlations: {
    parameter1: string;
    parameter2: string;
    correlation: number;
  }[];
  predictions: {
    parameter: string;
    nextValue: number;
    confidence: number;
    timeHorizon: number;
  }[];
}

// Recommendations
export interface Recommendation {
  id: string;
  type: 'parameter' | 'maintenance' | 'optimization' | 'safety';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actions: RecommendationAction[];
  reasoning: string;
  confidence: number;
  expectedImpact: string;
  risks: string[];
  timestamp: Date;
}

export interface RecommendationAction {
  type: 'set_variable' | 'run_command' | 'check_parameter' | 'manual_action';
  description: string;
  parameters: Record<string, any>;
  safety: {
    requiresConfirmation: boolean;
    reversible: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

// User Management
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// API Responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    recoverable: boolean;
    suggestions: string[];
  };
  timestamp: Date;
}

// MCP Protocol
export interface MCPRequest {
  type: 'chat' | 'tool_call' | 'document_query';
  payload: any;
  context?: string;
  userId?: string;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  context?: string;
}

// Connection Configuration
export interface PMACConnectionConfig {
  mode: 'real' | 'simulation';
  connection?: {
    type: 'ethernet' | 'serial' | 'usb';
    host?: string;
    port?: number;
    device?: string;
    baudRate?: number;
  };
  simulation?: {
    dataFile?: string;
    responseDelay?: number;
  };
}
