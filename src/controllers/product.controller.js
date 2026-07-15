import productService from '../services/product.service.js';

export async function getAll(req, res, next) {
  try {
    const products = await productService.getAllProducts(req.query);
    res.json(products);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.pid);
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const newProduct = await productService.createProduct(req.body);
    res.status(201).json(newProduct);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const updatedProduct = await productService.updateProduct(req.params.pid, req.body);
    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await productService.deleteProduct(req.params.pid);
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    next(error);
  }
}
