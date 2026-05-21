import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatoDia, SemanaMenu, ComidaDef, Ingrediente } from '../../services/menu';
import { ComidasData } from '../../services/comidas-data';
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
  private comidasData = inject(ComidasData);
  private readonly storageKey = 'hoysecome_manual_final_v2';
  private readonly customKey = 'hoysecome_custom_meals';

  menuData!: SemanaMenu;
  rangoEditable = 'Lunes 30/03/2026 al Domingo 05/04/2026';
  generandoPDF = false;
  modalPdfVisible = false;
  modalPdfError = false;
  lunesEmpiezaConCarne = true;

  readonly nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  comidasConCarne: ComidaDef[] = [];
  comidasSinCarne: ComidaDef[] = [];
  customMeals: ComidaDef[] = [];

  draggedComida: ComidaDef | null = null;
  dragOverCell: { diaIndex: number; turno: 'almuerzo' | 'cena'; valid: boolean } | null = null;

  mostrarFormulario = false;
  nuevaComida: ComidaDef = this.crearComidaVacia();
  nuevoIngredienteNombre = '';
  nuevoIngredienteCantidad = '';

  comidaPopup: ComidaDef | null = null;

  private crearComidaVacia(): ComidaDef {
    return { id: '', nombre: '', conCarne: true, ingredientes: [] };
  }

  ngOnInit(): void {
    this.cargarComidasPersonalizadas();
    this.actualizarListas();
    if (!this.cargarEstado()) {
      this.limpiarMenu();
    }
  }

  private cargarComidasPersonalizadas(): void {
    const raw = localStorage.getItem(this.customKey);
    if (!raw) { this.customMeals = []; return; }
    try {
      this.customMeals = JSON.parse(raw);
    } catch {
      this.customMeals = [];
    }
  }

  private guardarComidasPersonalizadas(): void {
    localStorage.setItem(this.customKey, JSON.stringify(this.customMeals));
  }

  private actualizarListas(): void {
    this.comidasConCarne = [
      ...this.comidasData.getComidasConCarne(),
      ...this.customMeals.filter(c => c.conCarne),
    ];
    this.comidasSinCarne = [
      ...this.comidasData.getComidasSinCarne(),
      ...this.customMeals.filter(c => !c.conCarne),
    ];
  }

  limpiarMenu(): void {
    const dias: PlatoDia[] = this.nombresDias.map((diaNombre, i) => {
      const almuerzoConCarne = this.lunesEmpiezaConCarne ? i % 2 === 0 : i % 2 !== 0;
      return {
        diaNombre,
        fechaStr: '',
        almuerzo: { texto: '', conCarne: almuerzoConCarne, comidaId: '' },
        cena: { texto: '', conCarne: !almuerzoConCarne, comidaId: '' }
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

  // ─── DRAG & DROP ─────────────────────────────────────────────

  onDragStart(event: DragEvent, comida: ComidaDef): void {
    this.draggedComida = comida;
    event.dataTransfer?.setData('text/plain', comida.id);
    event.dataTransfer!.effectAllowed = 'move';
  }

  onDragEnd(): void {
    this.draggedComida = null;
    this.dragOverCell = null;
  }

  onDragOver(event: DragEvent, _diaIndex: number, _turno: 'almuerzo' | 'cena'): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onDragEnter(event: DragEvent, diaIndex: number, turno: 'almuerzo' | 'cena'): void {
    event.preventDefault();
    if (!this.draggedComida) return;
    const slot = turno === 'almuerzo'
      ? this.menuData.dias[diaIndex].almuerzo
      : this.menuData.dias[diaIndex].cena;
    const valid = this.draggedComida.conCarne === slot.conCarne && !slot.texto;
    this.dragOverCell = { diaIndex, turno, valid };
  }

  onDragLeave(): void {
    this.dragOverCell = null;
  }

  onDrop(event: DragEvent, diaIndex: number, turno: 'almuerzo' | 'cena'): void {
    event.preventDefault();
    if (!this.draggedComida) return;
    const slot = turno === 'almuerzo'
      ? this.menuData.dias[diaIndex].almuerzo
      : this.menuData.dias[diaIndex].cena;

    if (this.draggedComida.conCarne !== slot.conCarne) return;
    if (slot.texto) return;

    slot.texto = this.draggedComida.nombre;
    slot.comidaId = this.draggedComida.id;
    this.draggedComida = null;
    this.dragOverCell = null;
    this.guardarEstado();
  }

  quitarPlato(diaIndex: number, turno: 'almuerzo' | 'cena'): void {
    const slot = turno === 'almuerzo'
      ? this.menuData.dias[diaIndex].almuerzo
      : this.menuData.dias[diaIndex].cena;
    slot.texto = '';
    slot.comidaId = '';
    this.guardarEstado();
  }

  actualizarRango(): void {
    this.menuData.rangoFechas = this.rangoEditable;
    this.guardarEstado();
  }

  getIngredientes(comidaId: string): Ingrediente[] | null {
    const predef = this.comidasData.getComidaById(comidaId);
    if (predef) return predef.ingredientes;
    const custom = this.customMeals.find(c => c.id === comidaId);
    return custom?.ingredientes ?? null;
  }

  mostrarIngredientes(comida: ComidaDef): void {
    this.comidaPopup = this.comidaPopup?.id === comida.id ? null : comida;
  }

  toggleIngredientesCell(comidaId: string): void {
    if (this.comidaPopup?.id === comidaId) {
      this.comidaPopup = null;
      return;
    }
    const ings = this.getIngredientes(comidaId);
    if (ings) {
      this.comidaPopup = { id: comidaId, nombre: '', conCarne: false, ingredientes: ings };
    }
  }

  // ─── CUSTOM MEAL FORM ────────────────────────────────────────

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (this.mostrarFormulario) {
      this.nuevaComida = this.crearComidaVacia();
    }
  }

  agregarIngrediente(): void {
    if (!this.nuevoIngredienteNombre.trim() || !this.nuevoIngredienteCantidad.trim()) return;
    this.nuevaComida.ingredientes.push({
      nombre: this.nuevoIngredienteNombre.trim(),
      cantidad: this.nuevoIngredienteCantidad.trim(),
    });
    this.nuevoIngredienteNombre = '';
    this.nuevoIngredienteCantidad = '';
  }

  quitarIngrediente(index: number): void {
    this.nuevaComida.ingredientes.splice(index, 1);
  }

  guardarComidaPersonalizada(): void {
    if (!this.nuevaComida.nombre.trim()) return;
    this.nuevaComida.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    this.nuevaComida.nombre = this.nuevaComida.nombre.trim();
    this.customMeals.push({ ...this.nuevaComida });
    this.guardarComidasPersonalizadas();
    this.actualizarListas();
    this.mostrarFormulario = false;
  }

  eliminarComidaPersonalizada(id: string): void {
    this.customMeals = this.customMeals.filter(c => c.id !== id);
    this.guardarComidasPersonalizadas();
    this.actualizarListas();

    for (const dia of this.menuData.dias) {
      if (dia.almuerzo.comidaId === id) {
        dia.almuerzo.texto = '';
        dia.almuerzo.comidaId = '';
      }
      if (dia.cena.comidaId === id) {
        dia.cena.texto = '';
        dia.cena.comidaId = '';
      }
    }
    this.guardarEstado();
  }

  // ─── PDF ─────────────────────────────────────────────────────

  exportarPDF(): void {
    this.generandoPDF = true;
    const data = document.getElementById('menu-export');
    if (!data) {
      this.generandoPDF = false;
      return;
    }

    const originalStyle = data.getAttribute('style') || '';
    data.style.width = '1200px';
    data.style.maxWidth = 'none';

    html2canvas(data, {
      scale: 2,
      windowWidth: 1200,
      useCORS: true,
      backgroundColor: '#ffffff'
    }).then((canvas) => {
      data.setAttribute('style', originalStyle);

      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const yPos = imgHeight < 210 ? (210 - imgHeight) / 2 : 10;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, yPos, imgWidth, imgHeight);
      pdf.save(`Menu_${this.rangoEditable.replace(/\//g, '-')}.pdf`);

      this.ngZone.run(() => {
        this.generandoPDF = false;
        this.modalPdfVisible = true;
      });
    }).catch(err => {
      data.setAttribute('style', originalStyle);
      this.ngZone.run(() => {
        this.generandoPDF = false;
        this.modalPdfError = true;
      });
    });
  }

  cerrarModalPdf(): void { this.modalPdfVisible = false; }

  // ─── STATE ───────────────────────────────────────────────────

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
      this.rangoEditable = data.rangoEditable ?? this.rangoEditable;
      this.menuData = data.menuData;
      this.lunesEmpiezaConCarne = data.lunesEmpiezaConCarne ?? true;
      return true;
    } catch {
      return false;
    }
  }
}
