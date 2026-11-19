/**
 * Simula a un repartidor yendo de un punto a otro (para probar el mapa sin un celular).
 *
 *   DRIVER_EMAIL=repartidor@ruvika.com DRIVER_PASSWORD=... \
 *   node scripts/simulate-driver.js "-34.9100,-60.0300" "-34.8956,-60.0189"
 *
 * Necesita que el repartidor tenga una entrega activa. Para ver la geocerca y el ETA, la entrega
 * tiene que estar "en camino" y el pedido geocodificado.
 */
const API = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const STEP_MS = Number(process.env.STEP_SECONDS ?? 6) * 1000; // el servidor descarta pings de menos de 5 s
const STEPS = Number(process.env.STEPS ?? 30);
const [from, to] = [process.argv[2] ?? '-34.9100,-60.0300', process.argv[3] ?? '-34.8956,-60.0189'].map((value) =>
  value.split(',').map(Number)
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(path, body, token) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} -> ${response.status} ${data.error?.message ?? ''}`);
  return data;
}

const { DRIVER_EMAIL, DRIVER_PASSWORD } = process.env;
if (!DRIVER_EMAIL || !DRIVER_PASSWORD) {
  console.error('Definí DRIVER_EMAIL y DRIVER_PASSWORD.');
  process.exit(1);
}

const { accessToken } = await call('/api/auth/login', { email: DRIVER_EMAIL, password: DRIVER_PASSWORD });
for (let step = 0; step <= STEPS; step += 1) {
  const t = step / STEPS;
  const jitter = () => (Math.random() - 0.5) * 0.0002; // ~10 m de ruido, como un GPS real
  const lat = from[0] + (to[0] - from[0]) * t + jitter();
  const lng = from[1] + (to[1] - from[1]) * t + jitter();
  const result = await call('/api/locations/me', { lat, lng, accuracy: 10, speed: 8 }, accessToken);
  console.log(`[${step}/${STEPS}] ${lat.toFixed(5)}, ${lng.toFixed(5)} -> ${JSON.stringify(result)}`);
  await sleep(STEP_MS);
}