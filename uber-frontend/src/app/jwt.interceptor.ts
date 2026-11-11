import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api.config';
import { AuthService } from './auth.service';

// Agrega "Authorization: Bearer <token>" SOLO a las peticiones de nuestra API (las que
// empiezan por API_URL). Así el token nunca viaja a servicios externos como el de rutas.
// Si nuestra API responde 401 (token vencido), limpia la sesión y manda al login.
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    : req.clone({ setHeaders: { Accept: 'application/json' } });

  return next(request).pipe(
    catchError((error) => {
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        auth.clearSession();
        router.navigateByUrl('/login', { replaceUrl: true });
      }
      return throwError(() => error);
    })
  );
};
