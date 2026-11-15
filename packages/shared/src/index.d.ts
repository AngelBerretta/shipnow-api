/** Tipos de @ruvika/shared para los frontends en TypeScript. Mantener en sync con constants.js. */
export declare const ROLES: { readonly ADMIN: 'admin'; readonly CUSTOMER: 'customer'; readonly DRIVER: 'driver'; readonly STORE: 'store' };
export declare const PRODUCT_STATUS: { readonly AVAILABLE: 'available'; readonly OUT_OF_STOCK: 'out_of_stock' };
export declare const ORDER_STATUS: {
  readonly CREATED: 'created'; readonly ASSIGNED: 'assigned'; readonly PICKED_UP: 'picked_up';
  readonly IN_TRANSIT: 'in_transit'; readonly DELIVERED: 'delivered'; readonly CANCELLED: 'cancelled';
};
export declare const DELIVERY_STATUS: {
  readonly PENDING: 'pending'; readonly ASSIGNED: 'assigned'; readonly PICKED_UP: 'picked_up';
  readonly IN_TRANSIT: 'in_transit'; readonly DELIVERED: 'delivered';
};
export declare const PRIORITY: { readonly LOW: 'low'; readonly NORMAL: 'normal'; readonly HIGH: 'high' };
export declare const DOCUMENT_TYPES: {
  readonly DNI: 'dni'; readonly LICENSE: 'licencia'; readonly PROOF_OF_ADDRESS: 'comprobante_domicilio';
  readonly DELIVERY_PROOF: 'comprobante_entrega'; readonly OTHER: 'otro';
};
export declare const ORDER_EVENT_TYPES: {
  readonly ORDER_CREATED: 'order_created'; readonly STATUS_CHANGED: 'status_changed';
  readonly DELIVERY_ASSIGNED: 'delivery_assigned'; readonly DELIVERY_STATUS_CHANGED: 'delivery_status_changed';
  readonly DELIVERY_REMOVED: 'delivery_removed';
};
export declare const TRACKING_CODE: { readonly PREFIX: string; readonly ALPHABET: string; readonly LENGTH: number; readonly PATTERN: RegExp };

export type Transitions = Readonly<Record<string, readonly string[]>>;
export declare const ORDER_TRANSITIONS: Transitions;
export declare const DELIVERY_TRANSITIONS: Transitions;
export declare function getAllowedTransitions(transitions: Transitions, from: string): readonly string[];
export declare function canTransition(transitions: Transitions, from: string, to: string): boolean;
export declare function isFinalStatus(transitions: Transitions, status: string): boolean;
