import {
  AfterViewInit, Component, ElementRef, OnDestroy, effect, inject, input, output, signal, untracked, viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { Lugar, NEIVA_CENTRO, NEIVA_LIMITES } from '../lugares';
import { Coord, RouteService } from '../route.service';

// =============================================================================
// Mapa de Neiva (Leaflet + mosaicos de CARTO/OpenStreetMap, sin clave).
//
// IMPORTANTE: la API NO entrega la ubicación de los conductores. Todos los carros que se
// ven en este mapa son una SIMULACIÓN VISUAL hecha en el frontend:
//  - "Buscando conductor": unos carros se mueven cerca del origen.
//  - "Conductor asignado": un carro recorre la ruta por calles hasta el origen.
//  - "En viaje": el carro recorre la ruta del origen al destino.
// Las posiciones se calculan a partir del id del viaje (o del usuario), así que no saltan
// cada vez que la página vuelve a consultar la API. No es GPS real.
// =============================================================================

// Duración de las animaciones (en milisegundos)
const DURACION_ACERCAMIENTO_MS = 20000; // carro yendo al punto de recogida
const DURACION_VIAJE_MS = 40000;        // carro yendo del origen al destino
const CARROS_CERCANOS = 5;              // carros simulados mientras se busca conductor

const ESTADOS_VIAJE = ['requested', 'assigned', 'driver_arrived', 'in_progress'];

// Carro visto desde arriba. Apunta hacia el norte; se rota según el rumbo.
const SVG_CARRO =
  '<svg width="18" height="32" viewBox="0 0 18 32" aria-hidden="true">' +
  '<rect x="1" y="1" width="16" height="30" rx="5" fill="#0e0f12" stroke="#fff" stroke-width="1.5"/>' +
  '<path d="M4 9.5h10l-1.2 4H5.2z" fill="#a7afb8"/>' +
  '<rect x="4.5" y="14.5" width="9" height="8" rx="1.5" fill="#2b2d33"/>' +
  '<path d="M5 26h8l-.8-2.5H5.8z" fill="#a7afb8"/>' +
  '</svg>';

// Carro que recorre una línea de principio a fin
interface Recorrido {
  marcador: L.Marker;
  linea: Coord[];
  acumulado: number[]; // metros recorridos hasta cada punto de la línea
  total: number;
  inicio: number;
  duracion: number;
}

// Carro que va y viene entre dos puntos (simulación de carros cercanos)
interface Errante {
  marcador: L.Marker;
  a: Coord;
  b: Coord;
  periodo: number;
  fase: number;
}

// Números pseudoaleatorios repetibles: misma semilla, mismos números
function generador(semilla: number): () => number {
  let s = Math.imul(Math.floor(Math.abs(semilla)) || 1, 2654435761) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Punto ubicado a cierta distancia (metros) y rumbo (grados desde el norte) de otro
function desplazar(p: Coord, metros: number, grados: number): Coord {
  const r = (grados * Math.PI) / 180;
  return [
    p[0] + (metros * Math.cos(r)) / 111320,
    p[1] + (metros * Math.sin(r)) / (111320 * Math.cos((p[0] * Math.PI) / 180)),
  ];
}

// Distancia aproximada en metros (suficiente para distancias de una ciudad)
function distancia(a: Coord, b: Coord): number {
  const dLat = (b[0] - a[0]) * 111320;
  const dLng = (b[1] - a[1]) * 111320 * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

// Rumbo en grados (0 = norte, 90 = este) para girar el carro
function rumbo(a: Coord, b: Coord): number {
  const dLat = b[0] - a[0];
  const dLng = (b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180);
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

function interpolar(a: Coord, b: Coord, f: number): Coord {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

@Component({
  selector: 'app-map',
  standalone: true,
  template: `<div #mapa class="u-mapa" [class.u-mapa--apagado]="estado() === 'offline'"
                  [class.u-mapa--elegir]="seleccionable()"></div>`,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  // ---- Entradas que manda la página ----
  modo = input<'cliente' | 'conductor'>('cliente');
  origen = input<Lugar | null>(null);
  destino = input<Lugar | null>(null);
  // Cliente: '' | requested | assigned | driver_arrived | in_progress
  // Conductor: offline | online | assigned | driver_arrived | in_progress
  estado = input('');
  viajeId = input<number | null>(null);
  semilla = input(1);               // id del usuario: fija la posición simulada del conductor
  mostrarRuta = input(false);       // dibujar la ruta aunque no haya viaje (tarifa estimada)
  pendientes = input<Lugar[]>([]);  // orígenes de solicitudes (solo conductor)
  seleccionable = input(false);     // permite tocar el mapa para elegir un punto

  // Punto que el usuario tocó en el mapa
  puntoElegido = output<{ lat: number; lng: number }>();

  private contenedor = viewChild.required<ElementRef<HTMLDivElement>>('mapa');
  private rutas = inject(RouteService);
  private listo = signal(false);

  private map?: L.Map;
  private capaRuta = L.layerGroup();
  private capaPuntos = L.layerGroup();
  private capaPendientes = L.layerGroup();
  private capaCarros = L.layerGroup();

  private recorrido?: Recorrido;
  private flota: Errante[] = [];
  private animacion = 0;
  private version = 0;          // invalida dibujos viejos cuando llega uno nuevo
  private claveEscena = '';
  private clavePendientes = '';
  private ultimoEncuadre: Coord[] = [];
  private usuarioMovio = false;
  private observador?: ResizeObserver;
  private reducido =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    // La página vuelve a consultar la API cada 5 s y entrega objetos nuevos aunque nada
    // haya cambiado. Por eso se arma una "clave" con los datos que importan y solo se
    // redibuja cuando esa clave cambia; así no se reinician las animaciones.
    effect(() => {
      if (!this.listo()) return;
      const o = this.origen();
      const d = this.destino();
      const clave = JSON.stringify([
        this.modo(), this.estado(), this.viajeId(), this.semilla(), this.mostrarRuta(),
        o && [o.lat, o.lng, o.nombre], d && [d.lat, d.lng, d.nombre],
      ]);
      untracked(() => {
        if (clave === this.claveEscena) return;
        this.claveEscena = clave;
        this.dibujarEscena();
      });
    });

    effect(() => {
      if (!this.listo()) return;
      const clave = JSON.stringify(this.pendientes().map((p) => [p.lat, p.lng]));
      untracked(() => {
        if (clave === this.clavePendientes) return;
        this.clavePendientes = clave;
        this.dibujarPendientes();
      });
    });
  }

  // Crea el mapa cuando el contenedor ya existe en la pantalla
  ngAfterViewInit() {
    const map = L.map(this.contenedor().nativeElement, {
      center: NEIVA_CENTRO,
      zoom: 14,
      minZoom: 12,
      maxZoom: 18,
      maxBounds: NEIVA_LIMITES,
      maxBoundsViscosity: 0.8,
      zoomControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    this.capaRuta.addTo(map);
    this.capaPendientes.addTo(map);
    this.capaPuntos.addTo(map);
    this.capaCarros.addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.seleccionable()) this.puntoElegido.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    map.on('dragstart', () => (this.usuarioMovio = true));

    // Dentro de Ionic el tamaño del contenedor cambia (transiciones, panel inferior).
    // Sin invalidateSize Leaflet pinta mosaicos grises.
    if (typeof ResizeObserver !== 'undefined') {
      this.observador = new ResizeObserver(() => this.refrescar());
      this.observador.observe(this.contenedor().nativeElement);
    }

    this.map = map;
    this.listo.set(true);
  }

  // Detiene animaciones y libera el mapa al salir de la página
  ngOnDestroy() {
    this.version++;
    this.detenerAnimacion();
    this.observador?.disconnect();
    this.map?.remove();
    this.map = undefined;
  }

  // Recalcula el tamaño del mapa. La página lo llama en ionViewDidEnter.
  refrescar() {
    if (!this.map) return;
    this.map.invalidateSize();
    if (!this.usuarioMovio) this.aplicarEncuadre();
  }

  // ---------------------------------------------------------------------------
  // Escenas
  // ---------------------------------------------------------------------------

  // Dibuja marcadores, ruta y carros según el estado actual
  private async dibujarEscena() {
    if (!this.map) return;
    const version = ++this.version;
    this.limpiarEscena();

    const estado = this.estado();
    const enViaje = ESTADOS_VIAJE.includes(estado);
    const lugarO = this.origen();
    const lugarD = this.destino();
    const o: Coord | null = lugarO ? [lugarO.lat, lugarO.lng] : null;
    const d: Coord | null = lugarD ? [lugarD.lat, lugarD.lng] : null;

    // Conductor sin viaje: solo su carro (las solicitudes se dibujan en otra capa)
    if (this.modo() === 'conductor' && !enViaje) {
      const base = this.posicionBase();
      this.crearCarro(base.punto, base.rumbo);
      this.encuadrar([base.punto, ...this.puntosPendientes()]);
      return;
    }

    if (lugarO && o) this.marcarPunto(o, 'origen', lugarO.nombre);
    if (lugarD && d) this.marcarPunto(d, 'destino', lugarD.nombre);
    const puntos = [o, d].filter((p): p is Coord => !!p);
    this.encuadrar(puntos.length ? puntos : [NEIVA_CENTRO]);

    // Ruta por calles del origen al destino
    let ruta: Coord[] | null = null;
    if (o && d && (enViaje || this.mostrarRuta())) {
      ruta = await this.rutas.ruta(o, d);
      if (version !== this.version) return;
      this.dibujarLinea(ruta, true);
      this.encuadrar(ruta);
    }
    if (!o) return;

    if (estado === 'requested') {
      this.ponerRadar(o);
      this.crearFlota(o);
    } else if (estado === 'assigned') {
      // El carro sale de un punto cercano (600 a 900 m) y va por calles hasta el origen
      const azar = generador(this.viajeId() ?? 1);
      const inicio = desplazar(o, 600 + azar() * 300, azar() * 360);
      const acercamiento = await this.rutas.ruta(inicio, o);
      if (version !== this.version) return;
      this.dibujarLinea(acercamiento, false);
      this.encuadrar([...acercamiento, ...(ruta ?? [])]);
      this.recorrer(acercamiento, DURACION_ACERCAMIENTO_MS);
    } else if (estado === 'driver_arrived') {
      this.crearCarro(o, ruta ? rumbo(ruta[0], ruta[1]) : 0);
    } else if (estado === 'in_progress') {
      if (ruta) this.recorrer(ruta, DURACION_VIAJE_MS);
      else this.crearCarro(o, 0);
    }
  }

  // Marca el origen de cada solicitud pendiente (conductor en línea)
  private dibujarPendientes() {
    this.capaPendientes.clearLayers();
    const puntos = this.puntosPendientes();
    puntos.forEach((p) =>
      L.marker(p, {
        icon: L.divIcon({ className: 'u-icono-mapa', html: '<div class="u-pin u-pin--solicitud"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
        interactive: false,
        keyboard: false,
      }).addTo(this.capaPendientes)
    );
    if (this.modo() === 'conductor' && !ESTADOS_VIAJE.includes(this.estado())) {
      this.encuadrar([this.posicionBase().punto, ...puntos]);
    }
  }

  private puntosPendientes(): Coord[] {
    return this.pendientes().map((p) => [p.lat, p.lng] as Coord);
  }

  // Posición simulada del conductor cuando no tiene viaje (depende del id del usuario)
  private posicionBase(): { punto: Coord; rumbo: number } {
    const azar = generador(this.semilla());
    return { punto: desplazar(NEIVA_CENTRO, 300 + azar() * 900, azar() * 360), rumbo: azar() * 360 };
  }

  // ---------------------------------------------------------------------------
  // Dibujo
  // ---------------------------------------------------------------------------

  private limpiarEscena() {
    this.detenerAnimacion();
    this.recorrido = undefined;
    this.flota = [];
    this.capaRuta.clearLayers();
    this.capaPuntos.clearLayers();
    this.capaCarros.clearLayers();
  }

  // Punto redondo (origen) o cuadrado (destino) con su nombre encima
  private marcarPunto(p: Coord, tipo: 'origen' | 'destino', nombre: string) {
    const marcador = L.marker(p, {
      icon: L.divIcon({ className: 'u-icono-mapa', html: `<div class="u-pin u-pin--${tipo}"></div>`, iconSize: [20, 20], iconAnchor: [10, 10] }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 500,
    }).addTo(this.capaPuntos);
    if (nombre) {
      // Se usa textContent para que un nombre que venga de la API nunca se interprete como HTML
      const etiqueta = document.createElement('span');
      etiqueta.textContent = nombre;
      marcador.bindTooltip(etiqueta, { permanent: true, direction: 'top', offset: [0, -12], className: 'u-etiqueta-mapa' });
    }
  }

  // Ruta principal: línea negra con borde blanco. Acercamiento: línea punteada gris.
  private dibujarLinea(linea: Coord[], principal: boolean) {
    if (principal) {
      L.polyline(linea, { color: '#ffffff', weight: 9, opacity: 1, interactive: false }).addTo(this.capaRuta);
      L.polyline(linea, { color: '#0e0f12', weight: 5, opacity: 1, interactive: false }).addTo(this.capaRuta);
    } else {
      L.polyline(linea, { color: '#6b6f78', weight: 4, dashArray: '1 9', lineCap: 'round', interactive: false }).addTo(this.capaRuta);
    }
  }

  // Ondas que crecen sobre el origen mientras se busca conductor
  private ponerRadar(p: Coord) {
    L.marker(p, {
      icon: L.divIcon({ className: 'u-icono-mapa', html: '<div class="u-radar"><span></span><span></span></div>', iconSize: [140, 140], iconAnchor: [70, 70] }),
      interactive: false,
      keyboard: false,
      zIndexOffset: -500,
    }).addTo(this.capaRuta);
  }

  private crearCarro(p: Coord, grados: number): L.Marker {
    return L.marker(p, {
      icon: L.divIcon({
        className: 'u-icono-mapa',
        html: `<div class="u-carro" style="transform: rotate(${grados}deg)">${SVG_CARRO}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    }).addTo(this.capaCarros);
  }

  private girar(marcador: L.Marker, grados: number) {
    const el = marcador.getElement()?.firstElementChild as HTMLElement | null;
    if (el) el.style.transform = `rotate(${grados}deg)`;
  }

  // ---------------------------------------------------------------------------
  // Animación
  // ---------------------------------------------------------------------------

  // Pone un carro a recorrer la línea completa en "duracion" milisegundos
  private recorrer(linea: Coord[], duracion: number) {
    const acumulado = [0];
    for (let i = 1; i < linea.length; i++) acumulado.push(acumulado[i - 1] + distancia(linea[i - 1], linea[i]));
    const marcador = this.crearCarro(linea[0], rumbo(linea[0], linea[1] ?? linea[0]));
    this.recorrido = { marcador, linea, acumulado, total: acumulado[acumulado.length - 1], inicio: performance.now(), duracion };

    if (this.reducido || !this.recorrido.total) {
      this.moverEnLinea(this.recorrido, 1);
      this.recorrido = undefined;
      return;
    }
    this.arrancar();
  }

  // Ubica el carro en la fracción f (0 a 1) del recorrido, proporcional a la distancia
  private moverEnLinea(r: Recorrido, f: number) {
    const meta = f * r.total;
    let i = 1;
    while (i < r.acumulado.length - 1 && r.acumulado[i] < meta) i++;
    const tramo = r.acumulado[i] - r.acumulado[i - 1];
    const parte = tramo > 0 ? (meta - r.acumulado[i - 1]) / tramo : 1;
    r.marcador.setLatLng(interpolar(r.linea[i - 1], r.linea[i], Math.min(1, Math.max(0, parte))));
    if (tramo > 0) this.girar(r.marcador, rumbo(r.linea[i - 1], r.linea[i]));
  }

  // Carros simulados cerca del origen mientras se busca conductor
  private crearFlota(o: Coord) {
    const azar = generador((this.viajeId() ?? 1) * 7 + 3);
    for (let i = 0; i < CARROS_CERCANOS; i++) {
      const a = desplazar(o, 250 + azar() * 650, azar() * 360);
      const b = desplazar(a, 120 + azar() * 160, azar() * 360);
      const marcador = this.crearCarro(a, rumbo(a, b));
      this.flota.push({ marcador, a, b, periodo: 9000 + azar() * 6000, fase: azar() * 2 });
    }
    this.arrancar();
  }

  private arrancar() {
    if (this.animacion || this.reducido || typeof requestAnimationFrame !== 'function') return;
    this.animacion = requestAnimationFrame(this.cuadro);
  }

  private detenerAnimacion() {
    if (this.animacion && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.animacion);
    this.animacion = 0;
  }

  // Un cuadro de animación (unas 60 veces por segundo)
  private cuadro = (t: number) => {
    this.animacion = 0;
    if (!this.map) return;

    const r = this.recorrido;
    if (r) {
      const f = Math.min(1, (t - r.inicio) / r.duracion);
      this.moverEnLinea(r, f);
      if (f >= 1) this.recorrido = undefined;
    }

    for (const e of this.flota) {
      // Va de a hacia b y regresa, con aceleración suave en los extremos
      let f = (t / e.periodo + e.fase) % 2;
      const ida = f <= 1;
      if (!ida) f = 2 - f;
      const suave = (1 - Math.cos(f * Math.PI)) / 2;
      e.marcador.setLatLng(interpolar(e.a, e.b, suave));
      this.girar(e.marcador, ida ? rumbo(e.a, e.b) : rumbo(e.b, e.a));
    }

    if (this.recorrido || this.flota.length) this.arrancar();
  };

  // ---------------------------------------------------------------------------
  // Encuadre
  // ---------------------------------------------------------------------------

  private encuadrar(puntos: Coord[]) {
    this.ultimoEncuadre = puntos;
    this.usuarioMovio = false;
    this.aplicarEncuadre();
  }

  private aplicarEncuadre() {
    const map = this.map;
    const puntos = this.ultimoEncuadre;
    if (!map || !puntos.length) return;
    const tam = map.getSize();
    if (!tam.x || !tam.y) return;
    if (puntos.length === 1) {
      map.setView(puntos[0], 15, { animate: !this.reducido });
    } else {
      map.fitBounds(L.latLngBounds(puntos), {
        paddingTopLeft: [40, 84],
        paddingBottomRight: [40, 40],
        maxZoom: 16,
        animate: !this.reducido,
      });
    }
  }
}
