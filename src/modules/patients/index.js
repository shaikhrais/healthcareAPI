// Patients Module Exports
module.exports = {
  routes: require('./routes/patients'),
  familyRoutes: require('./routes/family-members'),
  models: {
    Patient: require('./models/Patient'),
    FamilyMember: require('./models/FamilyMember'),
    PatientGroup: require('./models/PatientGroup')
  }
};