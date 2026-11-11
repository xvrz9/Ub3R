import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ClientDashboardPage } from './client-dashboard.page';

// Prueba de creación. Las peticiones HTTP quedan interceptadas por provideHttpClientTesting:
// no se llama a la API real.
describe('ClientDashboardPage', () => {
  let component: ClientDashboardPage;
  let fixture: ComponentFixture<ClientDashboardPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '**', children: [] }])],
    });
    fixture = TestBed.createComponent(ClientDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
