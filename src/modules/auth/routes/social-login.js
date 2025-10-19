const express = require('express');


const { protect } = require('../middleware/auth');
const socialLoginController = require('../controllers/socialLoginController');
const router = express.Router();
// Apply authentication middleware to all routes except OAuth callbacks
router.use((req, res, next) => {
  if (req.path.startsWith('/callback/') || req.path.startsWith('/auth/')) {
    return next();
  }
  return protect(req, res, next);
});

/**
 * @route   POST /api/social-login/initialize
 * @desc    Initialize social login configuration
 * @access  Private
 */
router.post('/initialize', socialLoginController.initialize);

/**
 * @route   GET /api/social-login/config
 * @desc    Get social login configuration
 * @access  Private
 */
router.get('/config', socialLoginController.getConfig);
// ...repeat for all other routes, replacing inline handlers with controller methods...

/**
 * @route   PUT /api/social-login/config
 * @desc    Update general configuration
 * @access  Private
 */
router.put('/config', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const updates = req.body;

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    await config.updateConfig(updates);

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      config: config.config,
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/social-login/providers/:provider/enable
 * @desc    Enable a social login provider
 * @access  Private
 */
router.post('/providers/:provider/enable', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { provider } = req.params;
    const providerConfig = req.body;

    const validProviders = [
      'google',
      'facebook',
      'apple',
      'microsoft',
      'github',
      'twitter',
      'linkedin',
    ];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider',
      });
    }

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    await config.enableProvider(provider, providerConfig);

    res.json({
      success: true,
      message: `${provider} provider enabled successfully`,
    });
  } catch (error) {
    console.error('Enable provider error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enable provider',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/social-login/providers/:provider/disable
 * @desc    Disable a social login provider
 * @access  Private
 */
router.post('/providers/:provider/disable', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { provider } = req.params;

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    await config.disableProvider(provider);

    res.json({
      success: true,
      message: `${provider} provider disabled successfully`,
    });
  } catch (error) {
    console.error('Disable provider error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable provider',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/social-login/providers
 * @desc    Get all providers configuration
 * @access  Private
 */
router.get('/providers', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    // Mask sensitive data
    const providers = JSON.parse(JSON.stringify(config.providers));

    Object.keys(providers).forEach((key) => {
      if (providers[key].clientSecret) providers[key].clientSecret = '***';
      if (providers[key].appSecret) providers[key].appSecret = '***';
      if (providers[key].privateKey) providers[key].privateKey = '***';
      if (providers[key].apiSecret) providers[key].apiSecret = '***';
    });

    res.json({
      success: true,
      providers,
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve providers',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/social-login/accounts
 * @desc    Get all linked social accounts
 * @access  Private
 */
router.get('/accounts', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { userId } = req.query;

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    let accounts = config.socialAccounts;

    if (userId) {
      accounts = accounts.filter((a) => a.userId.toString() === userId);
    }

    // Mask sensitive tokens
    accounts = accounts.map((account) => {
      const acc = account.toObject();
      if (acc.accessToken) acc.accessToken = `${acc.accessToken.substring(0, 10)}***`;
      if (acc.refreshToken) acc.refreshToken = `${acc.refreshToken.substring(0, 10)}***`;
      return acc;
    });

    res.json({
      success: true,
      accounts,
      total: accounts.length,
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve accounts',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/social-login/accounts/link
 * @desc    Link a social account to a user
 * @access  Private
 */
router.post('/accounts/link', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const accountData = req.body;

    if (!accountData.userId || !accountData.provider || !accountData.providerId) {
      return res.status(400).json({
        success: false,
        error: 'User ID, provider, and provider ID are required',
      });
    }

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    // Check if domain is allowed
    if (accountData.email && !config.isDomainAllowed(accountData.email)) {
      return res.status(403).json({
        success: false,
        error: 'Email domain is not allowed',
      });
    }

    await config.linkSocialAccount(accountData);

    res.json({
      success: true,
      message: 'Social account linked successfully',
    });
  } catch (error) {
    console.error('Link account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to link account',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/social-login/accounts/unlink
 * @desc    Unlink a social account from a user
 * @access  Private
 */
router.post('/accounts/unlink', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { userId, provider } = req.body;

    if (!userId || !provider) {
      return res.status(400).json({
        success: false,
        error: 'User ID and provider are required',
      });
    }

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    await config.unlinkSocialAccount(userId, provider);

    res.json({
      success: true,
      message: 'Social account unlinked successfully',
    });
  } catch (error) {
    console.error('Unlink account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlink account',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/social-login/accounts/user/:userId
 * @desc    Get social accounts for a specific user
 * @access  Private
 */
router.get('/accounts/user/:userId', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { userId } = req.params;

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    const accounts = config.getUserAccounts(userId);

    // Mask tokens
    const maskedAccounts = accounts.map((account) => {
      const acc = account.toObject();
      if (acc.accessToken) acc.accessToken = `${acc.accessToken.substring(0, 10)}***`;
      if (acc.refreshToken) acc.refreshToken = `${acc.refreshToken.substring(0, 10)}***`;
      return acc;
    });

    res.json({
      success: true,
      accounts: maskedAccounts,
      total: maskedAccounts.length,
    });
  } catch (error) {
    console.error('Get user accounts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user accounts',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/social-login/login
 * @desc    Handle social login (authenticate or create user)
 * @access  Public
 */
router.post('/auth/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state, organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required',
      });
    }

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    // Check if provider is enabled
    if (!config.providers[provider]?.enabled) {
      return res.status(403).json({
        success: false,
        error: `${provider} login is not enabled`,
      });
    }

    // This is a simplified example - in production, you would:
    // 1. Exchange code for access token with the provider
    // 2. Fetch user info from the provider
    // 3. Create or authenticate user
    // 4. Generate JWT token

    res.json({
      success: true,
      message: 'Social login initiated',
      provider,
    });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process social login',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/social-login/callback/:provider
 * @desc    Handle OAuth callback from provider
 * @access  Public
 */
router.post('/callback/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const callbackData = req.body;

    console.log(`Received callback from ${provider}:`, callbackData);

    // In production, this would:
    // 1. Verify the callback data
    // 2. Exchange authorization code for tokens
    // 3. Fetch user profile
    // 4. Create or link account
    // 5. Record login
    // 6. Return JWT token

    res.json({
      success: true,
      message: 'Callback processed',
      provider,
    });
  } catch (error) {
    console.error('Callback processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process callback',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/social-login/login/record
 * @desc    Record a login event
 * @access  Private
 */
router.post('/login/record', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const loginData = req.body;

    if (!loginData.provider || !loginData.providerId) {
      return res.status(400).json({
        success: false,
        error: 'Provider and provider ID are required',
      });
    }

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    await config.recordLogin(loginData);

    res.json({
      success: true,
      message: 'Login recorded successfully',
    });
  } catch (error) {
    console.error('Record login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record login',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/social-login/history
 * @desc    Get login history
 * @access  Private
 */
router.get('/history', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { userId, provider, success, startDate, endDate, limit = 50 } = req.query;

    const filters = {
      userId,
      provider,
      success: success !== undefined ? success === 'true' : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parseInt(limit, 10),
    };

    const history = await SocialLoginProvider.getLoginHistory(organizationId, filters);

    res.json({
      success: true,
      history,
      total: history.length,
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve history',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/social-login/security
 * @desc    Get security settings
 * @access  Private
 */
router.get('/security', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    res.json({
      success: true,
      security: config.security,
    });
  } catch (error) {
    console.error('Get security error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security settings',
      details: error.message,
    });
  }
});

/**
 * @route   PUT /api/social-login/security
 * @desc    Update security settings
 * @access  Private
 */
router.put('/security', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const updates = req.body;

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    await config.updateSecurity(updates);

    res.json({
      success: true,
      message: 'Security settings updated successfully',
      security: config.security,
    });
  } catch (error) {
    console.error('Update security error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security settings',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/social-login/stats
 * @desc    Get overall statistics
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    const stats = await SocialLoginProvider.getOverallStats(organizationId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/social-login/verify-ip
 * @desc    Verify if IP address is trusted
 * @access  Private
 */
router.post('/verify-ip', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { ipAddress } = req.body;

    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'IP address is required',
      });
    }

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    const isTrusted = config.isTrustedIP(ipAddress);

    res.json({
      success: true,
      isTrusted,
      restrictionEnabled: config.security.restrictToTrustedIPs,
    });
  } catch (error) {
    console.error('Verify IP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify IP',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/social-login/verify-domain
 * @desc    Verify if email domain is allowed
 * @access  Private
 */
router.post('/verify-domain', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const config = await SocialLoginProvider.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Social login configuration not found',
      });
    }

    const isAllowed = config.isDomainAllowed(email);

    res.json({
      success: true,
      isAllowed,
      domain: email.split('@')[1],
    });
  } catch (error) {
    console.error('Verify domain error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify domain',
      details: error.message,
    });
  }
});

module.exports = router;
