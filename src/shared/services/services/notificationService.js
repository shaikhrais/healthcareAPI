
const MessageTemplate = require('../models/MessageTemplate');
class NotificationService {
  constructor() {
    this.smsProvider = null; // Will be Twilio in production
    this.emailProvider = null; // Will be SendGrid/SES in production
  }

  // Replace template variables
  replaceVariables(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    }
    return result;
  }

  // Send appointment reminder
  async sendAppointmentReminder(appointment) {
    try {
      const template = await MessageTemplate.findOne({
        category: 'appointment_reminder',
        active: true,
      });

      if (!template) {
        console.log('No active reminder template found');
        return;
      }

      const data = {
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        practitionerName: `${appointment.practitioner.firstName} ${appointment.practitioner.lastName}`,
        date: new Date(appointment.startTime).toLocaleDateString(),
        time: new Date(appointment.startTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        treatmentName: appointment.treatment?.name || 'Appointment',
        duration: appointment.duration,
        clinicName: 'ExpoJane Clinic',
        clinicPhone: '(555) 123-4567',
        clinicAddress: '123 Health St, Toronto, ON',
      };

      // Send SMS
      if (template.type === 'sms' || template.type === 'both') {
        const smsBody = this.replaceVariables(template.smsBody, data);
        await this.sendSMS(appointment.patient.phone, smsBody);
      }

      // Send Email
      if (template.type === 'email' || template.type === 'both') {
        const emailSubject = this.replaceVariables(template.emailSubject, data);
        const emailBody = this.replaceVariables(template.emailBody, data);
        await this.sendEmail(appointment.patient.email, emailSubject, emailBody);
      }

      console.log(
        `✅ Reminder sent to ${appointment.patient.firstName} ${appointment.patient.lastName}`
      );
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }

  // Send appointment confirmation
  async sendAppointmentConfirmation(appointment) {
    try {
      const template = await MessageTemplate.findOne({
        category: 'appointment_confirmation',
        active: true,
      });

      if (!template) {
        console.log('No active confirmation template found');
        return;
      }

      const data = {
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        practitionerName: `${appointment.practitioner.firstName} ${appointment.practitioner.lastName}`,
        date: new Date(appointment.startTime).toLocaleDateString(),
        time: new Date(appointment.startTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        treatmentName: appointment.treatment?.name || 'Appointment',
        duration: appointment.duration,
        confirmationNumber: appointment._id.toString().slice(-8).toUpperCase(),
        clinicName: 'ExpoJane Clinic',
        clinicPhone: '(555) 123-4567',
      };

      if (template.type === 'sms' || template.type === 'both') {
        const smsBody = this.replaceVariables(template.smsBody, data);
        await this.sendSMS(appointment.patient.phone, smsBody);
      }

      if (template.type === 'email' || template.type === 'both') {
        const emailSubject = this.replaceVariables(template.emailSubject, data);
        const emailBody = this.replaceVariables(template.emailBody, data);
        await this.sendEmail(appointment.patient.email, emailSubject, emailBody);
      }

      console.log(
        `✅ Confirmation sent to ${appointment.patient.firstName} ${appointment.patient.lastName}`
      );
    } catch (error) {
      console.error('Error sending confirmation:', error);
    }
  }

  // Send SMS (placeholder - will use Twilio in production)
  async sendSMS(phone, message) {
    // TODO: Integrate with Twilio
    console.log(`📱 SMS to ${phone}: ${message}`);
    return { success: true, provider: 'mock' };
  }

  // Send Email (placeholder - will use SendGrid/SES in production)
  async sendEmail(email, subject, body) {
    // TODO: Integrate with SendGrid or AWS SES
    console.log(`📧 Email to ${email}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${body.substring(0, 100)}...`);
    return { success: true, provider: 'mock' };
  }

  // Schedule reminders for upcoming appointments
  async scheduleReminders() {
    const Appointment = require('../models/Appointment');

    // Find appointments in next 24-48 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      startTime: { $gte: tomorrow, $lt: dayAfterTomorrow },
      status: { $in: ['scheduled', 'confirmed'] },
      confirmationSent: { $exists: false },
    })
      .populate('patient', 'firstName lastName email phone')
      .populate('practitioner', 'firstName lastName')
      .populate('treatment', 'name');

    for (const appointment of appointments) {
      await this.sendAppointmentReminder(appointment);

      // Mark as sent
      appointment.confirmationSent = new Date();
      await appointment.save();
    }

    console.log(`📅 Processed ${appointments.length} reminder(s)`);
  }
}

module.exports = new NotificationService();
