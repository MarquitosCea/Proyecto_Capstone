import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { 
  MenuController, IonApp, IonMenu, IonHeader, 
  IonToolbar, IonTitle, IonContent, IonList, 
  IonItem, IonIcon, IonLabel, IonRouterOutlet 
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import { logInOutline, personAddOutline, logOutOutline, personCircleOutline, bookOutline } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonApp, IonMenu, IonHeader, IonToolbar, IonTitle, 
    IonContent, IonList, IonItem, IonIcon, IonLabel, IonRouterOutlet
  ]
})
export class AppComponent {
  estaLogueado: boolean = false;
  aliasUsuario: string = 'Explorador';

  constructor(private menuCtrl: MenuController, private router: Router) {
    addIcons({ logInOutline, personAddOutline, logOutOutline, personCircleOutline, bookOutline });
    this.verificarSesion();
  }

  verificarSesion() {
    const token = localStorage.getItem('token');
    this.estaLogueado = token !== null;
    this.aliasUsuario = localStorage.getItem('alias') || 'Explorador';
  }

  cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('alias');
    this.estaLogueado = false;
    this.menuCtrl.close();
    this.router.navigate(['/home']);
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
}