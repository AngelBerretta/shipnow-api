import { useEffect, useState, type FormEvent } from 'react';
import { Button, ErrorBanner } from '../components/ui';
import { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

const FIELD = 'min-h-12 w-full rounded-xl border border-asphalt-200 bg-white px-3 text-base';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slow, setSlow] = useState(false);

  // La API gratuita de Render se duerme: la primera peticion puede tardar cerca de un minuto.
  useEffect(() => {
    if (!submitting) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, [submitting]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-asphalt-900 p-4">
      <form onSubmit={(event) => void onSubmit(event)} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Ruvika · Repartidores</h1>
          <p className="text-sm text-asphalt-600">Ingresá para ver tus entregas.</p>
        </div>
        <ErrorBanner message={error} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input
            className={FIELD}
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Contraseña</span>
          <input
            className={FIELD}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <Button type="submit" variant="accent" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
        {slow && (
          <p className="text-xs text-asphalt-600">Despertando el servidor… la primera conexión puede tardar hasta un minuto.</p>
        )}
      </form>
    </div>
  );
}