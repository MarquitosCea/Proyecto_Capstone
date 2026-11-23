import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router'; 
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, 
  IonButton, IonIcon, IonRow, IonCol, IonChip,
  IonSearchbar, IonList, IonItem, IonLabel, IonButtons,
  IonFab, IonFabButton, IonFabList, MenuController, ActionSheetController, IonSpinner, LoadingController, AlertController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  bookOutline, moonOutline, navigateOutline, volumeHighOutline, volumeMuteOutline, 
  menuOutline, sunnyOutline, locationOutline, micOutline, mic, 
  mapOutline, footstepsOutline, shuffleOutline, locateOutline, closeOutline,
  colorPaletteOutline, leafOutline, businessOutline, languageOutline, waterOutline, lockClosed, checkmark, refreshOutline, close
} from 'ionicons/icons';
import * as L from 'leaflet';
import { NgIf, NgClass, NgFor } from '@angular/common';
import { CapacitorHttp } from '@capacitor/core';
import { firstValueFrom, timeout } from 'rxjs';
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
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonRow, IonCol, NgIf, NgClass, NgFor, IonChip,
    IonSearchbar, IonList, IonItem, IonLabel, IonButtons,
    IonFab, IonFabButton, IonFabList, IonSpinner
  ]
})
export class HomePage implements OnInit, OnDestroy {
  private map!: L.Map;
  private marcadoresLayer!: L.LayerGroup;
  private rutasLayer!: L.LayerGroup;
  private userMarker: L.Marker | null = null; 
  private resizeObserver: ResizeObserver | null = null;
  private debeIniciarMapa: boolean = false;
  private vistaVisible: boolean = false;
  
  mostrarTarjeta: boolean = false;
  mostrarHistoriaCompleta: boolean = false;
  navegando: boolean = false; 
  esManual: boolean = false; 
  esServicio: boolean = false; 
  
  listaLugares: any[] = [];
  lugaresFiltrados: any[] = [];
  textoBuscado: string = '';
  escuchando: boolean = false;
  filtroActivo: string = 'todos';

  idiomaActivo: string = 'es'; 
  traduciendoTexto: boolean = false;
  leyendoAudio: boolean = false; 
  private audioActual: HTMLAudioElement | null = null;
  private urlAudioActual: string | null = null;
  private audioFallbackTimer: any = null;
  private tokenAudio: number = 0;
  
  tipoPlanUsuario: string = 'observador'; 
  
  idiomasDisponibles = [
    { codigo: 'es', nombre: 'Español', voz: 'es-CL' },
    { codigo: 'en', nombre: 'English', voz: 'en-US' },
    { codigo: 'pt', nombre: 'Português', voz: 'pt-BR' },
    { codigo: 'fr', nombre: 'Français', voz: 'fr-FR' },
    { codigo: 'de', nombre: 'Deutsch', voz: 'de-DE' },
    { codigo: 'zh', nombre: '中文 (Mandarin)', voz: 'zh-CN' }
  ];

  textosUI: any = {
    'es': { servicio: 'Servicio de Utilidad', panorama: 'Panorama Encontrado', a: 'A', metros: 'metros.', leerMenos: 'LEER MENOS', leerMas: 'LEER MÁS', viajar: 'VIAJAR', detenerAudio: 'Detener Audio', escucharEn: 'Escuchar en', cerrar: 'CERRAR' },
    'en': { servicio: 'Utility Service', panorama: 'Found Landmark', a: 'At', metros: 'meters.', leerMenos: 'READ LESS', leerMas: 'READ MORE', viajar: 'TRAVEL', detenerAudio: 'Stop Audio', escucharEn: 'Listen in', cerrar: 'CLOSE CARD' },
    'pt': { servicio: 'Serviço de Utilidade', panorama: 'Marco Encontrado', a: 'A', metros: 'metros.', leerMenos: 'LER MENOS', leerMas: 'LER MAIS', viajar: 'VIAJAR', detenerAudio: 'Parar Áudio', escucharEn: 'Ouvir em', cerrar: 'FECHAR CARTÃO' },
    'fr': { servicio: 'Service d\'Utilité', panorama: 'Repère Trouvé', a: 'À', metros: 'mètres.', leerMenos: 'LIRE MOINS', leerMas: 'LIRE PLUS', viajar: 'VOYAGER', detenerAudio: 'Arrêter l\'audio', escucharEn: 'Écouter en', cerrar: 'FERMER LA CARTE' },
    'de': { servicio: 'Versorgungsdienst', panorama: 'Gefundenes Wahrzeichen', a: 'In', metros: 'Metern.', leerMenos: 'WENIGER LESEN', leerMas: 'MEHR LESEN', viajar: 'REISEN', detenerAudio: 'Audio stoppen', escucharEn: 'Hören auf', cerrar: 'KARTE SCHLIESSEN' },
    'zh': { servicio: '公用事业服务', panorama: '发现地标', a: '距离', metros: '米。', leerMenos: '阅读更少', leerMas: '阅读更多', viajar: '旅行', detenerAudio: '停止音频', escucharEn: '收听', cerrar: '关闭卡片' }
  };

  lugarSeleccionado: any = { 
    titulo: '', distancia: 0, lat: 0, lon: 0, imagen: null,
    traducciones: {} 
  };

  private get planNormalizado(): string {
    return (this.tipoPlanUsuario || 'observador').toLowerCase().trim();
  }

  constructor(
    private cdr: ChangeDetectorRef, 
    private router: Router, 
    private menuCtrl: MenuController,
    private actionSheetCtrl: ActionSheetController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private api: ApiService,
  ) {
    addIcons({ 
      bookOutline, moonOutline, navigateOutline, volumeHighOutline, volumeMuteOutline, 
      menuOutline, sunnyOutline, locationOutline, micOutline, mic, 
      mapOutline, footstepsOutline, shuffleOutline, locateOutline, closeOutline,
      colorPaletteOutline, leafOutline, businessOutline, languageOutline, waterOutline,
      lockClosed, checkmark, refreshOutline, close
    });

    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state) {
      this.esManual = nav.extras.state['manual'] === true;
    }
  }

  ionViewWillEnter() {
    const planGuardado = localStorage.getItem('tipo_plan');
    if (planGuardado) {
      this.tipoPlanUsuario = planGuardado.toLowerCase();
    }
    this.cdr.detectChanges();
  }

  ionViewDidEnter() {
    // El mapa se crea aquí, cuando el contenedor ya es visible y tiene tamaño real.
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
    const planGuardado = localStorage.getItem('tipo_plan');
    if (planGuardado) {
      this.tipoPlanUsuario = planGuardado.toLowerCase();
    }

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

  async mostrarMensaje(msj: string, color: string = 'light') {
    const titulos: any = {
      warning: 'Aviso',
      danger: 'Atención',
      success: 'Todo listo',
      light: 'GeoNyx'
    };
    const alerta = await this.alertCtrl.create({
      header: titulos[color] || 'GeoNyx',
      message: msj,
      buttons: [{ text: 'Entendido', role: 'cancel' }]
    });
    await alerta.present();
  }

  async verificarHorario() {
    const hora = await this.api.obtenerHoraReal();
    
    if (hora >= 20 || hora < 6) {
      if (!this.esManual) {
        this.mostrarMensaje('Es de noche. Entrando al Modo Misterio...', 'warning');
        this.router.navigate(['/misterio']);
        return;
      }
    }
    
    this.debeIniciarMapa = true;
    this.iniciarMapaSiCorresponde();
  }

  async irAMisterio() {
    const horaActual = new Date().getHours();
    const esDeNoche = horaActual >= 20 || horaActual < 8;

    if (this.planNormalizado.includes('observador') && !esDeNoche) {
      await this.verificarPremium('el Cambio Manual a Modo Misterio durante el día');
      return;
    }

    this.router.navigate(['/misterio'], { state: { manual: true } });
  }

  initMap() {
    if (this.map) return;

    try {
      this.map = L.map('map-container', {
        tapTolerance: 15
      }).setView([-33.4915, -70.7190], 15);
    } catch (error) {
      console.error('No se pudo inicializar el mapa histórico:', error);
      this.debeIniciarMapa = true;
      return;
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
      attribution: '© OpenStreetMap' 
    }).addTo(this.map);

    this.marcadoresLayer = L.layerGroup().addTo(this.map);
    this.rutasLayer = L.layerGroup().addTo(this.map);

    const mapEl = document.getElementById('map-container');
    if (mapEl && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.map) this.map.invalidateSize(true);
      });
      this.resizeObserver.observe(mapEl);
    }

    setTimeout(() => { if (this.map) this.map.invalidateSize(true); }, 300);
    setTimeout(() => { if (this.map) this.map.invalidateSize(true); }, 900);
    this.map.locate({ enableHighAccuracy: true, timeout: 7000 });

    this.map.on('locationfound', (e) => {
      if (this.map) {
        this.map.invalidateSize(true); 
        this.map.setView(e.latlng, 15);
      }
      this.colocarMarcadorUsuario(e.latlng);
      this.buscarLugaresWikipedia(e.latlng.lat, e.latlng.lng);
    });

    this.map.on('locationerror', () => {
      const fallbackCoords = L.latLng(-33.4915, -70.7190);
      this.colocarMarcadorUsuario(fallbackCoords);
      this.buscarLugaresWikipedia(fallbackCoords.lat, fallbackCoords.lng);
    });
  }

  private colocarMarcadorUsuario(latlng: L.LatLng) {
    const iconoUbicacion = L.divIcon({
      className: 'icono-ubicacion-limpio',
      html: `<div class="pulso-ubicacion"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -15] 
    });
    
    if (this.userMarker) {
      this.userMarker.setLatLng(latlng);
    } else {
      this.userMarker = L.marker(latlng, { icon: iconoUbicacion })
        .addTo(this.map)
        .bindPopup('<b style="color: #333131; font-size: 14px;">¡Estás aquí!</b>');
    }
  }

  centrarMapaEnUsuario() {
    if (this.userMarker) {
      const latLng = this.userMarker.getLatLng();
      this.map.flyTo(latLng, 16, { animate: true, duration: 0.5 });
      this.userMarker.openPopup();
    } else {
      this.mostrarMensaje('Aún no hemos detectado tu ubicación.');
    }
  }

  async buscarLugaresWikipedia(lat: number, lon: number) {
    const loading = await this.loadingCtrl.create({
      spinner: null, 
      cssClass: 'loading-geonyx',
      message: 'Buscando historias cercanas...'
    });
    await loading.present();

    const urlGeo = `https://es.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=20&format=json&origin=*`;
    
    try {
      const resNativa = await CapacitorHttp.get({ url: urlGeo });
      const data = typeof resNativa.data === 'string' ? JSON.parse(resNativa.data) : resNativa.data;
      if (!data?.query?.geosearch) return;
      
      this.listaLugares = data.query.geosearch.map((lugar: any) => {
        let cat = 'otros';
        const titulo = lugar.title.toLowerCase();
        
        if (titulo.includes('museo') || titulo.includes('galería') || titulo.includes('centro cultural')) cat = 'museo';
        else if (titulo.includes('parque') || titulo.includes('cerro') || titulo.includes('plaza')) cat = 'parque';
        else if (titulo.includes('palacio') || titulo.includes('monumento') || titulo.includes('iglesia')) cat = 'monumento';

        return { ...lugar, categoria: cat };
      });

      this.aplicarFiltro('todos');
    } catch (error) {
      console.error("Error buscando en Wikipedia:", error);
    } finally {
      await loading.dismiss();
    }
  }

  aplicarFiltro(categoria: string) {
    this.filtroActivo = categoria;
    this.marcadoresLayer.clearLayers();

    const lugaresMostrar = categoria === 'todos' 
      ? this.listaLugares 
      : this.listaLugares.filter(l => l.categoria === categoria);

    const crearIcono = (titulo: string) => L.divIcon({
      className: 'marcador-historico',
      html: `<button type="button" class="marcador-historico-btn" aria-label="Abrir ${String(titulo).replace(/"/g, '&quot;')}"><img src="assets/icon/libro.png" alt="" draggable="false" /></button>`,
      iconSize: [46, 46],
      iconAnchor: [23, 23],
      popupAnchor: [0, -23]
    });

    lugaresMostrar.forEach((lugar: any) => {
      const marker = L.marker([lugar.lat, lugar.lon], { 
        icon: crearIcono(lugar.title),
        interactive: true,
        bubblingMouseEvents: false,
        keyboard: true
      }).addTo(this.marcadoresLayer);

      let ultimaApertura = 0;
      const abrirLugar = () => {
        const ahora = Date.now();
        if (ahora - ultimaApertura < 500) return; // evita doble disparo (click del botón + click de Leaflet)
        ultimaApertura = ahora;
        if (this.map) this.map.flyTo([lugar.lat, lugar.lon], 16, { animate: true, duration: 0.5 });
        this.cargarHistoriaLugar(lugar.pageid, lugar.title, Math.round(lugar.dist || 0), lugar.lat, lugar.lon);
      };

      marker.on('click', abrirLugar);

      // Botón real dentro del ícono: el WebView de Android responde mejor a click que a touchend.
      const boton = marker.getElement()?.querySelector('.marcador-historico-btn');
      if (boton) {
        boton.addEventListener('click', (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
          abrirLugar();
        });
      }
    });

    this.cdr.detectChanges();
  }

  async buscarBanos() {
    const tienePermiso = await this.verificarPremium('los Filtros de Supervivencia Urbana');
    if (!tienePermiso) return; 

    if (!this.userMarker) {
      this.mostrarMensaje('Esperando a obtener tu ubicación actual...');
      return;
    }

    this.filtroActivo = 'banos';
    this.marcadoresLayer.clearLayers();

    const miLat = this.userMarker.getLatLng().lat;
    const miLng = this.userMarker.getLatLng().lng;

    const loading = await this.loadingCtrl.create({
      spinner: null,
      cssClass: 'loading-geonyx',
      message: 'Buscando baños cercanos...'
    });
    await loading.present();

    try {
      let data: any;
      try {
        // Primero el backend; si Render no alcanza Overpass, se usa el plugin nativo.
        data = await firstValueFrom(this.api.getBanos(miLat, miLng).pipe(timeout(18000)));
      } catch (errorBackend) {
        console.warn('Backend /banos no respondió, usando Overpass directo:', errorBackend);
        const consulta =
          `[out:json][timeout:25];` +
          `(nwr["amenity"="toilets"](around:4000,${miLat},${miLng});` +
          `nwr["amenity"="fuel"](around:4000,${miLat},${miLng});` +
          `nwr["shop"="mall"](around:4000,${miLat},${miLng}););out center;`;
        const url = 'https://ovp.dresel.systems/api-sa/interpreter?data=' + encodeURIComponent(consulta);
        const resNativa = await CapacitorHttp.get({
          url,
          headers: { 'User-Agent': 'GeoNyx/1.0', 'Accept': 'application/json' }
        });
        data = typeof resNativa.data === 'string' ? JSON.parse(resNativa.data) : resNativa.data;
      }

      if (data?.elements && data.elements.length > 0) {
        const iconoBano = L.divIcon({
          className: 'icono-bano-publico',
          html: `<div style="font-size: 20px; background: white; border-radius: 50%; width: 35px; height: 35px; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🚽</div>`,
          iconSize: [35, 35],
          iconAnchor: [17, 17]
        });

        let pinesDibujados = 0;

        data.elements.forEach((lugar: any) => {
          const lat = lugar.lat || lugar.center?.lat;
          const lon = lugar.lon || lugar.center?.lon;
          
          if (lat && lon) {
            const marker = L.marker([lat, lon], { icon: iconoBano, interactive: true }).addTo(this.marcadoresLayer);
            
            let tipoLugar = 'Baño Público';
            if (lugar.tags?.amenity === 'fuel') tipoLugar = 'Estación de Servicio (Baño)';
            if (lugar.tags?.shop === 'mall') tipoLugar = 'Centro Comercial (Baño)';
            const nombre = lugar.tags?.name || tipoLugar;
            
            let nota = 'Servicio disponible cercano.';
            if (tipoLugar.includes('Servicio') || tipoLugar.includes('Comercial')) {
              nota = '<strong style="color:#f39c12;">Atención:</strong> Puede requerir ser cliente para usar los baños.';
            }

            const abrirBano = () => {
              this.map.flyTo([lat, lon], 16, { animate: true, duration: 0.5 });
              this.abrirDetalleServicio(nombre, nota, lat, lon);
            };

            marker.on('click', abrirBano);
            const el = marker.getElement();
            if (el) {
              el.addEventListener('touchend', (ev: TouchEvent) => {
                ev.stopPropagation();
                abrirBano();
              }, { passive: true });
            }

            pinesDibujados++;
          }
        });

        if (pinesDibujados > 0) {
          this.map.setView([miLat, miLng], 13);
        }
      } else {
        this.mostrarMensaje('No se encontraron servicios ni baños públicos en un radio de 4km.');
        this.aplicarFiltro('todos'); 
      }
    } catch (error) {
      console.error("Error buscando servicios en Overpass:", error);
      this.mostrarMensaje('No pudimos cargar los baños cercanos.\nRevisa tu conexión e inténtalo de nuevo.');
      this.aplicarFiltro('todos'); 
    } finally {
      await loading.dismiss();
    }
  }

  abrirDetalleServicio(nombre: string, descripcion: string, lat: number, lon: number) {
    this.detenerAudio();
    this.esServicio = true; 
    
    const miLat = this.userMarker!.getLatLng().lat;
    const miLng = this.userMarker!.getLatLng().lng;
    const dist = Math.round(this.map.distance([miLat, miLng], [lat, lon]));

    this.lugarSeleccionado = { 
      titulo: nombre, 
      historiaCorta: descripcion, 
      distancia: dist, lat: lat, lon: lon,
      imagen: null
    };
    
    this.mostrarTarjeta = true;
    this.cdr.detectChanges(); 
  }

  async cargarHistoriaLugar(pageid: number, titulo: string, distancia: number, lat: number, lon: number) {
    this.detenerAudio();
    this.mostrarHistoriaCompleta = false;
    this.idiomaActivo = 'es'; 
    this.esServicio = false; 
    this.mostrarTarjeta = false; 

    // Abrimos la tarjeta de inmediato para que el toque nunca parezca ignorado.
    this.lugarSeleccionado = {
      titulo: titulo, distancia: distancia, lat: lat, lon: lon, imagen: null,
      traducciones: {
        'es': { corta: 'Cargando archivo histórico...', completa: 'Cargando archivo histórico...' }
      }
    };
    this.mostrarTarjeta = true;
    this.cdr.detectChanges();

    try {
      // Wikipedia se consulta en el backend: el teléfono no siempre puede acceder directo.
      const datos: any = await firstValueFrom(this.api.getWikipedia(pageid));
      const historiaTexto = datos.extracto || 'No existen registros detallados.';
      const textoLimpio = historiaTexto.replace(/\n/g, ' ').trim();
      const historiaCorta = textoLimpio.length > 100
        ? textoLimpio.substring(0, 100) + '...'
        : textoLimpio;

      this.lugarSeleccionado = {
        titulo: titulo, distancia: distancia, lat: lat, lon: lon, imagen: datos.imagen || null,
        traducciones: {
          'es': { corta: historiaCorta, completa: textoLimpio }
        }
      };
    } catch (error) {
      console.warn('No se pudo cargar el extracto de Wikipedia:', error);
      this.lugarSeleccionado = {
        titulo: titulo, distancia: distancia, lat: lat, lon: lon, imagen: null,
        traducciones: {
          'es': {
            corta: 'No se pudo cargar el archivo histórico. Revisa tu conexión.',
            completa: 'No se pudo cargar el archivo histórico. Revisa tu conexión.'
          }
        }
      };
    } finally {
      this.cdr.detectChanges();
    }
  }

  async abrirMenuIdiomas() {
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

    if (this.lugarSeleccionado.traducciones[codigoIdioma]) {
      this.cdr.detectChanges();
      return;
    }

    this.traduciendoTexto = true;
    this.cdr.detectChanges();

    const textoBase = this.lugarSeleccionado?.traducciones?.['es']?.completa || '';
    let textoTraducido = '';

    // El backend se encarga de MyMemory/Google y de dividir el texto en trozos.
    try {
      const datos: any = await firstValueFrom(this.api.traducir(textoBase, codigoIdioma));
      textoTraducido = datos?.texto || '';
    } catch (error) {
      console.warn('Fallo el servicio de traducción:', error);
    }

    if (textoTraducido) {
      let cortaTrad = textoTraducido;
      if (textoTraducido.length > 100) {
        cortaTrad = textoTraducido.substring(0, 100) + '...';
      }
      this.lugarSeleccionado.traducciones[codigoIdioma] = {
        corta: cortaTrad,
        completa: textoTraducido
      };
    } else {
      this.lugarSeleccionado.traducciones[codigoIdioma] = {
        corta: 'No se pudo traducir.', completa: 'No se pudo traducir en este momento.'
      };
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

    const textoALeer = this.lugarSeleccionado.traducciones[this.idiomaActivo]?.completa || '';
    if (!textoALeer.trim()) return;

    const token = ++this.tokenAudio;
    const confIdioma = this.idiomasDisponibles.find(i => i.codigo === this.idiomaActivo);
    const vozObjetivo = confIdioma ? confIdioma.voz : 'es-CL';
    const usarBackend = () => this.reproducirConBackend(textoALeer, vozObjetivo, token);

    // 1. Voz nativa SOLO si el WebView tiene voces cargadas. En Android suele
    //    tener speechSynthesis pero getVoices() devuelve [] y speak() no hace nada.
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
        const mensaje = new SpeechSynthesisUtterance(textoALeer);
        mensaje.lang = vozObjetivo;
        mensaje.voice = mejorVoz;

        let iniciado = false;
        const limpiarTimer = () => {
          if (this.audioFallbackTimer !== null) {
            clearTimeout(this.audioFallbackTimer);
            this.audioFallbackTimer = null;
          }
        };

        mensaje.onstart = () => { iniciado = true; limpiarTimer(); };
        mensaje.onend = () => {
          if (token !== this.tokenAudio) return;
          limpiarTimer();
          this.finalizarAudio();
        };
        mensaje.onerror = () => {
          if (token !== this.tokenAudio) return;
          limpiarTimer();
          this.finalizarAudio();
          void usarBackend();
        };

        this.leyendoAudio = true;
        this.cdr.detectChanges();
        window.speechSynthesis.speak(mensaje);

        // Si la voz nativa ni siquiera llega a "start", cambiamos al MP3 del backend.
        this.audioFallbackTimer = setTimeout(() => {
          if (iniciado || token !== this.tokenAudio) return;
          console.warn('La voz nativa no inició; usando MP3 del backend...');
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
    // NUNCA lanzar excepción aquí: se llama antes de abrir tarjetas y antes de traducir.
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

  toggleHistoria() {
    this.mostrarHistoriaCompleta = !this.mostrarHistoriaCompleta;
    this.cdr.detectChanges();
  }

  cerrarTarjeta() {
    this.detenerAudio();
    this.mostrarTarjeta = false;
    this.cdr.detectChanges(); 
  }

  // --- CÁLCULO NATIVO DE RUTAS PEATONALES Y ALTERNATIVAS ---

  private async trazarRutasPeatonales(waypoints: L.LatLng[], nombreTour: string) {
    if (!this.map || !this.rutasLayer) return;
    this.rutasLayer.clearLayers();

    const loading = await this.loadingCtrl.create({
      spinner: null,
      cssClass: 'loading-geonyx',
      message: `Calculando ${nombreTour}...`
    });
    await loading.present();

    const coordsStr = waypoints.map(p => `${p.lng},${p.lat}`).join(';');

    try {
      // OSRM se consulta desde el backend: desde el APK fallaba de forma intermitente.
      const data: any = await firstValueFrom(this.api.getRutas(coordsStr));

      if (!data?.routes?.length) {
        // Sin servicio de rutas: al menos mostramos la guía directa entre los puntos.
        L.polyline(waypoints, { color: '#7c4dff', weight: 5, dashArray: '10, 10' }).addTo(this.rutasLayer);
        this.map.fitBounds(L.latLngBounds(waypoints), { padding: [50, 50] });
        this.navegando = true;
        this.mostrarMensaje(`${nombreTour}\n\nRuta directa estimada.\nEl servicio de rutas no respondió.`);
        return;
      }

      if (data.routes.length > 1) {
        L.geoJSON(data.routes[1].geometry, {
          style: { color: '#7c4dff', weight: 5, opacity: 0.75, dashArray: '10, 10' }
        }).addTo(this.rutasLayer);
      }

      const capaPrincipal = L.geoJSON(data.routes[0].geometry, {
        style: { color: '#2979ff', weight: 6, opacity: 0.95 }
      }).addTo(this.rutasLayer);

      this.map.fitBounds(capaPrincipal.getBounds(), { padding: [50, 50] });
      this.navegando = true;

      const distKm = (data.routes[0].distance / 1000).toFixed(2);
      const minCamino = Math.max(1, Math.round(data.routes[0].duration / 60));
      const infoAlt = data.routes.length > 1 ? '\nRuta alternativa: trazo morado.' : '';

      this.mostrarMensaje(
        `${nombreTour}\n\nDistancia: ${distKm} km\nTiempo estimado: ~${minCamino} min caminando.${infoAlt}`
      );
    } catch (error) {
      console.error('Error trazando rutas:', error);
      this.mostrarMensaje('No se pudo calcular la ruta. Revisa tu conexión a internet.');
    } finally {
      await loading.dismiss();
      this.cdr.detectChanges();
    }
  }

  iniciarNavegacion(destinoLat: number, destinoLng: number) {
    if (!this.userMarker) { 
      this.mostrarMensaje('Esperando a obtener tu ubicación actual...'); 
      return; 
    }
    const miLat = this.userMarker.getLatLng().lat;
    const miLng = this.userMarker.getLatLng().lng;

    this.cerrarTarjeta(); 
    this.trazarRutasPeatonales(
      [L.latLng(miLat, miLng), L.latLng(destinoLat, destinoLng)],
      'Ruta hacia destino'
    );
  }

  async generarTourDinamico() {
    const tienePermiso = await this.verificarPremium('los Tours Dinámicos Generativos');
    if (!tienePermiso) return;

    if (!this.userMarker) { 
      this.mostrarMensaje('Esperando a obtener tu ubicación actual...'); 
      return; 
    }
    if (this.listaLugares.length === 0) {
      this.mostrarMensaje('Aún no hay lugares cargados alrededor.');
      return;
    }

    const miLat = this.userMarker.getLatLng().lat;
    const miLng = this.userMarker.getLatLng().lng;
    const puntosNavegacion = [L.latLng(miLat, miLng)];

    const lugaresCercanos = [...this.listaLugares].sort((a, b) => a.dist - b.dist).slice(0, 3); 
    lugaresCercanos.forEach((lugar: any) => puntosNavegacion.push(L.latLng(lugar.lat, lugar.lon)));

    this.trazarRutasPeatonales(puntosNavegacion, 'Tour de Lugares Cercanos');
  }

  async generarTourSorpresa() {
    const tienePermiso = await this.verificarPremium('los Tours Sorpresa');
    if (!tienePermiso) return;

    if (!this.userMarker) { 
      this.mostrarMensaje('Esperando a obtener tu ubicación actual...'); 
      return; 
    }
    if (this.listaLugares.length === 0) {
      this.mostrarMensaje('Aún no hay lugares cargados alrededor.');
      return;
    }

    const miLat = this.userMarker.getLatLng().lat;
    const miLng = this.userMarker.getLatLng().lng;
    const puntosNavegacion = [L.latLng(miLat, miLng)];

    const lugaresAzar = [...this.listaLugares].sort(() => 0.5 - Math.random()).slice(0, 3);
    lugaresAzar.forEach((lugar: any) => puntosNavegacion.push(L.latLng(lugar.lat, lugar.lon)));

    this.trazarRutasPeatonales(puntosNavegacion, 'Tour Alternativo Sorpresa');
  }

  cancelarNavegacion() {
    if (this.rutasLayer) {
      this.rutasLayer.clearLayers();
    }
    this.navegando = false;
    this.centrarMapaEnUsuario();
    this.cdr.detectChanges();
  }

  buscarHistoria(event: any) {
    this.textoBuscado = event.target.value.toLowerCase();
    this.filtrarLugares();
  }

  filtrarLugares() {
    if (this.textoBuscado && this.textoBuscado.trim() !== '') {
      this.lugaresFiltrados = this.listaLugares.filter((lugar: any) => lugar.title.toLowerCase().includes(this.textoBuscado));
    } else {
      this.lugaresFiltrados = [];
    }
    this.cdr.detectChanges();
  }

  iniciarReconocimientoVoz() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { 
      this.mostrarMensaje('Tu dispositivo no soporta búsqueda por voz.'); 
      return; 
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CL';
    recognition.continuous = false;

    recognition.onstart = () => { this.escuchando = true; this.cdr.detectChanges(); };
    recognition.onresult = (event: any) => { this.textoBuscado = event.results[0][0].transcript; this.filtrarLugares(); };
    recognition.onerror = () => { this.escuchando = false; this.cdr.detectChanges(); };
    recognition.onend = () => { this.escuchando = false; this.cdr.detectChanges(); };
    recognition.start();
  }

  seleccionarLugarBuscador(lugar: any) {
    this.lugaresFiltrados = []; 
    this.textoBuscado = '';
    this.map.flyTo([lugar.lat, lugar.lon], 16, { animate: true, duration: 0.5 });
    this.cargarHistoriaLugar(lugar.pageid, lugar.title, Math.round(lugar.dist || 0), lugar.lat, lugar.lon);
  }

  async refrescarHistorias() {
    const loading = await this.loadingCtrl.create({
      message: 'Actualizando ubicación y mapa...',
      spinner: null, 
      cssClass: 'loading-geonyx',
      duration: 8000 
    });
    await loading.present();

    try {
      this.marcadoresLayer.clearLayers();
      this.rutasLayer.clearLayers();
      this.listaLugares = [];
      this.lugaresFiltrados = [];
      this.textoBuscado = '';
      this.cerrarTarjeta();
      this.navegando = false;

      this.map.invalidateSize(true);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const nuevaLat = position.coords.latitude;
          const nuevaLon = position.coords.longitude;

          this.colocarMarcadorUsuario(L.latLng(nuevaLat, nuevaLon));
          this.map.flyTo([nuevaLat, nuevaLon], 15, { animate: true, duration: 1 });

          await this.buscarLugaresWikipedia(nuevaLat, nuevaLon);
          await loading.dismiss();
        },
        async (error) => {
          console.error("Error obteniendo GPS:", error);
          await loading.dismiss();
          const alert = await this.alertCtrl.create({
            header: 'Sin señal GPS',
            message: 'No pudimos actualizar tu ubicación. Verifica que el GPS esté encendido.',
            buttons: ['OK']
          });
          await alert.present();
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } catch (error) {
      console.error("Error fatal al refrescar:", error);
      await loading.dismiss();
    }
  }

  abrirMenu() {
    this.menuCtrl.open();
  }
}