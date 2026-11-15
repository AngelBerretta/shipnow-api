import { expect } from 'chai';
import { asAdmin } from './helpers/auth.js';

describe('Logger (/api/logs)', () => {
  describe('GET /api/logs/test', () => {
    it('devuelve 200 y dispara los 6 niveles de log definidos', async () => {
      const response = await asAdmin().get('/api/logs/test');

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('message');
      expect(response.body).to.have.property('timestamp');
      expect(response.body.levelsTriggered).to.deep.equal([
        'debug',
        'http',
        'info',
        'warning',
        'error',
        'fatal',
      ]);
    });
  });
});
