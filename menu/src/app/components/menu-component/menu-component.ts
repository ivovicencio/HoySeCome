import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatoDia, SemanaMenu } from '../../services/menu';
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
  private readonly storageKey = 'hoysecome_manual_final';

  menuData!: SemanaMenu;
  rangoEditable = 'Lunes 30/03/2026 al Domingo 05/04/2026';
  generandoPDF = false;
  modalPdfVisible = false;
  modalPdfError = false;
  
  lunesEmpiezaConCarne = true;

  readonly nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  readonly comidasConCarne = [
    // POLLO
    'Pollo al horno con papas o batatas + ensalada',
    'Pollo al horno con arroz',
    'Salpicón de pollo',
    'Guiso de arroz con pollo',
    'Guiso de fideos con pollo',
    'Estofado de pollo con arroz',
    'Pollo salteado con verduras y arroz',
    'Empanadas de pollo',
    'Tarta de pollo y verduras',
    'Sopa de pollo con verduras y fideos',
    'Picante de pollo',
    'Pollo con puré',
    // CARNE (BIFE / BLANDO)
    'Milanesas con arroz (Bife)',
    'Milanesas con fideos (Bife)',
    'Milanesas con puré (Bife)',
    'Bife con puré',
    'Bife encebollado con puré',
    'Bife a la criolla',
    'Marinera con ensalada rusa (Bife)',
    'Estofado de carne con fideos (Blando)',
    'Estofado de carne con papas (Blando)',
    'Guiso de lentejas con carne (Blando)',
    'Guiso de arroz con carne (Blando)',
    'Guiso de fideos con carne (Blando)',
    'Carne al horno con papas (Blando)',
    'Carne salteada con verduras (Blando)',
    // CARNE MOLIDA
    'Albóndigas con fideos (Molida)',
    'Albóndigas con puré (Molida)',
    'Fideos con salsa boloñesa (Molida)',
    'Arroz con salsa de carne (Molida)',
    'Pastel de papa (Molida)',
    'Pastel de carne (Molida)',
    'Hamburguesas con papas o batatas (Molida)',
    'Zapallitos rellenos (Molida)',
    'Tacos de carne (Molida)',
    'Lasaña (Molida)',
    'Canelones de carne (Molida)',
    'Polenta con salsa con carne (Molida)',
    'Empanadas de carne (Molida)',
    'Sándwich de carne picada (Molida)',
    'Burritos de carne (Molida)',
    // OSOBUCO / OTROS
    'Puchero con puré (Osobuco)',
    'Puchero completo con verduras (Osobuco)',
    'Sopa completa con carne y verduras'
  ];

  readonly comidasSinCarne = [
    'Pizza (Queso)',
    'Tarta de verduras (Acelga/Zapallo)',
    'Tarta de choclo y queso',
    'Milanesa de berenjena a la napo con arroz',
    'Bocaditos de verduras con arroz',
    'Hamburguesas de lentejas con verduras al horno',
    'Hamburguesas de garbanzo',
    'Tortilla de papa con ensalada',
    'Tortilla de verduras (Acelga/Zapallito)',
    'Guiso de lentejas (Sin Carne)',
    'Canelones de verdura',
    'Ñoquis con salsa',
    'Fideos con crema y queso',
    'Arroz con verduras salteadas',
    'Arroz con salsa y queso',
    'Papas rellenas'
  ];

  ngOnInit(): void {
    if (!this.cargarEstado()) {
      this.limpiarMenu();
    }
  }

  limpiarMenu(): void {
    const dias: PlatoDia[] = this.nombresDias.map((diaNombre, i) => {
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
    this.menuData.dias.forEach((dia, i) => {
      const almuerzoConCarne = this.lunesEmpiezaConCarne ? i % 2 === 0 : i % 2 !== 0;
      dia.almuerzo.conCarne = almuerzoConCarne;
      dia.cena.conCarne = !almuerzoConCarne;
    });
    this.guardarEstado();
  }

  seleccionarComida(nombre: string, conCarne: boolean): void {
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
    alert('No hay más espacios libres para esta categoría.');
  }

  actualizarRango(): void {
    this.menuData.rangoFechas = this.rangoEditable;
    this.guardarEstado();
  }

  exportarPDF(): void {
    this.generandoPDF = true;
    const data = document.getElementById('menu-export');
    if (!data) return;

    html2canvas(data, { scale: 2 }).then((canvas) => {
      const pdf = new jsPDF('l', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 10, 297, (canvas.height * 297) / canvas.width);
      pdf.save(`Menu_${this.rangoEditable.replace(/ /g, '_')}.pdf`);
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