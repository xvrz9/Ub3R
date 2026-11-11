import { Injectable } from '@angular/core';

// Par [latitud, longitud]
export type Coord = [number, number];

// Pide la geometría de una ruta por calles al servidor público de OSRM (gratis, sin clave).
// Solo sirve para DIBUJAR la línea en el mapa: la distancia, duración y tarifa que ve el
// usuario siguen saliendo de nuestra API.
// Se usa fetch y no HttpClient para que la petición no pase por el interceptor del token.
@Injectable({ providedIn: 'root' })
export class RouteService {
  private cache = new Map<string, Coord[]>();

  // Devuelve la lista de puntos de la ruta entre a y b.
  // Si OSRM falla, tarda más de 6 s o no hay internet, devuelve una línea recta.
  async ruta(a: Coord, b: Coord): Promise<Coord[]> {
    const recta: Coord[] = [a, b];
    const clave = [...a, ...b].map((n) => n.toFixed(5)).join(',');
    const guardada = this.cache.get(clave);
    if (guardada) return guardada;
    if (typeof fetch !== 'function') return recta;

    // OSRM recibe primero la longitud y luego la latitud
    const url =
      `https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}` +
      '?overview=full&geometries=geojson';
    const control = new AbortController();
    const limite = setTimeout(() => control.abort(), 6000);
    try {
      const respuesta = await fetch(url, { signal: control.signal });
      if (!respuesta.ok) return recta;
      const datos: any = await respuesta.json();
      const puntos = datos?.routes?.[0]?.geometry?.coordinates;
      if (!Array.isArray(puntos) || puntos.length < 2) return recta;

      // GeoJSON viene como [lng, lat]; se invierte y se añaden los extremos exactos
      const linea: Coord[] = [a, ...puntos.map((p: number[]) => [p[1], p[0]] as Coord), b];
      this.cache.set(clave, linea);
      return linea;
    } catch {
      return recta;
    } finally {
      clearTimeout(limite);
    }
  }
}
