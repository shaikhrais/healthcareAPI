const {
  getOrgId,
  findConfig,
  SocialLoginProvider,
} = require('../services/socialLoginService');

// Controller methods for social login

exports.initialize = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    let config = await findConfig(organizationId);
    if (config) {
      return res.status(400).json({ success: false, error: 'Social login configuration already exists' });
    }
    config = await SocialLoginProvider.create({ organization: organizationId, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Social login configuration initialized', config });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to initialize social login', details: error.message });
  }
};

exports.getConfig = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const config = await findConfig(organizationId);
    if (!config) {
      return res.status(404).json({ success: false, error: 'Social login configuration not found' });
    }
    const responseConfig = config.toObject();
    const { providers } = responseConfig;
    if (providers.google?.clientSecret) providers.google.clientSecret = '***';
    if (providers.facebook?.appSecret) providers.facebook.appSecret = '***';
    if (providers.apple?.privateKey) providers.apple.privateKey = '***';
    if (providers.microsoft?.clientSecret) providers.microsoft.clientSecret = '***';
    if (providers.github?.clientSecret) providers.github.clientSecret = '***';
    if (providers.twitter?.apiSecret) providers.twitter.apiSecret = '***';
    if (providers.linkedin?.clientSecret) providers.linkedin.clientSecret = '***';
    res.json({ success: true, config: responseConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve configuration', details: error.message });
  }
};

// ...continue for all other route handlers, splitting logic as needed...
