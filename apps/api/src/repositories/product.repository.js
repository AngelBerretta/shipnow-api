import Product from '../models/product.model.js';

/**
 * ProductRepository
 * Unico lugar de la aplicacion que conoce Mongoose/MongoDB para la entidad Product.
 * No contiene reglas de negocio (calculo de status, validaciones de precio, etc.):
 * eso vive en ProductService.
 */
class ProductRepository {
  async findAll(filter = {}, { skip = 0, limit = 0 } = {}) {
    let query = Product.find(filter).sort({ createdAt: -1 });
    if (limit > 0) {
      query = query.skip(skip).limit(limit);
    }
    return query;
  }

  async countAll(filter = {}) {
    return Product.countDocuments(filter);
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
