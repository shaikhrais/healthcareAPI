const express = require('express');

const router = express.Router();

router.get('/TASK-4.1', (req, res) => {
  res.json({
    taskId: 'TASK-4.1',
    title: 'Consent Forms & E-sign',
    description: 'Templates, signature, expiry.',
  });
});

module.exports = router;
