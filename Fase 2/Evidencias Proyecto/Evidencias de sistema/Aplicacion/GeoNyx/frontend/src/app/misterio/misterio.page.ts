import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, 
  IonButton, IonButtons, IonIcon, IonFab, IonFabButton,
  IonModal, IonItem, IonLabel, IonInput, IonTextarea, 
  AlertController, MenuController,
  ToastController, NavController, IonRow, IonCol
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  moonOutline, locateOutline, addOutline, closeOutline, micOutline,
  micOffOutline, bookOutline, navigateOutline, volumeHighOutline, volumeMuteOutline, 
  menuOutline, sunnyOutline, locationOutline, mic, 
  mapOutline, footstepsOutline, shuffleOutline,
  pencilOutline, trashOutline, starOutline, warningOutline, star
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
    IonRow, IonCol
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

  constructor(
    private cdr: ChangeDetectorRef, 
    private router: Router,
    private alertController: AlertController,
    private api: ApiService,
    private menuCtrl: MenuController,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {
    addIcons({ 
      moonOutline, locateOutline, addOutline, closeOutline, micOutline, mic, 
      volumeHighOutline, volumeMuteOutline, menuOutline, pencilOutline, 
      trashOutline, starOutline, warningOutline, star
    });

    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state) {
      this.esManual = nav.extras.state['manual'] === true;
    }
  }

  ionViewWillEnter() {
    this.miUsuarioId = localStorage.getItem('usuario_id');
  }

  ngOnInit() {
    this.miUsuarioId = localStorage.getItem('usuario_id');
    if (this.esManual) {
      this.initMap();
    } else {
      this.verificarHorario();
    }
  }

  abrirMenu() {
    this.menuCtrl.open();
  }

  verificarHorario() {
    const horaActual = new Date().getHours();
    if (horaActual >= 6 && horaActual < 20) {
      this.router.navigate(['/home']); 
    } else {
      this.initMap();
    }
  }

  irAHistorico() {
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
      setTimeout(() => { this.map.invalidateSize(); this.map.setView(e.latlng, 16); }, 400);

      this.map.on('click', async (e: L.LeafletMouseEvent) => {
        if (!this.userMarker) {
          window.alert("Espera a que obtengamos tu ubicación actual primero.");
          return;
        }

        const miUbicacion = this.userMarker.getLatLng();
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
      
      this.userMarker = L.marker(e.latlng, { icon: iconoUbicacion })
        .addTo(this.map).bindPopup('<b style="color: #ff00b7; font-size: 14px;">¡Estás Aquí!</b>').openPopup();
      
      this.cargarLeyendasBackend(e.latlng.lat, e.latlng.lng);
    });
  }

  centrarMapaEnUsuario() {
    if (this.userMarker) {
      this.map.flyTo(this.userMarker.getLatLng(), 16, { animate: true, duration: 0.5 });
      this.userMarker.openPopup();
    }
  }

  async cargarLeyendasBackend(lat: number, lon: number) {
    this.api.getLeyendas().subscribe({
      next: (leyendasDelServidor) => {
        leyendasDelServidor.forEach((leyenda: any) => {
          const iconoLeyenda = L.icon({
            iconUrl: 'assets/icon/LibroNoche.png',
            iconSize: [45, 45], iconAnchor: [17, 17], popupAnchor: [0, -17]
          });

          const marcador = L.marker([leyenda.latitud, leyenda.longitud], { icon: iconoLeyenda }).addTo(this.map);

          marcador.on('click', () => {
            this.map.flyTo([leyenda.latitud, leyenda.longitud], 16, { animate: true, duration: 0.5 });
            this.abrirTarjetaLeyenda(leyenda); 
          });
        });
      }
    });
  }

  abrirTarjetaLeyenda(leyenda: any) {
    this.leyendaSeleccionada = leyenda;
    this.leyendaSeleccionada.autor = leyenda.alias_autor || 'Anónimo'; 
    
    const token = localStorage.getItem('token');
    const miIdActual = localStorage.getItem('usuario_id');
    const miId = localStorage.getItem('usuario_id');
      
// --- NUEVO: OBTENER PROMEDIO Y MI VOTO GUARDADO ---
    this.puntuacionActual = 0; 
    this.promedioActual = '0.0'; 
    
    // Asegurarnos de capturar el ID correcto
    const idDeLaHistoria = this.leyendaSeleccionada.id_leyenda || this.leyendaSeleccionada.id;

    // SOLUCIÓN: Convertimos el texto a número. Si es nulo, pasamos 0.
    const idUsuarioNumerico = miIdActual ? parseInt(miIdActual) : 0;

    if (idDeLaHistoria) {
      this.api.obtenerEstadoValoracion(idDeLaHistoria, idUsuarioNumerico).subscribe({
        next: (datos: any) => {
          console.log("Datos de valoraciones recibidos:", datos);
          
          this.promedioActual = Number(datos.promedio).toFixed(1); 
          
          if (datos.mi_voto > 0) {
            this.puntuacionActual = datos.mi_voto; 
          }
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error("Error cargando valoraciones:", err)
      });
    }
    // --------------------------------------------------

    if (token && miIdActual && miIdActual !== 'null' && miIdActual !== 'undefined') {
      this.esMiLeyenda = String(miIdActual) === String(leyenda.id_usuario);
    } else {
      this.esMiLeyenda = false;
    }
    
    this.historiaExpandida = false; // <-- Esto resetea el "Leer más"
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

  formularioNuevaLeyenda(latClic?: number, lngClic?: number) {
    const miIdActual = localStorage.getItem('usuario_id');

    if (!miIdActual || miIdActual === 'null' || miIdActual === 'undefined') {
      window.alert("Sesión no detectada. Debes iniciar sesión para crear una leyenda.");
      this.router.navigate(['/login']); 
      return;
    }
    
    this.miUsuarioId = miIdActual; 

    if (!this.userMarker) {
      window.alert("Espera a obtener tu ubicación.");
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
    if (!miIdActual || miIdActual === 'null') {
      return; 
    }

    const datosLeyenda = {
      titulo: titulo, historia: historia, latitud: lat, longitud: lon,
      id_usuario: Number(miIdActual) 
    };

    this.api.crearLeyenda(datosLeyenda).subscribe({
      next: (respuesta) => {
        this.mostrarMensaje('¡Leyenda publicada en el mapa!');
        this.recargarPinesMapa(); 
      },
      error: (err: any) => { window.alert("Hubo un error al guardar tu leyenda."); }
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

  actualizarLeyendaBackend(id: number, titulo: string, historia: string) {
    const datosUpdate = { titulo: titulo, historia: historia };
    
    this.api.actualizarLeyenda(id, datosUpdate).subscribe({
      next: () => {
        this.mostrarMensaje('¡Leyenda actualizada!');
        this.recargarPinesMapa();
      },
      error: (err: any) => { console.error(err); window.alert("Error al actualizar la leyenda."); }
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
          handler: () => {
            this.api.borrarLeyenda(this.leyendaSeleccionada.id_leyenda).subscribe({
              next: () => {
                this.cerrarTarjeta();
                this.mostrarMensaje('Leyenda eliminada.');
                this.recargarPinesMapa();
              },
              error: (err: any) => { console.error(err); window.alert("Error al borrar."); }
            });
          }
        }
      ]
    });
    await alertaBorrar.present();
  }

async valorarHistoria(nota: number) {
  const idUsuarioActualStr = localStorage.getItem('usuario_id');

  // 1. Validar que esté logueado
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

  // Convertimos el ID a número de forma segura
  const idUsuarioActual = parseInt(idUsuarioActualStr);

  // 2. Efecto visual inmediato
  this.puntuacionActual = nota;
  this.cdr.detectChanges(); 

  // 3. Preparar los datos correctos
  const idLeyenda = this.leyendaSeleccionada.id_leyenda || this.leyendaSeleccionada.id; 
  const datosVoto = {
    id_usuario: idUsuarioActual,
    puntuacion: nota
  };

  // 4. Enviar al backend 
  this.api.valorarLeyenda(idLeyenda, datosVoto).subscribe({
    next: async () => {
      const toast = await this.toastCtrl.create({
        message: '¡Gracias por valorar este misterio!',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
      
      // 5. RECALCULAR EL PROMEDIO TRAS VOTAR (AQUÍ ES SU LUGAR CORRECTO)
      // Nota: Si en tu api.ts le llamaste "obtenerEstadoValoracion", cámbialo aquí.
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
              return true; // Retornamos explícitamente true para cerrar la alerta
            } else {
              this.mostrarMensaje('Debes escribir un motivo', 'warning');
              return false; // Retornamos explícitamente false para mantener la alerta abierta
            }
          }
        }
      ]
    });
    await alert.present();
  }

  enviarReporte(motivo: string) {
    const miId = Number(localStorage.getItem('usuario_id'));
    this.api.reportarLeyenda(this.leyendaSeleccionada.id_leyenda, { id_usuario: miId, motivo: motivo })
      .subscribe({
        next: () => {
          this.mostrarMensaje('Reporte enviado a los moderadores', 'success');
          this.cerrarTarjeta();
        },
        error: () => this.mostrarMensaje('Error al enviar reporte', 'danger')
      });
  }

  recargarPinesMapa() {
    this.map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker && layer !== this.userMarker) {
        this.map.removeLayer(layer);
      }
    });
    if (this.userMarker) {
      this.cargarLeyendasBackend(this.userMarker.getLatLng().lat, this.userMarker.getLatLng().lng);
    }
  }

  async mostrarMensaje(msj: string, color: string = 'light') {
    const toast = await this.alertController.create({ message: msj, buttons: ['OK'] });
    await toast.present();
  }

  async reproducirAudio(texto: string, idioma: 'es-CL' | 'en-US') {
    this.detenerAudio();
    this.idiomaLeyendo = idioma;
    this.cdr.detectChanges();

    let textoALeer = texto;

    if (idioma === 'en-US') {
      try {
        const urlTrad = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=${encodeURIComponent(texto)}`;
        const respuesta = await fetch(urlTrad);
        const data = await respuesta.json();
        if (data && data[0]) textoALeer = data[0].map((item: any) => item[0]).join('');
      } catch (error) {
        try {
          const urlAlt = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=es|en`;
          const resAlt = await fetch(urlAlt);
          const dataAlt = await resAlt.json();
          if (dataAlt && dataAlt.responseData && dataAlt.responseData.translatedText) textoALeer = dataAlt.responseData.translatedText;
        } catch (errorAlt) { }
      }
    }

    const mensaje = new SpeechSynthesisUtterance(textoALeer);
    mensaje.lang = idioma;
    
    const voces = window.speechSynthesis.getVoices();
    let mejorVoz = idioma === 'en-US' 
      ? voces.find(v => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))) || voces.find(v => v.lang.startsWith('en'))
      : voces.find(v => v.lang === 'es-CL' || v.lang === 'es-MX') || voces.find(v => v.lang.startsWith('es'));

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
}