import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QrCode({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { margin: 1, width: 320, color: { dark: '#1b232b', light: '#ffffff' } })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc(null);
      });
    return () => {
      active = false;
    };
  }, [value]);

  if (!src) return null;
  return <img src={src} alt={label} width={160} height={160} className="rounded-md border border-asphalt-200" />;
}