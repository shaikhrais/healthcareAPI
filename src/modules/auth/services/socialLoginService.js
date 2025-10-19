// Service layer for social login business logic
const SocialLoginProvider = require('../models/SocialLoginProvider');

const getOrgId = (req) => req.headers['x-organization-id'];

const findConfig = async (organizationId) => {
  return SocialLoginProvider.findOne({ organization: organizationId, isDeleted: false });
};

module.exports = {
  getOrgId,
  findConfig,
  SocialLoginProvider,
};
