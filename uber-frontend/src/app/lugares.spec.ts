import { mismoLugar, nombrePuntoMapa, resolverPunto } from './lugares';

describe('resolverPunto', () => {
  it('usa las coordenadas si la API las manda', () => {
    const p = resolverPunto({ origin_name: 'Casa', origin_latitude: '2.93', origin_longitude: '-75.28' }, 'origin');
    expect(p).toEqual({ nombre: 'Casa', lat: 2.93, lng: -75.28 });
  });

  it('busca por nombre en los lugares conocidos', () => {
    const p = resolverPunto({ destination_name: 'Parque Santander' }, 'destination');
    expect(p).toEqual({ nombre: 'Parque Santander', lat: 2.9273, lng: -75.2896 });
  });

  it('lee las coordenadas del nombre de un punto elegido en el mapa', () => {
    const nombre = nombrePuntoMapa(2.93123, -75.28711);
    expect(resolverPunto({ origin_name: nombre }, 'origin')).toEqual({ nombre, lat: 2.9312, lng: -75.2871 });
  });

  it('devuelve null si no hay forma de ubicar el punto', () => {
    expect(resolverPunto({ origin_name: 'Otro sitio', origin_latitude: null }, 'origin')).toBeNull();
    expect(resolverPunto(null, 'origin')).toBeNull();
  });

  it('compara lugares por posición', () => {
    expect(mismoLugar({ nombre: 'a', lat: 1, lng: 2 }, { nombre: 'b', lat: 1, lng: 2 })).toBe(true);
    expect(mismoLugar({ nombre: 'a', lat: 1, lng: 2 }, null)).toBe(false);
  });
});
