import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBanner, Panel } from '../components/ui';
import { isValidCode, normalizeCode, trackingPath } from '../lib/tracking';

export default function HomePage() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const code = normalizeCode(value);
    if (!isValidCode(code)) {
      setError('El código no es válido. Tiene el formato RV-XXXXXXXXXX.');
      return;
    }
    navigate(trackingPath(code));
  };

  return (
    <Panel>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">¿Dónde está mi pedido?</h1>
          <p className="mt-1 text-sm text-asphalt-600">Ingresá el código de seguimiento que te enviaron.</p>
        </div>
        <ErrorBanner message={error} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Código de seguimiento</span>
          <input
            className="min-h-12 w-full rounded-xl border border-asphalt-200 bg-white px-3 text-base uppercase placeholder:normal-case placeholder:text-asphalt-400"
            placeholder="RV-7K2M9QX4TB"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
          />
        </label>
        <button
          type="submit"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-signal px-4 text-base font-semibold text-asphalt-950 active:brightness-95"
        >
          Ver mi pedido
        </button>
      </form>
    </Panel>
  );
}