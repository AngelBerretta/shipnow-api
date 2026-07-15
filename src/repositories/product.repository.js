import Product from '../models/product.model.js';

/**
 * ProductRepository
 * Unico lugar de la aplicacion que conoce Mongoose/MongoDB para la entidad Product.
 * No contiene reglas de negocio (calculo de status, validaciones de precio, etc.):
 * eso vive en ProductService.
 */
class ProductRepository {
  async findAll(filter = {}) {
    return Product.find(filter).sort({ createdAt: -1 });
  }

  async findById(id) {
    return Product.findById(id);
  }

  async create(data) {
    return Product.create(data);
  }

  async updateById(id, data) {
    return Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async deleteById(id) {
    return Product.findByIdAndDelete(id);
  }
}

export default new ProductRepository();
