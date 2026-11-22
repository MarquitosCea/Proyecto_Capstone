import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  colorPaletteOutline, leafOutline, businessOutline, languageOutline, waterOutline, lockClosed, checkmark, refreshOutline
} from 'ionicons/icons';
import * as L from 'leaflet';
import { NgIf, NgClass, NgFor } from '@angular/common';
import 'leaflet-routing-machine';
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
export class HomePage implements OnInit {
  private map!: L.Map;
  private marcadoresLayer!: L.LayerGroup;
  private controlRuta: L.Routing.Control | null = null;
  private userMarker: L.Marker | null = null; 
  
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
      lockClosed, checkmark , refreshOutline
    });

    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state) {
      this.esManual = nav.extras.state['manual'] === true;
    }
  }

  ngOnInit() {
    const planGuardado = localStorage.getItem('tipo_plan');
    if (planGuardado) {
      this.tipoPlanUsuario = planGuardado;
    }

    if (this.esManual) {
      this.initMap();
    } else {
      this.verificarHorario();
    }
  }

  async verificarPremium(funcionDestacada: string): Promise<boolean> {
    if (this.tipoPlanUsuario !== 'observador') {
      return true; 
    }

    const alert = await this.alertCtrl.create({
      header: 'Función Premium ',
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
    const toast = await this.alertCtrl.create({ message: msj, buttons: ['OK'] });
    await toast.present();
  }

  async verificarHorario() {
    const hora = await this.api.obtenerHoraReal();
    
    // De noche (20:00 a 06:00) se bloquea o redirige a misterio
    if (hora >= 20 || hora < 6) {
      if (!this.esManual) {
        this.mostrarMensaje('Es de noche. Entrando al Modo Misterio...', 'warning');
        this.router.navigate(['/misterio']);
        return;
      }
    }
    
    // De día (06:00 a 20:00) inicializa el mapa normalmente
    this.initMap();
  }

  async irAMisterio() {
    const horaActual = new Date().getHours();
    const esDeNoche = horaActual >= 20 || horaActual < 8;

    if (this.tipoPlanUsuario === 'observador' && !esDeNoche) {
      await this.verificarPremium('el Cambio Manual a Modo Misterio durante el día');
      return;
    }

    this.router.navigate(['/misterio'], { state: { manual: true } });
  }

  initMap() {
    this.map = L.map('map-container').setView([-33.4915, -70.7190], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
      attribution: '© OpenStreetMap' 
    }).addTo(this.map);

    this.marcadoresLayer = L.layerGroup().addTo(this.map);

    setTimeout(() => { this.map.invalidateSize(); }, 400);
    this.map.locate();

    this.map.on('locationfound', (e) => {
      setTimeout(() => { 
        this.map.invalidateSize(); 
        window.dispatchEvent(new Event('resize')); 
      }, 800);
      
      const iconoUbicacion = L.divIcon({
        className: 'icono-ubicacion-limpio',
        html: `<div class="pulso-ubicacion"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -15] 
      });
      
      this.userMarker = L.marker(e.latlng, { icon: iconoUbicacion })
        .addTo(this.map)
        .bindPopup('<b style="color: #333131; font-size: 14px;">¡Estás aquí!</b>')
        .openPopup();
      
      this.buscarLugaresWikipedia(e.latlng.lat, e.latlng.lng);
    });
  }

  centrarMapaEnUsuario() {
    if (this.userMarker) {
      const latLng = this.userMarker.getLatLng();
      this.map.flyTo(latLng, 16, { animate: true, duration: 0.5 });
      this.userMarker.openPopup();
    } else {
      alert('Aún no hemos detectado tu ubicación.');
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
      const respuesta = await fetch(urlGeo);
      const data = await respuesta.json();
      if (!data.query || !data.query.geosearch) return;
      
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

    const iconoLibrito = L.icon({
      iconUrl: 'assets/icon/libro.png',
      iconSize: [35, 35],
      iconAnchor: [17, 17], 
      popupAnchor: [0, -17]
    });

    lugaresMostrar.forEach((lugar: any) => {
      const marker = L.marker([lugar.lat, lugar.lon], { icon: iconoLibrito });
      marker.on('click', () => {
        this.map.flyTo([lugar.lat, lugar.lon], 16, { animate: true, duration: 0.5 });
        this.cargarHistoriaLugar(lugar.pageid, lugar.title, Math.round(lugar.dist || 0), lugar.lat, lugar.lon);
      });
      this.marcadoresLayer.addLayer(marker);
    });

    this.cdr.detectChanges();
  }

  async buscarBanos() {
    const tienePermiso = await this.verificarPremium('los Filtros de Supervivencia Urbana');
    if (!tienePermiso) return; 

    if (!this.userMarker) {
      alert('Esperando a obtener tu ubicación actual...');
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

    const query = `[out:json];
    (
      nwr["amenity"="toilets"](around:4000,${miLat},${miLng});
      nwr["amenity"="fuel"](around:4000,${miLat},${miLng});
      nwr["shop"="mall"](around:4000,${miLat},${miLng});
    );
    out center;`;
    
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
      const respuesta = await fetch(url);
      const data = await respuesta.json();

      if (data.elements && data.elements.length > 0) {
        
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
            const marker = L.marker([lat, lon], { icon: iconoBano });
            
            let tipoLugar = 'Baño Público';
            if (lugar.tags?.amenity === 'fuel') tipoLugar = 'Estación de Servicio (Baño)';
            if (lugar.tags?.shop === 'mall') tipoLugar = 'Centro Comercial (Baño)';
            const nombre = lugar.tags?.name || tipoLugar;
            
            let nota = 'Servicio disponible cercano.';
            if (tipoLugar.includes('Servicio') || tipoLugar.includes('Comercial')) {
              nota = '<strong style="color:#f39c12;">Atención:</strong> Puede requerir ser cliente para usar los baños.';
            }

            marker.on('click', () => {
              this.map.flyTo([lat, lon], 16, { animate: true, duration: 0.5 });
              this.abrirDetalleServicio(nombre, nota, lat, lon);
            });

            this.marcadoresLayer.addLayer(marker);
            pinesDibujados++;
          }
        });

        if (pinesDibujados > 0) {
           this.map.setView([miLat, miLng], 13);
        }

      } else {
        alert('No se encontraron servicios ni baños públicos en un radio de 4km.');
        this.aplicarFiltro('todos'); 
      }
    } catch (error) {
      console.error("Error buscando servicios en Overpass:", error);
      alert('Hubo un error al conectar con el servicio de mapas.');
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

    const loading = await this.loadingCtrl.create({
      spinner: null, 
      cssClass: 'loading-geonyx',
      message: 'Abriendo archivo histórico...' 
    });
    await loading.present();

    const urlWiki = `https://es.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&pageids=${pageid}&exintro=true&explaintext=true&piprop=original&format=json&origin=*`;
    
    try {
      const respuesta = await fetch(urlWiki);
      const data = await respuesta.json();
      const paginaInfo = data.query.pages[pageid];
      
      const historiaTexto = paginaInfo.extract || 'No existen registros detallados.';
      
      const textoLimpio = historiaTexto.replace(/\n/g, ' ').trim();
      let historiaCorta = textoLimpio;
      if (textoLimpio.length > 100) {
        historiaCorta = textoLimpio.substring(0, 100) + '...';
      }

      let imagenEncontrada = null;
      if (paginaInfo.original && paginaInfo.original.source) {
         imagenEncontrada = paginaInfo.original.source;
      }

      this.lugarSeleccionado = { 
        titulo: titulo, distancia: distancia, lat: lat, lon: lon, imagen: imagenEncontrada,
        traducciones: {
          'es': { corta: historiaCorta, completa: textoLimpio }
        }
      };

      this.mostrarTarjeta = true;

    } catch (error) {
      this.lugarSeleccionado = { 
        titulo: titulo, distancia: distancia, lat: lat, lon: lon, imagen: null,
        traducciones: {
          'es': { corta: 'Error de conexión.', completa: 'Error de conexión.' }
        }
      };
      this.mostrarTarjeta = true;
    } finally {
      this.cdr.detectChanges(); 
      await loading.dismiss();
    }
  }

  async abrirMenuIdiomas() {
    const botones: any[] = this.idiomasDisponibles.map(idioma => {
      const estaSeleccionado = this.idiomaActivo === idioma.codigo;
      
      let tieneAcceso = false;
      
      if (this.tipoPlanUsuario === 'viajero') {
        tieneAcceso = true; // Viajero Escritor tiene todos los idiomas
      } else if (this.tipoPlanUsuario === 'explorador') {
        tieneAcceso = ['es', 'en', 'pt'].includes(idioma.codigo); // Español, Inglés y Portugués
      } else {
        tieneAcceso = ['es', 'en'].includes(idioma.codigo); // Observador solo Español e Inglés
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

    const textoBase = this.lugarSeleccionado.traducciones['es'].completa;

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

        this.lugarSeleccionado.traducciones[codigoIdioma] = {
          corta: cortaTrad,
          completa: textoTraducido
        };
      }
    } catch (error) {
      this.lugarSeleccionado.traducciones[codigoIdioma] = {
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

    const textoALeer = this.lugarSeleccionado.traducciones[this.idiomaActivo]?.completa || '';
    if (!textoALeer) return;

    const confIdioma = this.idiomasDisponibles.find(i => i.codigo === this.idiomaActivo);
    const vozObjetivo = confIdioma ? confIdioma.voz : 'es-CL';

    const mensaje = new SpeechSynthesisUtterance(textoALeer);
    mensaje.lang = vozObjetivo;

    const voces = window.speechSynthesis.getVoices();
    const prefijo = vozObjetivo.split('-')[0]; 
    
    let mejorVoz = voces.find(v => v.lang === vozObjetivo) || voces.find(v => v.lang.startsWith(prefijo));
    if (mejorVoz) {
      mensaje.voice = mejorVoz;
    }

    mensaje.onend = () => { this.leyendoAudio = false; this.cdr.detectChanges(); };
    mensaje.onerror = () => { this.leyendoAudio = false; this.cdr.detectChanges(); };
    
    window.speechSynthesis.speak(mensaje);
  }

  detenerAudio() {
    window.speechSynthesis.cancel();
    this.leyendoAudio = false;
    this.cdr.detectChanges();
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

  iniciarNavegacion(destinoLat: number, destinoLng: number) {
    if (!this.userMarker) { alert('Esperando a obtener tu ubicación actual...'); return; }
    const miLat = this.userMarker.getLatLng().lat;
    const miLng = this.userMarker.getLatLng().lng;

    if (this.controlRuta) this.map.removeControl(this.controlRuta);

    this.controlRuta = L.Routing.control({
      waypoints: [ L.latLng(miLat, miLng), L.latLng(destinoLat, destinoLng) ],
      router: L.Routing.osrmv1({ language: 'es', profile: 'walking' }),
      routeWhileDragging: false, addWaypoints: false, fitSelectedRoutes: true, show: true, collapsible: true
    }).addTo(this.map);

    this.navegando = true; 
    this.cerrarTarjeta(); 
  }

  async generarTourDinamico() {
    const tienePermiso = await this.verificarPremium('los Tours Dinámicos Generativos');
    if (!tienePermiso) return;

    if (!this.userMarker) { alert('Esperando a obtener tu ubicación actual...'); return; }
    if (this.listaLugares.length === 0) return;
    if (this.controlRuta) this.map.removeControl(this.controlRuta);

    const miLat = this.userMarker.getLatLng().lat;
    const miLng = this.userMarker.getLatLng().lng;
    const puntosNavegacion = [L.latLng(miLat, miLng)];

    const lugaresCercanos = [...this.listaLugares].sort((a, b) => a.dist - b.dist).slice(0, 3); 
    lugaresCercanos.forEach((lugar: any) => puntosNavegacion.push(L.latLng(lugar.lat, lugar.lon)));

    this.controlRuta = L.Routing.control({
      waypoints: puntosNavegacion,
      router: L.Routing.osrmv1({ language: 'es', profile: 'walking' }),
      routeWhileDragging: false, addWaypoints: false, fitSelectedRoutes: true, show: true, collapsible: true
    }).addTo(this.map);

    this.navegando = true; 
  }

  async generarTourSorpresa() {
    const tienePermiso = await this.verificarPremium('los Tours Sorpresa');
    if (!tienePermiso) return;

    if (!this.userMarker) { alert('Esperando a obtener tu ubicación actual...'); return; }
    if (this.listaLugares.length === 0) return;
    if (this.controlRuta) this.map.removeControl(this.controlRuta);

    const miLat = this.userMarker.getLatLng().lat;
    const miLng = this.userMarker.getLatLng().lng;
    const puntosNavegacion = [L.latLng(miLat, miLng)];

    const lugaresAzar = [...this.listaLugares].sort(() => 0.5 - Math.random()).slice(0, 3);
    lugaresAzar.forEach((lugar: any) => puntosNavegacion.push(L.latLng(lugar.lat, lugar.lon)));

    this.controlRuta = L.Routing.control({
      waypoints: puntosNavegacion,
      router: L.Routing.osrmv1({ language: 'es', profile: 'walking' }),
      routeWhileDragging: false, addWaypoints: false, fitSelectedRoutes: true, show: true, collapsible: true
    }).addTo(this.map);

    this.navegando = true; 
  }

  cancelarNavegacion() {
    if (this.controlRuta) { this.map.removeControl(this.controlRuta); this.controlRuta = null; }
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
    if (!SpeechRecognition) { alert('Tu navegador no soporta búsqueda por voz.'); return; }

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
      this.listaLugares = [];
      this.lugaresFiltrados = [];
      this.textoBuscado = '';
      this.cerrarTarjeta();
      
      if (this.controlRuta) {
        this.map.removeControl(this.controlRuta);
        this.controlRuta = null;
      }
      this.navegando = false;

      this.map.invalidateSize();

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const nuevaLat = position.coords.latitude;
          const nuevaLon = position.coords.longitude;

          if (this.userMarker) {
            this.userMarker.setLatLng([nuevaLat, nuevaLon]);
          }
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
