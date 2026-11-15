import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { DOCUMENT_TYPES } from '../src/constants/index.js';
import { createUser, createDelivery, NON_EXISTENT_ID } from './helpers/fixtures.js';

// Buffers pequeños en memoria: no hace falta ningun archivo real en
// disco para probar los endpoints, Supertest permite adjuntar un
// Buffer directamente con .attach(campo, buffer, { filename, contentType }).
const PDF_BUFFER = Buffer.from('%PDF-1.4 contenido de prueba', 'utf-8');
const TXT_BUFFER = Buffer.from('contenido de texto plano', 'utf-8');

describe('Carga de archivos (Multer)', () => {
  describe('POST /api/users/:uid/documents', () => {
    it('sube un documento valido y devuelve 201 con los metadatos guardados', async () => {
      const user = await createUser();

      const response = await request(app)
        .post(`/api/users/${user._id}/documents`)
        .field('documentType', DOCUMENT_TYPES.DNI)
        .attach('file', PDF_BUFFER, { filename: 'dni-frente.pdf', contentType: 'application/pdf' });

      expect(response.status).to.equal(201);
      expect(response.body.message).to.equal('Documento cargado correctamente');
      expect(response.body.user._id).to.equal(user._id);
      expect(response.body.user.documents).to.have.lengthOf(1);

      const doc = response.body.user.documents[0];
      expect(doc.originalName).to.equal('dni-frente.pdf');
      expect(doc.documentType).to.equal(DOCUMENT_TYPES.DNI);
      expect(doc.mimeType).to.equal('application/pdf');
      expect(doc).to.have.property('storedName');
      expect(doc).to.have.property('path');
      expect(doc).to.have.property('size');
      expect(doc).to.have.property('uploadedAt');
    });

    it('devuelve 400 FILE_REQUIRED si no se envia el archivo', async () => {
      const user = await createUser();

      const response = await request(app)
        .post(`/api/users/${user._id}/documents`)
        .field('documentType', DOCUMENT_TYPES.DNI);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.equal(false);
      expect(response.body.error.code).to.equal('FILE_REQUIRED');
    });

    it('devuelve 400 VALIDATION_ERROR si no se envia el tipo de documento', async () => {
      const user = await createUser();

      const response = await request(app)
        .post(`/api/users/${user._id}/documents`)
        .attach('file', PDF_BUFFER, { filename: 'doc.pdf', contentType: 'application/pdf' });

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('devuelve 400 INVALID_DOCUMENT_TYPE si el tipo de documento no pertenece al enum', async () => {
      const user = await createUser();

      const response = await request(app)
        .post(`/api/users/${user._id}/documents`)
        .field('documentType', 'pasaporte')
        .attach('file', PDF_BUFFER, { filename: 'doc.pdf', contentType: 'application/pdf' });

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_DOCUMENT_TYPE');
      expect(response.body.error.details).to.deep.equal({
        received: 'pasaporte',
        allowed: Object.values(DOCUMENT_TYPES),
      });
    });

    it('devuelve 400 INVALID_FILE_TYPE si el archivo no es de un tipo permitido', async () => {
      const user = await createUser();

      const response = await request(app)
        .post(`/api/users/${user._id}/documents`)
        .field('documentType', DOCUMENT_TYPES.DNI)
        .attach('file', TXT_BUFFER, { filename: 'doc.txt', contentType: 'text/plain' });

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_FILE_TYPE');
    });

    it('devuelve 404 USER_NOT_FOUND si el usuario no existe', async () => {
      const response = await request(app)
        .post(`/api/users/${NON_EXISTENT_ID}/documents`)
        .field('documentType', DOCUMENT_TYPES.DNI)
        .attach('file', PDF_BUFFER, { filename: 'doc.pdf', contentType: 'application/pdf' });

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('USER_NOT_FOUND');
    });
  });

  describe('POST /api/deliveries/:did/proof', () => {
    it('sube un comprobante valido y devuelve 201 con la entrega actualizada', async () => {
      const delivery = await createDelivery();

      const response = await request(app)
        .post(`/api/deliveries/${delivery._id}/proof`)
        .attach('file', PDF_BUFFER, { filename: 'firma-cliente.pdf', contentType: 'application/pdf' });

      expect(response.status).to.equal(201);
      expect(response.body.message).to.equal('Comprobante asociado a la entrega correctamente');
      expect(response.body.delivery._id).to.equal(delivery._id);
      expect(response.body.delivery.documents).to.have.lengthOf(1);
      expect(response.body.delivery.documents[0].originalName).to.equal('firma-cliente.pdf');
      // Si no se envia documentType, el default es DELIVERY_PROOF.
      expect(response.body.delivery.documents[0].documentType).to.equal(DOCUMENT_TYPES.DELIVERY_PROOF);
    });

    it('devuelve 400 FILE_REQUIRED si no se envia el archivo', async () => {
      const delivery = await createDelivery();

      const response = await request(app).post(`/api/deliveries/${delivery._id}/proof`);

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('FILE_REQUIRED');
    });

    it('devuelve 400 INVALID_DOCUMENT_TYPE si se envia un tipo de documento invalido', async () => {
      const delivery = await createDelivery();

      const response = await request(app)
        .post(`/api/deliveries/${delivery._id}/proof`)
        .field('documentType', 'inexistente')
        .attach('file', PDF_BUFFER, { filename: 'comprobante.pdf', contentType: 'application/pdf' });

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_DOCUMENT_TYPE');
    });

    it('devuelve 404 DELIVERY_NOT_FOUND si la entrega no existe', async () => {
      const response = await request(app)
        .post(`/api/deliveries/${NON_EXISTENT_ID}/proof`)
        .attach('file', PDF_BUFFER, { filename: 'comprobante.pdf', contentType: 'application/pdf' });

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('DELIVERY_NOT_FOUND');
    });
  });
});
