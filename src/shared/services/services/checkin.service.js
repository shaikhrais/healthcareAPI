
const CheckIn = require('../models/CheckIn');
const Appointment = require('../models/Appointment');
const NotificationService = require('./notification.service');
class CheckInService {
  /**
   * Check in a patient for their appointment
   */
  async checkInPatient(appointmentId, checkInData, userId) {
    try {
      // Verify appointment exists and get details
      const appointment = await Appointment.findById(appointmentId)
        .populate('patientId')
        .populate('practitionerId');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Check for existing active check-in
      const existingCheckIn = await CheckIn.findOne({
        appointmentId,
        status: { $in: ['waiting', 'in_room', 'with_practitioner'] },
      });

      if (existingCheckIn) {
        throw new Error('Patient already checked in');
      }

      // Calculate estimated wait time based on current queue
      const queueLength = await CheckIn.countDocuments({
        practitionerId: appointment.practitionerId._id,
        status: { $in: ['waiting', 'in_room'] },
      });

      const estimatedWaitTime = queueLength * 15; // 15 minutes per patient

      // Create check-in
      const checkIn = await CheckIn.create({
        appointmentId,
        patientId: appointment.patientId._id,
        practitionerId: appointment.practitionerId._id,
        checkInMethod: checkInData.checkInMethod || 'front_desk',
        checkInBy: userId,
        notes: checkInData.notes,
        estimatedWaitTime,
      });

      // Send notification to practitioner
      await NotificationService.sendCheckInNotification(
        appointment.practitionerId._id,
        appointment.patientId,
        checkIn
      );

      return await CheckIn.findById(checkIn._id)
        .populate('patientId', 'firstName lastName dateOfBirth')
        .populate('practitionerId', 'firstName lastName')
        .populate('appointmentId', 'date time type')
        .populate('checkInBy', 'firstName lastName');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update check-in status with automatic workflow transitions
   */
  async updateStatus(checkInId, newStatus, roomNumber = null) {
    try {
      const checkIn = await CheckIn.findById(checkInId)
        .populate('patientId')
        .populate('practitionerId');

      if (!checkIn) {
        throw new Error('Check-in record not found');
      }

      const oldStatus = checkIn.status;
      checkIn.status = newStatus;

      if (roomNumber) {
        checkIn.roomNumber = roomNumber;
      }

      await checkIn.save();

      // Send notifications based on status change
      if (newStatus === 'in_room' && oldStatus === 'waiting') {
        // Notify patient their room is ready
        await NotificationService.sendRoomReadyNotification(checkIn.patientId._id, roomNumber);
      } else if (newStatus === 'with_practitioner' && oldStatus === 'in_room') {
        // Notify practitioner patient is ready
        await NotificationService.sendPatientReadyNotification(
          checkIn.practitionerId._id,
          checkIn.patientId,
          roomNumber
        );
      } else if (newStatus === 'completed') {
        // Mark appointment as completed
        await Appointment.findByIdAndUpdate(checkIn.appointmentId, {
          status: 'completed',
        });
      } else if (newStatus === 'no_show') {
        // Mark appointment as no-show
        await Appointment.findByIdAndUpdate(checkIn.appointmentId, {
          status: 'no_show',
        });
      }

      return await CheckIn.findById(checkInId)
        .populate('patientId', 'firstName lastName')
        .populate('practitionerId', 'firstName lastName')
        .populate('appointmentId', 'date time type');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Record vital signs for a checked-in patient
   */
  async recordVitals(checkInId, vitalsData) {
    try {
      const checkIn = await CheckIn.findById(checkInId);

      if (!checkIn) {
        throw new Error('Check-in record not found');
      }

      checkIn.vitals = {
        ...checkIn.vitals,
        ...vitalsData,
      };

      await checkIn.save();

      // Notify practitioner if vitals are concerning
      const isConcerning = this.checkVitalsForConcerns(vitalsData);
      if (isConcerning) {
        await NotificationService.sendConcerningVitalsAlert(
          checkIn.practitionerId,
          checkIn.patientId,
          vitalsData
        );
      }

      return checkIn;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if vital signs are concerning (basic thresholds)
   */
  checkVitalsForConcerns(vitals) {
    if (vitals.heartRate) {
      if (vitals.heartRate < 50 || vitals.heartRate > 120) return true;
    }
    if (vitals.temperature) {
      if (vitals.temperature < 95 || vitals.temperature > 100.4) return true;
    }
    if (vitals.bloodPressure) {
      const [systolic, diastolic] = vitals.bloodPressure.split('/').map(Number);
      if (systolic > 180 || systolic < 90 || diastolic > 120 || diastolic < 60) return true;
    }
    return false;
  }

  /**
   * Get waiting queue with estimated wait times
   */
  async getQueue(practitionerId) {
    try {
      const queue = await CheckIn.getWaitingQueue(practitionerId);

      // Add position in queue to each check-in
      return queue.map((checkIn, index) => ({
        ...checkIn.toObject(),
        queuePosition: index + 1,
        estimatedCallTime: new Date(Date.now() + index * 15 * 60000), // 15 min per patient
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get comprehensive waiting room statistics
   */
  async getWaitingRoomStats() {
    try {
      const basicStatus = await CheckIn.getWaitingRoomStatus();

      // Get additional stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completedToday = await CheckIn.countDocuments({
        checkInTime: { $gte: today },
        status: 'completed',
      });

      const noShowsToday = await CheckIn.countDocuments({
        checkInTime: { $gte: today },
        status: 'no_show',
      });

      const avgWaitTime = await CheckIn.aggregate([
        {
          $match: {
            checkInTime: { $gte: today },
            actualWaitTime: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            avgWait: { $avg: '$actualWaitTime' },
          },
        },
      ]);

      return {
        ...basicStatus,
        completedToday,
        noShowsToday,
        averageWaitTime: avgWaitTime[0]?.avgWait || 0,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Auto-advance patient through workflow
   */
  async autoAdvanceWorkflow(checkInId) {
    try {
      const checkIn = await CheckIn.findById(checkInId);

      if (!checkIn) {
        throw new Error('Check-in record not found');
      }

      let newStatus = checkIn.status;

      // Auto-advance logic
      if (checkIn.status === 'waiting') {
        // Check if a room is available (simplified - would integrate with room management)
        const availableRoom = await this.findAvailableRoom();
        if (availableRoom) {
          newStatus = 'in_room';
          checkIn.roomNumber = availableRoom;
        }
      } else if (checkIn.status === 'in_room') {
        // Check if practitioner is available
        const practitionerAvailable = await this.isPractitionerAvailable(checkIn.practitionerId);
        if (practitionerAvailable) {
          newStatus = 'with_practitioner';
        }
      }

      if (newStatus !== checkIn.status) {
        return await this.updateStatus(checkInId, newStatus, checkIn.roomNumber);
      }

      return checkIn;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find available room (simplified implementation)
   */
  async findAvailableRoom() {
    const occupiedRooms = await CheckIn.find({
      status: { $in: ['in_room', 'with_practitioner'] },
      roomNumber: { $exists: true, $ne: null },
    }).distinct('roomNumber');

    const allRooms = ['101', '102', '103', '104', '105', '106', '107', '108'];
    const availableRooms = allRooms.filter((room) => !occupiedRooms.includes(room));

    return availableRooms[0] || null;
  }

  /**
   * Check if practitioner is available
   */
  async isPractitionerAvailable(practitionerId) {
    const activePatients = await CheckIn.countDocuments({
      practitionerId,
      status: 'with_practitioner',
    });

    return activePatients === 0;
  }

  /**
   * Get patient check-in history with analytics
   */
  async getPatientHistory(patientId, limit = 20) {
    try {
      const checkIns = await CheckIn.find({ patientId })
        .sort({ checkInTime: -1 })
        .limit(limit)
        .populate('practitionerId', 'firstName lastName')
        .populate('appointmentId', 'date time type');

      // Calculate patient-specific stats
      const avgWaitTime = await CheckIn.aggregate([
        {
          $match: {
            patientId,
            actualWaitTime: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            avgWait: { $avg: '$actualWaitTime' },
            totalVisits: { $sum: 1 },
          },
        },
      ]);

      return {
        checkIns,
        stats: avgWaitTime[0] || { avgWait: 0, totalVisits: 0 },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Batch check-in for group appointments
   */
  async batchCheckIn(appointmentIds, checkInMethod, userId) {
    try {
      const results = [];

      for (const appointmentId of appointmentIds) {
        try {
          const checkIn = await this.checkInPatient(appointmentId, { checkInMethod }, userId);
          results.push({ success: true, appointmentId, checkIn });
        } catch (error) {
          results.push({ success: false, appointmentId, error: error.message });
        }
      }

      return results;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CheckInService();
