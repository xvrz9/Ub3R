import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';

// Cada dashboard declara el rol que puede entrar (data.role); authGuard lo valida.
export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then((m) => m.RegisterPage),
    canActivate: [guestGuard],
  },
  {
    path: 'client-dashboard',
    loadComponent: () => import('./client-dashboard/client-dashboard.page').then((m) => m.ClientDashboardPage),
    canActivate: [authGuard],
    data: { role: 'client' },
  },
  {
    path: 'driver-dashboard',
    loadComponent: () => import('./driver-dashboard/driver-dashboard.page').then((m) => m.DriverDashboardPage),
    canActivate: [authGuard],
    data: { role: 'driver' },
  },
  {
    path: 'admin-dashboard',
    loadComponent: () => import('./admin-dashboard/admin-dashboard.page').then((m) => m.AdminDashboardPage),
    canActivate: [authGuard],
    data: { role: 'admin' },
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
