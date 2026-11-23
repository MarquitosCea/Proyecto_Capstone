import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
  pencilOutline, trashOutline, starOutline, warningOutline, star, refreshOutline, checkmark, close
} from 'ionicons/icons'; 
import * as L from 'leaflet';
import { NgIf, SlicePipe } from '@angular/common';
import { CapacitorHttp } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
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
export class MisterioPage implements OnInit, OnDestroy {
  private map!: L.Map;
  private userMarker: L.Marker | null = null;
  private pinTemporal: L.Marker | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private debeIniciarMapa: boolean = false;
  private vistaVisible: boolean = false;
  
  mostrarTarjeta: boolean = false;
  esManual: boolean = false; 
  leyendaSeleccionada: any = { titulo: '', historia: '', autor: '', traducciones: {} };
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
  private audioActual: HTMLAudioElement | null = null;
  private urlAudioActual: string | null = null;
  private audioFallbackTimer: any = null;
  private tokenAudio: number = 0;

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
    'de': { escritoPor: 'Geschrieben von', autor: 'Autor', leerMas: 'MEHR LESEN', leerMenos: 'WENIGER LESEN', queParecio: 'Wie fanden Sie dieses Geheimnis?', promedio: 'Durchschnitt', reportar: 'Geschichte melden', editar: 'Bearbeiten', borrar: 'Löschen', cerrar: 'SCHLIESSEN' },
    'zh': { escritoPor: '作者', autor: '作者', leerMas: '阅读更多', leerMenos: '收起', queParecio: '你觉得这个谜团怎么样？', promedio: '平均', reportar: '举报故事', editar: '编辑', borrar: '删除', cerrar: '关闭' }
  };

  private get planNormalizado(): string {
    return (this.tipoPlanUsuario || 'observador').toLowerCase().trim();
  }

  get maxCaracteres(): number {
    if (this.planNormalizado.includes('viajero')) return 22000;
    if (this.planNormalizado.includes('explorador')) return 10000;
    return 4500;
  }

  get maxHistorias(): number {
    if (this.planNormalizado.includes('viajero')) return 25;
    if (this.planNormalizado.includes('explorador')) return 10;
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
      trashOutline, starOutline, warningOutline, star, lockClosed, refreshOutline,
      checkmark, close
    });

    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state) {
      this.esManual = nav.extras.state['manual'] === true;
    }
  }

  ionViewWillEnter() {
    this.miUsuarioId = localStorage.getItem('usuario_id');
    this.tipoPlanUsuario = (localStorage.getItem('tipo_plan') || 'observador').toLowerCase();
    this.cdr.detectChanges();
  }

  ionViewDidEnter() {
    // Crear el mapa cuando la vista ya es visible evita el típico mapa a medias al cambiar de modo.
    this.vistaVisible = true;
    this.iniciarMapaSiCorresponde();

    const invalidar = () => {
      if (this.map) {
        this.map.invalidateSize(true);
        window.dispatchEvent(new Event('resize'));
      }
    };
    setTimeout(invalidar, 150);
    setTimeout(invalidar, 500);
    setTimeout(invalidar, 1200);
  }

  ionViewWillLeave() {
    this.vistaVisible = false;
    this.destruirMapa();
    this.debeIniciarMapa = true;
  }

  ngOnInit() {
    this.miUsuarioId = localStorage.getItem('usuario_id');
    this.tipoPlanUsuario = (localStorage.getItem('tipo_plan') || 'observador').toLowerCase();
    if (this.esManual) {
      this.debeIniciarMapa = true;
    } else {
      this.verificarHorario();
    }
  }

  ngOnDestroy() {
    this.destruirMapa();
  }

  private iniciarMapaSiCorresponde() {
    if (this.vistaVisible && this.debeIniciarMapa && !this.map) {
      this.debeIniciarMapa = false;
      this.initMap();
    }
  }

  private destruirMapa() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.map) {
      this.map.remove();
      (this.map as any) = null;
    }
    this.userMarker = null;
    this.pinTemporal = null;
  }

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
    if (!this.planNormalizado.includes('observador')) {
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
      this.debeIniciarMapa = true;
      this.iniciarMapaSiCorresponde();
      return;
    }

    if (hora >= 6 && hora < 20) {
      this.mostrarMensaje('El Modo Misterio automático solo funciona de 20:00 a 06:00 hrs.', 'warning');
      this.router.navigate(['/home']);
    } else {
      this.debeIniciarMapa = true;
      this.iniciarMapaSiCorresponde();
    }
  }

  async irAHistorico() {
    if (this.planNormalizado.includes('observador')) {
      this.mostrarMensaje('El cambio manual de modo es exclusivo para niveles Explorador y Viajero.', 'warning');
      return; 
    }
    this.router.navigate(['/home'], { state: { manual: true } });
  }

  async initMap() {
    if (this.map) return;

    const loading = await this.mostrarCargando('Cargando Modo Misterio...');

    try {
      this.map = L.map('map-misterio', { 
        attributionControl: false,
        tapTolerance: 15
      }).setView([-33.4915, -70.7190], 15);
    } catch (error) {
      console.error('No se pudo inicializar el mapa misterio:', error);
      await loading.dismiss();
      this.debeIniciarMapa = true;
      return;
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
      className: 'mapa-oscuro-filtro', 
      maxZoom: 19
    }).addTo(this.map);

    // Observa cambios de tamaño del contenedor Ionic para evitar mapas cortados
    const mapEl = document.getElementById('map-misterio');
    if (mapEl && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.map) this.map.invalidateSize(true);
      });
      this.resizeObserver.observe(mapEl);
    }

    setTimeout(() => { if (this.map) this.map.invalidateSize(true); }, 300);
    setTimeout(() => { if (this.map) this.map.invalidateSize(true); }, 900);
    setTimeout(() => { if (this.map) this.map.invalidateSize(true); }, 1500);

    this.map.on('click', async (e: L.LeafletMouseEvent) => {
      if (!this.userMarker) {
        this.mostrarMensaje('Espera a que obtengamos tu ubicación actual primero.', 'warning');
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
      textoPopup.innerHTML = '<b style="color: #ff00b7; cursor: pointer; display: block; padding: 5px;">Toca para crear una leyenda</b>';
      textoPopup.addEventListener('click', () => {
        this.formularioNuevaLeyenda(e.latlng.lat, e.latlng.lng);
        this.pinTemporal?.closePopup();
      });

      this.pinTemporal.bindPopup(textoPopup).openPopup();
      this.pinTemporal.on('click', () => { this.formularioNuevaLeyenda(e.latlng.lat, e.latlng.lng); });
    });

    this.map.locate({ setView: false, enableHighAccuracy: true, timeout: 7000 });

    this.map.on('locationfound', async (e) => {
      if (this.map) {
        this.map.invalidateSize(true); 
        this.map.setView(e.latlng, 16); 
      }
      
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
      
      await loading.dismiss();
      this.cargarLeyendasBackend(e.latlng.lat, e.latlng.lng);
    });

    this.map.on('locationerror', async () => {
      if (this.map) this.map.invalidateSize(true);
      await loading.dismiss();
      this.cargarLeyendasBackend(-33.4915, -70.7190);
    });
  }

  async recargarUbicacion() {
    if (this.map) {
      this.map.invalidateSize(true);
      this.map.locate({ setView: true, enableHighAccuracy: true });

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
        this.map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker && layer !== this.userMarker && layer !== this.pinTemporal) {
            this.map.removeLayer(layer);
          }
        });

        if (Array.isArray(leyendasDelServidor)) {
          leyendasDelServidor.forEach((leyenda: any) => {
            const latNum = Number(leyenda.latitud ?? leyenda.lat);
            const lonNum = Number(leyenda.longitud ?? leyenda.lon ?? leyenda.lng);

            if (!isNaN(latNum) && !isNaN(lonNum) && latNum !== 0 && lonNum !== 0) {
              const iconoLeyenda = L.divIcon({
                className: 'marcador-leyenda',
                html: '<button type="button" class="marcador-leyenda-btn" aria-label="Leer leyenda"><img src="assets/icon/LibroNoche.png" alt="" draggable="false" /></button>',
                iconSize: [45, 45],
                iconAnchor: [22, 22],
                popupAnchor: [0, -22]
              });

              const marcador = L.marker([latNum, lonNum], { icon: iconoLeyenda, interactive: true, keyboard: true }).addTo(this.map);

              let ultimaApertura = 0;
              const abrir = () => {
                const ahora = Date.now();
                if (ahora - ultimaApertura < 500) return;
                ultimaApertura = ahora;
                if (this.map) this.map.flyTo([latNum, lonNum], 16, { animate: true, duration: 0.5 });
                this.abrirTarjetaLeyenda(leyenda);
              };

              marcador.on('click', abrir);

              const boton = marcador.getElement()?.querySelector('.marcador-leyenda-btn');
              if (boton) {
                boton.addEventListener('click', (ev: Event) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  abrir();
                });
              }
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
    this.leyendaSeleccionada = { ...leyenda };
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
    const textoHistoria = leyenda.historia || '';
    this.leyendaSeleccionada.traducciones = {
      'es': { 
        completa: textoHistoria, 
        corta: textoHistoria.length > 100 ? textoHistoria.substring(0, 100) + '...' : textoHistoria 
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
    if (!SpeechRecognition) { 
      this.mostrarMensaje('Tu dispositivo no soporta dictado por voz.', 'warning'); 
      return; 
    }

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
          { text: 'Quizás más tarde', role: 'cancel' },
          {
            text: 'Iniciar sesión',
            handler: () => { this.router.navigate(['/login']); }
          }
        ]
      });
      await alertaLogin.present();
      return;
    }
    
    this.miUsuarioId = miIdActual; 

    if (!this.userMarker) {
      this.mostrarMensaje('Espera a obtener tu ubicación.', 'warning');
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
      next: () => {
        loading.dismiss();
        this.mostrarMensaje('¡Leyenda publicada en el mapa!');
        this.recargarPinesMapa(); 
      },
      error: () => { 
        loading.dismiss();
        this.mostrarMensaje('Hubo un error al guardar tu leyenda.', 'danger'); 
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
        this.mostrarMensaje('Error al actualizar la leyenda.', 'danger'); 
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
                this.mostrarMensaje('Error al borrar.', 'danger'); 
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

  // --- SISTEMA MULTI-IDIOMA NATIVO CON CAPACITOR HTTP (SIN BLOQUEO CORS) ---

  async abrirMenuIdiomas() {
    this.tipoPlanUsuario = (localStorage.getItem('tipo_plan') || this.tipoPlanUsuario || 'observador').toLowerCase();
    const plan = this.planNormalizado;

    const botones: any[] = this.idiomasDisponibles.map(idioma => {
      const estaSeleccionado = this.idiomaActivo === idioma.codigo;
      
      let tieneAcceso = false;
      if (plan.includes('viajero')) {
        tieneAcceso = true; 
      } else if (plan.includes('explorador')) {
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

    if (!this.leyendaSeleccionada.traducciones) {
      this.leyendaSeleccionada.traducciones = {
        'es': {
          completa: this.leyendaSeleccionada.historia || '',
          corta: (this.leyendaSeleccionada.historia || '').substring(0, 100) + '...'
        }
      };
    }

    if (this.leyendaSeleccionada.traducciones[codigoIdioma]) {
      this.cdr.detectChanges();
      return;
    }

    this.traduciendoTexto = true;
    this.cdr.detectChanges();

    const textoBase = this.leyendaSeleccionada.traducciones['es']?.completa || '';
    let textoTraducido = '';

    if (!textoBase.trim()) {
      this.idiomaActivo = 'es';
      this.traduciendoTexto = false;
      this.cdr.detectChanges();
      return;
    }

    // El backend llama a MyMemory/Google y divide el texto en trozos.
    try {
      const datos: any = await firstValueFrom(this.api.traducir(textoBase, codigoIdioma));
      textoTraducido = datos?.texto || '';
    } catch (e) {
      console.warn('Fallo el servicio de traducción:', e);
    }

    if (textoTraducido) {
      const cortaTrad = textoTraducido.length > 100 
        ? textoTraducido.substring(0, 100) + '...' 
        : textoTraducido;

      this.leyendaSeleccionada.traducciones[codigoIdioma] = {
        corta: cortaTrad,
        completa: textoTraducido
      };
    } else {
      this.idiomaActivo = 'es';
      this.mostrarMensaje('No se pudo traducir en este momento.', 'warning');
    }

    this.traduciendoTexto = false;
    this.cdr.detectChanges();
  }

  toggleAudio() {
    if (this.leyendoAudio) {
      this.detenerAudio();
    } else {
      void this.reproducirAudio();
    }
  }

  async reproducirAudio() {
    this.detenerAudio();

    const textoALeer = this.leyendaSeleccionada.traducciones[this.idiomaActivo]?.completa || '';
    if (!textoALeer.trim()) return;

    const token = ++this.tokenAudio;
    const confIdioma = this.idiomasDisponibles.find(i => i.codigo === this.idiomaActivo);
    const vozObjetivo = confIdioma ? confIdioma.voz : 'es-CL';
    const usarBackend = () => this.reproducirConBackend(textoALeer, vozObjetivo, token);

    // 1. Voz nativa SOLO con voces cargadas. Si no hay voces, speak() calla sin avisar.
    const nativo = typeof window !== 'undefined'
      && !!(window as any).speechSynthesis
      && typeof (window as any).SpeechSynthesisUtterance !== 'undefined';

    let voces: SpeechSynthesisVoice[] = [];
    if (nativo) {
      try { voces = window.speechSynthesis.getVoices() || []; } catch { voces = []; }
    }
    const prefijo = vozObjetivo.split('-')[0];
    const mejorVoz = voces.find(v => v.lang === vozObjetivo) || voces.find(v => v.lang.startsWith(prefijo));

    if (nativo && mejorVoz) {
      try {
        const oraciones = textoALeer.match(/[^.!?]+[.!?]+/g) || [textoALeer];
        let indiceOracion = 0;
        let activo = true;
        let iniciado = false;
        this.audioActual = null;

        const limpiarTimer = () => {
          if (this.audioFallbackTimer !== null) {
            clearTimeout(this.audioFallbackTimer);
            this.audioFallbackTimer = null;
          }
        };

        const hablarSiguiente = () => {
          if (token !== this.tokenAudio || !activo) return;
          if (indiceOracion >= oraciones.length) {
            if (token === this.tokenAudio) this.finalizarAudio();
            return;
          }
          const mensaje = new SpeechSynthesisUtterance(oraciones[indiceOracion].trim());
          mensaje.lang = vozObjetivo;
          mensaje.voice = mejorVoz;
          mensaje.onstart = () => { iniciado = true; limpiarTimer(); };
          mensaje.onend = () => { indiceOracion++; hablarSiguiente(); };
          mensaje.onerror = () => {
            activo = false;
            if (token !== this.tokenAudio) return;
            limpiarTimer();
            this.finalizarAudio();
            void usarBackend();
          };
          window.speechSynthesis.speak(mensaje);
        };

        this.leyendoAudio = true;
        this.cdr.detectChanges();
        hablarSiguiente();

        this.audioFallbackTimer = setTimeout(() => {
          if (iniciado || token !== this.tokenAudio) return;
          console.warn('La voz nativa no inició; usando MP3 del backend...');
          activo = false;
          try { (window as any).speechSynthesis.cancel(); } catch { /* ignora */ }
          limpiarTimer();
          void usarBackend();
        }, 1800);
        return;
      } catch (error) {
        console.warn('Voz nativa no disponible, usando respaldo del backend...', error);
      }
    }

    await usarBackend();
  }

  private async reproducirConBackend(texto: string, voz: string, token: number) {
    try {
      if (token !== this.tokenAudio) return;
      this.leyendoAudio = true;
      this.cdr.detectChanges();

      const blob = await firstValueFrom(this.api.sintetizarVoz(texto, voz));
      if (token !== this.tokenAudio) return;

      this.urlAudioActual = URL.createObjectURL(blob);
      const audio = new Audio(this.urlAudioActual);
      this.audioActual = audio;
      audio.onended = () => { if (token === this.tokenAudio) this.finalizarAudio(); };
      audio.onerror = () => {
        if (token !== this.tokenAudio) return;
        this.finalizarAudio();
        this.mostrarMensaje('No se pudo reproducir el audio.');
      };
      await audio.play();
    } catch (error) {
      console.warn('Error reproduciendo audio:', error);
      if (token === this.tokenAudio) {
        this.finalizarAudio();
        this.mostrarMensaje('No se pudo reproducir el audio en este dispositivo.');
      }
    }
  }

  private finalizarAudio() {
    if (this.audioFallbackTimer !== null) {
      clearTimeout(this.audioFallbackTimer);
      this.audioFallbackTimer = null;
    }
    this.leyendoAudio = false;
    if (this.urlAudioActual) {
      URL.revokeObjectURL(this.urlAudioActual);
      this.urlAudioActual = null;
    }
    this.audioActual = null;
    this.cdr.detectChanges();
  }

  detenerAudio() {
    // Se llama antes de traducir y al abrir tarjetas: no puede lanzar excepciones.
    this.tokenAudio++;
    try {
      if (typeof window !== 'undefined' && (window as any).speechSynthesis) {
        (window as any).speechSynthesis.cancel();
      }
    } catch (error) {
      console.warn('No se pudo detener la voz nativa:', error);
    }
    if (this.audioActual) {
      try {
        this.audioActual.pause();
        this.audioActual.currentTime = 0;
      } catch (error) {
        console.warn('No se pudo detener el audio:', error);
      }
    }
    this.finalizarAudio();
  }

  get idiomasPermitidos(): any[] {
    const plan = this.planNormalizado;
    if (plan.includes('viajero')) {
      return this.idiomasDisponibles; 
    } else if (plan.includes('explorador')) {
      return this.idiomasDisponibles.filter(i => ['es', 'en', 'pt'].includes(i.codigo));
    } else {
      return this.idiomasDisponibles.filter(i => ['es', 'en'].includes(i.codigo)); 
    }
  }
}