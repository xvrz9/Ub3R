import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonButtons, IonButton } from '@ionic/angular';
import { AuthService } from '../auth.service';
import { AdminService, EstadoAprobacion } from '../admin.service';

// Igual que en los otros dashboards: todo lo que cambia después de un "await" es signal
// para que la pantalla se actualice (Angular 22 sin Zone.js).

interface Metrica {
  nombre: string;
  valor: string;
  destacada?: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonButtons, IonButton],
})
export class AdminDashboardPage implements OnInit {
  private auth = inject(AuthService);
  private adminApi = inject(AdminService);

  pestanas: { estado: EstadoAprobacion; nombre: string }[] = [
    { estado: 'pending', nombre: 'Pendientes' },
    { estado: 'approved', nombre: 'Aprobados' },
    { estado: 'rejected', nombre: 'Rechazados' },
  ];

  // Métricas
  metricas = signal<Metrica[]>([]);
  cargandoMetricas = signal(false);
  errorMetricas = signal('');

  // Conductores de la pestaña elegida
  pestana = signal<EstadoAprobacion>('pending');
  conductores = signal<any[]>([]);
  cargandoLista = signal(false);
  errorLista = signal('');

  // Decisiones
  procesando = signal<number | null>(null);   // id del conductor que se está aprobando o rechazando
  rechazando = signal<number | null>(null);   // id del conductor con el formulario de rechazo abierto
  nota = '';                                  // nota escrita al rechazar
  info = signal('');
  error = signal('');

  nombre = '';

  constructor() {
    this.nombre = (this.auth.getUser()?.name || '').split(' ')[0];
  }

  // Al abrir la pantalla carga métricas y conductores pendientes
  ngOnInit() {
    this.actualizar();
  }

  // Vuelve a cargar todo (botón "Actualizar")
  actualizar() {
    this.cargarMetricas();
    this.cargarConductores();
  }

  // Trae los KPIs y los arma como tarjetas. Endpoint: GET /api/admin/dashboard
  async cargarMetricas() {
    this.cargandoMetricas.set(true);
    this.errorMetricas.set('');
    try {
      const res: any = await this.adminApi.dashboard();
      const s = res.stats || {};
      this.metricas.set([
        { nombre: 'Ingresos totales', valor: this.moneda(s.total_revenue), destacada: true },
        { nombre: 'Viajes activos', valor: this.numero(s.active_trips) },
        { nombre: 'Viajes completados', valor: this.numero(s.completed_trips) },
        { nombre: 'Viajes cancelados', valor: this.numero(s.cancelled_trips) },
        { nombre: 'Clientes', valor: this.numero(s.total_clients) },
        { nombre: 'Conductores', valor: this.numero(s.total_drivers) },
        { nombre: 'Conductores aprobados', valor: this.numero(s.approved_drivers) },
        { nombre: 'Pendientes de aprobar', valor: this.numero(s.pending_drivers) },
      ]);
    } catch (e: any) {
      this.errorMetricas.set(this.mensaje(e));
    } finally {
      this.cargandoMetricas.set(false);
    }
  }

  // Cambia de pestaña y carga su lista
  elegirPestana(estado: EstadoAprobacion) {
    if (estado === this.pestana()) return;
    this.pestana.set(estado);
    this.rechazando.set(null);
    this.conductores.set([]);
    this.cargarConductores();
  }

  // Lista los conductores de la pestaña actual.
  // Endpoint: GET /api/admin/drivers?approval_status={pending|approved|rejected}
  async cargarConductores() {
    const estado = this.pestana();
    this.cargandoLista.set(true);
    this.errorLista.set('');
    try {
      const res: any = await this.adminApi.conductores(estado);
      if (estado === this.pestana()) this.conductores.set(res.drivers || []);
    } catch (e: any) {
      if (estado === this.pestana()) {
        this.conductores.set([]);
        this.errorLista.set(this.mensaje(e));
      }
    } finally {
      if (estado === this.pestana()) this.cargandoLista.set(false);
    }
  }

  // Aprueba con la nota fija de siempre
  aprobar(driver: any) {
    this.decidir(driver, 'approved', 'Documentación verificada.');
  }

  // Abre el formulario para confirmar el rechazo y escribir la nota
  pedirRechazo(driver: any) {
    this.nota = '';
    this.rechazando.set(driver.id);
  }

  cancelarRechazo() {
    this.rechazando.set(null);
  }

  // Confirma el rechazo. Si la nota queda vacía se envía la nota fija de siempre.
  confirmarRechazo(driver: any) {
    this.decidir(driver, 'rejected', this.nota.trim() || 'Rechazado por el administrador.');
  }

  // Aprueba o rechaza un conductor. Endpoint: PATCH /api/admin/drivers/{id}/approval
  private async decidir(driver: any, estado: 'approved' | 'rejected', nota: string) {
    if (this.procesando() !== null) return;
    this.error.set('');
    this.info.set('');
    this.procesando.set(driver.id);
    try {
      await this.adminApi.cambiarAprobacion(driver.id, estado, nota);
      const nombre = driver.user?.name || 'El conductor';
      this.info.set(estado === 'approved' ? `${nombre} fue aprobado.` : `${nombre} fue rechazado.`);
      this.rechazando.set(null);
      await Promise.all([this.cargarConductores(), this.cargarMetricas()]);
    } catch (e: any) {
      this.error.set(this.mensaje(e));
    } finally {
      this.procesando.set(null);
    }
  }

  // Cierra sesión. Endpoint: POST /api/auth/logout
  salir() {
    this.auth.logout();
  }

  // Texto del estado vacío según la pestaña
  vacio(): string {
    const m: Record<EstadoAprobacion, string> = {
      pending: 'No hay conductores pendientes de aprobación.',
      approved: 'Todavía no hay conductores aprobados.',
      rejected: 'No hay conductores rechazados.',
    };
    return m[this.pestana()];
  }

  private numero(n: any): string {
    return Number(n || 0).toLocaleString('es-CO');
  }

  // Formatea dinero en pesos colombianos
  private moneda(n: any): string {
    return '$' + Number(n || 0).toLocaleString('es-CO');
  }

  // Convierte un error HTTP en un mensaje para mostrar
  private mensaje(e: any): string {
    if (e?.status === 0) return 'No hay conexión con el servidor';
    if (e?.status === 403) return 'Esta cuenta no es administrador';
    return e?.error?.message || 'Error inesperado';
  }
}
