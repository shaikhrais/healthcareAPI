// Role-based permission helpers based on Jane App's access levels

const ROLE_HIERARCHY = {
  owner: 13, // Practice Owner - Highest authority
  full_access: 12,
  admin_billing: 11,
  admin_scheduling: 10,
  admin_reports: 9,
  practitioner_frontdesk: 8,
  practitioner_limited: 7,
  frontdesk_only: 6,
  billing_only: 5,
  scheduler_only: 4,
  support_staff: 3,
  patient: 2,
  no_access: 1,
};

// Check if user has minimum role level
const hasMinimumRole = (userRole, minimumRole) =>
  ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];

// Check if user can view all patients
const canViewAllPatients = (user) =>
  [
    'owner',
    'full_access',
    'admin_billing',
    'admin_scheduling',
    'admin_reports',
    'practitioner_frontdesk',
    'frontdesk_only',
  ].includes(user.role);

// Check if user can view other staff schedules
const canViewAllSchedules = (user) =>
  [
    'owner',
    'full_access',
    'admin_billing',
    'admin_scheduling',
    'admin_reports',
    'practitioner_frontdesk',
    'frontdesk_only',
    'scheduler_only',
  ].includes(user.role);

// Check if user can manage billing
const canAccessBilling = (user) =>
  ['owner', 'full_access', 'admin_billing', 'billing_only'].includes(user.role) ||
  user.permissions?.accessBilling === true;

// Check if user can view shared charts
const canViewSharedCharts = (user) =>
  user.role === 'owner' || user.permissions?.viewChartsShared === true;

// Check if user can manage shifts
const canManageShifts = (user) =>
  ['owner', 'full_access', 'admin_billing', 'admin_scheduling', 'scheduler_only'].includes(
    user.role
  ) || user.permissions?.manageShifts === true;

// Check if user can edit patient records
const canEditPatient = (user, patientId, patientPractitionerId) => {
  // Owner and full access can edit all
  if (
    [
      'owner',
      'full_access',
      'admin_billing',
      'admin_scheduling',
      'practitioner_frontdesk',
      'frontdesk_only',
    ].includes(user.role)
  ) {
    return true;
  }

  // Limited practitioners can only edit their own patients
  if (user.role === 'practitioner_limited') {
    return user._id.toString() === patientPractitionerId?.toString();
  }

  return false;
};

// Check if user can process payments
const canProcessPayments = (user) =>
  ['owner', 'full_access', 'admin_billing', 'billing_only'].includes(user.role) ||
  user.permissions?.accessBilling === true;

// Check if user can manage clinic settings
const canManageSettings = (user) =>
  ['owner', 'full_access', 'admin_billing', 'admin_scheduling'].includes(user.role);

// Check if user can view reports
const canViewReports = (user) =>
  ['owner', 'full_access', 'admin_billing', 'admin_reports', 'admin_scheduling'].includes(
    user.role
  );

// Check if user can schedule appointments
const canScheduleAppointments = (user) =>
  [
    'owner',
    'full_access',
    'admin_billing',
    'admin_scheduling',
    'practitioner_frontdesk',
    'frontdesk_only',
    'scheduler_only',
    'practitioner_limited',
  ].includes(user.role);

// Check if user can check-in patients
const canCheckInPatients = (user) =>
  [
    'owner',
    'full_access',
    'admin_billing',
    'admin_scheduling',
    'practitioner_frontdesk',
    'frontdesk_only',
    'support_staff',
  ].includes(user.role);

// Check if user can manage patient files
const canManagePatientFiles = (user) =>
  [
    'owner',
    'full_access',
    'admin_billing',
    'practitioner_frontdesk',
    'frontdesk_only',
    'practitioner_limited',
  ].includes(user.role);

// Check if user is owner (for special privileges)
const isOwner = (user) => user.role === 'owner';

// Check if user can manage staff roles (owner only)
const canManageStaffRoles = (user) => user.role === 'owner';

// Check if user can delete practice data (owner only)
const canDeletePracticeData = (user) => user.role === 'owner';

// Middleware to require minimum role
const requireRole = (minimumRole) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!hasMinimumRole(req.user.role, minimumRole)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  next();
};

// Middleware to require specific permission
const requirePermission = (permissionCheck) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!permissionCheck(req.user)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  next();
};

module.exports = {
  ROLE_HIERARCHY,
  hasMinimumRole,
  canViewAllPatients,
  canViewAllSchedules,
  canAccessBilling,
  canViewSharedCharts,
  canManageShifts,
  canEditPatient,
  canProcessPayments,
  canManageSettings,
  canViewReports,
  canScheduleAppointments,
  canCheckInPatients,
  canManagePatientFiles,
  isOwner,
  canManageStaffRoles,
  canDeletePracticeData,
  requireRole,
  requirePermission,
};
