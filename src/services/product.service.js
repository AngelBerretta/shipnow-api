import productRepository from '../repositories/product.repository.js';
import { PRODUCT_STATUS } from '../constants/index.js';
import { ProductNotFoundError, ValidationError } from '../errors/index.js';

class ProductService {
  async getAllProducts(query = {}) {
    const filter = {};
    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;
    return productRepository.findAll(filter);
  }

  async getProductById(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new ProductNotFoundError();
    }
    return product;
  }

  async createProduct({ name, description, price, stock, category, status }) {
    if (!name || price === undefined || stock === undefined) {
      throw new ValidationError('Faltan datos obligatorios (name, price, stock)');
    }
    if (price < 0) {
      throw new ValidationError('El precio no puede ser negativo');
    }
    if (stock < 0) {
      throw new ValidationError('El stock no puede ser negativo');
    }

    return productRepository.create({
      name,
      description,
      price,
      stock,
      category,
      status: this.***REMOVED***resolveStatus(stock, status),
    });
  }

  async updateProduct(id, { name, description, price, stock, category, status }) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new ProductNotFoundError();
    }

    if (price !== undefined && price < 0) {
      throw new ValidationError('El precio no puede ser negativo');
    }
    if (stock !== undefined && stock < 0) {
      throw new ValidationError('El stock no puede ser negativo');
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;

    if (stock !== undefined) {
      updateData.stock = stock;
      updateData.status = this.***REMOVED***resolveStatus(stock, status);
    } else if (status !== undefined && product.stock > 0) {
      updateData.status = status;
    }

    return productRepository.updateById(id, updateData);
  }

  async deleteProduct(id) {
    const deleted = await productRepository.deleteById(id);
    if (!deleted) {
      throw new ProductNotFoundError();
    }
    return deleted;
  }

  /**
   * Regla de negocio: un producto sin stock nunca puede figurar como
   * disponible, sin importar el status recibido en el body.
   */
  ***REMOVED***resolveStatus(stock, requestedStatus) {
    if (stock <= 0) return PRODUCT_STATUS.OUT_OF_STOCK;
    return requestedStatus || PRODUCT_STATUS.AVAILABLE;
  }
}

export default new ProductService();
