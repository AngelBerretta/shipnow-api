import mongoose from 'mongoose';

import app from './app.js';
import config from './config/index.js';

mongoose
  .connect(config.mongoUri)
  .then(() => {
    console.log('Conectado a MongoDB');
    app.listen(config.port, () => {
      console.log(`Servidor corriendo en puerto ${config.port} [${config.nodeEnv}]`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar con MongoDB:', error.message);
    process.exit(1);
  });
