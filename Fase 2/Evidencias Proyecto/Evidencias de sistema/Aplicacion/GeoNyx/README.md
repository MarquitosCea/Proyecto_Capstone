# GeoNyx

**Historias que cobran vida donde estás.**  
Aplicación móvil de exploración histórica basada en la ubicación, con mapas, relatos, traducción, audio y leyendas creadas por la comunidad.

---

## Descripción

**GeoNyx** es una aplicación móvil (Android) y web que transforma cualquier paseo en una experiencia narrativa. Al detectar la ubicación del usuario, muestra en un mapa los lugares históricos cercanos y permite descubrir su historia, escucharla en voz alta, traducirla y navegar hasta ella.

### Qué hace

- **Mapa histórico:** busca lugares cercanos con la API geográfica de Wikipedia y los muestra con marcadores sobre OpenStreetMap.
- **Fichas de historia:** extracto, imagen y texto completo del lugar, con filtros por categoría (monumentos, museos, parques, estaciones) y búsqueda por texto o voz.
- **Traducción multilenguaje:** español a inglés, portugués, francés, alemán y chino, con acceso según el plan del usuario.
- **Lectura en voz alta (TTS):** voz nativa del dispositivo con respaldo de audio generado en el servidor, como solución para los WebView de Android.
- **Navegación peatonal:** rutas hacia un destino, recorridos dinámicos a los lugares más cercanos y recorridos sorpresa, con ruta principal y alternativa.
- **Servicios cercanos:** localización de baños públicos, gasolineras y centros comerciales en un radio de 4 km mediante Overpass.
- **Modo Misterio:** entre las 20:00 y las 06:00 la aplicación activa un modo nocturno en el que los usuarios publican, editan, eliminan, valoran y reportan **leyendas** geolocalizadas.
- **Cuentas y planes:** registro e inicio de sesión con Supabase Auth, recuperación de contraseña y tres planes (Observador, Explorador Lector y Viajero Escritor) que desbloquean funciones premium.
- **Moderación:** valoraciones promedio por leyenda y reportes de contenido.

### A quién va dirigido

A viajeros, turistas, exploradores urbanos y lectores curiosos que buscan algo más que un listado de puntos turísticos: **historias contextuales, accesibles en su idioma y en formato audio**, además de una comunidad que comparte relatos misteriosos sobre cada lugar.

### Qué problema resuelve

La guía turística tradicional es estática, no se adapta a la ubicación real del visitante, rara vez está disponible en varios idiomas o en audio, y no permite que la comunidad aporte sus propias historias. GeoNyx combina geolocalización, contenido histórico, accesibilidad lingüística y auditiva, y narrativa colaborativa en una sola aplicación.

---

## Tecnologías utilizadas

| Capa | Tecnologías |
|---|---|
| **Frontend** | Angular 22, Ionic Framework 9, Capacitor 8 (Android), TypeScript 6, RxJS 7, Ionicons 8, Leaflet 1.9 (mapas) |
| **Backend** | Python 3, FastAPI, Uvicorn, SQLAlchemy, Pydantic, python-dotenv, SDK de Supabase, `psycopg[binary]`, SDK de Mercado Pago (dependencia instalada) |
| **Base de datos** | PostgreSQL con extensión **PostGIS** (tipo `geometry`, funciones `ST_MakePoint`, `ST_X` y `ST_Y`) alojada en Supabase |
| **Cloud y despliegue** | **Render** (API FastAPI), **Supabase** (autenticación y base de datos), GitHub para control de versiones |
| **APIs externas** | Wikipedia (geosearch y extractos), OpenStreetMap (tiles), Overpass API (servicios cercanos), OSRM y routing.openstreetmap.de (rutas peatonales), MyMemory y Google Translate (traducción), Google Translate TTS (audio), timeapi.io (hora de Santiago) |
| **Pruebas y calidad** | Vitest y Jasmine (pruebas unitarias), ESLint con angular-eslint, CLI de Angular e Ionic |
| **Móvil** | Capacitor Android, WebView nativa, permisos de geolocalización y `CapacitorHttp` para evitar bloqueos de red en el dispositivo |

---

## Instrucciones para ejecutar el proyecto localmente

### Prerrequisitos

- Node.js 20.19+ o 22+ y npm
- Python 3.10+
- Git
- Cuenta de Supabase con un proyecto PostgreSQL/PostGIS creado
- Opcional: Android Studio y JDK 17+ para compilar el APK

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd GeoNyx
```

### 2. Configurar el backend (FastAPI)

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Crea un archivo `backend/.env` con las siguientes variables. Este archivo no debe subirse al repositorio:

```env
DATABASE_URL=postgresql://usuario:password@host:puerto/base_de_datos
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_KEY=<service_role_o_anon_key>
MERCADOPAGO_ACCESS_TOKEN=<token_de_acceso>
```

> La base de datos debe tener habilitada la extensión PostGIS y las tablas `usuarios`, `leyendas`, `valoraciones` y `reportes` con los campos utilizados en `backend/main.py`.

Inicia la API:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Verifica que responda en <http://localhost:8000>, donde debe mostrar el mensaje *"El servidor de GeoNyx está funcionando"*. La documentación interactiva está disponible en <http://localhost:8000/docs>.

### 3. Configurar el frontend (Ionic + Angular)

```bash
cd frontend
npm install
```

Por defecto, el frontend apunta a la API desplegada en Render. Para utilizar el backend local, modifica la URL en estos dos archivos:

- `frontend/src/app/services/api.ts`: `private apiUrl = 'http://localhost:8000';`
- `frontend/src/environments/environment.ts`: `apiUrl: 'http://localhost:8000'`

Inicia la aplicación web:

```bash
npm start
```

La aplicación queda disponible en <http://localhost:4200>.

### 4. Compilar para Android (opcional)

```bash
npm run build
npx cap sync android
npx cap open android
```

Desde Android Studio, ejecuta la aplicación en un dispositivo o emulador con GPS activado. Antes de generar el APK definitivo, restablece la URL de producción en `api.ts` y `environment.prod.ts`, ya que un `127.0.0.1` en el teléfono no apuntaría a la máquina de desarrollo.

### Comandos útiles

| Acción | Comando |
|---|---|
| Pruebas unitarias | `cd frontend && npm test` |
| Análisis estático | `cd frontend && npm run lint` |
| Build de producción | `cd frontend && npm run build` |
| Verificar conexión a la base de datos | `GET http://localhost:8000/test-db` |

---

## Integrantes del equipo y roles

| Integrante | Rol principal | Responsabilidades |
|---|---|---|
| **Sebastian Rojas** | Product Owner y Frontend Developer | Definición de ideas y producto, organización de las jornadas de trabajo y los sprints, desarrollo de la interfaz con Angular e Ionic. |
| **Marcos Cea** | Backend y Database Developer | Diseño e implementación de la base de datos (PostgreSQL/PostGIS), desarrollo de la API FastAPI y documentación del proyecto. |
| **Ambos integrantes** | Diseño y QA | Creación del logo oficial de GeoNyx, pruebas y ajustes conjuntos de la experiencia de usuario. |

---

## Metodología de trabajo

El equipo trabajó con **Scrum** en sprints cortos:

- **Product Owner (Sebastian):** priorización de funcionalidades, gestión del backlog y organización de los días y sprints de trabajo.
- **Equipo de desarrollo (ambos integrantes):** implementación, integración frontend-backend y pruebas.
- **Ceremonias:** planificación de cada sprint, seguimiento diario del avance y revisión y retrospectiva al final de cada entrega.
- **Control de versiones:** Git con rama principal en GitHub; cada entrega integraba frontend, backend y documentación.
- **Entrega:** despliegue del backend en Render y compilación del APK con Capacitor para pruebas en dispositivo real.

---

## Arquitectura de la solución

```mermaid
flowchart TB
    subgraph Cliente["Cliente (Ionic + Angular + Capacitor)"]
        UI["Pantallas: Home / Misterio / Mis historias / Suscripción / Login"]
        MAP["Leaflet + OpenStreetMap"]
        SRV["ApiService (HTTP)"]
        UI --> MAP
        UI --> SRV
    end

    subgraph API["Backend FastAPI en Render"]
        R["/rutas · /traducir · /wikipedia · /banos · /tts"]
        A["/registro · /login · /recuperar-password · /actualizar-password"]
        L["/leyendas (CRUD, valorar, reportar) · /actualizar-plan"]
    end

    subgraph Datos["Supabase"]
        AUTH["Supabase Auth"]
        DB[("PostgreSQL + PostGIS<br/>usuarios · leyendas · valoraciones · reportes")]
    end

    subgraph Externas["Servicios externos"]
        W["Wikipedia"]
        O["Overpass / OSM"]
        OSRM["OSRM / routing.openstreetmap.de"]
        TRAD["MyMemory / Google Translate"]
        TTS["Google TTS"]
    end

    SRV -->|HTTPS| R
    SRV -->|HTTPS| A
    SRV -->|HTTPS| L
    A --> AUTH
    L --> DB
    R --> OSRM
    R --> O
    R --> W
    R --> TRAD
    R --> TTS
    MAP -.->|CapacitorHttp| W
    MAP -.->|CapacitorHttp| O
```

### Flujo resumido

1. El usuario abre la aplicación y se consulta la hora real mediante timeapi.io: de noche se activa el **Modo Misterio** y de día, el mapa histórico.
2. Con la geolocalización del dispositivo se buscan lugares en Wikipedia y se dibujan los marcadores con Leaflet.
3. Al abrir un lugar se consulta su extracto e imagen mediante `/wikipedia`, se traduce con `/traducir` y se reproduce con `/tts` si el usuario lo solicita.
4. Las rutas peatonales se calculan en el servidor mediante `/rutas` y los servicios cercanos mediante `/banos`, con respaldo nativo desde el dispositivo.
5. Las leyendas, valoraciones, reportes y planes se persisten en PostgreSQL/PostGIS; la autenticación se delega a Supabase Auth.

### Estructura principal

```text
GeoNyx/
├── backend/
│   ├── main.py              # Todos los endpoints de la API
│   ├── requirements.txt     # Dependencias Python
│   └── .env                 # Variables de entorno (no versionar)
├── documentacion/
│   ├── Informe Proyecto Capstone.docx
│   └── Plan de Pruebas GeoNyx.xlsx
├── frontend/
│   ├── src/app/
│   │   ├── home/            # Mapa, historias, traducción, audio y rutas
│   │   ├── misterio/        # Leyendas nocturnas, votos y reportes
│   │   ├── mis-historias/   # Publicaciones del usuario
│   │   ├── suscripcion/     # Planes Observador / Explorador / Viajero
│   │   ├── login/ · registro/
│   │   └── services/api.ts  # Cliente HTTP hacia el backend
│   ├── android/             # Proyecto nativo Capacitor
│   └── capacitor.config.ts
└── README.md
```

## Documentación del proyecto

- [`Informe Proyecto Capstone`](documentacion/Informe%20Proyecto%20Capstone.docx): documento principal del capstone, actualizado con el plan de pruebas y la corrección de las discrepancias frente al código final.
- [`Plan de Pruebas GeoNyx.xlsx`](documentacion/Plan%20de%20Pruebas%20GeoNyx.xlsx): matriz de 32 casos de prueba con precondiciones, pasos, resultados esperados y estado. Los resultados reales quedan pendientes de confirmación por el equipo.

---

> **Nota de seguridad:** el archivo `.env` contiene credenciales. Nunca debe incluirse en el repositorio; utiliza `.gitignore` y variables de entorno en Render.
