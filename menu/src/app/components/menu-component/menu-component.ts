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
  private readonly storageKey = 'hoysecome_manual_final_v2';

  menuData!: SemanaMenu;
  rangoEditable = 'Lunes 30/03/2026 al Domingo 05/04/2026';
  generandoPDF = false;
  modalPdfVisible = false;
  modalPdfError = false;
  lunesEmpiezaConCarne = true;

  readonly nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  readonly comidasConCarne = [
    'Pollo al horno con papas y batatas al horno (Pata muslo/Pechuga)',
    'Salpicón de pollo (Pechuga, zanahoria, arvejas, tomate) con arroz',
    'Tarta con pollo y verduras (Pechuga, zapallo, cebolla y acelga)',
    'Guiso de arroz (Pollo o Blando )',
    'Guiso de fideos (Pollo o Blando)',
    'Estofado de pollo con arroz (Pata muslo)',
    'Pollo al horno con arroz',
    'Pollo salteado con verduras y arroz',
    'Empanadas (Pollo o Carne)',
    'Sopa de pollo con verduras y fideos',
    'Picante de pollo',
    'Pollo con puré',
    'Milanesa con arroz (Blando o Bife)',
    'Milanesa con fideos (Blando o Bife)',
    'Milanesa con puré (Bife)',
    'Bife a la criolla con puré (Bifes)',
    'Bife encebollado con puré (Bifes)',
    'Marinera con ensalada rusa (Bife)',
    'Marineras con fideos a la provenzal (ajo y perejil) (Bife)',
    'Estofado de carne con fideos (Blando) (papas, zapallo, zanahoria, cebolla salteada)',
    'Estofado de carne con papas (Blando) (papas, zapallo, zanahoria, cebolla salteada)',
    'Guiso de lentejas (Blando)',
    'Guiso de arroz con carne (Blando)',
    'Guiso de fideos con carne (Blando)',
    'Carne al horno con papas (Blando)',
    'Carne salteada con verduras (Blando)',
    'Milanesas a la napo con arroz (Bife)',
    'Albóndigas en salsa con fideos (Molida)',
    'Albóndigas en salsa de tomate con fideos',
    'Albóndigas con puré (Molida)',
    'Fideos con salsa boloñesa (Molida)',
    'Arroz con salsa de carne (Molida)',
    'Pastel de papa (Molida)',
    'Pastel de carne (Molida)',
    'Hamburguesa de carne con arroz',
    'Hamburguesas con papas o batatas (Molida)',
    'Zapallitos rellenos con carne',
    'Pastel de polenta',
    'Tacos de carne (Molida)',
    'Lasaña (Molida) (masa de panqueques en capas)',
    'Canelones de carne con salsa roja (Molida) y blanca (salsa blanca con queso)',
    'Polenta con salsa con carne (Molida)',
    'Sándwich de carne picada (Molida)',
    'Burritos de carne (Molida)',
    'Croquetas de arroz (Con carne) mas ensalada',
    'Ñoquis con salsa de carne',
    'Puchero a la olla con puré (Osobuco)',
    'Puchero completo con verduras (Osobuco)',
    'Sopa completa con carne y verduras'
  ];

  readonly comidasSinCarne = [
    'Papa con queso/Bombita de papa con ensalada (Lechuga, tomate, zanahoria)',
    'Tarta de verduras (Acelga, zapallo, cebolla)',
    'Tarta de choclo y queso',
    'Pizza (Queso)',
    'Arroz con salsa',
    'Milanesa de berenjena a la napo con arroz (Berenjenas, tomate, queso)',
    'Bocaditos de verduras con arroz (Zapallito o Acelga)',
    'Polenta con salsa de tomate y queso',
    'Hamburguesa de lentejas con verduras al horno (Papas, batata, zanahoria)',
    'Sopa paraguaya (Queso, cebolla)',
    'Tortilla de papas con ensalada (Huevo, lechuga, tomate)',
    'Pastel de verduras (Queso, papa, zanahoria, berenjena, zapallito)',
    'Fideos salteados con verduras (Zanahoria, papa, tomate, morrón y berenjena)',
    'Sopa de zapallo',
    'Canelones de verdura',
    'Ñoquis con salsa',
    'Fideos con crema y queso',
    'Arroz con verduras salteadas',
    'Arroz con salsa y queso',
    'Bombitas de papa con queso y arroz'
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
  }

  quitarPlato(diaIndex: number, turno: 'almuerzo' | 'cena'): void {
    if (turno === 'almuerzo') {
      this.menuData.dias[diaIndex].almuerzo.texto = '';
    } else {
      this.menuData.dias[diaIndex].cena.texto = '';
    }
    this.guardarEstado();
  }

  actualizarRango(): void {
    this.menuData.rangoFechas = this.rangoEditable;
    this.guardarEstado();
  }

  exportarPDF(): void {
    this.generandoPDF = true;
    const data = document.getElementById('menu-export');
    if (!data) {
      this.generandoPDF = false;
      return;
    }

    // Guardamos dimensiones originales para restaurar después
    const originalStyle = data.getAttribute('style') || '';
    
    // Forzamos el ancho de escritorio para la captura
    data.style.width = '1200px';
    data.style.maxWidth = 'none';

    html2canvas(data, { 
      scale: 2, 
      windowWidth: 1200,
      useCORS: true,
      backgroundColor: '#ffffff'
    }).then((canvas) => {
      // Restauramos el estilo original
      data.setAttribute('style', originalStyle);

      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 297; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Ajuste de posición vertical para centrar si la tabla es corta
      const yPos = imgHeight < 210 ? (210 - imgHeight) / 2 : 10;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, yPos, imgWidth, imgHeight);
      pdf.save(`Menu_${this.rangoEditable.replace(/\//g, '-')}.pdf`);
      
      this.ngZone.run(() => { 
        this.generandoPDF = false; 
        this.modalPdfVisible = true; 
      });
    }).catch(err => {
      console.error('Error al exportar PDF:', err);
      data.setAttribute('style', originalStyle);
      this.ngZone.run(() => {
        this.generandoPDF = false;
        this.modalPdfError = true;
      });
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
    try {
      const data = JSON.parse(raw);
      this.rangoEditable = data.rangoEditable;
      this.menuData = data.menuData;
      this.lunesEmpiezaConCarne = data.lunesEmpiezaConCarne;
      return true;
    } catch (e) {
      return false;
    }
  }
}