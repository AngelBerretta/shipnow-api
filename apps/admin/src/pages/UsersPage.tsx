import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Badge, Button, confirmAction, EmptyState, ErrorBanner, Field, Input, Loading, Modal, PageHeader, Pagination, Select, Table, Td, Th,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime, fullName, ROLE_LABEL } from '../lib/format';
import type { Page, Role, User } from '../lib/types';

// El rol admin no se otorga desde el panel (igual que en el alta pública de la API).
const ASSIGNABLE_ROLES = ['customer', 'driver', 'store'] as const;

const createSchema = z.object({
  firstName: z.string().trim().min(1, 'Ingresá el nombre'),
  lastName: z.string().trim().min(1, 'Ingresá el apellido'),
  email: z.string().trim().min(1, 'Ingresá el email').email('El email no es válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role: z.enum(ASSIGNABLE_ROLES),
});
const editSchema = z.object({
  firstName: z.string().trim().min(1, 'Ingresá el nombre'),
  lastName: z.string().trim().min(1, 'Ingresá el apellido'),
  role: z.enum(['admin', ...ASSIGNABLE_ROLES]),
  password: z.string().refine((v) => v === '' || v.length >= 8, 'Mínimo 8 caracteres'),
});
type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', role: 'customer' },
  });
  const create = useMutation({
    mutationFn: (values: CreateValues) => api('/api/users', { method: 'POST', body: values }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      onClose();
    },
  });

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4" noValidate>
        <ErrorBanner message={create.error && errorMessage(create.error)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" error={errors.firstName?.message}><Input {...register('firstName')} /></Field>
          <Field label="Apellido" error={errors.lastName?.message}><Input {...register('lastName')} /></Field>
        </div>
        <Field label="Email" error={errors.email?.message}><Input type="email" {...register('email')} /></Field>
        <Field label="Contraseña" error={errors.password?.message}><Input type="password" autoComplete="new-password" {...register('password')} /></Field>
        <Field label="Rol">
          <Select {...register('role')}>
            {ASSIGNABLE_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="accent" disabled={create.isPending}>Crear usuario</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, isSelf, onClose }: { user: User; isSelf: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const lockedRole = user.role === 'admin' || isSelf;
  const { register, handleSubmit, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { firstName: user.firstName, lastName: user.lastName, role: user.role, password: '' },
  });
  const update = useMutation({
    mutationFn: (values: EditValues) => {
      // Solo se envia lo que cambia; el rol de un admin no se toca.
      const body: Record<string, unknown> = { firstName: values.firstName, lastName: values.lastName };
      if (!lockedRole && values.role !== user.role) body.role = values.role;
      if (values.password) body.password = values.password;
      return api(`/api/users/${user._id}`, { method: 'PATCH', body });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
      onClose();
    },
  });

  return (
    <Modal title={`Editar a ${fullName(user)}`} onClose={onClose}>
      <form onSubmit={handleSubmit((v) => update.mutate(v))} className="space-y-4" noValidate>
        <ErrorBanner message={update.error && errorMessage(update.error)} />
        <p className="text-sm text-asphalt-600">{user.email}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" error={errors.firstName?.message}><Input {...register('firstName')} /></Field>
          <Field label="Apellido" error={errors.lastName?.message}><Input {...register('lastName')} /></Field>
        </div>
        <Field label="Rol">
          <Select disabled={lockedRole} {...register('role')}>
            {(['admin', ...ASSIGNABLE_ROLES] as Role[]).map((role) => (
              <option key={role} value={role} disabled={role === 'admin' && user.role !== 'admin'}>{ROLE_LABEL[role]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Nueva contraseña (opcional)" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" placeholder="Dejala vacía para no cambiarla" {...register('password')} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="accent" disabled={update.isPending}>Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<Role | ''>('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const users = useQuery({
    queryKey: ['users', page, role],
    queryFn: () => api<Page<User>>('/api/users', { query: { page, limit: 15, role } }),
  });
  const refresh = () => void queryClient.invalidateQueries();
  const toggle = useMutation({
    mutationFn: (u: User) => api(`/api/users/${u._id}`, { method: 'PATCH', body: { isActive: !u.isActive } }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/users/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
  const actionError = toggle.error ?? remove.error;

  return (
    <>
      <PageHeader
        title="Usuarios"
        actions={
          <>
            <Select aria-label="Filtrar por rol" value={role} onChange={(e) => { setRole(e.target.value as Role | ''); setPage(1); }}>
              <option value="">Todos los roles</option>
              {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Button variant="accent" onClick={() => setCreating(true)}>Nuevo usuario</Button>
          </>
        }
      />
      <div className="mb-3 space-y-2">
        <ErrorBanner message={users.error && errorMessage(users.error)} />
        <ErrorBanner message={actionError && errorMessage(actionError)} />
      </div>

      {users.isLoading ? <Loading /> : users.data && users.data.data.length === 0 ? (
        <EmptyState>No hay usuarios con este filtro.</EmptyState>
      ) : users.data && (
        <>
          <Table>
            <thead><tr><Th>Nombre</Th><Th>Email</Th><Th>Rol</Th><Th>Estado</Th><Th>Alta</Th><Th /></tr></thead>
            <tbody>
              {users.data.data.map((u) => {
                const isSelf = u._id === me?._id;
                return (
                  <tr key={u._id}>
                    <Td className="font-medium">{fullName(u)}</Td>
                    <Td>{u.email}</Td>
                    <Td>{ROLE_LABEL[u.role]}</Td>
                    <Td><Badge tone={u.isActive ? 'ok' : 'neutral'}>{u.isActive ? 'Activo' : 'Inactivo'}</Badge></Td>
                    <Td>{formatDateTime(u.createdAt)}</Td>
                    <Td className="space-x-2 whitespace-nowrap text-right">
                      <Button variant="secondary" onClick={() => setEditing(u)}>Editar</Button>
                      <Button variant="secondary" disabled={isSelf} onClick={() => toggle.mutate(u)}>{u.isActive ? 'Desactivar' : 'Activar'}</Button>
                      <Button variant="danger" disabled={isSelf} onClick={() => confirmAction(`¿Eliminar a ${fullName(u)}?`) && remove.mutate(u._id)}>Eliminar</Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <Pagination page={users.data.pagination.page} totalPages={users.data.pagination.totalPages} total={users.data.pagination.total} onChange={setPage} />
        </>
      )}
      {creating && <CreateUserModal onClose={() => setCreating(false)} />}
      {editing && <EditUserModal user={editing} isSelf={editing._id === me?._id} onClose={() => setEditing(null)} />}
    </>
  );
}
