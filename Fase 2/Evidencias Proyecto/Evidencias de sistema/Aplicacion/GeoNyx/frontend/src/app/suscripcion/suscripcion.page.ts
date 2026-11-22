import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { 
  AlertController, 
  IonicSafeString,
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent,
  IonList, IonItem, IonIcon, IonLabel, IonButton
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  checkmarkCircle, star, flash, timeOutline, bookOutline, languageOutline, 
  sunnyOutline, book, language, filterCircle, medalOutline, medal, waterOutline 
} from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api'; 

@Component({
  selector: 'app-suscripcion',
  templateUrl: './suscripcion.page.html',
  styleUrls: ['./suscripcion.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
    IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent,
    IonList, IonItem, IonIcon, IonLabel, IonButton
  ]
})
export class SuscripcionPage implements OnInit {
  
  usuarioId!: number; 
  planActual: string = 'observador';

  private jerarquiaPlanes: { [key: string]: number } = {
    'observador': 1,
    'explorador': 2,
    'viajero': 3
  };

  private nombresPlanes: { [key: string]: string } = {
    'observador': 'Observador (Gratis)',
    'explorador': 'Explorador Lector',
    'viajero': 'Viajero Escritor'
  };

  constructor(
    private alertCtrl: AlertController, 
    private router: Router, 
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ 
      checkmarkCircle, star, flash, timeOutline, bookOutline, languageOutline, 
      sunnyOutline, book, language, filterCircle, medalOutline, medal, waterOutline 
    });
  }

  ngOnInit() {
    this.cargarDatosUsuario();
  }

  ionViewWillEnter() {
    this.cargarDatosUsuario();
  }

  cargarDatosUsuario() {
    const idGuardado = localStorage.getItem('usuario_id');
    const planGuardado = localStorage.getItem('tipo_plan');
    
    if (!idGuardado) {
      this.router.navigate(['/login']);
      return;
    }

    this.usuarioId = parseInt(idGuardado, 10);

    if (planGuardado) {
      this.planActual = planGuardado.trim().toLowerCase();
    } else {
      this.planActual = 'observador';
    }

    this.cdr.detectChanges();
  }

  esPlanActual(plan: string): boolean {
    return this.planActual === plan;
  }

  esRebaja(planDestino: string): boolean {
    const nivelActual = this.jerarquiaPlanes[this.planActual] || 1;
    const nivelDestino = this.jerarquiaPlanes[planDestino] || 1;
    return nivelDestino < nivelActual;
  }

  obtenerTextoBoton(plan: string, textoSubida: string): string {
    if (this.esPlanActual(plan)) {
      return 'Plan Actual';
    }
    if (this.esRebaja(plan)) {
      return 'Rebajar Plan';
    }
    return textoSubida;
  }

  async seleccionarPlan(plan: string) {
    if (!this.usuarioId) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.esPlanActual(plan)) return;

    const nombrePlan = this.nombresPlanes[plan] || plan;
    const bajandoDePlan = this.esRebaja(plan);

    const tituloAlerta = bajandoDePlan ? '¿Rebajar Suscripción?' : '¡Activación de Suscripción!';
    const mensajeAlerta = bajandoDePlan
      ? `¿Estás seguro de que deseas rebajar tu cuenta al plan <strong>${nombrePlan}</strong>? Perderás los beneficios exclusivos de tu rango actual.`
      : `¿Deseas activar de forma inmediata el plan <strong>${nombrePlan}</strong> para fines de demostración?`;
    const textoConfirmar = bajandoDePlan ? 'Sí, Rebajar' : 'Sí, Activar';

    const alert = await this.alertCtrl.create({
      header: tituloAlerta,
      message: new IonicSafeString(mensajeAlerta),
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: textoConfirmar,
          handler: () => {
            this.api.actualizarPlanUsuario(this.usuarioId, plan).subscribe({
              next: async () => {
                localStorage.setItem('tipo_plan', plan);
                this.planActual = plan;
                this.cdr.detectChanges();

                const headerExito = bajandoDePlan ? 'Plan Rebajado' : '¡Plan Activado con Éxito!';
                const mensajeExito = bajandoDePlan
                  ? `Tu suscripción ha sido cambiada al rango <strong>${nombrePlan.toUpperCase()}</strong>.`
                  : `Tu cuenta ahora tiene el rango <strong>${nombrePlan.toUpperCase()}</strong>. ¡Disfruta los beneficios!`;

                const successAlert = await this.alertCtrl.create({
                  header: headerExito,
                  message: new IonicSafeString(mensajeExito),
                  buttons: [{
                    text: 'Continuar Aventura',
                    handler: () => {
                      this.router.navigate(['/home'], { replaceUrl: true });
                    }
                  }]
                });
                await successAlert.present();
              },
              error: (err: any) => {
                console.error("Error al actualizar plan:", err);
                window.alert("Hubo un error al actualizar el plan en la base de datos.");
              }
            });
          }
        }
      ]
    });
    
    await alert.present();
  }
}
