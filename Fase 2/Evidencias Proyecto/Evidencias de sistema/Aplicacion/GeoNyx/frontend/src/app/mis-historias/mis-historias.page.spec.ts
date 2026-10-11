import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisHistoriasPage } from './mis-historias.page';

describe('MisHistoriasPage', () => {
  let component: MisHistoriasPage;
  let fixture: ComponentFixture<MisHistoriasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MisHistoriasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
