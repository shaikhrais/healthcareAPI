const express = require('express');
const request = require('supertest');

const router = require('../../generated-code/TASK-10.14');
/* eslint-env jest */
describe('TASK-10.14 generated route', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use('/api/generated-code', router);
  });
  test('GET /api/generated-code/TASK-10.14 returns 200', async () => {
    const res = await request(app).get('/api/generated-code/TASK-10.14');
    expect(res.status).toBe(200);
    expect(res.body.taskId).toBe('TASK-10.14');
  });
});
