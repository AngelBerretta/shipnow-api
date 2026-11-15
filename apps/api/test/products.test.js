import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { PRODUCT_STATUS } from '../src/constants/index.js';
import { NON_EXISTENT_ID, MALFORMED_ID } from './helpers/fixtures.js';

function buildProductPayload(overrides = {}) {
  return {
    name: 'Producto de prueba',
    description: 'Descripcion de prueba',
    price: 1000,
    stock: 10,
    category: 'Test',
    ...overrides,
  };
}

async function createProduct(overrides = {}) {
  const payload = buildProductPayload(overrides);
  const response = await request(app).post('/api/products').send(payload);
  if (response.status !== 201) {
    throw new Error(`No se pudo crear el producto de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

describe('Productos (/api/products)', () => {
  describe('GET /api/products', () => {
    it('devuelve 200 y un listado paginado con los productos creados', async () => {
      const product = await createProduct();

      const response = await request(app).get('/api/products');

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('data').that.is.an('array');
      expect(response.body).to.have.property('pagination');
      const found = response.body.data.find((p) => p._id === product._id);
      expect(found).to.exist;
    });

    it('filtra por category cuando se envia por query param', async () => {
      await createProduct({ category: 'Electronica', stock: 5 });
      await createProduct({ category: 'Hogar', stock: 0 });

      const response = await request(app).get('/api/products?category=Electronica');

      expect(response.status).to.equal(200);
      response.body.data.forEach((product) => expect(product.category).to.equal('Electronica'));
    });
  });

  describe('GET /api/products/:pid', () => {
    it('devuelve 200 y el producto correspondiente al id', async () => {
      const product = await createProduct();

      const response = await request(app).get(`/api/products/${product._id}`);

      expect(response.status).to.equal(200);
      expect(response.body._id).to.equal(product._id);
      expect(response.body.name).to.equal(product.name);
    });

    it('devuelve 404 con el formato de error definido si el producto no existe', async () => {
      const response = await request(app).get(`/api/products/${NON_EXISTENT_ID}`);

      expect(response.status).to.equal(404);
      expect(response.body).to.deep.equal({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Producto no encontrado' },
      });
    });

    it('devuelve 400 INVALID_ID si el id no tiene un formato valido', async () => {
      const response = await request(app).get(`/api/products/${MALFORMED_ID}`);

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_ID');
    });
  });

  describe('POST /api/products', () => {
    it('crea un producto valido y devuelve 201', async () => {
      const payload = buildProductPayload({ stock: 25 });

      const response = await request(app).post('/api/products').send(payload);

      expect(response.status).to.equal(201);
      expect(response.body).to.include({
        name: payload.name,
        price: payload.price,
        stock: payload.stock,
        status: PRODUCT_STATUS.AVAILABLE,
      });
    });

    it('crea el producto con status out_of_stock si el stock es 0, sin importar el status enviado', async () => {
      const payload = buildProductPayload({ stock: 0, status: PRODUCT_STATUS.AVAILABLE });

      const response = await request(app).post('/api/products').send(payload);

      expect(response.status).to.equal(201);
      expect(response.body.status).to.equal(PRODUCT_STATUS.OUT_OF_STOCK);
    });

    it('devuelve 400 VALIDATION_ERROR si faltan datos obligatorios', async () => {
      const response = await request(app).post('/api/products').send({ name: 'Incompleto' });

      expect(response.status).to.equal(400);
      expect(response.body).to.deep.equal({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Faltan datos obligatorios (name, price, stock)' },
      });
    });

    it('devuelve 400 VALIDATION_ERROR si el precio es negativo', async () => {
      const payload = buildProductPayload({ price: -10 });

      const response = await request(app).post('/api/products').send(payload);

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/products/:pid', () => {
    it('actualiza parcialmente el producto y devuelve 200', async () => {
      const product = await createProduct({ stock: 10 });

      const response = await request(app).put(`/api/products/${product._id}`).send({ price: 2000 });

      expect(response.status).to.equal(200);
      expect(response.body.price).to.equal(2000);
      expect(response.body.stock).to.equal(10);
    });

    it('recalcula el status a out_of_stock si se actualiza el stock a 0', async () => {
      const product = await createProduct({ stock: 10 });

      const response = await request(app).put(`/api/products/${product._id}`).send({ stock: 0 });

      expect(response.status).to.equal(200);
      expect(response.body.stock).to.equal(0);
      expect(response.body.status).to.equal(PRODUCT_STATUS.OUT_OF_STOCK);
    });

    it('devuelve 404 PRODUCT_NOT_FOUND si el producto no existe', async () => {
      const response = await request(app).put(`/api/products/${NON_EXISTENT_ID}`).send({ price: 100 });

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('PRODUCT_NOT_FOUND');
    });
  });

  describe('DELETE /api/products/:pid', () => {
    it('elimina el producto y devuelve 200', async () => {
      const product = await createProduct();

      const response = await request(app).delete(`/api/products/${product._id}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ message: 'Producto eliminado' });

      const getResponse = await request(app).get(`/api/products/${product._id}`);
      expect(getResponse.status).to.equal(404);
    });

    it('devuelve 404 PRODUCT_NOT_FOUND si el producto no existe', async () => {
      const response = await request(app).delete(`/api/products/${NON_EXISTENT_ID}`);

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('PRODUCT_NOT_FOUND');
    });
  });
});