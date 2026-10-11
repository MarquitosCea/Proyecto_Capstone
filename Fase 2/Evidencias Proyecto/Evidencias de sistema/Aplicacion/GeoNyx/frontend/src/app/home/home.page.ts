import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router'; // <-- Importamos el enrutador
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, 
  IonButton, IonIcon, IonRow, IonCol,
  IonSearchbar, IonList, IonItem, IonLabel, IonButtons,
  IonFab, IonFabButton, IonFabList, MenuController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  bookOutline, moonOutline, navigateOutline, volumeHighOutline, volumeMuteOutline, 
  menuOutline, sunnyOutline, locationOutline, micOutline, mic, 
  mapOutline, footstepsOutline, shuffleOutline, locateOutline, closeOutline
} from 'ionicons/icons';
import * as L from 'leaflet';
import { NgIf, NgClass, NgFor } from '@angular/common';
import 'leaflet-routing-machine';

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
    IonButton, IonIcon, IonRow, IonCol, NgIf, NgClass, NgFor,
    IonSearchbar, IonList, IonItem, IonLabel, IonButtons,
    IonFab, IonFabButton, IonFabList 
  ]
})
export class HomePage implements OnInit {
  private map!: L.Map;
  private controlRuta: L.Routing.Control | null = null;
  private userMarker: L.Marker | null = null; 
  
  mostrarTarjeta: boolean = false;
  mostrarHistoriaCompleta: boolean = false;
  navegando: boolean = false; 
  esManual: boolean = false; // <-- 1. Nueva variable para saber si fue un clic manual
  
  idiomaLeyendo: string | null = null; 
  lugarSeleccionado: any = { titulo: '', historiaCorta: '', historiaCompleta: '', distancia: 0, lat: 0, lon: 0 };

  listaLugares: any[] = [];
  lugaresFiltrados: any[] = [];
  textoBuscado: string = '';
  escuchando: boolean = false;

  constructor(private cdr: ChangeDetectorRef, private router: Router, private menuCtrl: MenuController) {
    addIcons({ 
      bookOutline, moonOutline, navigateOutline, volumeHighOutline, volumeMuteOutline, 
      menuOutline, sunnyOutline, locationOutline, micOutline, mic, 
      mapOutline, footstepsOutline, shuffleOutline, locateOutline, closeOutline
    });

    // 2. Leemos si la navegación vino desde el botón de la luna
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state) {
      this.esManual = nav.extras.state['manual'] === true;
    }
  }

  ngOnInit() {
    // 3. Si fue manual, saltamos la verificación. Si es automático (al abrir la app), verificamos la hora.
    if (this.esManual) {
      this.initMap();
    } else {
      this.verificarHorario();
    }
  }

  verificarHorario() {
    const horaActual = new Date().getHours();
    if (horaActual >= 20 || horaActual < 6) {
      console.log("Automático: Son más de las 20:00. Derivando a Misterio...");
      this.router.navigate(['/misterio']); 
    } else {
      this.initMap(); 
    }
  }

  // 4. Función para el botón del Sol
  irAMisterio() {
    // Viajamos a Misterio enviando el pase VIP (manual: true)
    this.router.navigate(['/misterio'], { state: { manual: true } });
  }

  // ... (Aquí sigue tu initMap() y el resto del código que ya tienes)

  initMap() {
    this.map = L.map('map-container').setView([-33.4915, -70.7190], 15);

    // Mapa claro (OpenStreetMap normal)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
      attribution: '© OpenStreetMap' 
    }).addTo(this.map);

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
    const urlGeo = `https://es.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=20&format=json&origin=*`;
    
    try {
      const respuesta = await fetch(urlGeo);
      const data = await respuesta.json();
      if (!data.query || !data.query.geosearch) return;
      
      const lugares = data.query.geosearch;
      this.listaLugares = lugares;

      const iconoLibrito = L.icon({
        iconUrl: 'assets/icon/libro.png',
        iconSize: [35, 35],
        iconAnchor: [17, 17], 
        popupAnchor: [0, -17]
      });

      lugares.forEach((lugar: any) => {
        const marker = L.marker([lugar.lat, lugar.lon], { icon: iconoLibrito }).addTo(this.map);
        marker.on('click', () => {
          this.map.flyTo([lugar.lat, lugar.lon], 16, { animate: true, duration: 0.5 });
          this.cargarHistoriaLugar(lugar.pageid, lugar.title, Math.round(lugar.dist), lugar.lat, lugar.lon);
        });
      });
    } catch (error) {
      console.error("Error buscando en Wikipedia:", error);
    }
  }

  async cargarHistoriaLugar(pageid: number, titulo: string, distancia: number, lat: number, lon: number) {
    this.detenerAudio();
    this.mostrarHistoriaCompleta = false;
    this.lugarSeleccionado = { titulo: titulo, historiaCorta: 'Buscando...', historiaCompleta: 'Buscando...', distancia: distancia, lat: lat, lon: lon };
    this.mostrarTarjeta = true;
    this.cdr.detectChanges(); 

    const urlTexto = `https://es.wikipedia.org/w/api.php?action=query&prop=extracts&pageids=${pageid}&exintro=true&explaintext=true&format=json&origin=*`;
    
    try {
      const respuesta = await fetch(urlTexto);
      const data = await respuesta.json();
      const historiaTexto = data.query.pages[pageid].extract || 'No existen registros detallados.';
      
      const textoLimpio = historiaTexto.replace(/\n/g, ' ').trim();
      let historiaCorta = textoLimpio;
      if (textoLimpio.length > 100) {
        historiaCorta = textoLimpio.substring(0, 100) + '...';
      }

      this.lugarSeleccionado.historiaCorta = historiaCorta;
      this.lugarSeleccionado.historiaCompleta = textoLimpio;
    } catch (error) {
      this.lugarSeleccionado.historiaCorta = 'Error de conexión.';
    }
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

  toggleAudio(idioma: 'es-CL' | 'en-US') {
    if (this.idiomaLeyendo === idioma) {
      this.detenerAudio();
    } else {
      this.reproducirAudio(idioma);
    }
  }

  async reproducirAudio(idioma: 'es-CL' | 'en-US') {
    this.detenerAudio();
    this.idiomaLeyendo = idioma;
    this.cdr.detectChanges();

    let textoALeer = this.lugarSeleccionado.historiaCompleta;

    if (idioma === 'en-US') {
      try {
        const urlTrad = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=${encodeURIComponent(textoALeer)}`;
        const respuesta = await fetch(urlTrad);
        const data = await respuesta.json();
        if (data && data[0]) textoALeer = data[0].map((item: any) => item[0]).join('');
      } catch (error) {}
    }

    const mensaje = new SpeechSynthesisUtterance(textoALeer);
    mensaje.lang = idioma;
    const voces = window.speechSynthesis.getVoices();
    let mejorVoz = null;

    if (idioma === 'en-US') {
      mejorVoz = voces.find(v => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))) || voces.find(v => v.lang.startsWith('en'));
    } else {
      mejorVoz = voces.find(v => v.lang === 'es-CL' || v.lang === 'es-MX') || voces.find(v => v.lang.startsWith('es'));
    }

    if (mejorVoz) mensaje.voice = mejorVoz;
    mensaje.onend = () => { this.idiomaLeyendo = null; this.cdr.detectChanges(); };
    window.speechSynthesis.speak(mensaje);
    this.cdr.detectChanges();
  }

  detenerAudio() {
    window.speechSynthesis.cancel();
    this.idiomaLeyendo = null;
    this.cdr.detectChanges();
  }

  iniciarNavegacion(destinoLat: number, destinoLng: number) {
    if (!this.userMarker) {
      alert('Esperando a obtener tu ubicación actual...');
      return;
    }
    const miLat = this.userMarker.getLatLng().lat;
    const miLng = this.userMarker.getLatLng().lng;

    if (this.controlRuta) this.map.removeControl(this.controlRuta);

    this.controlRuta = L.Routing.control({
      waypoints: [ L.latLng(miLat, miLng), L.latLng(destinoLat, destinoLng) ],
      router: L.Routing.osrmv1({ language: 'es', profile: 'walking' }),
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      show: true,
      collapsible: true
    }).addTo(this.map);

    this.navegando = true; 
    this.cerrarTarjeta(); 
  }

  generarTourDinamico() {
    if (!this.userMarker) {
      alert('Esperando a obtener tu ubicación actual...');
      return;
    }
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
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      show: true,
      collapsible: true
    }).addTo(this.map);

    this.navegando = true; 
  }

  generarTourSorpresa() {
    if (!this.userMarker) {
      alert('Esperando a obtener tu ubicación actual...');
      return;
    }
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
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      show: true,
      collapsible: true
    }).addTo(this.map);

    this.navegando = true; 
  }

  cancelarNavegacion() {
    if (this.controlRuta) {
      this.map.removeControl(this.controlRuta);
      this.controlRuta = null;
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
    if (!SpeechRecognition) { alert('Tu navegador no soporta búsqueda por voz.'); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CL';
    recognition.continuous = false;

    recognition.onstart = () => { this.escuchando = true; this.cdr.detectChanges(); };
    recognition.onresult = (event: any) => {
      this.textoBuscado = event.results[0][0].transcript;
      this.filtrarLugares();
    };
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

  abrirMenu() {
    this.menuCtrl.open();
  }
}