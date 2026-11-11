import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-home',
  template: `
    <ion-content class="u-splash">
      <div class="u-splash__centro">
        <div class="u-splash__marca">
          <span class="u-brand u-brand--grande"><span class="u-brand__logo">U</span>Ub3R</span>
          <ion-spinner name="crescent" color="light"></ion-spinner>
        </div>
      </div>
    </ion-content>
  `,
  standalone: true,
  imports: [IonContent, IonSpinner],
})
export class HomePage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  // Lee el rol de localStorage y redirige al dashboard que le corresponde.
  // Si el rol no es reconocido, la sesión no sirve: se borra y se vuelve al login.
  ngOnInit() {
    const role = this.auth.getRole();
    if (role === 'client') this.router.navigateByUrl('/client-dashboard', { replaceUrl: true });
    else if (role === 'driver') this.router.navigateByUrl('/driver-dashboard', { replaceUrl: true });
    else if (role === 'admin') this.router.navigateByUrl('/admin-dashboard', { replaceUrl: true });
    else {
      this.auth.clearSession();
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }
}
