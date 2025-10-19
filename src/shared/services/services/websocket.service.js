const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');

/**
 * WebSocket Service for Real-Time Dashboard Updates
 *
 * Provides real-time streaming of dashboard metrics to connected clients.
 */

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.subscriptions = new Map(); // userId -> Set of metric types
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws/dashboard' });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('WebSocket server initialized on path: /ws/dashboard');
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws, req) {
    try {
      // Parse query parameters for authentication
      const parameters = url.parse(req.url, true).query;
      const { token } = parameters;

      if (!token) {
        ws.close(1008, 'Authentication token required');
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const userId = decoded.id;

      // Store connection
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      // Initialize subscriptions
      if (!this.subscriptions.has(userId)) {
        this.subscriptions.set(userId, new Set());
      }

      console.log(`WebSocket client connected: ${userId}`);

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connected',
        message: 'Connected to real-time dashboard updates',
        userId,
        timestamp: new Date().toISOString(),
      });

      // Handle messages from client
      ws.on('message', (message) => {
        this.handleMessage(ws, userId, message);
      });

      // Handle disconnection
      ws.on('close', () => {
        this.handleDisconnection(ws, userId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1008, 'Authentication failed');
    }
  }

  /**
   * Handle messages from client
   */
  handleMessage(ws, userId, message) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(ws, userId, data.metrics);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(ws, userId, data.metrics);
          break;
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        default:
          this.sendToClient(ws, { type: 'error', message: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendToClient(ws, { type: 'error', message: 'Invalid message format' });
    }
  }

  /**
   * Handle subscription request
   */
  handleSubscribe(ws, userId, metrics) {
    if (!Array.isArray(metrics)) {
      metrics = [metrics];
    }

    const userSubscriptions = this.subscriptions.get(userId);
    metrics.forEach((metric) => userSubscriptions.add(metric));

    this.sendToClient(ws, {
      type: 'subscribed',
      metrics,
      message: `Subscribed to ${metrics.length} metric(s)`,
    });

    console.log(`User ${userId} subscribed to:`, metrics);
  }

  /**
   * Handle unsubscription request
   */
  handleUnsubscribe(ws, userId, metrics) {
    if (!Array.isArray(metrics)) {
      metrics = [metrics];
    }

    const userSubscriptions = this.subscriptions.get(userId);
    metrics.forEach((metric) => userSubscriptions.delete(metric));

    this.sendToClient(ws, {
      type: 'unsubscribed',
      metrics,
      message: `Unsubscribed from ${metrics.length} metric(s)`,
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(ws, userId) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        this.clients.delete(userId);
        this.subscriptions.delete(userId);
      }
    }
    console.log(`WebSocket client disconnected: ${userId}`);
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast metric update to subscribed users
   */
  broadcastMetricUpdate(metricType, data, targetUserId = null) {
    const message = {
      type: 'metric_update',
      metricType,
      data,
      timestamp: new Date().toISOString(),
    };

    if (targetUserId) {
      // Send to specific user
      this.broadcastToUser(targetUserId, metricType, message);
    } else {
      // Broadcast to all subscribed users
      for (const [userId, subscriptions] of this.subscriptions.entries()) {
        if (subscriptions.has(metricType) || subscriptions.has('all')) {
          this.broadcastToUser(userId, metricType, message);
        }
      }
    }
  }

  /**
   * Broadcast to all connections of a user
   */
  broadcastToUser(userId, metricType, message) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.forEach((ws) => {
        this.sendToClient(ws, message);
      });
    }
  }

  /**
   * Broadcast system alert
   */
  broadcastAlert(alert) {
    const message = {
      type: 'alert',
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      timestamp: new Date().toISOString(),
    };

    // Send to all connected clients
    for (const userClients of this.clients.values()) {
      userClients.forEach((ws) => {
        this.sendToClient(ws, message);
      });
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: Array.from(this.clients.values()).reduce((sum, set) => sum + set.size, 0),
      uniqueUsers: this.clients.size,
      activeSubscriptions: Array.from(this.subscriptions.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ),
    };
  }

  /**
   * Close all connections
   */
  close() {
    if (this.wss) {
      this.wss.clients.forEach((ws) => {
        ws.close(1000, 'Server shutting down');
      });
      this.wss.close();
    }
  }
}

module.exports = new WebSocketService();
