import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { 
  NavController, ToastController, IonHeader, IonToolbar, 
  IonButtons, IonBackButton, IonTitle, IonContent, 
  IonItem, IonLabel, IonInput, IonButton, IonIcon, IonText,
  IonSelect, IonSelectOption // <-- IMPORTAMOS EL SELECTOR
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personOutline, mailOutline, lockClosedOutline, globeOutline } from 'ionicons/icons';

import { ApiService } from '../services/api';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, 
    IonButtons, IonBackButton, IonTitle, 
    IonContent, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonText,
    IonSelect, IonSelectOption // <-- LO AÑADIMOS A LOS IMPORTS
  ]
})
export class RegistroPage {
  usuario = { alias: '', email: '', password: '', nacionalidad: '' };

  // LISTA DE PAÍSES (Puedes agregar los que quieras)
  listaPaises: string[] = [
    'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 
    'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador', 'España', 
    'Estados Unidos', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 
    'Panamá', 'Paraguay', 'Perú', 'Puerto Rico', 'República Dominicana', 
    'Uruguay', 'Venezuela', 'Otro'
  ];

  constructor(
    private api: ApiService, 
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private router: Router
  ) {
    addIcons({ personOutline, mailOutline, lockClosedOutline, globeOutline });
  }

  async registrar() {
    if (!this.usuario.alias || !this.usuario.email || !this.usuario.password || !this.usuario.nacionalidad) {
      this.mostrarMensaje('Por favor, completa todos los campos.', 'warning');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.usuario.email)) {
      this.mostrarMensaje('Ingresa un correo electrónico válido.', 'warning');
      return;
    }

    if (this.usuario.password.length < 6) {
      this.mostrarMensaje('La contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    try {
      const res = await this.api.registrarUsuario(this.usuario);
      this.mostrarMensaje('¡Registro exitoso! Revisa tu correo para confirmar la cuenta.', 'success');
      this.navCtrl.navigateRoot('/login'); 
    } catch (error) {
      this.mostrarMensaje('Hubo un error. Puede que el correo ya esté registrado.', 'danger');
      console.error(error);
    }
  }

  irALogin() {
    this.router.navigate(['/login']);
  }

  async mostrarMensaje(msj: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message: msj,
      duration: 3500,
      position: 'bottom',
      color: color
    });
    toast.present();
  }
}
