// Lugares de ejemplo en Neiva (coordenadas aproximadas) para no escribir lat/long a mano.
// Los usa el pasajero en los selectores y el mapa para ubicar puntos por nombre.

export interface Lugar {
  nombre: string;
  lat: number;
  lng: number;
}

export const LUGARES: Lugar[] = [
  { nombre: 'Parque Santander', lat: 2.9273, lng: -75.2896 },
  { nombre: 'Terminal de Transportes', lat: 2.9437, lng: -75.2954 },
  { nombre: 'Universidad Surcolombiana', lat: 2.9389, lng: -75.2889 },
  { nombre: 'Centro Comercial San Pedro Plaza', lat: 2.9380, lng: -75.2800 },
  { nombre: 'Aeropuerto Benito Salas', lat: 2.9501, lng: -75.2940 },
];

// Centro aproximado de Neiva y límites para que el mapa no se salga de la ciudad
export const NEIVA_CENTRO: [number, number] = [2.9345, -75.289];
export const NEIVA_LIMITES: [[number, number], [number, number]] = [
  [2.86, -75.36],
  [3.02, -75.2],
];

// Nombre que se envía cuando el pasajero toca un punto del mapa
export function nombrePuntoMapa(lat: number, lng: number): string {
  return `Punto en el mapa (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

// Redondea a 6 decimales (unos 10 cm), suficiente para enviar a la API
export function redondear(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

// Devuelve true si dos lugares están en la misma posición
export function mismoLugar(a: Lugar | null, b: Lugar | null): boolean {
  return !!a && !!b && a.lat === b.lat && a.lng === b.lng;
}

function esNumero(v: any): boolean {
  return v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
}

// Obtiene el punto de origen o destino de un objeto que viene de la API (solicitud o viaje).
// No sabemos si la API devuelve coordenadas, así que se prueba en este orden:
//  1. origin_latitude / origin_longitude (o destination_*) si vienen y son números
//  2. el nombre coincide con uno de los LUGARES
//  3. el nombre tiene el formato "Punto en el mapa (lat, lng)" que genera esta app
// Si nada funciona devuelve null y el mapa simplemente no dibuja ese punto.
export function resolverPunto(obj: any, extremo: 'origin' | 'destination'): Lugar | null {
  if (!obj) return null;
  const nombre: string = obj[`${extremo}_name`] || '';
  const lat = obj[`${extremo}_latitude`];
  const lng = obj[`${extremo}_longitude`];
  if (esNumero(lat) && esNumero(lng)) return { nombre, lat: Number(lat), lng: Number(lng) };

  const conocido = LUGARES.find((l) => l.nombre === nombre);
  if (conocido) return { ...conocido };

  const m = /^Punto en el mapa \((-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)\)$/.exec(nombre);
  if (m) return { nombre, lat: Number(m[1]), lng: Number(m[2]) };
  return null;
}
