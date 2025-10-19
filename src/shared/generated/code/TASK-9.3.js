const express = require('express');

const router = express.Router();

router.get('/TASK-9.3', (req, res) => {
  res.json({
    taskId: 'TASK-9.3',
    title: 'Insurance Claims',
    description: 'CMS-1500/UB-04; EDI 837.',
  });
});

module.exports = router;
