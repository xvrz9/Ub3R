import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api.config';

// Claves de localStorage que pertenecen a la sesión. Al cerrar sesión se borran todas.
//  - token / user: autenticación
//  - activeTrip: viaje en curso del conductor
//  - lastRoute: origen y destino de la última solicitud del pasajero (para dibujar el mapa)
//  - driverAvailable: el conductor dejó el interruptor "En línea" encendido
const CLAVES_SESION = ['token', 'user', 'activeTrip', 'lastRoute', 'driverAvailable'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Misma URL que el resto de servicios (se cambia solo en api.config.ts)
  private apiUrl = API_URL;

  // Inicia sesión. Endpoint: POST /api/auth/login
  async login(login: string, password: string) {
    const res: any = await firstValueFrom(
      this.http.post(`${this.apiUrl}/auth/login`, { login, password })
    );
    this.saveSession(res);
    return res;
  }

  // Registra client o driver. Endpoint: POST /api/auth/register
  async register(data: any) {
    const res: any = await firstValueFrom(
      this.http.post(`${this.apiUrl}/auth/register`, data)
    );
    this.saveSession(res);
    return res;
  }

  // Cierra sesión. Endpoint: POST /api/auth/logout
  // Aunque el servidor no responda, la sesión local se borra igual.
  async logout() {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/auth/logout`, {}));
    } catch {
      // Sin conexión o token vencido: no importa, se limpia localmente
    }
    this.clearSession();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  // Guarda token y usuario en localStorage (sin endpoint)
  private saveSession(res: any) {
    localStorage.setItem('token', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
  }

  // Borra todo lo que guarda la app para esta sesión
  clearSession() {
    CLAVES_SESION.forEach((clave) => localStorage.removeItem(clave));
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Usuario guardado. Si el JSON está dañado devuelve null en vez de romper la app.
  getUser(): any {
    const u = localStorage.getItem('user');
    if (!u) return null;
    try {
      return JSON.parse(u);
    } catch {
      return null;
    }
  }

  // 'client' | 'driver' | 'admin' | null
  getRole(): string | null {
    return this.getUser()?.role ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
