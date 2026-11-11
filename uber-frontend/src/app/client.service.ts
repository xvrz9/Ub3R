import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);

  // Calcula distancia, duración y tarifa estimada. Endpoint: POST /api/client/estimate-fare
  estimarTarifa(body: any): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}/client/estimate-fare`, body));
  }

  // Crea la solicitud de viaje. Endpoint: POST /api/client/ride-requests
  solicitarViaje(body: any): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}/client/ride-requests`, body));
  }

  // Consulta la solicitud o viaje activo del cliente. Endpoint: GET /api/client/active
  viajeActivo(): Promise<any> {
    return firstValueFrom(this.http.get(`${API_URL}/client/active`));
  }

  // Cancela una solicitud o viaje antes de iniciar. Endpoint: POST /api/client/cancel/{id}
  cancelar(id: number, reason: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}/client/cancel/${id}`, { reason }));
  }
}
