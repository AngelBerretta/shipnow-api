/** Falla de un canal. `retryable: false` = no tiene sentido reintentar (dirección inválida, etc.). */
export class ChannelError extends Error {
  constructor(message, { retryable = true } = {}) {
    super(message);
    this.name = 'ChannelError';
    this.retryable = retryable;
  }
}

export const retryableStatus = (status) => status === 429 || status >= 500;