/** Pasa el JSON de un pedido de WooCommerce al formato de /api/inbound/orders. */
export function mapWooCommerceOrder(wc) {
  const target = wc.shipping?.address_1 ? wc.shipping : wc.billing;
  return {
    externalId: `wc-${wc.id}`,
    customer: {
      firstName: wc.billing?.first_name || 'Cliente',
      lastName: wc.billing?.last_name || 'WooCommerce',
      email: wc.billing?.email,
    },
    items: (wc.line_items ?? []).map((item) => ({ name: item.name, quantity: item.quantity, price: Number(item.price) })),
    deliveryAddress: [target?.address_1, target?.city, target?.state].filter(Boolean).join(', '),
  };
}