import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger.js';
import { DataPoint } from '../types/collection-types.js';

export interface StreamSubscription {
  id: string;
  machineId: string;
  variableType?: string;
  variableAddress?: number;
  interval: number; // milliseconds
  lastSent: Date;
}

export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'error' | 'ping' | 'pong';
  payload?: any;
  subscriptionId?: string;
  timestamp?: Date;
}

export class WebSocketStreamer {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, Set<StreamSubscription>>();
  private subscriptions = new Map<string, StreamSubscription>();
  private streamInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    server: HttpServer
  ) {
    
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/data-stream',
      clientTracking: true,
    });

    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      logger.info('New WebSocket connection', { clientId, origin: request.headers.origin });
      
      // Initialize client
      this.clients.set(ws, new Set());

      // Setup message handling
      ws.on('message', (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.handleDisconnection(ws);
        logger.info('WebSocket connection closed', { clientId });
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.handleDisconnection(ws);
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'ping',
        payload: { message: 'Connected to PMAC data stream', clientId },
        timestamp: new Date(),
      });
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error:', error);
    });

    logger.info('WebSocket server initialized on /ws/data-stream');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('WebSocket streamer is already running');
      return;
    }

    logger.info('Starting WebSocket data streamer');
    
    // Start periodic data streaming
    this.streamInterval = setInterval(() => {
      this.streamDataToClients();
    }, 1000); // Check every second

    this.isRunning = true;
    logger.info('WebSocket data streamer started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('WebSocket streamer is not running');
      return;
    }

    logger.info('Stopping WebSocket data streamer');

    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }

    // Close all connections
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1001, 'Server shutting down');
      }
    });

    this.clients.clear();
    this.subscriptions.clear();
    this.isRunning = false;
    
    logger.info('WebSocket data streamer stopped');
  }

  private handleMessage(ws: WebSocket, message: WSMessage): void {
    logger.debug('Received WebSocket message', { 
      type: message.type, 
      subscriptionId: message.subscriptionId 
    });

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message);
        break;
      case 'ping':
        this.sendMessage(ws, { type: 'pong', timestamp: new Date() });
        break;
      default:
        logger.warn('Unknown message type', { type: message.type });
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private handleSubscribe(ws: WebSocket, message: WSMessage): void {
    try {
      const { machineId, variableType, variableAddress, interval = 5000 } = message.payload;
      
      if (!machineId) {
        this.sendError(ws, 'machineId is required for subscription');
        return;
      }

      const subscriptionId = message.subscriptionId || 
        `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const subscription: StreamSubscription = {
        id: subscriptionId,
        machineId,
        variableType,
        variableAddress,
        interval: Math.max(interval, 1000), // Minimum 1 second
        lastSent: new Date(0), // Start from epoch to send immediately
      };

      // Add to client subscriptions
      const clientSubscriptions = this.clients.get(ws);
      if (clientSubscriptions) {
        clientSubscriptions.add(subscription);
        this.subscriptions.set(subscriptionId, subscription);
      }

      this.sendMessage(ws, {
        type: 'subscribe',
        payload: { 
          success: true, 
          subscriptionId,
          message: 'Subscription created successfully' 
        },
        subscriptionId,
        timestamp: new Date(),
      });

      logger.info('Created data subscription', {
        subscriptionId,
        machineId,
        variableType,
        variableAddress,
        interval,
      });
    } catch (error) {
      logger.error('Failed to handle subscription:', error);
      this.sendError(ws, 'Failed to create subscription');
    }
  }

  private handleUnsubscribe(ws: WebSocket, message: WSMessage): void {
    try {
      const subscriptionId = message.subscriptionId;
      
      if (!subscriptionId) {
        this.sendError(ws, 'subscriptionId is required for unsubscribe');
        return;
      }

      const clientSubscriptions = this.clients.get(ws);
      if (clientSubscriptions) {
        // Find and remove subscription
        for (const sub of clientSubscriptions) {
          if (sub.id === subscriptionId) {
            clientSubscriptions.delete(sub);
            this.subscriptions.delete(subscriptionId);
            break;
          }
        }
      }

      this.sendMessage(ws, {
        type: 'unsubscribe',
        payload: { success: true, subscriptionId },
        subscriptionId,
        timestamp: new Date(),
      });

      logger.info('Removed data subscription', { subscriptionId });
    } catch (error) {
      logger.error('Failed to handle unsubscribe:', error);
      this.sendError(ws, 'Failed to remove subscription');
    }
  }

  private handleDisconnection(ws: WebSocket): void {
    const clientSubscriptions = this.clients.get(ws);
    if (clientSubscriptions) {
      // Remove all subscriptions for this client
      clientSubscriptions.forEach(sub => {
        this.subscriptions.delete(sub.id);
      });
      this.clients.delete(ws);
    }
  }

  private async streamDataToClients(): Promise<void> {
    const now = new Date();
    
    for (const [ws, subscriptions] of this.clients) {
      if (ws.readyState !== WebSocket.OPEN) continue;

      for (const subscription of subscriptions) {
        const timeSinceLastSent = now.getTime() - subscription.lastSent.getTime();
        
        if (timeSinceLastSent >= subscription.interval) {
          await this.sendDataForSubscription(ws, subscription);
          subscription.lastSent = now;
        }
      }
    }
  }

  private async sendDataForSubscription(
    ws: WebSocket, 
    subscription: StreamSubscription
  ): Promise<void> {
    try {
      // For now, send empty data since we don't have access to data points
      // In a real implementation, this would get data from the scheduler
      const dataPoints: DataPoint[] = [];

      if (dataPoints.length > 0) {
        this.sendMessage(ws, {
          type: 'data',
          payload: {
            dataPoints,
            count: dataPoints.length,
            timeRange: { startTime: new Date(), endTime: new Date() },
          },
          subscriptionId: subscription.id,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error('Failed to send data for subscription:', {
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : String(error),
      });
      
      this.sendError(ws, 'Failed to fetch data', subscription.id);
    }
  }

  private sendMessage(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Failed to send WebSocket message:', error);
      }
    }
  }

  private sendError(ws: WebSocket, message: string, subscriptionId?: string): void {
    this.sendMessage(ws, {
      type: 'error',
      payload: { error: message },
      subscriptionId,
      timestamp: new Date(),
    });
  }

  // Public methods for external use
  async broadcastDataUpdate(dataPoints: DataPoint[]): Promise<void> {
    if (!this.isRunning || dataPoints.length === 0) return;

    const message: WSMessage = {
      type: 'data',
      payload: {
        dataPoints,
        count: dataPoints.length,
        realtime: true,
      },
      timestamp: new Date(),
    };

    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, message);
      }
    });

    logger.debug(`Broadcasted ${dataPoints.length} data points to ${this.wss.clients.size} clients`);
  }

  getStats(): {
    isRunning: boolean;
    connectedClients: number;
    activeSubscriptions: number;
  } {
    return {
      isRunning: this.isRunning,
      connectedClients: this.clients.size,
      activeSubscriptions: this.subscriptions.size,
    };
  }
}
