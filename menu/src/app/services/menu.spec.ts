import { TestBed } from '@angular/core/testing';

import { Menu } from './menu';

describe('Menu', () => {
  let service: Menu;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Menu);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('de miércoles muestra la semana que empieza el lunes actual (ancla)', () => {
    const miercoles = new Date(2026, 3, 1);
    const menu = service.getMenuSemanal(miercoles);
    expect(menu.fechaInicio).toBe('2026-03-30');
    expect(menu.dias[0].almuerzo.texto).toContain('Puchero');
    expect(menu.dias[0].almuerzo.conCarne).toBe(true);
    expect(menu.dias[0].cena.conCarne).toBe(false);
  });

  it('jueves antes de las 13:00 sigue la semana en curso', () => {
    const juevesMediodia = new Date(2026, 3, 2, 12, 59);
    const menu = service.getMenuSemanal(juevesMediodia);
    expect(menu.fechaInicio).toBe('2026-03-30');
  });

  it('desde el jueves a las 13:00 muestra la semana del próximo lunes', () => {
    const juevesTarde = new Date(2026, 3, 2, 13, 0);
    const menu = service.getMenuSemanal(juevesTarde);
    expect(menu.fechaInicio).toBe('2026-04-06');
    expect(menu.dias[0].almuerzo.conCarne).toBe(true);
    expect(menu.dias[0].cena.conCarne).toBe(false);
  });

  it('martes: almuerzo sin carne y cena con carne', () => {
    const menu = service.getMenuSemanal(new Date(2026, 3, 1));
    expect(menu.dias[1].almuerzo.conCarne).toBe(false);
    expect(menu.dias[1].cena.conCarne).toBe(true);
  });
});
