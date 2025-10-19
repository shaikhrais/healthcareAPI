const express = require('express');

const router = express.Router();

router.get('/TASK-15.3', (req, res) => {
  res.json({
    taskId: 'TASK-15.3',
    title: 'Imaging PACS/DICOM',
    description: 'Orders + viewer + measure.',
  });
});

module.exports = router;
