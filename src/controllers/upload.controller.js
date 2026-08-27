import uploadService from '../services/upload.service.js';

/**
 * upload.controller.js
 *
 * Igual de "delgado" que el resto de los controllers del proyecto: solo
 * pasa `req.file` (que ya dejó armado el middleware de Multer de la
 * ruta) y `req.body` al Service, y delega cualquier error con
 * `next(error)`. No valida nada por su cuenta.
 */

export async function uploadUserDocument(req, res, next) {
  try {
    const updatedUser = await uploadService.uploadUserDocument(req.params.uid, req.file, req.body.documentType);
    res.status(201).json({
      message: 'Documento cargado correctamente',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadDeliveryProof(req, res, next) {
  try {
    const updatedDelivery = await uploadService.uploadDeliveryProof(
      req.params.did,
      req.file,
      req.body.documentType
    );
    res.status(201).json({
      message: 'Comprobante asociado a la entrega correctamente',
      delivery: updatedDelivery,
    });
  } catch (error) {
    next(error);
  }
}
