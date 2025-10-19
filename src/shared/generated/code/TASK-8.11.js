const express = require('express');

const router = express.Router();

router.get('/TASK-8.11', (req, res) => {
  res.json({
    taskId: 'TASK-8.11',
    title: 'FHIR document exchange',
    description: 'Implements: FHIR document exchange.',
  });
});

module.exports = router;
