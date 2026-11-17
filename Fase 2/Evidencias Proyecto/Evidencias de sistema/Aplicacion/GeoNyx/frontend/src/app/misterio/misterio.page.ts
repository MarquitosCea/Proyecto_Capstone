import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, 
  IonButton, IonButtons, IonIcon, IonFab, IonFabButton,
  IonModal, IonItem, IonLabel, IonInput, IonTextarea, 
  AlertController, MenuController, ActionSheetController,
  ToastController, NavController, IonRow, IonCol, IonSpinner, LoadingController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  moonOutline, locateOutline, addOutline, closeOutline, micOutline,
  micOffOutline, bookOutline, navigateOutline, volumeHighOutline, volumeMuteOutline, 
  menuOutline, sunnyOutline, locationOutline, mic, lockClosed,
  mapOutline, footstepsOutline, shuffleOutline, languageOutline,
  pencilOutline, trashOutline, starOutline, warningOutline, star, refreshOutline
} from 'ionicons/icons'; 
import * as L from 'leaflet';
import { NgIf, SlicePipe } from '@angular/common';
import { ApiService } from '../services/api';

const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const iconDefault = L.icon({
  iconRetinaUrl, iconUrl, shadowUrl,
  iconSize: [25, 41], iconAnchor: [12, 41],
  popupAnchor: [1, -34], tooltipAnchor: [16, -28], shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-misterio',
  templateUrl: 'misterio.page.html',
  styleUrls: ['misterio.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent,
    IonButton, IonButtons, IonIcon, NgIf, IonFab, IonFabButton,
    FormsModule, IonModal, IonItem, IonLabel, IonInput, IonTextarea, SlicePipe,
    IonRow, IonCol, IonSpinner,
  ]
})
export class MisterioPage implements OnInit {
  private map!: L.Map;
  private userMarker: L.Marker | null = null;
  private pinTemporal: L.Marker | null = null;
  
  mostrarTarjeta: boolean = false;
  esManual: boolean = false; 
  leyendaSeleccionada: any = { titulo: '', historia: '', autor: '' };
  puntuacionActual: number = 0;
  promedioActual: string = '0.0';

  mostrarModalLeyenda: boolean = false;
  escuchandoTitulo: boolean = false;
  escuchandoHistoria: boolean = false;
  idiomaLeyendo: string | null = null; 
  historiaExpandida: boolean = false;
  
  nuevaLeyenda: { titulo: string, historia: string, lat: number, lon: number } = { titulo: '', historia: '', lat: 0, lon: 0 };

  miUsuarioId: string | null = null;
  esMiLeyenda: boolean = false;
  esEdicion: boolean = false;
  leyendaEditandoId: number | null = null;

  idiomaActivo: string = 'es'; 
  traduciendoTexto: boolean = false;
  leyendoAudio: boolean = false; 

  tipoPlanUsuario: string = 'observador'; 
  historiasCreadas: number = 0;
  
  idiomasDisponibles = [
    { codigo: 'es', nombre: 'Español', voz: 'es-CL' },
    { codigo: 'en', nombre: 'English', voz: 'en-US' },
    { codigo: 'pt', nombre: 'Português', voz: 'pt-BR' },
    { codigo: 'fr', nombre: 'Français', voz: 'fr-FR' },
    { codigo: 'de', nombre: 'Deutsch', voz: 'de-DE' },
    { codigo: 'zh', nombre: '中文 (Mandarin)', voz: 'zh-CN' }
  ];

  textosUI: any = {
    'es': { escritoPor: 'Escrito por', autor: 'Autor', leerMas: 'LEER MÁS', leerMenos: 'LEER MENOS', queParecio: '¿Qué te pareció este misterio?', promedio: 'Promedio', reportar: 'Reportar historia', editar: 'Editar', borrar: 'Borrar', cerrar: 'CERRAR' },
    'en': { escritoPor: 'Written by', autor: 'Author', leerMas: 'READ MORE', leerMenos: 'READ LESS', queParecio: 'What did you think of this mystery?', promedio: 'Average', reportar: 'Report story', editar: 'Edit', borrar: 'Delete', cerrar: 'CLOSE' },
    'pt': { escritoPor: 'Escrito por', autor: 'Autor', leerMas: 'LER MAIS', leerMenos: 'LER MENOS', queParecio: 'O que você achou deste mistério?', promedio: 'Média', reportar: 'Denunciar história', editar: 'Editar', borrar: 'Excluir', cerrar: 'FECHAR' },
    'fr': { escritoPor: 'Écrit par', autor: 'Auteur', leerMas: 'LIRE LA SUITE', leerMenos: 'RÉDUIRE', queParecio: 'Qu\'avez-vous pensé de ce mystère ?', promedio: 'Moyenne', reportar: 'Signaler l\'histoire', editar: 'Éditer', borrar: 'Supprimer', cerrar: 'FERMER' },
    'de': { escritoPor: 'Geschrieben von', autor: 'Autor', leerMas: 'MEHR LESEN', leerMenos: "WENIGER LESEN", queParecio: 'Wie fanden Sie dieses Geheimnis?', promedio: 'Durchschnitt', reportar: 'Geschichte melden', editar: 'Bearbeiten', borrar: 'Löschen', cerrar: 'SCHLIESSEN' },
    'zh': { escritoPor: '作者', autor: '作者', leerMas: '阅读更多', leerMenos: '收起', queParecio: '你觉得这个谜团怎么样？', promedio: '平均', reportar: '举报故事', editar: '编辑', borrar: '删除', cerrar: '关闭' }
  };

  get maxCaracteres(): number {
    if (this.tipoPlanUsuario === 'viajero') return 22000;
    if (this.tipoPlanUsuario === 'explorador') return 10000;
    return 4500;
  }

  get maxHistorias(): number {
    if (this.tipoPlanUsuario === 'viajero') return 25;
    if (this.tipoPlanUsuario === 'explorador') return 10;
    return 5;
  }

  constructor(
    private cdr: ChangeDetectorRef, 
    private router: Router,
    private alertController: AlertController,
    private api: ApiService,
    private menuCtrl: MenuController,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {
    addIcons({ 
      moonOutline, locateOutline, addOutline, closeOutline, micOutline, mic, 
      volumeHighOutline, volumeMuteOutline, menuOutline, pencilOutline, 
      trashOutline, starOutline, warningOutline, star, lockClosed, refreshOutline
    });

    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state) {
      this.esManual = nav.extras.state['manual'] === true;
    }
  }

  ionViewWillEnter() {
    this.miUsuarioId = localStorage.getItem('usuario_id');
    this.tipoPlanUsuario = localStorage.getItem('tipo_plan') || 'observador'; 
  }

  ngOnInit() {
    this.miUsuarioId = localStorage.getItem('usuario_id');
    if (this.esManual) {
      this.initMap();
    } else {
      this.verificarHorario();
    }
  }

  // --- COMPONENT SPINNER CON CSS DEL MODO HISTÓRICO ---
  async mostrarCargando(mensaje: string = 'Cargando...') {
    const loading = await this.loadingCtrl.create({
      message: mensaje,
      spinner: null,
      cssClass: 'loading-geonyx'
    });
    await loading.present();
    return loading;
  }

  async verificarPremium(funcionDestacada: string): Promise<boolean> {
    if (this.tipoPlanUsuario !== 'observador') {
      return true; 
    }

    const alert = await this.alertCtrl.create({
      header: 'Función Premium',
      message: `Para usar ${funcionDestacada} necesitas mejorar tu plan. ¡Desbloquea todo el potencial de GeoNyx!`,
      buttons: [
        { text: 'Quizás después', role: 'cancel' },
        { 
          text: 'Ver Planes', 
          cssClass: 'boton-alerta-premium',
          handler: () => { 
            this.router.navigate(['/suscripcion']); 
          } 
        }
      ]
    });
    await alert.present();
    return false; 
  }

  abrirMenu() {
    this.menuCtrl.open();
  }

  async verificarHorario() {
    const hora = await this.api.obtenerHoraReal();
    
    if (this.esManual) {
      this.initMap();
      return;
    }

    if (hora >= 6 && hora < 20) {
      this.mostrarMensaje('El Modo Misterio automático solo funciona de 20:00 a 06:00 hrs.', 'warning');
      this.router.navigate(['/home']);
    } else {
      this.initMap();
    }
  }

  async irAHistorico() {
    if (this.tipoPlanUsuario === 'observador') {
      this.mostrarMensaje('El cambio manual de modo es exclusivo para niveles Explorador y Viajero.', 'warning');
      return; 
    }
    this.router.navigate(['/home'], { state: { manual: true } });
  }

  initMap() {
    this.map = L.map('map-misterio', { attributionControl: false }).setView([-33.4915, -70.7190], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
      className: 'mapa-oscuro-filtro', maxZoom: 19
    }).addTo(this.map);

    setTimeout(() => { this.map.invalidateSize(); }, 400);

    this.map.locate({ setView: false });

    this.map.on('locationfound', (e) => {
      setTimeout(() => { 
        if (this.map) {
          this.map.invalidateSize(); 
          this.map.setView(e.latlng, 16); 
        }
      }, 400);

      this.map.on('click', async (e: L.LeafletMouseEvent) => {
        if (!this.userMarker) {
          window.alert("Espera a que obtengamos tu ubicación actual primero.");
          return;
        }

        const miUbicacion = this.userMarker.getLatLng();
        if (!miUbicacion || isNaN(miUbicacion.lat) || isNaN(miUbicacion.lng)) return;

        const distanciaMetros = miUbicacion.distanceTo(e.latlng);

        if (distanciaMetros > 5000) {
          const alertaLejos = await this.alertController.create({
            header: 'Muy Lejos',
            message: `Ese punto está a ${(distanciaMetros / 1000).toFixed(1)} km. Límite de 5 km.`,
            buttons: ['Entendido']
          });
          await alertaLejos.present();
          return;
        }

        if (this.pinTemporal) this.map.removeLayer(this.pinTemporal);

        this.pinTemporal = L.marker(e.latlng).addTo(this.map);
        
        const textoPopup = document.createElement('div');
        textoPopup.innerHTML = '<b style="color: #ff00b7; cursor: pointer; display: block; padding: 5px;"> Toca para crear una leyenda</b>';
        textoPopup.addEventListener('click', () => {
          this.formularioNuevaLeyenda(e.latlng.lat, e.latlng.lng);
          this.pinTemporal?.closePopup();
        });

        this.pinTemporal.bindPopup(textoPopup).openPopup();
        this.pinTemporal.on('click', () => { this.formularioNuevaLeyenda(e.latlng.lat, e.latlng.lng); });
      });
      
      const iconoUbicacion = L.divIcon({
        className: 'icono-ubicacion-limpio',
        html: `<div class="pulso-misterio"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -15] 
      });
      
      if (this.userMarker) {
        this.userMarker.setLatLng(e.latlng);
      } else {
        this.userMarker = L.marker(e.latlng, { icon: iconoUbicacion })
          .addTo(this.map).bindPopup('<b style="color: #ff00b7; font-size: 14px;">¡Estás Aquí!</b>').openPopup();
      }
      
      this.cargarLeyendasBackend(e.latlng.lat, e.latlng.lng);
    });
  }

  async recargarUbicacion() {
    if (this.map) {
      this.map.locate({ setView: true });

      if (this.userMarker) {
        const pos = this.userMarker.getLatLng();
        if (pos && !isNaN(pos.lat) && !isNaN(pos.lng)) {
          this.cargarLeyendasBackend(pos.lat, pos.lng);
        }
      }
    }
  }

  centrarMapaEnUsuario() {
    if (this.userMarker) {
      const pos = this.userMarker.getLatLng();
      if (pos && !isNaN(pos.lat) && !isNaN(pos.lng)) {
        this.map.flyTo(pos, 16, { animate: true, duration: 0.5 });
        this.userMarker.openPopup();
      } else {
        this.mostrarMensaje('Aún no se ha detectado una ubicación válida.', 'warning');
      }
    } else {
      this.mostrarMensaje('Espera a que obtengamos tu ubicación.', 'warning');
    }
  }

  async cargarLeyendasBackend(lat: number, lon: number) {
    const loading = await this.mostrarCargando('Cargando leyendas locales...');

    this.api.getLeyendas().subscribe({
      next: (leyendasDelServidor) => {
        // Limpiamos únicamente marcadores de leyendas previas
        this.map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker && layer !== this.userMarker && layer !== this.pinTemporal) {
            this.map.removeLayer(layer);
          }
        });

        if (Array.isArray(leyendasDelServidor)) {
          leyendasDelServidor.forEach((leyenda: any) => {
            const latNum = Number(leyenda.latitud ?? leyenda.lat);
            const lonNum = Number(leyenda.longitud ?? leyenda.lon ?? leyenda.lng);

            // Validación estricta para evitar errores NaN en Leaflet
            if (!isNaN(latNum) && !isNaN(lonNum) && latNum !== 0 && lonNum !== 0) {
              const iconoLeyenda = L.icon({
                iconUrl: 'assets/icon/LibroNoche.png',
                iconSize: [45, 45], iconAnchor: [17, 17], popupAnchor: [0, -17]
              });

              const marcador = L.marker([latNum, lonNum], { icon: iconoLeyenda }).addTo(this.map);

              marcador.on('click', () => {
                this.map.flyTo([latNum, lonNum], 16, { animate: true, duration: 0.5 });
                this.abrirTarjetaLeyenda(leyenda); 
              });
            }
          });
        }
        loading.dismiss();
      },
      error: (err) => {
        console.error("Error al cargar leyendas:", err);
        loading.dismiss();
      }
    });
  }

  abrirTarjetaLeyenda(leyenda: any) {
    this.leyendaSeleccionada = leyenda;
    this.leyendaSeleccionada.autor = leyenda.alias_autor || 'Anónimo'; 
    
    const token = localStorage.getItem('token');
    const miIdActual = localStorage.getItem('usuario_id');
      
    this.puntuacionActual = 0; 
    this.promedioActual = '0.0'; 
    
    const idDeLaHistoria = this.leyendaSeleccionada.id_leyenda || this.leyendaSeleccionada.id;
    const idUsuarioNumerico = miIdActual ? parseInt(miIdActual) : 0;

    if (idDeLaHistoria) {
      this.api.obtenerEstadoValoracion(idDeLaHistoria, idUsuarioNumerico).subscribe({
        next: (datos: any) => {
          this.promedioActual = Number(datos.promedio).toFixed(1); 
          
          if (datos.mi_voto > 0) {
            this.puntuacionActual = datos.mi_voto; 
          }
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error("Error cargando valoraciones:", err)
      });
    }

    this.idiomaActivo = 'es';
    this.leyendoAudio = false;
    this.leyendaSeleccionada.traducciones = {
      'es': { 
        completa: leyenda.historia, 
        corta: leyenda.historia.length > 100 ? leyenda.historia.substring(0, 100) + '...' : leyenda.historia 
      }
    };

    if (token && miIdActual && miIdActual !== 'null' && miIdActual !== 'undefined') {
      this.esMiLeyenda = String(miIdActual) === String(leyenda.id_usuario);
    } else {
      this.esMiLeyenda = false;
    }
    
    this.historiaExpandida = false;
    this.mostrarTarjeta = true;
    this.cdr.detectChanges();
  }

  cerrarTarjeta() {
    this.mostrarTarjeta = false;
    this.detenerAudio(); 
    this.cdr.detectChanges();
    this.puntuacionActual = 0;
  }

  iniciarReconocimientoVoz(campo: 'titulo' | 'historia') {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { window.alert('Tu navegador no soporta dictado por voz.'); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CL';
    recognition.continuous = false;

    recognition.onstart = () => { 
      if (campo === 'titulo') this.escuchandoTitulo = true;
      else this.escuchandoHistoria = true;
      this.cdr.detectChanges(); 
    };

    recognition.onresult = (event: any) => {
      const textoDictado = event.results[0][0].transcript;
      if (campo === 'titulo') {
        const espacio = this.nuevaLeyenda.titulo.length > 0 ? ' ' : '';
        this.nuevaLeyenda.titulo += espacio + textoDictado;
      } else {
        const espacio = this.nuevaLeyenda.historia.length > 0 ? ' ' : '';
        this.nuevaLeyenda.historia += espacio + textoDictado;
      }
      this.cdr.detectChanges();
    };

    recognition.onerror = () => { this.escuchandoTitulo = false; this.escuchandoHistoria = false; this.cdr.detectChanges(); };
    recognition.onend = () => { this.escuchandoTitulo = false; this.escuchandoHistoria = false; this.cdr.detectChanges(); };

    recognition.start();
  }

  async formularioNuevaLeyenda(latClic?: number, lngClic?: number) {
    const miIdActual = localStorage.getItem('usuario_id');

    if (!miIdActual || miIdActual === 'null' || miIdActual === 'undefined') {
      const alertaLogin = await this.alertController.create({
        message: 'Para compartir tus historias, debes de iniciar sesión.',
        buttons: [
          {
            text: 'Quizás más tarde',
            role: 'cancel'
          },
          {
            text: 'Iniciar sesión',
            handler: () => {
              this.router.navigate(['/login']);
            }
          }
        ]
      });
      await alertaLogin.present();
      return;
    }
    
    this.miUsuarioId = miIdActual; 

    if (!this.userMarker) {
      window.alert("Espera a obtener tu ubicación.");
      return;
    }
    
    if (this.historiasCreadas >= this.maxHistorias) {
      this.mostrarMensaje(`Límite de ${this.maxHistorias} historias alcanzado. ¡Mejora tu plan!`, 'warning');
      return;
    }
    
    this.esEdicion = false;
    this.leyendaEditandoId = null;

    this.nuevaLeyenda.lat = latClic !== undefined ? latClic : this.userMarker.getLatLng().lat;
    this.nuevaLeyenda.lon = lngClic !== undefined ? lngClic : this.userMarker.getLatLng().lng;
    this.nuevaLeyenda.titulo = '';
    this.nuevaLeyenda.historia = '';
    
    this.mostrarModalLeyenda = true;
    this.cdr.detectChanges();
  }

  cerrarModalLeyenda() {
    this.mostrarModalLeyenda = false;
    this.escuchandoTitulo = false;
    this.escuchandoHistoria = false;
    if (this.pinTemporal) { this.map.removeLayer(this.pinTemporal); this.pinTemporal = null; }
    this.cdr.detectChanges();
  }

  async publicarDesdeModal() {
    if (this.nuevaLeyenda.titulo.trim() !== '' && this.nuevaLeyenda.historia.trim() !== '') {
      
      if (this.esEdicion && this.leyendaEditandoId) {
        this.actualizarLeyendaBackend(this.leyendaEditandoId, this.nuevaLeyenda.titulo, this.nuevaLeyenda.historia);
      } else {
        this.guardarLeyendaBackend(this.nuevaLeyenda.titulo, this.nuevaLeyenda.historia, this.nuevaLeyenda.lat, this.nuevaLeyenda.lon);
      }
      
      this.cerrarModalLeyenda();
    } else {
      const alertaFaltan = await this.alertController.create({
        header: 'Datos incompletos', message: 'Debes ingresar un título y una historia.', buttons: ['OK']
      });
      await alertaFaltan.present();
    }
  }

  async guardarLeyendaBackend(titulo: string, historia: string, lat: number, lon: number) {
    const miIdActual = localStorage.getItem('usuario_id');
    if (!miIdActual || miIdActual === 'null') return; 

    const loading = await this.mostrarCargando('Guardando leyenda en el mapa...');

    const datosLeyenda = {
      titulo: titulo, historia: historia, latitud: lat, longitud: lon,
      id_usuario: Number(miIdActual) 
    };

    this.api.crearLeyenda(datosLeyenda).subscribe({
      next: (respuesta) => {
        loading.dismiss();
        this.mostrarMensaje('¡Leyenda publicada en el mapa!');
        this.recargarPinesMapa(); 
      },
      error: (err: any) => { 
        loading.dismiss();
        window.alert("Hubo un error al guardar tu leyenda."); 
      }
    });
  }

  editarLeyenda() {
    this.esEdicion = true; 
    this.leyendaEditandoId = this.leyendaSeleccionada.id_leyenda; 
    
    this.nuevaLeyenda.titulo = this.leyendaSeleccionada.titulo;
    this.nuevaLeyenda.historia = this.leyendaSeleccionada.historia;
    
    this.mostrarModalLeyenda = true;
    this.cerrarTarjeta();
  }

  async actualizarLeyendaBackend(id: number, titulo: string, historia: string) {
    const loading = await this.mostrarCargando('Actualizando tu leyenda...');

    const datosUpdate = { titulo: titulo, historia: historia };
    
    this.api.actualizarLeyenda(id, datosUpdate).subscribe({
      next: () => {
        loading.dismiss();
        this.mostrarMensaje('¡Leyenda actualizada!');
        this.recargarPinesMapa();
      },
      error: (err: any) => { 
        loading.dismiss();
        console.error(err); 
        window.alert("Error al actualizar la leyenda."); 
      }
    });
  }

  async borrarLeyenda() {
    const alertaBorrar = await this.alertController.create({
      header: '¿Borrar leyenda?',
      message: 'Esta acción eliminará la historia del mapa para todos.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Borrar', 
          role: 'destructive',
          handler: async () => {
            const loading = await this.mostrarCargando('Eliminando leyenda...');

            this.api.borrarLeyenda(this.leyendaSeleccionada.id_leyenda).subscribe({
              next: () => {
                loading.dismiss();
                this.cerrarTarjeta();
                this.mostrarMensaje('Leyenda eliminada.');
                this.recargarPinesMapa();
              },
              error: (err: any) => { 
                loading.dismiss();
                console.error(err); 
                window.alert("Error al borrar."); 
              }
            });
          }
        }
      ]
    });
    await alertaBorrar.present();
  }

  async valorarHistoria(nota: number) {
    const idUsuarioActualStr = localStorage.getItem('usuario_id');

    if (!idUsuarioActualStr) {
      const toast = await this.toastCtrl.create({
        message: 'Debes iniciar sesión para valorar historias.',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      this.navCtrl.navigateForward('/login');
      return;
    }

    const idUsuarioActual = parseInt(idUsuarioActualStr);

    this.puntuacionActual = nota;
    this.cdr.detectChanges(); 

    const idLeyenda = this.leyendaSeleccionada.id_leyenda || this.leyendaSeleccionada.id; 
    const datosVoto = {
      id_usuario: idUsuarioActual,
      puntuacion: nota
    };

    this.api.valorarLeyenda(idLeyenda, datosVoto).subscribe({
      next: async () => {
        const toast = await this.toastCtrl.create({
          message: '¡Gracias por valorar este misterio!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
        
        this.api.obtenerEstadoValoracion(idLeyenda, idUsuarioActual).subscribe({
          next: (datos: any) => {
            this.promedioActual = Number(datos.promedio).toFixed(1);
            this.cdr.detectChanges();
          }
        });
      },
      error: (err: any) => {
        console.error('Error al valorar:', err);
        this.puntuacionActual = 0; 
        this.cdr.detectChanges();   
      }
    });
  }

  async reportarHistoria() {
    const miId = localStorage.getItem('usuario_id');
    if (!miId || miId === 'null') {
      this.mostrarMensaje('Debes iniciar sesión para reportar.', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Reportar Leyenda',
      inputs: [
        {
          name: 'motivo',
          type: 'textarea',
          placeholder: '¿Por qué reportas esta historia?'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Enviar Reporte',
          handler: (data) => {
            if (data && data.motivo && data.motivo.trim() !== '') {
              this.enviarReporte(data.motivo);
              return true;
            } else {
              this.mostrarMensaje('Debes escribir un motivo', 'warning');
              return false;
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async enviarReporte(motivo: string) {
    const loading = await this.mostrarCargando('Enviando reporte...');

    const miId = Number(localStorage.getItem('usuario_id'));
    this.api.reportarLeyenda(this.leyendaSeleccionada.id_leyenda, { id_usuario: miId, motivo: motivo })
      .subscribe({
        next: () => {
          loading.dismiss();
          this.mostrarMensaje('Reporte enviado a los moderadores', 'success');
          this.cerrarTarjeta();
        },
        error: () => {
          loading.dismiss();
          this.mostrarMensaje('Error al enviar reporte', 'danger');
        }
      });
  }

  recargarPinesMapa() {
    if (this.userMarker) {
      const pos = this.userMarker.getLatLng();
      if (pos && !isNaN(pos.lat) && !isNaN(pos.lng)) {
        this.cargarLeyendasBackend(pos.lat, pos.lng);
      }
    }
  }

  async mostrarMensaje(msj: string, color: string = 'light') {
    const toast = await this.alertController.create({ message: msj, buttons: ['OK'] });
    await toast.present();
  }

  // --- SISTEMA MULTI-IDIOMA Y AUDIO (OPTIMIZADO) ---

  async abrirMenuIdiomas() {
    const botones: any[] = this.idiomasDisponibles.map(idioma => {
      const estaSeleccionado = this.idiomaActivo === idioma.codigo;
      
      let tieneAcceso = false;
      
      if (this.tipoPlanUsuario === 'viajero') {
        tieneAcceso = true; 
      } else if (this.tipoPlanUsuario === 'explorador') {
        tieneAcceso = ['es', 'en', 'pt'].includes(idioma.codigo); 
      } else {
        tieneAcceso = ['es', 'en'].includes(idioma.codigo); 
      }

      let icono: string | undefined = estaSeleccionado ? 'checkmark' : undefined;
      if (!tieneAcceso) {
        icono = 'lock-closed';
      }

      return {
        text: idioma.nombre,
        icon: icono,
        cssClass: estaSeleccionado ? 'idioma-seleccionado' : '',
        handler: () => { this.validarIdiomaSegunPlan(idioma, tieneAcceso); }
      };
    });

    botones.push({ 
      text: 'Cancelar', icon: 'close', role: 'destructive', cssClass: 'boton-cancelar-rojo', handler: () => {} 
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Traducir historia a:',
      buttons: botones
    });

    await actionSheet.present();
  }

  validarIdiomaSegunPlan(idioma: any, tieneAcceso: boolean) {
    if (!tieneAcceso) {
      this.verificarPremium(`la traducción al ${idioma.nombre}`);
      return;
    }
    this.cambiarIdiomaTexto(idioma.codigo);
  }

  obtenerNombreIdiomaActivo(): string {
    const id = this.idiomasDisponibles.find(i => i.codigo === this.idiomaActivo);
    return id ? id.nombre : 'Español';
  }

  async cambiarIdiomaTexto(codigoIdioma: string) {
    if (this.idiomaActivo === codigoIdioma) return; 
    
    this.detenerAudio(); 
    this.idiomaActivo = codigoIdioma;

    if (this.leyendaSeleccionada.traducciones[codigoIdioma]) {
      this.cdr.detectChanges();
      return;
    }

    this.traduciendoTexto = true;
    this.cdr.detectChanges();

    const textoBase = this.leyendaSeleccionada.traducciones['es'].completa;

    try {
      const targetLang = codigoIdioma === 'zh' ? 'zh-CN' : codigoIdioma; 
      const urlTrad = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=${targetLang}&dt=t&q=${encodeURIComponent(textoBase)}`;
      
      const respuesta = await fetch(urlTrad);
      const data = await respuesta.json();
      
      if (data && data[0]) {
        const textoTraducido = data[0].map((item: any) => item[0]).join('');
        
        let cortaTrad = textoTraducido;
        if (textoTraducido.length > 100) {
          cortaTrad = textoTraducido.substring(0, 100) + '...';
        }

        this.leyendaSeleccionada.traducciones[codigoIdioma] = {
          corta: cortaTrad,
          completa: textoTraducido
        };
      }
    } catch (error) {
      this.leyendaSeleccionada.traducciones[codigoIdioma] = {
        corta: 'Translation error.', completa: 'Error translating the text.'
      };
    }

    this.traduciendoTexto = false;
    this.cdr.detectChanges();
  }

  toggleAudio() {
    if (this.leyendoAudio) {
      this.detenerAudio();
    } else {
      this.reproducirAudio();
    }
  }

  reproducirAudio() {
    this.detenerAudio();
    this.leyendoAudio = true;
    this.cdr.detectChanges();

    const textoALeer = this.leyendaSeleccionada.traducciones[this.idiomaActivo]?.completa || '';
    if (!textoALeer) return;

    const confIdioma = this.idiomasDisponibles.find(i => i.codigo === this.idiomaActivo);
    const vozObjetivo = confIdioma ? confIdioma.voz : 'es-CL';

    const voces = window.speechSynthesis.getVoices();
    const prefijo = vozObjetivo.split('-')[0];
    const mejorVoz = voces.find(v => v.lang === vozObjetivo) || voces.find(v => v.lang.startsWith(prefijo));

    const oraciones = textoALeer.match(/[^.!?]+[.!?]+/g) || [textoALeer];
    let indiceOracion = 0;

    const hablarSiguiente = () => {
      if (indiceOracion >= oraciones.length || !this.leyendoAudio) {
        this.leyendoAudio = false;
        this.cdr.detectChanges();
        return;
      }

      const mensaje = new SpeechSynthesisUtterance(oraciones[indiceOracion].trim());
      mensaje.lang = vozObjetivo;
      if (mejorVoz) mensaje.voice = mejorVoz;

      mensaje.onend = () => {
        indiceOracion++;
        hablarSiguiente();
      };

      mensaje.onerror = () => {
        this.leyendoAudio = false;
        this.cdr.detectChanges();
      };

      window.speechSynthesis.speak(mensaje);
    };

    hablarSiguiente();
  }

  detenerAudio() {
    window.speechSynthesis.cancel();
    this.leyendoAudio = false;
    this.cdr.detectChanges();
  }

  get idiomasPermitidos(): any[] {
    if (this.tipoPlanUsuario === 'viajero') {
      return this.idiomasDisponibles; 
    } else if (this.tipoPlanUsuario === 'explorador') {
      return this.idiomasDisponibles.filter(i => ['es', 'en', 'pt'].includes(i.codigo));
    } else {
      return this.idiomasDisponibles.filter(i => ['es', 'en'].includes(i.codigo)); 
    }
  }
}