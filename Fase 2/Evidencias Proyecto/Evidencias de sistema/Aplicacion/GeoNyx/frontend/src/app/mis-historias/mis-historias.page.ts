import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgIf, NgFor, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { 
  AlertController, ToastController,
  IonHeader, IonToolbar, IonButtons, IonBackButton, 
  IonTitle, IonContent, IonIcon, IonList, 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton,
  IonSearchbar, IonModal, IonItem, IonLabel, IonInput, IonTextarea 
} from '@ionic/angular';
import { ApiService } from '../services/api';
import { addIcons } from 'ionicons';
import { trashOutline, bookOutline, pencilOutline, chevronDownOutline,
          chevronUpOutline, locationOutline, calendarOutline, star
} from 'ionicons/icons';

@Component({
  selector: 'app-mis-historias',
  templateUrl: './mis-historias.page.html',
  styleUrls: ['./mis-historias.page.scss'],
  standalone: true,
  imports: [
    CommonModule, NgIf, NgFor, SlicePipe, FormsModule,
    IonHeader, IonToolbar, IonButtons, IonBackButton, 
    IonTitle, IonContent, IonIcon, IonList, 
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton,
    IonSearchbar, IonModal, IonItem, IonLabel, IonInput, IonTextarea
  ]
})
export class MisHistoriasPage implements OnInit {
  misLeyendas: any[] = [];
  leyendasFiltradas: any[] = []; 
  cargando: boolean = true;

  mostrarModalEdicion: boolean = false;
  leyendaEditando: any = { id_leyenda: null, titulo: '', historia: '' };

  constructor(
    private api: ApiService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef 
  ) {
    addIcons({ trashOutline, bookOutline, pencilOutline, 
      chevronDownOutline, chevronUpOutline, locationOutline, 
      calendarOutline, star });
  }

  ngOnInit() {
    this.cargarMisLeyendas();
  }

cargarMisLeyendas() {
    this.cargando = true;
    this.cdr.detectChanges(); 

    const miId = localStorage.getItem('usuario_id');

    this.api.getLeyendas().subscribe({
      // CAMBIO: Hacemos que esta parte sea "async" para poder esperar a los mapas
      next: async (todasLasLeyendas) => {
        try {
          if (Array.isArray(todasLasLeyendas)) {
            this.misLeyendas = todasLasLeyendas
              .filter((l: any) => String(l.id_usuario) === String(miId))
              // NUEVO: Agregamos promedio: '...' al mapeo inicial
              .map((l: any) => ({ ...l, expandida: false, lugar: 'Buscando zona...', promedio: '...' }))
              .reverse(); 
              
            this.leyendasFiltradas = [...this.misLeyendas]; 
            this.cdr.detectChanges(); // Mostramos las tarjetas de inmediato

            // CAMBIO: Esperamos a que TODAS las ubicaciones se resuelvan
            await Promise.all(this.misLeyendas.map(l => this.obtenerNombreLugar(l)));

            // NUEVO: Buscar el promedio para cada leyenda sin bloquear la pantalla
            this.misLeyendas.forEach(l => this.obtenerPromedioLeyenda(l));

          } else {
            this.misLeyendas = [];
            this.leyendasFiltradas = [];
          }
        } catch (error) {
          this.misLeyendas = [];
          this.leyendasFiltradas = [];
        }
        
        this.cargando = false;
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        this.mostrarMensaje('Error al conectar con el servidor', 'danger');
        this.cargando = false;
        this.cdr.detectChanges(); 
      }
    });
  }

  // CAMBIO: Nueva API de mapas más rápida y sin bloqueos
  async obtenerNombreLugar(leyenda: any) {
    try {
      if (!leyenda.latitud || !leyenda.longitud) {
        leyenda.lugar = 'Ubicación desconocida';
        return;
      }

      // Usamos BigDataCloud que no bloquea las peticiones de aplicaciones
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${leyenda.latitud}&longitude=${leyenda.longitud}&localityLanguage=es`;
      
      const respuesta = await fetch(url);
      if (!respuesta.ok) throw new Error('API bloqueada');
      
      const data = await respuesta.json();
      
      // Intentamos sacar el barrio, ciudad o región
      leyenda.lugar = data.locality || data.city || data.principalSubdivision || 'Ubicación local';
      
    } catch (e) {
      console.error("Error obteniendo ubicación:", e);
      leyenda.lugar = 'Ubicación local';
    } finally {
      this.cdr.detectChanges();
    }
  }

  buscarLeyenda(event: any) {
    const texto = event.target.value.toLowerCase();
    
    if (!texto) {
      this.leyendasFiltradas = [...this.misLeyendas];
      return;
    }

    this.leyendasFiltradas = this.misLeyendas.filter(l => 
      l.titulo.toLowerCase().includes(texto) || 
      l.historia.toLowerCase().includes(texto) ||
      (l.lugar && l.lugar.toLowerCase().includes(texto)) 
    );
  }

  toggleLeerMas(leyenda: any) {
    leyenda.expandida = !leyenda.expandida;
    this.cdr.detectChanges();
  }

  abrirEditor(leyenda: any) {
    this.leyendaEditando.id_leyenda = leyenda.id_leyenda;
    this.leyendaEditando.titulo = leyenda.titulo;
    this.leyendaEditando.historia = leyenda.historia;
    this.mostrarModalEdicion = true;
  }

  cerrarEditor() {
    this.mostrarModalEdicion = false;
  }

  async guardarEdicion() {
    if (!this.leyendaEditando.titulo.trim() || !this.leyendaEditando.historia.trim()) {
      this.mostrarMensaje('Los campos no pueden estar vacíos', 'warning');
      return;
    }

    this.cargando = true;
    const datosUpdate = {
      titulo: this.leyendaEditando.titulo,
      historia: this.leyendaEditando.historia
    };

    this.api.actualizarLeyenda(this.leyendaEditando.id_leyenda, datosUpdate).subscribe({
      next: () => {
        this.mostrarMensaje('Leyenda actualizada', 'success');
        this.mostrarModalEdicion = false;
        this.cargarMisLeyendas(); 
      },
      error: () => {
        this.mostrarMensaje('Error al actualizar', 'danger');
        this.cargando = false;
      }
    });
  }

  async borrarLeyenda(id: number) {
    const alertaBorrar = await this.alertCtrl.create({
      header: '¿Borrar leyenda?',
      message: 'Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar', role: 'destructive',
          handler: () => {
            this.cargando = true;
            this.cdr.detectChanges();
            this.api.borrarLeyenda(id).subscribe({
              next: () => {
                this.mostrarMensaje('Leyenda eliminada', 'success');
                this.cargarMisLeyendas(); 
              },
              error: () => {
                this.mostrarMensaje('Error al borrar', 'danger');
                this.cargando = false;
                this.cdr.detectChanges();
              }
            });
          }
        }
      ]
    });
    await alertaBorrar.present();
  }

  async mostrarMensaje(msj: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msj, duration: 2500, position: 'bottom', color: color });
    toast.present();
  }

  obtenerPromedioLeyenda(leyenda: any) {
    const idLeyenda = leyenda.id_leyenda || leyenda.id;
    if (!idLeyenda) {
      leyenda.promedio = '0.0';
      return;
    }
    
    // Pasamos "0" como id_usuario para que solo nos traiga el promedio general
    this.api.obtenerEstadoValoracion(idLeyenda, 0).subscribe({
      next: (datos: any) => {
        leyenda.promedio = Number(datos.promedio).toFixed(1);
        this.cdr.detectChanges();
      },
      error: () => {
        leyenda.promedio = '0.0';
        this.cdr.detectChanges();
      }
    });
  }
}