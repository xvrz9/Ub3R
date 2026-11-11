import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Protege las rutas privadas.
// 1. Sin token guardado: manda al login.
// 2. Si la ruta declara un rol (data: { role: 'client' }) y el usuario tiene otro,
//    lo manda a /home, que lo lleva a su propio dashboard.
export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);

  const rolRuta = route.data?.['role'];
  if (rolRuta && auth.getRole() !== rolRuta) return router.createUrlTree(['/home']);
  return true;
};

// Para login y registro: si ya hay sesión no tiene sentido volver a entrar,
// así que se manda a /home.
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? router.createUrlTree(['/home']) : true;
};
