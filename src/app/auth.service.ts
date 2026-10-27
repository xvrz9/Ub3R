import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Cambie por la IP de su servidor Laravel (emulador Android: 10.0.2.2)
  private apiUrl = 'http://20.20.1.157:8000';

  constructor(private http: HttpClient, private router: Router) {}

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
  async logout() {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/auth/logout`, {}));
    } catch (e) {}
    this.clearSession();
    this.router.navigateByUrl('/login');
  }

  // Guarda token y usuario en localStorage (sin endpoint)
  private saveSession(res: any) {
    localStorage.setItem('token', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
  }

  // Borra la sesión local
  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): any {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  // 'client' | 'driver' | 'admin' | null
  getRole(): string | null {
    return this.getUser()?.role ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
