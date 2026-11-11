import { Component, OnInit, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { AuthService } from '../auth.service';
import { ClientService } from '../client.service';
import { LUGARES, Lugar, mismoLugar, nombrePuntoMapa, redondear, resolverPunto } from '../lugares';
import { MapComponent } from '../map/map.component';

// Angular 22 no usa Zone.js por defecto: cambiar una propiedad normal después de un
// "await" no repinta la pantalla. Por eso todo lo que se muestra en la vista es un signal:
// al hacer .set() Angular sabe que debe actualizar la plantilla.

// Origen y destino de la última solicitud, guardados para poder dibujar la ruta
// al recargar aunque la API no devuelva coordenadas.
interface UltimaRuta {
  origen: Lugar;
  destino: Lugar;
}

@Component({
  selector: 'app-client-dashboard',
  templateUrl: './client-dashboard.page.html',
  styleUrls: ['./client-dashboard.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, MapComponent],
})
export class ClientDashboardPage implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private clientApi = inject(ClientService);
  private mapa = viewChild(MapComponent);

  lugares = LUGARES;
  origen = signal<Lugar>(LUGARES[0]);
  destino = signal<Lugar>(LUGARES[1]);
  eligiendo = signal<'origen' | 'destino'>('origen'); // qué punto se fija al tocar el mapa

  estimado = signal<any>(null);   // resultado de estimar tarifa
  activo = signal<any>(null);     // solicitud o viaje activo
  tipo = signal('');              // 'request' | 'trip'
  error = signal('');
  info = signal('');
  estimando = signal(false);      // carga del botón "Ver tarifa"
  solicitando = signal(false);    // carga del botón "Solicitar viaje"
  cancelando = signal(false);
  ultimaRuta = signal<UltimaRuta | null>(this.leerUltimaRuta());

  // Si el usuario eligió un punto en el mapa, se agrega a las opciones del selector
  opcionesOrigen = computed(() => this.opciones(this.origen()));
  opcionesDestino = computed(() => this.opciones(this.destino()));

  // Puntos que dibuja el mapa: los del viaje activo o los que se están eligiendo
  mapaOrigen = computed(() => (this.activo() ? this.puntoActivo('origin') : this.origen()));
  mapaDestino = computed(() => (this.activo() ? this.puntoActivo('destination') : this.destino()));

  nombre = '';                    // primer nombre del usuario para el saludo
  idUsuario = 1;
  pasos = ['Buscando', 'Asignado', 'Llegó', 'En viaje'];

  private timer: any;
  private consultando = false;    // evita consultas encimadas si la API tarda más de 5 s

  constructor() {
    const usuario = this.auth.getUser();
    this.nombre = (usuario?.name || '').split(' ')[0];
    this.idUsuario = Number(usuario?.id) || 1;
  }

  // Posición del estado en la barra de progreso (0 a 3)
  paso(status: string): number {
    return ['requested', 'assigned', 'driver_arrived', 'in_progress'].indexOf(status);
  }

  // Al abrir la pantalla revisa si ya hay un viaje activo y repite cada 5 segundos
  ngOnInit() {
    this.cargarActivo();
    this.timer = setInterval(() => this.cargarActivo(), 5000);
  }

  // Detiene el temporizador al salir de la pantalla
  ngOnDestroy() {
    clearInterval(this.timer);
  }

  // Ionic reutiliza las páginas: al volver al dashboard se consulta de inmediato
  ionViewWillEnter() {
    this.cargarActivo();
  }

  // Cuando la transición de Ionic termina, el mapa recalcula su tamaño
  ionViewDidEnter() {
    this.mapa()?.refrescar();
  }

  // Consulta el estado actual. Endpoint: GET /api/client/active
  async cargarActivo() {
    if (this.consultando) return;
    this.consultando = true;
    try {
      const res: any = await this.clientApi.viajeActivo();
      if (res.has_active) {
        this.activo.set(res.data);
        this.tipo.set(res.type);
        this.estimado.set(null);
      } else {
        if (this.activo()) this.info.set('Tu viaje terminó o fue cancelado.');
        this.activo.set(null);
        this.tipo.set('');
        this.guardarUltimaRuta(null);
      }
    } catch {
      // Si falla la red se conserva el último estado conocido
    } finally {
      this.consultando = false;
    }
  }

  // Cambia el origen desde el selector
  elegirOrigen(lugar: Lugar) {
    this.origen.set(lugar);
    this.cambiarRuta();
  }

  // Cambia el destino desde el selector
  elegirDestino(lugar: Lugar) {
    this.destino.set(lugar);
    this.cambiarRuta();
  }

  // El usuario tocó el mapa: fija el origen o el destino en ese punto (sin endpoint).
  // Después de fijar el origen pasa solo a elegir el destino, como en Uber.
  elegirEnMapa(p: { lat: number; lng: number }) {
    const lugar: Lugar = { nombre: nombrePuntoMapa(p.lat, p.lng), lat: redondear(p.lat), lng: redondear(p.lng) };
    if (this.eligiendo() === 'origen') {
      this.origen.set(lugar);
      this.eligiendo.set('destino');
    } else {
      this.destino.set(lugar);
    }
    this.cambiarRuta();
  }

  // Intercambia origen y destino
  intercambiar() {
    const o = this.origen();
    this.origen.set(this.destino());
    this.destino.set(o);
    this.cambiarRuta();
  }

  // Al cambiar origen o destino, la tarifa anterior ya no sirve
  cambiarRuta() {
    this.estimado.set(null);
    this.error.set('');
  }

  // Arma el cuerpo con coordenadas de origen y destino
  private coordenadas() {
    return {
      origin_latitude: this.origen().lat,
      origin_longitude: this.origen().lng,
      destination_latitude: this.destino().lat,
      destination_longitude: this.destino().lng,
    };
  }

  // Calcula la tarifa estimada. Endpoint: POST /api/client/estimate-fare
  async estimar() {
    this.error.set('');
    this.info.set('');
    if (mismoLugar(this.origen(), this.destino())) {
      this.error.set('El origen y el destino no pueden ser iguales');
      return;
    }
    this.estimando.set(true);
    try {
      const res: any = await this.clientApi.estimarTarifa(this.coordenadas());
      this.estimado.set(res.estimate);
    } catch (e: any) {
      this.error.set(this.mensaje(e));
    } finally {
      this.estimando.set(false);
    }
  }

  // Crea la solicitud de viaje. Endpoint: POST /api/client/ride-requests
  async solicitar() {
    if (this.solicitando()) return;
    this.error.set('');
    this.info.set('');
    this.solicitando.set(true);
    try {
      await this.clientApi.solicitarViaje({
        origin_name: this.origen().nombre,
        origin_latitude: this.origen().lat,
        origin_longitude: this.origen().lng,
        destination_name: this.destino().nombre,
        destination_latitude: this.destino().lat,
        destination_longitude: this.destino().lng,
      });
      this.guardarUltimaRuta({ origen: this.origen(), destino: this.destino() });
      this.consultando = false;   // forzar la consulta aunque haya una del temporizador en curso
      await this.cargarActivo();
    } catch (e: any) {
      this.error.set(this.mensaje(e));
    } finally {
      this.solicitando.set(false);
    }
  }

  // Cancela la solicitud o viaje activo. Endpoint: POST /api/client/cancel/{id}
  async cancelar() {
    const activo = this.activo();
    if (!activo || this.cancelando()) return;
    this.error.set('');
    this.cancelando.set(true);
    try {
      await this.clientApi.cancelar(activo.id, 'Cancelado por el cliente');
      this.activo.set(null);
      this.tipo.set('');
      this.guardarUltimaRuta(null);
      this.info.set('Solicitud cancelada.');
    } catch (e: any) {
      this.error.set(this.mensaje(e));
    } finally {
      this.cancelando.set(false);
    }
  }

  // Cierra sesión. Endpoint: POST /api/auth/logout
  salir() {
    this.auth.logout();
  }

  // Texto legible para cada estado del viaje
  etiqueta(status: string): string {
    const m: any = {
      requested: 'Buscando conductor',
      assigned: 'Conductor asignado',
      driver_arrived: 'Tu conductor llegó',
      in_progress: 'En viaje',
    };
    return m[status] || status;
  }

  // Frase de apoyo bajo el estado del viaje
  detalle(status: string): string {
    const m: any = {
      requested: 'Estamos buscando un conductor cerca de ti.',
      assigned: 'Tu conductor va en camino al punto de recogida.',
      driver_arrived: 'Tu conductor te espera en el punto de recogida.',
      in_progress: 'Disfruta el viaje.',
    };
    return m[status] || '';
  }

  // Formatea dinero en pesos colombianos
  moneda(n: number): string {
    return '$' + Number(n).toLocaleString('es-CO');
  }

  // Punto del viaje activo: primero lo que diga la API; si no alcanza, la última ruta guardada
  private puntoActivo(extremo: 'origin' | 'destination'): Lugar | null {
    const activo = this.activo();
    const punto = resolverPunto(activo, extremo);
    if (punto) return punto;
    const guardada = this.ultimaRuta();
    const lugar = extremo === 'origin' ? guardada?.origen : guardada?.destino;
    const nombre = activo?.[`${extremo}_name`];
    return lugar && (!nombre || nombre === lugar.nombre) ? lugar : null;
  }

  private opciones(seleccionado: Lugar): Lugar[] {
    return LUGARES.includes(seleccionado) ? LUGARES : [...LUGARES, seleccionado];
  }

  // Lee la última ruta de localStorage (clave lastRoute). Si está dañada, la ignora.
  private leerUltimaRuta(): UltimaRuta | null {
    try {
      const texto = localStorage.getItem('lastRoute');
      return texto ? JSON.parse(texto) : null;
    } catch {
      return null;
    }
  }

  private guardarUltimaRuta(ruta: UltimaRuta | null) {
    this.ultimaRuta.set(ruta);
    if (ruta) localStorage.setItem('lastRoute', JSON.stringify(ruta));
    else localStorage.removeItem('lastRoute');
  }

  // Convierte un error HTTP en un mensaje para mostrar
  private mensaje(e: any): string {
    if (e?.status === 0) return 'No hay conexión con el servidor';
    const errors = e?.error?.errors;
    return errors ? (Object.values(errors).flat() as string[]).join(' | ') : e?.error?.message || 'Error inesperado';
  }
}
