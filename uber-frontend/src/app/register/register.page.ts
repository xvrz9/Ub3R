import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [FormsModule, RouterLink, IonContent],
})
export class RegisterPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  form: any = {
    name: '', email: '', phone: '', password: '', role: 'client',
    license_number: '', plate: '', brand: '', model: '', year: null, capacity: 4, color: '',
  };
  confirmacion = '';   // repetir contraseña: solo se revisa aquí, no se envía a la API
  verClave = false;
  anioActual = new Date().getFullYear();

  // Signals: se actualizan después de un "await" y la vista debe repintarse
  error = signal('');
  loading = signal(false);

  // Cambia entre pasajero (client) y conductor (driver)
  elegirRol(rol: 'client' | 'driver') {
    this.form.role = rol;
    this.error.set('');
  }

  // Revisa en el teléfono lo mismo que exige la API, para no esperar el error 422
  private validar(): string {
    const f = this.form;
    if (!f.name.trim() || !f.email.trim() || !f.password) return 'Complete nombre, correo y contraseña';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return 'El correo no es válido';
    if (f.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (f.password !== this.confirmacion) return 'Las contraseñas no coinciden';
    if (f.role === 'driver') {
      if (!f.license_number.trim() || !f.plate.trim() || !f.brand.trim() || !f.model.trim() || !f.year) {
        return 'Complete licencia, placa, marca, modelo y año del vehículo';
      }
      const anio = Number(f.year);
      if (!Number.isInteger(anio) || anio < 1990 || anio > this.anioActual + 1) {
        return `El año del vehículo debe estar entre 1990 y ${this.anioActual + 1}`;
      }
    }
    return '';
  }

  // Registra al usuario. Endpoint: POST /api/auth/register
  // Si el rol es "client" manda solo datos básicos; si es "driver" manda también licencia y vehículo.
  async onRegister() {
    if (this.loading()) return;
    this.error.set('');
    const problema = this.validar();
    if (problema) {
      this.error.set(problema);
      return;
    }

    const f = this.form;
    const body: any = {
      name: f.name.trim(), email: f.email.trim(), password: f.password, role: f.role,
    };
    if (f.phone.trim()) body.phone = f.phone.trim();
    if (f.role === 'driver') {
      Object.assign(body, {
        license_number: f.license_number.trim(),
        plate: f.plate.trim().toUpperCase(),
        brand: f.brand.trim(),
        model: f.model.trim(),
        year: Number(f.year),
        capacity: Number(f.capacity) || 4,
      });
      if (f.color.trim()) body.color = f.color.trim();
    }

    this.loading.set(true);
    try {
      await this.auth.register(body);
      this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (e: any) {
      // 422: Laravel devuelve los errores de validación en e.error.errors
      const errors = e?.error?.errors;
      this.error.set(
        e?.status === 0
          ? 'No hay conexión con el servidor'
          : errors
            ? (Object.values(errors).flat() as string[]).join(' | ')
            : e?.error?.message || 'No se pudo registrar'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
