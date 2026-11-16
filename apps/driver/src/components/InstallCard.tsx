import { useEffect, useState } from 'react';
import { Button } from './ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'ruvika.driver.installDismissed';

/** Android/Chrome: botón "Instalar". iOS Safari no tiene ese evento: se muestran las instrucciones. */
export default function InstallCard() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1');

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (standalone || dismissed || (!prompt && !isIos)) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };
  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };

  return (
    <div className="mb-4 rounded-xl border border-signal-dark/30 bg-white p-4 text-sm">
      <p className="font-semibold">Instalá Ruvika en tu celular</p>
      {prompt ? (
        <p className="mt-1 text-asphalt-600">Se abre como una app y funciona aunque no tengas señal.</p>
      ) : (
        <p className="mt-1 text-asphalt-600">En Safari tocá Compartir y después “Agregar a inicio”.</p>
      )}
      <div className="mt-3 flex gap-2">
        {prompt && (
          <Button variant="accent" onClick={() => void install()}>
            Instalar
          </Button>
        )}
        <Button variant="secondary" onClick={dismiss}>
          Ahora no
        </Button>
      </div>
    </div>
  );
}