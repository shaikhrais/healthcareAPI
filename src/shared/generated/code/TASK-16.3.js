const express = require('express');

const router = express.Router();

router.get('/TASK-16.3', (req, res) => {
  res.json({ taskId: 'TASK-16.3', title: 'SSO (SAML/OIDC)', description: 'Okta/AzureAD/Google.' });
});

module.exports = router;
