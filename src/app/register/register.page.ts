import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonItem, IonInput, IonButton, IonText,
  IonSelect, IonSelectOption
} from '@ionic/angular';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    FormsModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem,
    IonInput, IonButton, IonText, IonSelect, IonSelectOption
  ],
})
export class RegisterPage {
  form: any = {
    name: '', email: '', phone: '', password: '', role: 'client',
    license_number: '', plate: '', brand: '', model: '', year: null, capacity: 4, color: '',
  };
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  // Registra al usuario. Endpoint: POST /api/auth/register
  // Si el rol es "client" manda solo datos básicos; si es "driver" manda también licencia y vehículo.
  async onRegister() {
    this.error = '';
    const f = this.form;
    if (!f.name || !f.email || !f.phone || !f.password) {
      this.error = 'Complete todos los campos';
      return;
    }

    const body: any = { name: f.name, email: f.email, phone: f.phone, password: f.password, role: f.role };
    if (f.role === 'driver') {
      Object.assign(body, {
        license_number: f.license_number, plate: f.plate, brand: f.brand,
        model: f.model, year: Number(f.year), capacity: Number(f.capacity), color: f.color,
      });
    }

    this.loading = true;
    try {
      await this.auth.register(body);
      this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (e: any) {
      // 422: Laravel devuelve los errores de validación en e.error.errors
      const errors = e?.error?.errors;
      this.error = errors
        ? Object.values(errors).flat().join(' | ')
        : e?.error?.message || 'No se pudo registrar';
    } finally {
      this.loading = false;
    }
  }
}