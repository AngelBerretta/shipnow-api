import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Page, Role, User } from './types';

/** Usuarios de un rol para llenar selectores (la API limita cada pagina a 100). */
export function useUsersByRole(role: Role) {
  return useQuery({
    queryKey: ['users', 'by-role', role],
    queryFn: () => api<Page<User>>('/api/users', { query: { role, limit: 100 } }),
    select: (page) => page.data.filter((user) => user.isActive),
    staleTime: 60_000,
  });
}
