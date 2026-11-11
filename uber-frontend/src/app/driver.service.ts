import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class DriverService {
  private http = inject(HttpClient);

  // Cambia disponibilidad ('available' | 'unavailable'). Endpoint: PUT /api/driver/availability
  cambiarDisponibilidad(status: string): Promise<any> {
    return firstValueFrom(this.http.put(`${API_URL}/driver/availability`, { status }));
  }

  // Lista las solicitudes pendientes. Endpoint: GET /api/driver/ride-requests
  solicitudes(): Promise<any> {
    return firstValueFrom(this.http.get(`${API_URL}/driver/ride-requests`));
  }

  // Acepta una solicitud. Endpoint: POST /api/driver/ride-requests/{id}/accept
  aceptar(id: number): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}/driver/ride-requests/${id}/accept`, {}));
  }

  // Marca que llegó al punto de recogida. Endpoint: POST /api/driver/trips/{id}/arrive
  llegar(id: number): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}/driver/trips/${id}/arrive`, {}));
  }

  // Inicia el recorrido. Endpoint: POST /api/driver/trips/{id}/start
  iniciar(id: number): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}/driver/trips/${id}/start`, {}));
  }

  // Finaliza el viaje con distancia y duración reales. Endpoint: POST /api/driver/trips/{id}/complete
  finalizar(id: number, actual_distance_km: number, actual_duration_min: number): Promise<any> {
    return firstValueFrom(
      this.http.post(`${API_URL}/driver/trips/${id}/complete`, { actual_distance_km, actual_duration_min })
    );
  }
}
