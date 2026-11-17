import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // Asegúrate de que diga localhost y NO 127.0.0.1
  private apiUrl = 'http://localhost:8000'; 

  constructor(private http: HttpClient) { }

  getLeyendas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/leyendas`);
  }

  crearLeyenda(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/leyendas`, datos);
  }

  actualizarLeyenda(id: number, datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/leyendas/${id}`, datos);
  }

  borrarLeyenda(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/leyendas/${id}`);
  }

  valorarLeyenda(id_leyenda: number, datos: { id_usuario: number, puntuacion: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/leyendas/${id_leyenda}/valorar`, datos);
  }

  reportarLeyenda(id_leyenda: number, datos: { id_usuario: number, motivo: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/leyendas/${id_leyenda}/reportar`, datos);
  }

  async registrarUsuario(datos: any) {
    const respuesta = await fetch(`${this.apiUrl}/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    if (!respuesta.ok) throw new Error('Error al registrar');
    return await respuesta.json();
  }

  async loginUsuario(datos: any) {
    const respuesta = await fetch(`${this.apiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    if (!respuesta.ok) throw new Error('Credenciales incorrectas');
    return await respuesta.json();
  }

  obtenerEstadoValoracion(idLeyenda: number, idUsuario: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/leyendas/${idLeyenda}/valoraciones/${idUsuario}`);
  }

  recuperarPassword(email: string) {
    return this.http.post(`${this.apiUrl}/recuperar-password`, { email });
  }

  actualizarPassword(datos: any) {
    return this.http.post(`${this.apiUrl}/actualizar-password`, datos);
  }

  actualizarPlanUsuario(id_usuario: number, nuevo_plan: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/actualizar-plan`, {
      id_usuario: id_usuario,
      nuevo_plan: nuevo_plan
    });
  }

  async obtenerHoraReal(): Promise<number> {
    try {
      // Usamos timeapi.io que es más estable en navegadores locales
      const respuesta = await fetch('https://timeapi.io/api/time/current/zone?timeZone=America/Santiago');
      if (!respuesta.ok) throw new Error();
      const datos = await respuesta.json();
      return datos.hour;
    } catch (error) {
      console.warn("Fallo de red al consultar API de tiempo. Usando hora local como respaldo.");
      return new Date().getHours();
    }
  }
}