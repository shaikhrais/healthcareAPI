const request = require('supertest');

const app = require('../server');
/* eslint-env jest */
describe('Generated API', () => {
  test('GET /api/generated returns array', async () => {
    const res = await request(app).get('/api/generated').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/generated/:id 404 for unknown', async () => {
    await request(app).get('/api/generated/NOPE').expect(404);
  });
});
