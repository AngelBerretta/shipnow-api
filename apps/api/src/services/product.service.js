import productRepository from '../repositories/product.repository.js';
import userRepository from '../repositories/user.repository.js';
import { PRODUCT_STATUS, ROLES } from '../constants/index.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { ProductNotFoundError, UserNotFoundError, ValidationError } from '../errors/index.js';

class ProductService {
  /**
   * Listado paginado de productos. Nunca devuelve la colección completa
   * sin control (ver utils/pagination.js). Sigue admitiendo filtrar por
   * `category`, `status` y, ahora, `owner` (tienda duena del producto).
   */
  async getAllProducts(query = {}) {
    const pagination = parsePagination(query);
    const filter = {};
    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;
    if (query.owner) filter.owner = query.owner;

    const [products, total] = await Promise.all([
      productRepository.findAll(filter, { skip: pagination.skip, limit: pagination.limit }),
      productRepository.countAll(filter),
    ]);

    return { data: products, pagination: buildPaginationMeta(pagination, total) };
  }

  async getProductById(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new ProductNotFoundError();
    }
    return product;
  }

  async createProduct({ name, description, price, stock, category, status, owner }) {
    if (!name || price === undefined || stock === undefined) {
      throw new ValidationError('Faltan datos obligatorios (name, price, stock)');
    }
    if (price < 0) {
      throw new ValidationError('El precio no puede ser negativo');
    }
    if (stock < 0) {
      throw new ValidationError('El stock no puede ser negativo');
    }
    if (owner) {
      await this.#assertOwnerIsStore(owner);
    }

    return productRepository.create({
      name,
      description,
      price,
      stock,
      category,
      owner: owner || null,
      status: this.#resolveStatus(stock, status),
    });
  }

  async updateProduct(id, { name, description, price, stock, category, status, owner }) {
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
    if (owner) {
      await this.#assertOwnerIsStore(owner);
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;
    if (owner !== undefined) updateData.owner = owner || null;

    if (stock !== undefined) {
      updateData.stock = stock;
      updateData.status = this.#resolveStatus(stock, status);
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
  #resolveStatus(stock, requestedStatus) {
    if (stock <= 0) return PRODUCT_STATUS.OUT_OF_STOCK;
    return requestedStatus || PRODUCT_STATUS.AVAILABLE;
  }

  /** Regla de negocio: el duenio de un producto tiene que ser un usuario existente con rol `store`. */
  async #assertOwnerIsStore(ownerId) {
    const owner = await userRepository.findById(ownerId);
    if (!owner) {
      throw new UserNotFoundError('La tienda duena del producto no existe');
    }
    if (owner.role !== ROLES.STORE) {
      throw new ValidationError(`El duenio del producto debe tener rol de tienda (rol actual: ${owner.role})`);
    }
  }
}

export default new ProductService();
