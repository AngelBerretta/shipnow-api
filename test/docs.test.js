import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';

describe('Documentación (/api/docs)', () => {
  it('redirige /api/docs a /api/docs/ (montaje de swagger-ui-express)', async () => {
    const response = await request(app).get('/api/docs');

    expect(response.status).to.equal(301);
    expect(response.headers.location).to.equal('/api/docs/');
  });

  it('GET /api/docs/ devuelve 200 y sirve el HTML de Swagger UI', async () => {
    const response = await request(app).get('/api/docs/');

    expect(response.status).to.equal(200);
    expect(response.headers['content-type']).to.include('text/html');
    expect(response.text).to.include('swagger-ui');
    expect(response.text).to.include('ShipNow API');
  });
});
