import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonItem, IonInput, IonButton, IonText
} from '@ionic/angular';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    FormsModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem,
    IonInput, IonButton, IonText
  ],
})
export class LoginPage {
  login = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  // Envía credenciales. Endpoint: POST /api/auth/login
  // Si sale bien, va a /home que redirige según el rol.
  async onLogin() {
    this.error = '';
    if (!this.login || !this.password) {
      this.error = 'Ingrese correo/teléfono y contraseña';
      return;
    }
    this.loading = true;
    try {
      await this.auth.login(this.login, this.password);
      this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (e: any) {
      this.error = e?.error?.message || 'No se pudo iniciar sesión';
    } finally {
      this.loading = false;
    }
  }
}