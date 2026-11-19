import Integration from '../models/integration.model.js';

const STORE_FIELDS = 'firstName lastName';

class IntegrationRepository {
  async create(data) {
    return Integration.create(data);
  }
  async findAll() {
    return Integration.find().populate('store', STORE_FIELDS).sort({ createdAt: -1 });
  }
  async findById(id) {
    return Integration.findById(id).populate('store', STORE_FIELDS);
  }
  /** `store` sin populate (ObjectId) + secreto: para firmar y para validar firmas entrantes. */
  async findByIdWithSecret(id) {
    return Integration.findById(id).select('+webhookSecret');
  }
  async findByPrefix(prefix) {
    return Integration.findOne({ keyPrefix: prefix }).select('+keyHash');
  }
  async updateById(id, data) {
    return Integration.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('store', STORE_FIELDS);
  }
  async deleteById(id) {
    return Integration.findByIdAndDelete(id);
  }
  async touch(id) {
    return Integration.updateOne({ _id: id }, { $set: { lastUsedAt: new Date() } });
  }
  async findActiveByStore(storeId, event) {
    return Integration.find({ store: storeId, isActive: true, webhookUrl: { $ne: null }, events: event }).select('_id');
  }
}

export default new IntegrationRepository();