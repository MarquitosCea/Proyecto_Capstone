import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { 
  MenuController, IonApp, IonMenu, IonHeader, 
  IonToolbar, IonTitle, IonContent, IonList, 
  IonItem, IonIcon, IonLabel, IonRouterOutlet, IonChip 
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import { 
  logInOutline, personAddOutline, logOutOutline, personCircleOutline, 
  bookOutline, medalOutline, star, starOutline, personCircle, diamondOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonApp, IonMenu, IonHeader, IonToolbar, IonTitle, 
    IonContent, IonList, IonItem, IonIcon, IonLabel, IonRouterOutlet, IonChip
  ]
})
export class AppComponent {
  estaLogueado: boolean = false;
  aliasUsuario: string = 'Explorador';
  planUsuario: string = 'observador';

  constructor(private menuCtrl: MenuController, private router: Router) {
    addIcons({ 
      personCircle, logInOutline, personAddOutline, logOutOutline, 
      personCircleOutline, bookOutline, medalOutline, star, starOutline, diamondOutline 
    });
    this.verificarSesion();
  }

  // Método que se llama al iniciar para revisar el localStorage
  verificarSesion() {
    const token = localStorage.getItem('token') || localStorage.getItem('usuario_id');
    this.estaLogueado = token !== null;
    this.aliasUsuario = localStorage.getItem('alias') || localStorage.getItem('alias_usuario') || 'Explorador';
    this.planUsuario = localStorage.getItem('tipo_plan') || 'observador';
  }

  // Se asegura de actualizar visualmente cuando se abre el menú
  menuAbierto() {
    this.verificarSesion();
  }

  // --- MÉTODOS DINÁMICOS PARA LA INSIGNIA ---
  obtenerNombreInsignia(): string {
    if (this.planUsuario === 'explorador') return 'Explorador Lector';
    if (this.planUsuario === 'viajero') return 'Viajero Escritor';
    return 'Observador';
  }

  obtenerColorInsignia(): string {
    if (this.planUsuario === 'explorador') return 'success';
    if (this.planUsuario === 'viajero') return 'tertiary';
    return 'medium';
  }

  cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('alias');
    localStorage.removeItem('alias_usuario');
    localStorage.removeItem('tipo_plan');
    
    this.estaLogueado = false;
    this.planUsuario = 'observador';
    
    this.menuCtrl.close();
    this.router.navigate(['/login']); // Te enviamos directo al login al salir
  }

  irARegistro() {
    this.menuCtrl.close(); 
    this.router.navigate(['/registro']);
  }

  irALogin() {
    this.menuCtrl.close();
    this.router.navigate(['/login']);
  }

  irAMisHistorias() {
    this.menuCtrl.close();
    this.router.navigate(['/mis-historias']); 
  }

  irASuscripcion() {
    this.menuCtrl.close();
    this.router.navigate(['/suscripcion']);
  }
}
