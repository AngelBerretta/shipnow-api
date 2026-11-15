import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, ErrorBanner, Field, Input } from '../components/ui';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

const schema = z.object({
  email: z.string().trim().min(1, 'Ingresá tu email').email('El email no es válido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  // La API gratuita de Render se duerme: la primera peticion puede tardar cerca de un minuto.
  useEffect(() => {
    if (!isSubmitting) return setSlow(false);
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, [isSubmitting]);

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <div className="flex min-h-full items-center justify-center bg-asphalt-900 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-md bg-white p-6" noValidate>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Ruvika</h1>
          <p className="text-sm text-asphalt-600">Ingresá para administrar pedidos y entregas.</p>
        </div>
        <ErrorBanner message={error} />
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="username" {...register('email')} />
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" variant="accent" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
        {slow && (
          <p className="text-xs text-asphalt-600">
            Despertando el servidor… la primera conexión puede tardar hasta un minuto.
          </p>
        )}
      </form>
    </div>
  );
}
