import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Badge, Button, confirmAction, EmptyState, ErrorBanner, Field, Input, Loading, Modal, PageHeader, Pagination, Select, Table, Td, Th,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { formatMoney, fullName } from '../lib/format';
import { useUsersByRole } from '../lib/queries';
import type { Page, Product, ProductStatus } from '../lib/types';

const schema = z.object({
  name: z.string().trim().min(1, 'Ingresá el nombre'),
  description: z.string(),
  category: z.string().trim(),
  price: z.number({ error: 'Ingresá el precio' }).min(0, 'No puede ser negativo'),
  stock: z.number({ error: 'Ingresá el stock' }).int('Debe ser entero').min(0, 'No puede ser negativo'),
  owner: z.string(),
});
type Values = z.infer<typeof schema>;

function ProductModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const stores = useUsersByRole('store');
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      category: product?.category ?? '',
      price: product?.price ?? 0,
      stock: product?.stock ?? 0,
      owner: product?.owner ?? '',
    },
  });
  const save = useMutation({
    mutationFn: (values: Values) => {
      const body = { ...values, owner: values.owner || null };
      return product
        ? api(`/api/products/${product._id}`, { method: 'PUT', body })
        : api('/api/products', { method: 'POST', body });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
      onClose();
    },
  });

  return (
    <Modal title={product ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
        <ErrorBanner message={save.error && errorMessage(save.error)} />
        <Field label="Nombre" error={errors.name?.message}><Input {...register('name')} /></Field>
        <Field label="Descripción"><Input {...register('description')} /></Field>
        <Field label="Categoría"><Input {...register('category')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio" error={errors.price?.message}><Input type="number" min={0} step="0.01" {...register('price', { valueAsNumber: true })} /></Field>
          <Field label="Stock" error={errors.stock?.message}><Input type="number" min={0} {...register('stock', { valueAsNumber: true })} /></Field>
        </div>
        <Field label="Tienda dueña">
          <Select {...register('owner')}>
            <option value="">Sin tienda</option>
            {stores.data?.map((u) => <option key={u._id} value={u._id}>{fullName(u)}</option>)}
          </Select>
        </Field>
        <p className="text-xs text-asphalt-600">Con stock 0, el producto queda “Sin stock” automáticamente.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="accent" disabled={save.isPending}>Guardar producto</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const stores = useUsersByRole('store');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const products = useQuery({
    queryKey: ['products', page, status, category],
    queryFn: () => api<Page<Product>>('/api/products', { query: { page, limit: 15, status, category } }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries(),
  });
  const ownerName = (id: string | null) => fullName(stores.data?.find((s) => s._id === id));

  return (
    <>
      <PageHeader
        title="Productos"
        actions={
          <>
            <Input aria-label="Filtrar por categoría" placeholder="Categoría" className="w-40" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} />
            <Select aria-label="Filtrar por estado" value={status} onChange={(e) => { setStatus(e.target.value as ProductStatus | ''); setPage(1); }}>
              <option value="">Todos los estados</option>
              <option value="available">Disponible</option>
              <option value="out_of_stock">Sin stock</option>
            </Select>
            <Button variant="accent" onClick={() => setEditing('new')}>Nuevo producto</Button>
          </>
        }
      />
      <div className="mb-3 space-y-2">
        <ErrorBanner message={products.error && errorMessage(products.error)} />
        <ErrorBanner message={remove.error && errorMessage(remove.error)} />
      </div>

      {products.isLoading ? <Loading /> : products.data && products.data.data.length === 0 ? (
        <EmptyState>No hay productos con este filtro. Creá el primero con “Nuevo producto”.</EmptyState>
      ) : products.data && (
        <>
          <Table>
            <thead><tr><Th>Nombre</Th><Th>Categoría</Th><Th className="text-right">Precio</Th><Th className="text-right">Stock</Th><Th>Estado</Th><Th>Tienda</Th><Th /></tr></thead>
            <tbody>
              {products.data.data.map((product) => (
                <tr key={product._id}>
                  <Td className="font-medium">{product.name}</Td>
                  <Td>{product.category || '—'}</Td>
                  <Td className="text-right">{formatMoney(product.price)}</Td>
                  <Td className="text-right">{product.stock}</Td>
                  <Td><Badge tone={product.status === 'available' ? 'ok' : 'bad'}>{product.status === 'available' ? 'Disponible' : 'Sin stock'}</Badge></Td>
                  <Td>{product.owner ? ownerName(product.owner) : '—'}</Td>
                  <Td className="space-x-2 whitespace-nowrap text-right">
                    <Button variant="secondary" onClick={() => setEditing(product)}>Editar</Button>
                    <Button variant="danger" onClick={() => confirmAction(`¿Eliminar “${product.name}”?`) && remove.mutate(product._id)}>Eliminar</Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={products.data.pagination.page} totalPages={products.data.pagination.totalPages} total={products.data.pagination.total} onChange={setPage} />
        </>
      )}
      {editing && <ProductModal product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
