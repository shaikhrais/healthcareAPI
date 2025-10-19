/**
 * Sync Module Exports
 * Offline synchronization for mobile applications
 */

module.exports = {
  routes: require('./routes/sync'),
  models: {
    SyncState: require('./models/SyncState'),
    PendingSync: require('./models/PendingSync'),
  },
  services: {
    syncService: require('./services/syncService'),
  },
  controllers: {
    syncController: require('./controllers/syncController'),
  },
};