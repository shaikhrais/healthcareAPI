/**
 * Offline Sync Service
 * Handles data synchronization for mobile offline mode
 */

const SyncState = require('../models/SyncState');
const PendingSync = require('../models/PendingSync');

// Import models that can be synced
const Appointment = require('../../appointments/models/Appointment');
const Patient = require('../../patients/models/Patient');

class SyncService {
  constructor() {
    this.syncSequence = 0;
  }

  /**
   * Initialize sync state for a device
   */
  async initializeDevice(userId, deviceId, deviceType, capabilities = {}) {
    try {
      const syncState = await SyncState.findOrCreate(userId, deviceId, deviceType);
      
      // Update device capabilities
      syncState.capabilities = {
        ...syncState.capabilities,
        ...capabilities,
      };
      
      // Mark as online
      await syncState.updateConnectionStatus(true);
      
      return {
        success: true,
        syncState,
        message: 'Device initialized for sync',
      };
    } catch (error) {
      console.error('Device initialization error:', error);
      throw new Error(`Failed to initialize device: ${error.message}`);
    }
  }

  /**
   * Get sync status for a device
   */
  async getSyncStatus(userId, deviceId) {
    try {
      const syncState = await SyncState.findOne({ user: userId, deviceId });
      
      if (!syncState) {
        throw new Error('Device not found or not initialized');
      }

      const pendingChanges = await PendingSync.countDocuments({
        user: userId,
        deviceId,
        status: { $in: ['pending', 'failed'] },
      });

      const conflicts = await PendingSync.countDocuments({
        user: userId,
        deviceId,
        status: 'conflict',
      });

      return {
        syncState,
        pendingChanges,
        conflicts,
        lastSync: syncState.lastSyncTimestamp,
        isOnline: syncState.isOnline,
        totalPendingChanges: syncState.totalPendingChanges,
      };
    } catch (error) {
      console.error('Get sync status error:', error);
      throw new Error(`Failed to get sync status: ${error.message}`);
    }
  }

  /**
   * Queue a change for synchronization
   */
  async queueChange(userId, deviceId, dataType, recordId, operation, changeData, originalData = null) {
    try {
      this.syncSequence += 1;

      const pendingSync = new PendingSync({
        user: userId,
        deviceId,
        dataType,
        recordId,
        operation,
        changeData,
        originalData,
        clientTimestamp: new Date(),
        sequence: this.syncSequence,
        priority: this.getPriorityForDataType(dataType),
      });

      await pendingSync.save();

      // Update sync state
      const syncState = await SyncState.findOne({ user: userId, deviceId });
      if (syncState) {
        await syncState.updateSyncState(dataType, {
          pendingChanges: (syncState.syncStates[dataType]?.pendingChanges || 0) + 1,
        });
      }

      return {
        success: true,
        pendingSync,
        message: 'Change queued for sync',
      };
    } catch (error) {
      console.error('Queue change error:', error);
      throw new Error(`Failed to queue change: ${error.message}`);
    }
  }

  /**
   * Process pending synchronization
   */
  async processPendingSync(userId, deviceId, options = {}) {
    try {
      const { limit = 50, dataType } = options;

      const pendingChanges = await PendingSync.getPendingForDevice(userId, deviceId, {
        limit,
        dataType,
      });

      const results = {
        processed: 0,
        completed: 0,
        failed: 0,
        conflicts: 0,
        errors: [],
      };

      for (const change of pendingChanges) {
        try {
          await change.startSync();
          
          const result = await this.processChange(change);
          
          if (result.success) {
            await change.markCompleted();
            results.completed += 1;
          } else if (result.conflict) {
            await change.markConflict(result.serverData, result.clientData);
            results.conflicts += 1;
          } else {
            await change.markFailed(result.error);
            results.failed += 1;
            results.errors.push({
              changeId: change._id,
              error: result.error,
            });
          }
          
          results.processed += 1;
        } catch (error) {
          await change.markFailed(error.message);
          results.failed += 1;
          results.errors.push({
            changeId: change._id,
            error: error.message,
          });
        }
      }

      // Update sync state
      const syncState = await SyncState.findOne({ user: userId, deviceId });
      if (syncState) {
        await syncState.updateSyncState(dataType || 'all', {
          lastSync: new Date(),
          version: (syncState.syncStates[dataType]?.version || 0) + 1,
          pendingChanges: Math.max(0, (syncState.syncStates[dataType]?.pendingChanges || 0) - results.completed),
        });
      }

      return results;
    } catch (error) {
      console.error('Process pending sync error:', error);
      throw new Error(`Failed to process pending sync: ${error.message}`);
    }
  }

  /**
   * Process individual change
   */
  async processChange(pendingChange) {
    try {
      const { dataType, recordId, operation, changeData } = pendingChange;

      switch (dataType) {
        case 'appointment':
          return await this.processAppointmentChange(recordId, operation, changeData);
        case 'patient':
          return await this.processPatientChange(recordId, operation, changeData);
        case 'clinicalNote':
          return await this.processClinicalNoteChange(recordId, operation, changeData);
        default:
          return { success: false, error: `Unsupported data type: ${dataType}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process appointment changes
   */
  async processAppointmentChange(recordId, operation, changeData) {
    try {
      switch (operation) {
        case 'create':
          const newAppointment = new Appointment(changeData);
          await newAppointment.save();
          return { success: true };

        case 'update':
          const existingAppointment = await Appointment.findById(recordId);
          if (!existingAppointment) {
            return { success: false, error: 'Appointment not found' };
          }

          // Check for conflicts (simple version checking)
          if (existingAppointment.updatedAt > changeData.clientTimestamp) {
            return {
              success: false,
              conflict: true,
              serverData: existingAppointment.toObject(),
              clientData: changeData,
            };
          }

          Object.assign(existingAppointment, changeData);
          await existingAppointment.save();
          return { success: true };

        case 'delete':
          await Appointment.findByIdAndDelete(recordId);
          return { success: true };

        default:
          return { success: false, error: `Unsupported operation: ${operation}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process patient changes
   */
  async processPatientChange(recordId, operation, changeData) {
    try {
      switch (operation) {
        case 'create':
          const newPatient = new Patient(changeData);
          await newPatient.save();
          return { success: true };

        case 'update':
          const existingPatient = await Patient.findById(recordId);
          if (!existingPatient) {
            return { success: false, error: 'Patient not found' };
          }

          // Check for conflicts
          if (existingPatient.updatedAt > changeData.clientTimestamp) {
            return {
              success: false,
              conflict: true,
              serverData: existingPatient.toObject(),
              clientData: changeData,
            };
          }

          Object.assign(existingPatient, changeData);
          await existingPatient.save();
          return { success: true };

        case 'delete':
          await Patient.findByIdAndUpdate(recordId, { deleted: true });
          return { success: true };

        default:
          return { success: false, error: `Unsupported operation: ${operation}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process clinical note changes (placeholder)
   */
  async processClinicalNoteChange(recordId, operation, changeData) {
    // Placeholder - would integrate with clinical notes service
    return { success: true };
  }

  /**
   * Get incremental sync data since last sync
   */
  async getIncrementalSync(userId, deviceId, dataType, lastSyncTime) {
    try {
      const syncState = await SyncState.findOne({ user: userId, deviceId });
      if (!syncState) {
        throw new Error('Device not found');
      }

      const query = {
        updatedAt: { $gt: new Date(lastSyncTime) },
      };

      let data = [];

      switch (dataType) {
        case 'appointments':
          data = await Appointment.find(query).limit(100);
          break;
        case 'patients':
          data = await Patient.find({ ...query, deleted: { $ne: true } }).limit(100);
          break;
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

      return {
        success: true,
        data,
        count: data.length,
        syncTime: new Date(),
        hasMore: data.length === 100,
      };
    } catch (error) {
      console.error('Incremental sync error:', error);
      throw new Error(`Failed to get incremental sync: ${error.message}`);
    }
  }

  /**
   * Get conflicts for manual resolution
   */
  async getConflicts(userId, deviceId = null) {
    try {
      const conflicts = await PendingSync.getConflictsForUser(userId, { deviceId });
      
      return {
        success: true,
        conflicts,
        count: conflicts.length,
      };
    } catch (error) {
      console.error('Get conflicts error:', error);
      throw new Error(`Failed to get conflicts: ${error.message}`);
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(conflictId, resolution, resolvedData) {
    try {
      const conflict = await PendingSync.findById(conflictId);
      if (!conflict) {
        throw new Error('Conflict not found');
      }

      await conflict.resolveConflict(resolution, resolvedData);

      // Apply the resolved data
      if (resolution !== 'manual_resolve') {
        const dataToApply = resolution === 'server_wins' 
          ? conflict.conflictData.serverVersion 
          : conflict.conflictData.clientVersion;
          
        await this.processChange({
          dataType: conflict.dataType,
          recordId: conflict.recordId,
          operation: conflict.operation,
          changeData: dataToApply,
        });
      }

      return {
        success: true,
        message: 'Conflict resolved',
      };
    } catch (error) {
      console.error('Resolve conflict error:', error);
      throw new Error(`Failed to resolve conflict: ${error.message}`);
    }
  }

  /**
   * Update device connection status
   */
  async updateConnectionStatus(userId, deviceId, isOnline, quality = 'excellent') {
    try {
      const syncState = await SyncState.findOne({ user: userId, deviceId });
      if (!syncState) {
        throw new Error('Device not found');
      }

      await syncState.updateConnectionStatus(isOnline, quality);

      return {
        success: true,
        message: 'Connection status updated',
      };
    } catch (error) {
      console.error('Update connection status error:', error);
      throw new Error(`Failed to update connection status: ${error.message}`);
    }
  }

  /**
   * Get priority for data type
   */
  getPriorityForDataType(dataType) {
    const priorities = {
      appointment: 1, // Highest priority
      clinicalNote: 2,
      patient: 3,
      message: 4,
      document: 5, // Lowest priority
    };
    
    return priorities[dataType] || 5;
  }

  /**
   * Cleanup old sync data
   */
  async cleanup(options = {}) {
    try {
      const { 
        completedSyncDays = 7, 
        oldStateDays = 30,
        maxFailedAttempts = 5 
      } = options;

      const results = {
        completedSyncs: 0,
        oldStates: 0,
        failedSyncs: 0,
      };

      // Cleanup completed syncs
      results.completedSyncs = await PendingSync.cleanupCompleted(completedSyncDays);

      // Cleanup old sync states
      results.oldStates = await SyncState.cleanupOldStates(oldStateDays);

      // Remove permanently failed syncs
      const failedResult = await PendingSync.deleteMany({
        status: 'failed',
        syncAttempts: { $gte: maxFailedAttempts },
      });
      results.failedSyncs = failedResult.deletedCount;

      return {
        success: true,
        cleaned: results,
      };
    } catch (error) {
      console.error('Sync cleanup error:', error);
      throw new Error(`Failed to cleanup sync data: ${error.message}`);
    }
  }
}

module.exports = new SyncService();