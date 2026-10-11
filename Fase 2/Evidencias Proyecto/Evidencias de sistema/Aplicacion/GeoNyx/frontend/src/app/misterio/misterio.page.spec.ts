import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisterioPage } from './misterio.page';

describe('MisterioPage', () => {
  let component: MisterioPage;
  let fixture: ComponentFixture<MisterioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MisterioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
