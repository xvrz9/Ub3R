import { Component, OnInit, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonToggle } from '@ionic/angular';
import { AuthService } from '../auth.service';
import { DriverService } from '../driver.service';
import { Lugar, resolverPunto } from '../lugares';
import { MapComponent } from '../map/map.component';

// Igual que en el dashboard del cliente: Angular 22 no usa Zone.js, así que lo que
// cambia después de un "await" debe ser signal para que la pantalla se actualice.

@Component({
  selector: 'app-driver-dashboard',
  templateUrl: './driver-dashboard.page.html',
  styleUrls: ['./driver-dashboard.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonToggle, MapComponent],
})
export class DriverDashboardPage implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private driverApi = inject(DriverService);
  private mapa = viewChild(MapComponent);

  disponible = signal(false);
  solicitudes = signal<any[]>([]);
  viaje = signal<any>(null);   // viaje en curso del conductor (se guarda en localStorage)
  error = signal('');
  info = signal('');
  cargando = signal(false);    // botón de la acción en curso
  conectando = signal(false);  // mientras se cambia la disponibilidad

  // Datos que recibe el mapa
  estadoMapa = computed(() => this.viaje()?.status || (this.disponible() ? 'online' : 'offline'));
  mapaOrigen = computed(() => resolverPunto(this.viaje(), 'origin'));
  mapaDestino = computed(() => resolverPunto(this.viaje(), 'destination'));
  mapaPendientes = computed(() =>
    this.viaje() ? [] : this.solicitudes().map((s) => resolverPunto(s, 'origin')).filter((p): p is Lugar => !!p)
  );

  distancia: any = 1;          // distancia real al finalizar
  duracion: any = 5;           // duración real al finalizar
  nombre = '';
  idUsuario = 1;
  pasos = ['Asignado', 'Llegué', 'En viaje', 'Fin'];

  private timer: any;

  constructor() {
    const usuario = this.auth.getUser();
    this.nombre = (usuario?.name || '').split(' ')[0];
    this.idUsuario = Number(usuario?.id) || 1;
  }

  // Recupera el viaje en curso (si lo hay), restaura la disponibilidad y
  // refresca la lista de solicitudes cada 5 segundos
  ngOnInit() {
    try {
      const guardado = localStorage.getItem('activeTrip');
      if (guardado) this.viaje.set(JSON.parse(guardado));
    } catch {
      localStorage.removeItem('activeTrip'); // JSON dañado: se descarta
    }
    if (localStorage.getItem('driverAvailable') === '1') this.restaurarDisponibilidad();
    this.timer = setInterval(() => this.cargarSolicitudes(), 5000);
  }

  // Detiene el temporizador al salir de la pantalla
  ngOnDestroy() {
    clearInterval(this.timer);
  }

  // Cuando la transición de Ionic termina, el mapa recalcula su tamaño
  ionViewDidEnter() {
    this.mapa()?.refrescar();
  }

  // La API no tiene un endpoint para leer la disponibilidad. Si el conductor la dejó
  // encendida, se vuelve a enviar para quedar sincronizado. Endpoint: PUT /api/driver/availability
  private async restaurarDisponibilidad() {
    this.conectando.set(true);
    try {
      await this.driverApi.cambiarDisponibilidad('available');
      this.disponible.set(true);
      await this.cargarSolicitudes();
    } catch (e: any) {
      this.disponible.set(false);
      localStorage.removeItem('driverAvailable');
      this.error.set(
        e?.status === 403 ? 'Tu cuenta aún no ha sido aprobada por el administrador.' : this.mensaje(e)
      );
    } finally {
      this.conectando.set(false);
    }
  }

  // Cambia la disponibilidad al mover el toggle. Endpoint: PUT /api/driver/availability
  async onToggle(ev: any) {
    const quiere = ev.detail.checked;
    if (quiere === this.disponible()) return;
    this.error.set('');
    this.info.set('');
    this.conectando.set(true);
    try {
      await this.driverApi.cambiarDisponibilidad(quiere ? 'available' : 'unavailable');
      this.disponible.set(quiere);
      if (quiere) {
        localStorage.setItem('driverAvailable', '1');
        await this.cargarSolicitudes();
      } else {
        localStorage.removeItem('driverAvailable');
        this.solicitudes.set([]);
      }
    } catch (e: any) {
      // 403: conductor aún no aprobado por el administrador
      this.disponible.set(false);
      localStorage.removeItem('driverAvailable');
      ev.target.checked = false;
      this.error.set(
        e?.status === 403 ? 'Tu cuenta aún no ha sido aprobada por el administrador.' : this.mensaje(e)
      );
    } finally {
      this.conectando.set(false);
    }
  }

  // Trae las solicitudes pendientes. Endpoint: GET /api/driver/ride-requests
  async cargarSolicitudes() {
    if (!this.disponible() || this.viaje()) return;
    try {
      const res: any = await this.driverApi.solicitudes();
      this.solicitudes.set(res.requests || []);
    } catch {
      // Si falla la red se conserva la última lista
    }
  }

  // Acepta una solicitud. Endpoint: POST /api/driver/ride-requests/{id}/accept
  // Si otro conductor la tomó primero, el backend responde 409.
  async aceptar(s: any) {
    this.error.set('');
    this.info.set('');
    this.cargando.set(true);
    try {
      const res: any = await this.driverApi.aceptar(s.id);
      const trip = res.trip || {};
      this.viaje.set({
        ...trip,
        origin_name: s.origin_name,
        destination_name: s.destination_name,
        // Coordenadas para el mapa, solo si la API las mandó en el viaje o en la solicitud
        origin_latitude: trip.origin_latitude ?? s.origin_latitude,
        origin_longitude: trip.origin_longitude ?? s.origin_longitude,
        destination_latitude: trip.destination_latitude ?? s.destination_latitude,
        destination_longitude: trip.destination_longitude ?? s.destination_longitude,
        estimated_fare: trip.estimated_fare ?? s.estimated_fare,
        client: s.client,
      });
      this.distancia = s.estimated_distance_km;
      this.guardarViaje();
      this.solicitudes.set([]);
    } catch (e: any) {
      this.error.set(e?.status === 409 ? 'Otro conductor tomó esta solicitud.' : this.mensaje(e));
      this.cargarSolicitudes();
    } finally {
      this.cargando.set(false);
    }
  }

  // Registra la llegada al punto de recogida. Endpoint: POST /api/driver/trips/{id}/arrive
  async llegar() {
    await this.accionViaje(() => this.driverApi.llegar(this.viaje().id));
  }

  // Inicia el recorrido. Endpoint: POST /api/driver/trips/{id}/start
  async iniciar() {
    await this.accionViaje(() => this.driverApi.iniciar(this.viaje().id));
  }

  // Finaliza el viaje. Endpoint: POST /api/driver/trips/{id}/complete
  async finalizar() {
    this.error.set('');
    const km = Number(this.distancia);
    const min = Number(this.duracion);
    if (!Number.isFinite(km) || km <= 0 || !Number.isFinite(min) || min <= 0) {
      this.error.set('La distancia y la duración deben ser números mayores que cero.');
      return;
    }
    this.cargando.set(true);
    try {
      const res: any = await this.driverApi.finalizar(this.viaje().id, km, min);
      this.info.set('Viaje finalizado. Tarifa final: ' + this.moneda(res.trip.final_fare));
      this.viaje.set(null);
      localStorage.removeItem('activeTrip');
      this.disponible.set(true); // el backend lo deja disponible al completar
      localStorage.setItem('driverAvailable', '1');
      this.cargarSolicitudes();
    } catch (e: any) {
      this.error.set(this.mensaje(e));
    } finally {
      this.cargando.set(false);
    }
  }

  // Ejecuta arrive/start y actualiza el estado del viaje con la respuesta
  private async accionViaje(fn: () => Promise<any>) {
    this.error.set('');
    this.cargando.set(true);
    try {
      const res: any = await fn();
      this.viaje.set({ ...this.viaje(), status: res.trip.status });
      this.guardarViaje();
    } catch (e: any) {
      this.error.set(this.mensaje(e));
    } finally {
      this.cargando.set(false);
    }
  }

  // Guarda el viaje en localStorage para no perderlo al recargar
  private guardarViaje() {
    localStorage.setItem('activeTrip', JSON.stringify(this.viaje()));
  }

  // Cierra sesión. Endpoint: POST /api/auth/logout (AuthService borra activeTrip y driverAvailable)
  salir() {
    this.auth.logout();
  }

  // Posición del estado en la barra de progreso (0 a 2)
  paso(status: string): number {
    return ['assigned', 'driver_arrived', 'in_progress'].indexOf(status);
  }

  // Texto legible para cada estado del viaje
  etiqueta(status: string): string {
    const m: any = {
      assigned: 'Ve por el pasajero',
      driver_arrived: 'Esperando al pasajero',
      in_progress: 'En viaje',
    };
    return m[status] || status;
  }

  // Formatea dinero en pesos colombianos
  moneda(n: number): string {
    return '$' + Number(n).toLocaleString('es-CO');
  }

  // Convierte un error HTTP en un mensaje para mostrar
  private mensaje(e: any): string {
    if (e?.status === 0) return 'No hay conexión con el servidor';
    return e?.error?.message || 'Error inesperado';
  }
}
