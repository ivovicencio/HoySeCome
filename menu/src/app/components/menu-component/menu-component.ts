import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComidaTurno, PlatoDia, SemanaMenu } from '../../services/menu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Anotacion {
  id: string;
  nombre: string;
  dia: string;
  come: boolean;
}

interface HistorialItem extends Anotacion {
  creadoEn: string;
}

interface GrupoDia {
  dia: string;
  lista: Anotacion[];
  comen: number;
  noComen: number;
}

@Component({
  standalone: true,
  selector: 'app-menu-component',
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-component.html',
  styleUrls: ['./menu-component.css'],
})
export class MenuComponent implements OnInit {
  private ngZone = inject(NgZone);
  private readonly storageKey = 'hoysecome_estado_v2';
  private readonly maxHistorial = 400;

  menuData!: SemanaMenu;
  rangoEditable = 'Lunes 30/03/2026 al Domingo 05/04/2026';
  generandoPDF = false;
  modalPdfVisible = false;
  modalPdfError = false;

  formNombre = '';
  formDia = 'Lunes';
  formComeOpcion: 'si' | 'no' = 'si';
  diaImpresion = 'Lunes';

  anotacionesActivas: Anotacion[] = [];
  historico: HistorialItem[] = [];
  historialExpandido = false;

  readonly subtituloRegla =
    'Rotá el menú cuando quieras. Las anotaciones son aparte. Podés bajar el PDF del menú completo o solo los anotados de un día que elijas.';

  readonly nombresDias = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];

  private readonly comidasConCarne = [
    'MILANESA CON ARROZ/FIDEOS CON ENSALADA',
    'GUISO DE ARROZ/FIDEO',
    'POLLO AL HORNO',
    'SALPICON DE POLLO',
    'TARTA CON POLLO Y VERDURAS',
    'ESTOFADO DE CARNE',
    'ALBONDIGAS CON FIDEO Y ENSALADA',
    'PUCHERO A LA OLLA CON PURE',
    'BIFE A LA CRIOLLA CON PURE',
    'MARINERA CON ENSALADA RUSA',
  ];

  private readonly comidasSinCarne = [
    'PAPA CON QUESO/BOMBITA DE PAPA CON ENSALADA',
    'GUISO DE LENTEJAS',
    'TARTA DE VERDURAS',
    'PIZZA',
    'ARROZ CON SALSA',
    'MILANESA DE BERENJENA A LA NAPO CON ARROZ O FIDEO',
    'PASTEL DE PAPA',
    'BOCADITOS DE VERDURAS CON ARROZ Y ENSALADA',
    'POLENTA CON SALSA',
    'HAMBURGUESA DE LENTEJAS CON QUESO',
    'SOPA CON PUCHERO PAPA ZAPALLO POLENTA',
  ];

  ngOnInit(): void {
    if (!this.cargarEstado()) {
      this.rotarMenu();
    }
  }

  rotarMenu(): void {
    const carnesSemana = this.tomarAleatorias(
      this.comidasConCarne,
      this.nombresDias.length
    );
    const sinCarneSemana = this.tomarAleatorias(
      this.comidasSinCarne,
      this.nombresDias.length
    );

    const dias: PlatoDia[] = this.nombresDias.map((diaNombre, i) => {
      const almuerzoConCarne = i % 2 === 0;
      const cenaConCarne = !almuerzoConCarne;

      const almuerzo: ComidaTurno = {
        texto: almuerzoConCarne ? carnesSemana[i] : sinCarneSemana[i],
        conCarne: almuerzoConCarne,
      };
      const cena: ComidaTurno = {
        texto: cenaConCarne
          ? carnesSemana[(i + 2) % 7]
          : sinCarneSemana[(i + 2) % 7],
        conCarne: cenaConCarne,
      };

      return {
        diaNombre,
        fechaStr: '',
        almuerzo,
        cena,
      };
    });

    this.menuData = {
      rangoFechas: this.rangoEditable,
      fechaInicio: '',
      fechaFin: '',
      dias,
    };
    this.guardarEstado();
  }

  actualizarRango(): void {
    this.menuData.rangoFechas = this.rangoEditable;
    this.guardarEstado();
  }

  gruposPorDia(): GrupoDia[] {
    return this.nombresDias.map((dia) => {
      const lista = this.anotacionesActivas.filter((a) => a.dia === dia);
      return {
        dia,
        lista,
        comen: lista.filter((a) => a.come).length,
        noComen: lista.filter((a) => !a.come).length,
      };
    });
  }

  totalAnotados(): number {
    return this.anotacionesActivas.length;
  }

  listaDiaImpresion(): Anotacion[] {
    return this.anotacionesActivas.filter((a) => a.dia === this.diaImpresion);
  }

  totalComeDiaImpresion(): number {
    return this.listaDiaImpresion().filter((a) => a.come).length;
  }

  totalNoComeDiaImpresion(): number {
    return this.listaDiaImpresion().filter((a) => !a.come).length;
  }

  onCambioDiaImpresion(): void {
    this.guardarEstado();
  }

  enviarAnotacion(): void {
    const nombre = this.formNombre.trim();
    if (!nombre) {
      return;
    }

    const item: Anotacion = {
      id: this.crearId(),
      nombre,
      dia: this.formDia,
      come: this.formComeOpcion === 'si',
    };

    this.anotacionesActivas = [...this.anotacionesActivas, item];

    const hist: HistorialItem = {
      ...item,
      creadoEn: new Date().toISOString(),
    };
    this.historico = [hist, ...this.historico].slice(0, this.maxHistorial);

    this.formNombre = '';
    this.guardarEstado();
  }

  eliminarAnotacion(id: string): void {
    this.anotacionesActivas = this.anotacionesActivas.filter((a) => a.id !== id);
    this.guardarEstado();
  }

  vaciarListaAnotaciones(): void {
    if (
      this.anotacionesActivas.length &&
      !confirm('¿Borrar todas las anotaciones de la lista actual?')
    ) {
      return;
    }
    this.anotacionesActivas = [];
    this.guardarEstado();
  }

  onCambioFormDia(): void {
    this.guardarEstado();
  }

  limpiarHistorial(): void {
    if (
      this.historico.length &&
      !confirm('¿Borrar el historial guardado en este navegador?')
    ) {
      return;
    }
    this.historico = [];
    this.guardarEstado();
  }

  exportarPDF(): void {
    const safeRange = this.rangoEditable
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
    this.capturarHojaPdf({
      elementId: 'menu-export',
      pdfTitle: `Menú ${this.rangoEditable}`,
      fileName: `Menu_Residencia_${safeRange}.pdf`,
    });
  }

  exportarPdfAnotadosDelDia(): void {
    const safeDia = this.diaImpresion
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
    const safeRange = this.rangoEditable
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
    this.capturarHojaPdf({
      elementId: 'anotados-dia-export',
      pdfTitle: `Anotados ${this.diaImpresion}`,
      fileName: `Anotados_${safeDia}_${safeRange}.pdf`,
    });
  }

  private capturarHojaPdf(opts: {
    elementId: string;
    pdfTitle: string;
    fileName: string;
  }): void {
    this.generandoPDF = true;
    this.modalPdfVisible = false;
    this.modalPdfError = false;

    const data = document.getElementById(opts.elementId);
    if (!data) {
      this.ngZone.run(() => {
        this.generandoPDF = false;
        this.modalPdfError = true;
        this.modalPdfVisible = true;
      });
      return;
    }

    html2canvas(data, { scale: 2, backgroundColor: '#ffffff' })
      .then((canvas) => {
        const imgWidth = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const contentDataURL = canvas.toDataURL('image/png');

        const pdf = new jsPDF('l', 'mm', 'a4');
        pdf.addImage(contentDataURL, 'PNG', 0, 10, imgWidth, imgHeight);
        pdf.setProperties({ title: opts.pdfTitle });
        pdf.save(opts.fileName);

        this.ngZone.run(() => {
          this.generandoPDF = false;
          this.modalPdfError = false;
          this.modalPdfVisible = true;
        });
      })
      .catch(() => {
        this.ngZone.run(() => {
          this.generandoPDF = false;
          this.modalPdfError = true;
          this.modalPdfVisible = true;
        });
      });
  }

  cerrarModalPdf(): void {
    this.modalPdfVisible = false;
    this.modalPdfError = false;
  }

  formatoFechaHora(iso: string): string {
    try {
      return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  private tomarAleatorias(origen: string[], cantidad: number): string[] {
    const copia = [...origen];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = this.randomInt(i + 1);
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia.slice(0, cantidad);
  }

  private randomInt(max: number): number {
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return arr[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  private crearId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${this.randomInt(1_000_000)}`;
  }

  private guardarEstado(): void {
    const estado = {
      version: 2,
      rangoEditable: this.rangoEditable,
      menuData: this.menuData,
      anotacionesActivas: this.anotacionesActivas,
      historico: this.historico,
      formDia: this.formDia,
      diaImpresion: this.diaImpresion,
    };
    localStorage.setItem(this.storageKey, JSON.stringify(estado));
  }

  private cargarEstado(): boolean {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return false;
    }
    try {
      const data = JSON.parse(raw) as {
        version?: number;
        rangoEditable?: string;
        menuData?: SemanaMenu;
        anotacionesActivas?: Anotacion[];
        historico?: HistorialItem[];
        formDia?: string;
        diaImpresion?: string;
      };
      if (!data?.menuData?.dias?.length) {
        return false;
      }
      this.rangoEditable = data.rangoEditable ?? this.rangoEditable;
      this.menuData = data.menuData;
      this.menuData.rangoFechas = this.rangoEditable;
      this.anotacionesActivas = data.anotacionesActivas ?? [];
      this.historico = (data.historico ?? []).slice(0, this.maxHistorial);
      if (data.formDia && this.nombresDias.includes(data.formDia)) {
        this.formDia = data.formDia;
      }
      if (data.diaImpresion && this.nombresDias.includes(data.diaImpresion)) {
        this.diaImpresion = data.diaImpresion;
      }
      return true;
    } catch {
      return false;
    }
  }
}
