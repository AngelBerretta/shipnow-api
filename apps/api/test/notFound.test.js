import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';

describe('Rutas inexistentes', () => {
  it('devuelve 404 con el mismo formato de error que el resto de la API', async () => {
    const response = await request(app).get('/api/esto-no-existe');

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Ruta no encontrada: GET /api/esto-no-existe',
      },
    });
  });

  it('tambien devuelve 404 uniforme para metodos no soportados en una ruta existente', async () => {
    const response = await request(app).patch('/api/users');

    expect(response.status).to.equal(404);
    expect(response.body.success).to.equal(false);
    expect(response.body.error.code).to.equal('ROUTE_NOT_FOUND');
  });
});
