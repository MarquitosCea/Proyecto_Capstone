import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { 
  NavController, ToastController, IonHeader, IonToolbar, 
  IonButtons, IonBackButton, IonTitle, IonContent, AlertController,
  IonItem, IonLabel, IonInput, IonButton, IonIcon, IonText
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personOutline, lockClosedOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';

import { ApiService } from '../services/api';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, 
    IonButtons, IonBackButton, IonTitle, 
    IonContent, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonText
  ]
})
export class LoginPage implements OnInit {
  credenciales = { email: '', password: '' };
  mostrarPassword = false;

  constructor(
    private api: ApiService, 
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private router: Router
  ) {
    addIcons({ personOutline, lockClosedOutline, eyeOutline, eyeOffOutline });
  }

  ngOnInit() {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      if (accessToken && refreshToken) {
        this.pedirNuevaPassword(accessToken, refreshToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }

  toggleMostrarPassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  async ingresar() {
    if (!this.credenciales.email || !this.credenciales.password) {
      this.mostrarMensaje('Por favor, ingresa tu usuario o correo y contraseña.', 'warning');
      return;
    }

    try {
      const res = await this.api.loginUsuario(this.credenciales);
      
      localStorage.setItem('token', res.token);
      localStorage.setItem('usuario_id', res.usuario_id);
      localStorage.setItem('alias_usuario', res.alias || 'Explorador');
      localStorage.setItem('tipo_plan', res.tipo_plan || 'observador');
      
      this.mostrarMensaje('¡Bienvenido de vuelta!', 'success');
      this.navCtrl.navigateRoot('/home').then(() => window.location.reload());
    } catch (error) {
      this.mostrarMensaje('Usuario, correo o contraseña incorrectos.', 'danger');
    }
  }

  irARegistro() {
    this.router.navigate(['/registro']);
  }

async recuperarPassword() {
    const alerta = await this.alertCtrl.create({
      header: 'Recuperar Contraseña',
      message: 'Ingresa tu correo electrónico registrado para recibir un enlace de recuperación.',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'tu@correo.com'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Enviar',
          handler: (data) => {
            if (!data.email) {
              this.mostrarMensaje('Debes ingresar un correo válido.', 'warning');
              return false; 
            }
            
            this.api.recuperarPassword(data.email).subscribe({
              next: () => {
                this.mostrarMensaje('Enlace enviado, revisa tu bandeja de entrada o spam.', 'success');
              },
              error: () => {
                this.mostrarMensaje('No se pudo enviar el correo. Asegúrate de que los datos sean correctos.', 'danger');
              }
            });
            return true;
          }
        }
      ]
    });

    await alerta.present();
  }

  async mostrarMensaje(msj: string, color: string = 'danger') {
    const toast = await this.toastCtrl.create({
      message: msj,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    toast.present();
  }

  async pedirNuevaPassword(accessToken: string, refreshToken: string) {
    const alerta = await this.alertCtrl.create({
      header: 'Crear Nueva Contraseña',
      message: 'Ingresa tu nueva contraseña (mínimo 6 caracteres).',
      backdropDismiss: false,
      inputs: [
        { name: 'password', type: 'password', placeholder: 'Nueva contraseña' }
      ],
      buttons: [
        {
          text: 'Guardar Contraseña',
          handler: (data) => {
            if (!data.password || data.password.length < 6) {
              this.mostrarMensaje('La contraseña debe tener al menos 6 caracteres.', 'warning');
              return false; 
            }
            
            this.api.actualizarPassword({
              access_token: accessToken,
              refresh_token: refreshToken,
              new_password: data.password
            }).subscribe({
              next: () => {
                this.mostrarMensaje('¡Contraseña actualizada!', 'success');
              },
              error: () => {
                this.mostrarMensaje('El enlace expiró o es inválido.', 'danger');
              }
            });
            return true;
          }
        }
      ]
    });
    await alerta.present();
  }
}