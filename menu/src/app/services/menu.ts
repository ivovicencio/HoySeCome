import { Injectable } from '@angular/core';

export interface ComidaTurno {
  texto: string;
  conCarne: boolean;
}

export interface PlatoDia {
  diaNombre: string;
  fechaStr: string;
  almuerzo: ComidaTurno;
  cena: ComidaTurno;
}

export interface SemanaMenu {
  rangoFechas: string;
  fechaInicio: string;
  fechaFin: string;
  dias: PlatoDia[];
}

type DiaPlantilla = {
  almuerzo: string;
  cena: string;
};

@Injectable({
  providedIn: 'root',
})
export class Menu {
  static JUEVES_CAMBIO_HORA = 13;
  static JUEVES_CAMBIO_MINUTO = 0;

  private static readonly LUNES_ANCLA = new Date(2026, 2, 30);

  private readonly nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  private readonly plantillasSemana: DiaPlantilla[][] = [
    [
      { almuerzo: 'Puchero a la olla con fideos', cena: 'Tarta de verduras (queso)' },
      {
        almuerzo: 'Milanesa de berenjena con arroz',
        cena: 'Pollo al horno con papas doradas',
      },
      {
        almuerzo: 'Milanesa de pollo con fideos y ensalada de tomate, lechuga, zanahoria y choclo',
        cena: 'Sopa de verduras',
      },
      {
        almuerzo: 'Bombitas de papas con ensalada de lechuga, tomate, huevo',
        cena: 'Empanadas de pollo (pechugas)',
      },
      {
        almuerzo: 'Estofado de carne con arroz',
        cena: 'Hamburguesas de lentejas con verduras al horno (papas, batata y zanahoria)',
      },
      { almuerzo: 'Zapallitos rellenos', cena: 'Bifes con cebolla y puré de papa y zapallo' },
      { almuerzo: 'Guiso de pollo', cena: 'Bocaditos de verduras con arroz' },
    ],
    [
      { almuerzo: 'Milanesa de carne con fideos', cena: 'Tarta de zapallito y queso' },
      { almuerzo: 'Ñoquis de sémola con salsa', cena: 'Pollo al horno con batatas' },
      { almuerzo: 'Guiso de arroz con carne', cena: 'Sopa de verduras con fideos' },
      { almuerzo: 'Pastel de papas (lentejas)', cena: 'Albóndigas con puré' },
      { almuerzo: 'Carne al horno con papas', cena: 'Guiso de lentejas' },
      { almuerzo: 'Tortilla de espinaca y ensalada', cena: 'Pechuga grillada con verduras' },
      { almuerzo: 'Bife a la plancha con puré', cena: 'Pizza mozzarella y tomate' },
    ],
    [
      { almuerzo: 'Puchero liviano con verduras', cena: 'Omelette de verduras' },
      { almuerzo: 'Milanesa de berenjena con puré', cena: 'Pollo con mostaza y papas' },
      { almuerzo: 'Milanesa napolitana con fideos', cena: 'Ñoquis de espinaca con salsa blanca' },
      { almuerzo: 'Tarta multiverdura', cena: 'Asado de tira / pollo (según disponibilidad)' },
      { almuerzo: 'Arroz con pollo', cena: 'Fideos con aceite, ajo y perejil + ensalada' },
      {
        almuerzo: 'Zapallo anco relleno (quinoa y verduras)',
        cena: 'Matambre con papas panaderas',
      },
      { almuerzo: 'Gallina / pollo con papas al horno', cena: 'Ravioles de verdura con salsa' },
    ],
  ];

  getMenuSemanal(fechaReferencia?: Date): SemanaMenu {
    const ahora = fechaReferencia ?? new Date();
    const lunesMostrado = this.getLunesSegunReglaJueves(ahora);
    const plantilla = this.plantillasSemana[this.indicePlantilla(lunesMostrado)];

    const dias: PlatoDia[] = [];
    for (let i = 0; i < 7; i++) {
      const fechaDia = new Date(lunesMostrado);
      fechaDia.setDate(lunesMostrado.getDate() + i);
      const dPlant = plantilla[i];

      const almuerzoConCarne = i % 2 === 0;
      const cenaConCarne = !almuerzoConCarne;

      dias.push({
        diaNombre: this.nombresDias[i],
        fechaStr: fechaDia.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
        almuerzo: {
          texto: dPlant.almuerzo,
          conCarne: almuerzoConCarne,
        },
        cena: {
          texto: dPlant.cena,
          conCarne: cenaConCarne,
        },
      });
    }

    const fechaDomingo = new Date(lunesMostrado);
    fechaDomingo.setDate(lunesMostrado.getDate() + 6);

    const fechaInicio = this.formatLocalISO(lunesMostrado);
    const fechaFin = this.formatLocalISO(fechaDomingo);
    const rangoFechas = `Lunes ${lunesMostrado.toLocaleDateString('es-AR')} al Domingo ${fechaDomingo.toLocaleDateString('es-AR')}`;

    return { rangoFechas, fechaInicio, fechaFin, dias };
  }

  private getLunesSegunReglaJueves(ahora: Date): Date {
    const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const dia = d.getDay();

    if (dia === 4 && this.antesDelCorteJueves(ahora)) {
      d.setDate(d.getDate() - 3);
      return d;
    }

    if (dia === 0 || dia >= 4) {
      const diasHastaLunes = dia === 0 ? 1 : 8 - dia;
      d.setDate(d.getDate() + diasHastaLunes);
    } else {
      d.setDate(d.getDate() - (dia - 1));
    }
    return d;
  }

  private antesDelCorteJueves(ahora: Date): boolean {
    const minutosDelDia = ahora.getHours() * 60 + ahora.getMinutes();
    const corte =
      Menu.JUEVES_CAMBIO_HORA * 60 + Menu.JUEVES_CAMBIO_MINUTO;
    return minutosDelDia < corte;
  }

  private indicePlantilla(lunes: Date): number {
    const diffMs =
      new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate()).getTime() -
      new Date(
        Menu.LUNES_ANCLA.getFullYear(),
        Menu.LUNES_ANCLA.getMonth(),
        Menu.LUNES_ANCLA.getDate()
      ).getTime();
    const semanas = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    const n = this.plantillasSemana.length;
    return ((semanas % n) + n) % n;
  }

  private formatLocalISO(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
