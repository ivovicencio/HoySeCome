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
  private readonly storageKey = 'hoysecome_manual_v1';

  menuData!: SemanaMenu;
  rangoEditable = 'Lunes 30/03/2026 al Domingo 05/04/2026';
  generandoPDF = false;
  modalPdfVisible = false;
  modalPdfError = false;
  
  // Control de la rotación de categorías (true = Lunes almuerzo tiene carne)
  lunesEmpiezaConCarne = true;

  readonly nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  readonly comidasConCarne = [
    'MILANESA CON ARROZ (BLANDO o BIFE )', 'MILANESA CON FIDEOS (BLANDO o BIFE)', 
    'POLLO AL HORNO CON BATATAS Y ZAPALLO (PATA MUSLO/PECHUGA)', 'SALPICÓN DE POLLO (PECHUGA, ZANAHORIA, ARVEJAS, TOMATE)',
    'TARTA CON POLLO Y VERDURAS (PECHUGA, ZAPALLO, CEBOLLA Y ACELGA)', 'GUISO DE ARROZ (POLLO O BLANDO)',
    'GUISO DE FIDEOS (POLLO O BLANDO)', 'ESTOFADO DE CARNE CON FIDEOS ( BLANDO)',
    'ESTOFADO DE POLLO CON ARROZ (PATA MUSLO)', 'ALBÓNDIGAS EN SALSA CON FIDEOS (MOLIDA)',
    'PASTEL DE PAPA (MOLIDA)', 'PASTEL DE CARNE (MOLIDA)', 'PUCHERO A LA OLLA CON PURE (OSOBUCO)',
    'BIFE A LA CRIOLLA CON PURE (BIFES)', 'BIFE ENCEBOLLADO CON PURE (BIFES)',
    'MARINERA CON ENSALADA RUSA (BIFE)', 'FIDEOS CON SALSA BOLOÑESA (MOLIDA)', 'GUISO DE LENTEJAS (BLANDO)'
  ];

  readonly comidasSinCarne = [
    'PAPA CON QUESO/BOMBITA DE PAPA CON ENSALADA (LECHUGA, TOMATE, ZANAHORIA)', 'GUISO DE LENTEJAS (SIN CARNE)',
    'TARTA DE VERDURAS (ACELGA, ZAPALLO, CEBOLLA)', 'PIZZA (QUESO)', 'ARROZ CON SALSA',
    'MILANESA DE BERENJENA A LA NAPO CON ARROZ (BERENJENAS, TOMATE, QUESO)', 
    'BOCADITOS DE VERDURAS CON ARROZ (ZAPALLITO O ACELGA)', 'POLENTA CON SALSA DE TOMATE Y QUESO',
    'HAMBURGUESA DE LENTEJAS CON VERDURAS AL HORNO (LENTEJAS DE LATA, PAPA, BATATA, ZANAHORIA)',
    'SOPA CON PUCHERO PAPA ZAPALLO POLENTA (LEGUMBRES, FIDEOS MUNICIÓN)', 'SOPA PARAGUAYA (QUESO, CEBOLLA)',
    'TORTILLA DE PAPAS CON ENSALADA (HUEVO, LECHUGA, TOMATE)'
  ];

  ngOnInit(): void {
    if (!this.cargarEstado()) {
      this.limpiarMenu();
    }
  }

  limpiarMenu(): void {
    const dias: PlatoDia[] = this.nombresDias.map((diaNombre, i) => {
      // Si lunesEmpiezaConCarne es true, los pares (0, 2, 4...) tienen carne en almuerzo
      const almuerzoConCarne = this.lunesEmpiezaConCarne ? i % 2 === 0 : i % 2 !== 0;
      return {
        diaNombre,
        fechaStr: '',
        almuerzo: { texto: '', conCarne: almuerzoConCarne },
        cena: { texto: '', conCarne: !almuerzoConCarne }
      };
    });
    this.menuData = { rangoFechas: this.rangoEditable, fechaInicio: '', fechaFin: '', dias };
    this.guardarEstado();
  }

  rotarCategorias(): void {
    this.lunesEmpiezaConCarne = !this.lunesEmpiezaConCarne;
    // Guardamos los textos actuales para no borrarlos al rotar categorías
    const platosActuales = this.menuData.dias.map(d => ({ almuerzo: d.almuerzo.texto, cena: d.cena.texto }));
    
    this.menuData.dias.forEach((dia, i) => {
      const almuerzoConCarne = this.lunesEmpiezaConCarne ? i % 2 === 0 : i % 2 !== 0;
      dia.almuerzo.conCarne = almuerzoConCarne;
      dia.almuerzo.texto = platosActuales[i].almuerzo;
      dia.cena.conCarne = !almuerzoConCarne;
      dia.cena.texto = platosActuales[i].cena;
    });
    this.guardarEstado();
  }

  seleccionarComida(nombre: string, conCarne: boolean): void {
    // Buscamos el primer hueco vacío que coincida con la categoría
    for (let dia of this.menuData.dias) {
      if (dia.almuerzo.conCarne === conCarne && dia.almuerzo.texto === '') {
        dia.almuerzo.texto = nombre;
        this.guardarEstado();
        return;
      }
      if (dia.cena.conCarne === conCarne && dia.cena.texto === '') {
        dia.cena.texto = nombre;
        this.guardarEstado();
        return;
      }
    }
    alert('Ya completaste todos los turnos de esta categoría.');
  }

  actualizarRango(): void {
    this.menuData.rangoFechas = this.rangoEditable;
    this.guardarEstado();
  }

  exportarPDF(): void {
    this.capturarHojaPdf({
      elementId: 'menu-export',
      pdfTitle: `Menú ${this.rangoEditable}`,
      fileName: `Menu_Residencia.pdf`,
    });
  }

  private capturarHojaPdf(opts: { elementId: string; pdfTitle: string; fileName: string }): void {
    this.generandoPDF = true;
    const data = document.getElementById(opts.elementId);
    if (!data) return;

    html2canvas(data, { scale: 2, backgroundColor: '#ffffff' }).then((canvas) => {
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('l', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 10, imgWidth, imgHeight);
      pdf.save(opts.fileName);
      this.ngZone.run(() => { this.generandoPDF = false; this.modalPdfVisible = true; });
    });
  }

  cerrarModalPdf(): void { this.modalPdfVisible = false; }

  private guardarEstado(): void {
    localStorage.setItem(this.storageKey, JSON.stringify({
      rangoEditable: this.rangoEditable,
      menuData: this.menuData,
      lunesEmpiezaConCarne: this.lunesEmpiezaConCarne
    }));
  }

  private cargarEstado(): boolean {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return false;
    const data = JSON.parse(raw);
    this.rangoEditable = data.rangoEditable;
    this.menuData = data.menuData;
    this.lunesEmpiezaConCarne = data.lunesEmpiezaConCarne;
    return true;
  }
}