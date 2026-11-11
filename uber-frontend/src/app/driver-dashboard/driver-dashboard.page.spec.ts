import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DriverDashboardPage } from './driver-dashboard.page';

// Prueba de creación. Las peticiones HTTP quedan interceptadas por provideHttpClientTesting:
// no se llama a la API real.
describe('DriverDashboardPage', () => {
  let component: DriverDashboardPage;
  let fixture: ComponentFixture<DriverDashboardPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '**', children: [] }])],
    });
    fixture = TestBed.createComponent(DriverDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
