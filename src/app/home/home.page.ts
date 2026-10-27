import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-home',
  template: `
    <ion-content class="ion-padding ion-text-center">
      <ion-spinner></ion-spinner>
    </ion-content>
  `,
  standalone: true,
  imports: [IonContent, IonSpinner],
})
export class HomePage implements OnInit {
  constructor(private auth: AuthService, private router: Router) {}

  // Lee el rol de localStorage y redirige al dashboard (se crean en clases 2, 3 y 4).
  ngOnInit() {
    const role = this.auth.getRole();
    if (role === 'client') this.router.navigateByUrl('/client-dashboard', { replaceUrl: true });
    else if (role === 'driver') this.router.navigateByUrl('/driver-dashboard', { replaceUrl: true });
    else if (role === 'admin') this.router.navigateByUrl('/admin-dashboard', { replaceUrl: true });
    else this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}