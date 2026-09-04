import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';

describe('Health check (/api/health)', () => {
  it('devuelve 200 con estado, entorno, uptime y timestamp, sin datos sensibles', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).to.equal(200);
    expect(response.body.status).to.equal('ok');
    expect(response.body.environment).to.equal('test');
    expect(response.body).to.have.property('uptime').that.is.a('number');
    expect(response.body).to.have.property('timestamp');
    // Nunca debe filtrar la URI de Mongo ni ningun otro dato de config.
    expect(response.body).to.not.have.property('mongoUri');
    expect(response.body).to.not.have.property('jwtSecret');
  });
});
