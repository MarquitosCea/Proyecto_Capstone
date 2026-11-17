import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuscripcionPage } from './suscripcion.page';

describe('SuscripcionPage', () => {
  let component: SuscripcionPage;
  let fixture: ComponentFixture<SuscripcionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SuscripcionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
