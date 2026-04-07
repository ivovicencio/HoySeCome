import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComidaTurno, PlatoDia, SemanaMenu } from '../../services/menu';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

  menuData!: SemanaMenu;
  rangoEditable = 'Lunes 30/03/2026 al Domingo 05/04/2026';
  generandoPDF = false;
  modalPdfVisible = false;
  modalPdfError = false;

  readonly subtituloRegla =
    'Rotá el menú cuando quieras. Una vez listo, podés descargar el PDF para imprimir y pegar en el comedor.';

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
    const carnesSemana = this.tomarAleatorias(this.comidasConCarne, 7);
    const sinCarneSemana = this.tomarAleatorias(this.comidasSinCarne, 7);

    const dias: PlatoDia[] = this.nombresDias.map((diaNombre, i) => {
      const almuerzoConCarne = i % 2 === 0;
      const cenaConCarne = !almuerzoConCarne;

      return {
        diaNombre,
        fechaStr: '',
        almuerzo: {
          texto: almuerzoConCarne ? carnesSemana[i] : sinCarneSemana[i],
          conCarne: almuerzoConCarne,
        },
        cena: {
          texto: cenaConCarne ? carnesSemana[(i + 2) % 7] : sinCarneSemana[(i + 2) % 7],
          conCarne: cenaConCarne,
        },
      };
    });

    this.menuData = { rangoFechas: this.rangoEditable, fechaInicio: '', fechaFin: '', dias };
    this.guardarEstado();
  }

  actualizarRango(): void {
    this.menuData.rangoFechas = this.rangoEditable;
    this.guardarEstado();
  }

  exportarPDF(): void {
    const safeRange = this.rangoEditable.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    this.capturarHojaPdf({
      elementId: 'menu-export',
      pdfTitle: `Menú ${this.rangoEditable}`,
      fileName: `Menu_Residencia_${safeRange}.pdf`,
    });
  }

  private capturarHojaPdf(opts: { elementId: string; pdfTitle: string; fileName: string }): void {
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
        pdf.save(opts.fileName);

        this.ngZone.run(() => {
          this.generandoPDF = false;
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
  }

  private tomarAleatorias(origen: string[], cantidad: number): string[] {
    const copia = [...origen];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia.slice(0, cantidad);
  }

  private guardarEstado(): void {
    localStorage.setItem(this.storageKey, JSON.stringify({
      rangoEditable: this.rangoEditable,
      menuData: this.menuData
    }));
  }

  private cargarEstado(): boolean {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      if (!data?.menuData) return false;
      this.rangoEditable = data.rangoEditable;
      this.menuData = data.menuData;
      return true;
    } catch {
      return false;
    }
  }
}