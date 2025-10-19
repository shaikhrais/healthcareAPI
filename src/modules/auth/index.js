// Auth Module Exports
module.exports = {
  routes: require('./routes/auth'),
  mfaRoutes: require('./routes/mfa'),
  biometricRoutes: require('./routes/biometric'),
  models: {
    User: require('./models/User'),
    Session: require('./models/Session'),
    MFADevice: require('./models/MFADevice'),
    BiometricDevice: require('./models/BiometricDevice')
  }
};