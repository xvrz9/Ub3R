import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [FormsModule, RouterLink, IonContent],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  login = '';
  password = '';
  verClave = false;

  // Signals: lo que cambia después de un "await" debe ser signal para que la vista se repinte
  error = signal('');
  loading = signal(false);

  // Envía credenciales. Endpoint: POST /api/auth/login
  // Si sale bien, va a /home que redirige según el rol.
  async onLogin() {
    if (this.loading()) return;
    this.error.set('');
    if (!this.login.trim() || !this.password) {
      this.error.set('Ingrese correo/teléfono y contraseña');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.login(this.login.trim(), this.password);
      this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (e: any) {
      this.error.set(
        e?.status === 0 ? 'No hay conexión con el servidor' : e?.error?.message || 'No se pudo iniciar sesión'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
