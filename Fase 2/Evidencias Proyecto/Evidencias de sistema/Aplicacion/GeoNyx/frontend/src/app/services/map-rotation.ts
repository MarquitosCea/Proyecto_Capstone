import * as L from 'leaflet';

type GetMousePosition = (e: any, container?: HTMLElement) => any;

let originalGetMousePosition: GetMousePosition | null = null;
let anguloMapa = 0;

/**
 * Leaflet calcula la posición del ratón usando getBoundingClientRect().
 * Cuando rotamos el contenedor con CSS, ese rectángulo deja de coincidir con
 * el sistema de coordenadas interno del mapa. Este parche convierte el punto
 * de pantalla al punto real del mapa aplicando la rotación inversa.
 */
export function instalarParcheRotacionMapa(): void {
  if (originalGetMousePosition) return;

  const domEvent = (L as any).DomEvent;
  originalGetMousePosition = domEvent.getMousePosition;

  domEvent.getMousePosition = (e: any, container?: HTMLElement) => {
    const original = originalGetMousePosition!;
    const esMapa = container &&
      (container.id === 'map-container' || container.id === 'map-misterio');

    if (!anguloMapa || !esMapa || !container) {
      return original(e, container);
    }

    const clienteX = e?.clientX ?? e?.changedTouches?.[0]?.clientX ?? e?.touches?.[0]?.clientX;
    const clienteY = e?.clientY ?? e?.changedTouches?.[0]?.clientY ?? e?.touches?.[0]?.clientY;
    if (clienteX === undefined || clienteY === undefined) {
      return original(e, container);
    }

    const rect = container.getBoundingClientRect();
    const centroX = rect.left + rect.width / 2;
    const centroY = rect.top + rect.height / 2;
    const rad = anguloMapa * Math.PI / 180;
    const dx = clienteX - centroX;
    const dy = clienteY - centroY;

    // visual = R(angulo) * local  =>  local = R(-angulo) * visual
    const localX = dx * Math.cos(rad) + dy * Math.sin(rad) + container.clientWidth / 2;
    const localY = -dx * Math.sin(rad) + dy * Math.cos(rad) + container.clientHeight / 2;

    return L.point(localX - container.clientLeft, localY - container.clientTop);
  };
}

export function establecerAnguloMapa(angulo: number): void {
  anguloMapa = angulo;
}

export function restaurarParcheRotacionMapa(): void {
  if (originalGetMousePosition) {
    (L as any).DomEvent.getMousePosition = originalGetMousePosition;
    originalGetMousePosition = null;
  }
  anguloMapa = 0;
}
