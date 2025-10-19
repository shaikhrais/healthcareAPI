/**
 * Production MongoDB Configuration
 * Handles production database setup with proper error handling and validation
 */

const mongoose = require('mongoose');
const config = require('./env.config');
const logger = require('./logger.config');

class ProductionDatabase {
  constructor() {
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Connect to production MongoDB with retry logic
   */
  async connect() {
    if (this.isConnected) {
      logger.info('Database already connected');
      return;
    }

    try {
      await this.connectWithRetry();
      this.setupEventHandlers();
      await this.validateConnection();
      logger.info('✅ Production MongoDB connected successfully');
    } catch (error) {
      logger.error('❌ Failed to connect to production MongoDB', {
        error: error.message,
        retries: this.connectionRetries,
      });
      throw error;
    }
  }

  /**
   * Connect with retry logic for production resilience
   */
  async connectWithRetry() {
    while (this.connectionRetries < this.maxRetries) {
      try {
        await mongoose.connect(config.mongodb.uri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 30000,
          socketTimeoutMS: 75000,
          // Production-specific options
          bufferCommands: false, // Disable mongoose buffering
          autoIndex: false, // Don't build indexes automatically
          maxConnecting: 2, // Limit concurrent connections
          autoCreate: false, // Don't auto-create collections
        });

        this.isConnected = true;
        this.connectionRetries = 0;
        return;
      } catch (error) {
        this.connectionRetries++;
        logger.warn(`Database connection attempt ${this.connectionRetries} failed`, {
          error: error.message,
          nextRetryIn: this.retryDelay / 1000,
        });

        if (this.connectionRetries >= this.maxRetries) {
          throw new Error(
            `Failed to connect to MongoDB after ${this.maxRetries} attempts: ${error.message}`
          );
        }

        await this.delay(this.retryDelay);
        this.retryDelay *= 1.5; // Exponential backoff
      }
    }
  }

  /**
   * Setup MongoDB event handlers for production monitoring
   */
  setupEventHandlers() {
    const db = mongoose.connection;

    db.on('connected', () => {
      logger.info('📦 MongoDB connected');
    });

    db.on('error', (error) => {
      logger.error('🚨 MongoDB connection error', { error: error.message });
      this.isConnected = false;
    });

    db.on('disconnected', () => {
      logger.warn('📤 MongoDB disconnected');
      this.isConnected = false;

      // Attempt to reconnect in production
      if (config.isProduction) {
        logger.info('🔄 Attempting to reconnect to MongoDB...');
        setTimeout(() => this.connect(), this.retryDelay);
      }
    });

    db.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected');
      this.isConnected = true;
    });

    // Handle process termination gracefully
    process.on('SIGINT', () => this.disconnect());
    process.on('SIGTERM', () => this.disconnect());
  }

  /**
   * Validate database connection and basic operations
   */
  async validateConnection() {
    try {
      // Test basic database operations
      await mongoose.connection.db.admin().ping();
      logger.info('✅ Database ping successful');

      // Check database permissions
      const dbName = mongoose.connection.db.databaseName;
      logger.info('📊 Connected to database:', dbName);

      // Validate indexes exist (will run in background)
      setTimeout(() => this.validateIndexes(), 5000);
    } catch (error) {
      logger.error('❌ Database validation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate critical indexes exist (non-blocking)
   */
  async validateIndexes() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      logger.info(`📋 Database contains ${collections.length} collections`);

      // Log any collections without indexes (for monitoring)
      for (const collection of collections) {
        const indexes = await mongoose.connection.db
          .collection(collection.name)
          .indexes();
        if (indexes.length === 1) {
          // Only has the default _id index
          logger.warn(`⚠️ Collection '${collection.name}' has no custom indexes`);
        }
      }
    } catch (error) {
      logger.warn('⚠️ Index validation failed (non-critical)', { error: error.message });
    }
  }

  /**
   * Gracefully disconnect from database
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      logger.info('👋 MongoDB disconnected gracefully');
      this.isConnected = false;
    } catch (error) {
      logger.error('❌ Error disconnecting from MongoDB', { error: error.message });
    }
  }

  /**
   * Get database health status
   */
  async getHealthStatus() {
    if (!this.isConnected) {
      return { status: 'disconnected' };
    }

    try {
      const ping = await mongoose.connection.db.admin().ping();
      const stats = await mongoose.connection.db.stats();

      return {
        status: 'connected',
        database: mongoose.connection.db.databaseName,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        collections: stats.collections,
        dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
        ping: ping.ok === 1,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const productionDB = new ProductionDatabase();

module.exports = {
  productionDB,
  connectToProduction: () => productionDB.connect(),
  disconnectFromProduction: () => productionDB.disconnect(),
  getProductionDBHealth: () => productionDB.getHealthStatus(),
};