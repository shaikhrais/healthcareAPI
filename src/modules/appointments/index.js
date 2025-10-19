// Appointments Module Exports
module.exports = {
  routes: require('./routes/appointments'),
  checkinRoutes: require('./routes/checkin'),
  models: {
    Appointment: require('./models/Appointment'),
    CheckIn: require('./models/CheckIn')
  }
};