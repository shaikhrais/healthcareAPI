const express = require('express');

const router = express.Router();

router.get('/TASK-2.4', (req, res) => {
  res.json({
    taskId: 'TASK-2.4',
    title: 'Two-Factor Auth (TOTP)',
    description: 'Enable/verify 2FA with TOTP.',
  });
});

module.exports = router;
