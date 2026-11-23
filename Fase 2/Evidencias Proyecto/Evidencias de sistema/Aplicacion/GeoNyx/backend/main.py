from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
import json
import os
import re
import urllib.parse
import urllib.request

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

engine = create_engine(DATABASE_URL)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="GeoNyx API")

# API pública: se permite cualquier origen (login/registro usan token en el body, no cookies)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NuevaLeyenda(BaseModel):
    titulo: str
    historia: str
    latitud: float
    longitud: float
    id_usuario: int

class UsuarioRegistro(BaseModel):
    email: str
    password: str
    alias: str 

class UsuarioLogin(BaseModel):
    email: str
    password: str

class LeyendaUpdate(BaseModel):
    titulo: str
    historia: str

class ValoracionLeyenda(BaseModel):
    id_usuario: int
    puntuacion: int

class ReporteLeyenda(BaseModel):
    id_usuario: int
    motivo: str

class EmailRecuperacion(BaseModel):
    email: str

class NuevaPassword(BaseModel):
    access_token: str
    refresh_token: str
    new_password: str

@app.get("/")
def raiz():
    return "El servidor de GeoNyx está funcionando"


def _obtener_json(url: str, timeout: int = 20):
    """Descarga un JSON externo desde el servidor (evita bloqueos de red del teléfono)."""
    peticion = urllib.request.Request(url, headers={"User-Agent": "GeoNyx/1.0"})
    with urllib.request.urlopen(peticion, timeout=timeout) as respuesta:
        return json.loads(respuesta.read().decode("utf-8"))


@app.get("/rutas")
def obtener_rutas(coords: str):
    """coords = lng,lat;lng,lat;...  Calcula rutas peatonales en el servidor."""
    patron = r"-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?(?:;-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?){1,10}"
    if not re.fullmatch(patron, coords):
        raise HTTPException(status_code=400, detail="Formato de coordenadas inválido")

    urls = [
        "https://routing.openstreetmap.de/routed-foot/route/v1/driving/"
        + coords + "?overview=full&geometries=geojson&alternatives=true",
        "https://router.project-osrm.org/route/v1/driving/"
        + coords + "?overview=full&geometries=geojson&alternatives=true",
    ]
    errores = []
    respuestas = []
    for url in urls:
        try:
            datos = _obtener_json(url)
            if datos.get("code") == "Ok" and datos.get("routes"):
                respuestas.append(datos)
            else:
                errores.append("respuesta sin rutas")
        except Exception as exc:
            errores.append(str(exc))

    if not respuestas:
        raise HTTPException(status_code=502, detail="No se pudo calcular la ruta: " + "; ".join(errores))

    principal = respuestas[0]
    # El servidor peatonal suele devolver una sola ruta; tomamos la alternativa del otro.
    if len(principal["routes"]) == 1:
        for alternativa in respuestas[1:]:
            if len(alternativa["routes"]) > 1:
                principal = {
                    **principal,
                    "routes": [principal["routes"][0], alternativa["routes"][1]],
                }
                break
    return principal


@app.get("/traducir")
def traducir(texto: str, idioma: str):
    """Traduce español -> idioma usando MyMemory, con Google como respaldo."""
    if not texto or not idioma:
        raise HTTPException(status_code=400, detail="Faltan parámetros")

    lang = "zh-CN" if idioma == "zh" else idioma
    errores = []
    partes = []

    # MyMemory limita el tamaño de la petición: traducimos por trozos desde el servidor.
    for inicio in range(0, len(texto), 450):
        trozo = texto[inicio:inicio + 450]
        traduccion = ""

        url_mem = ("https://api.mymemory.translated.net/get?q="
                   + urllib.parse.quote(trozo)
                   + "&langpair=" + urllib.parse.quote("es|" + lang))
        try:
            datos = _obtener_json(url_mem)
            traduccion = (datos.get("responseData") or {}).get("translatedText") or ""
        except Exception as exc:
            errores.append(str(exc))

        if not traduccion:
            url_google = ("https://translate.googleapis.com/translate_a/single?client=gtx"
                          "&sl=es&tl=" + urllib.parse.quote(lang)
                          + "&dt=t&q=" + urllib.parse.quote(trozo))
            try:
                datos = _obtener_json(url_google)
                if isinstance(datos, list) and datos and isinstance(datos[0], list):
                    traduccion = "".join(parte[0] for parte in datos[0] if parte and parte[0])
            except Exception as exc:
                errores.append(str(exc))

        if traduccion:
            partes.append(traduccion)

    if partes:
        return {"texto": " ".join(partes).strip()}

    raise HTTPException(status_code=502, detail="No se pudo traducir: " + "; ".join(errores[:3]))


@app.get("/wikipedia")
def wikipedia(pageid: int):
    """Devuelve el extracto y la imagen de un lugar de Wikipedia."""
    url = ("https://es.wikipedia.org/w/api.php?action=query"
           "&prop=extracts%7Cpageimages&pageids=" + str(pageid)
           + "&exintro=true&explaintext=true&piprop=original&format=json&origin=*")
    try:
        datos = _obtener_json(url)
        paginas = (datos.get("query") or {}).get("pages") or {}
        pagina = paginas.get(str(pageid)) or {}
        return {
            "extracto": pagina.get("extract", ""),
            "imagen": (pagina.get("original") or {}).get("source"),
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Error consultando Wikipedia: " + str(exc))


@app.get("/test-db")
def probar_base_datos():
    try:
        with engine.connect() as connection:
            resultado = connection.execute(text("SELECT version();"))
            version = resultado.fetchone()
            return {"estado": "Conexión exitosa con Supabase", "version_postgres": version[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en la conexión: {str(e)}")

@app.post("/registro")
async def registro(user: UsuarioRegistro):
    try:
        response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password
        })
        
        nuevo_id = None
        if response.user:
            with engine.connect() as connection:
                query = text("""
                    INSERT INTO usuarios (alias, email, password_hash, nacionalidad, fecha_registro)
                    VALUES (:alias, :email, :password_hash, 'Chile', NOW())
                    RETURNING id_usuario
                """)
                resultado = connection.execute(query, {
                    "alias": user.alias,
                    "email": user.email,
                    "password_hash": "gestionado_por_supabase"
                })
                nuevo_id = resultado.scalar() 
                connection.commit()

        return {
            "mensaje": "Usuario registrado con éxito",
            "usuario_id": nuevo_id,
            "token": response.session.access_token if response.session else None
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Reemplaza SOLO la función @app.post("/login") en tu main.py actual

@app.post("/login")
async def login(user: UsuarioLogin):
    try:
        email_para_auth = user.email
        
        # 1. Si el usuario escribió su Alias (ej. "CeCe") en lugar de un correo,
        # buscamos cuál es su correo real en la base de datos
        if "@" not in email_para_auth:
            with engine.connect() as connection:
                query = text("SELECT email FROM usuarios WHERE alias = :alias")
                resultado = connection.execute(query, {"alias": email_para_auth})
                db_email = resultado.scalar()
                if db_email:
                    email_para_auth = db_email
                else:
                    raise HTTPException(status_code=401, detail="Usuario no encontrado")

        # 2. Ahora sí iniciamos sesión en Supabase con el correo real
        response = supabase.auth.sign_in_with_password({
            "email": email_para_auth,
            "password": user.password
        })
        
        real_id = None
        alias_usuario = "Explorador"
        tipo_plan_usuario = "observador"
        
        # 3. Traemos el resto de sus datos para mandarlos al Frontend
        with engine.connect() as connection:
            query = text("SELECT id_usuario, alias, tipo_plan FROM usuarios WHERE email = :email")
            resultado = connection.execute(query, {"email": email_para_auth})
            db_user = resultado.fetchone()
            if db_user:
                real_id = db_user[0]
                alias_usuario = db_user[1]
                tipo_plan_usuario = db_user[2] if db_user[2] else "observador"
        
        return {
            "mensaje": "Login exitoso",
            "token": response.session.access_token,
            "usuario_id": real_id, 
            "alias": alias_usuario,
            "tipo_plan": tipo_plan_usuario
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    
@app.get("/leyendas")
def obtener_leyendas():
    try:
        with engine.connect() as connection:
            query = text("""
                SELECT l.id_leyenda, l.titulo, l.historia, 
                       ST_X(l.ubicacion::geometry) as longitud, 
                       ST_Y(l.ubicacion::geometry) as latitud, 
                       l.valoracion_promedio,
                       l.id_usuario,
                       u.alias as alias_autor,
                       l.fecha_publicacion
                FROM leyendas l
                LEFT JOIN usuarios u ON l.id_usuario = u.id_usuario
                WHERE l.activa = TRUE
            """)
            resultado = connection.execute(query)
            leyendas = []
            for fila in resultado:
                leyendas.append({
                    "id_leyenda": fila[0],
                    "titulo": fila[1],
                    "historia": fila[2],
                    "longitud": fila[3],
                    "latitud": fila[4],
                    "valoracion": float(fila[5]) if fila[5] else 0.0,
                    "id_usuario": fila[6],                           
                    "alias_autor": fila[7] if fila[7] else "Anónimo",
                    "fecha_publicacion": str(fila[8]) if len(fila) > 8 and fila[8] else None
                })
            return leyendas
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/leyendas")
def crear_leyenda(leyenda: NuevaLeyenda):
    try:
        with engine.connect() as connection:
            query = text("""
                INSERT INTO leyendas (titulo, historia, id_usuario, ubicacion)
                VALUES (:titulo, :historia, :id_usuario, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
            """)
            connection.execute(query, {
                "titulo": leyenda.titulo,
                "historia": leyenda.historia,
                "id_usuario": leyenda.id_usuario,
                "lon": leyenda.longitud,
                "lat": leyenda.latitud
            })
            connection.commit()
            return {"mensaje": "Leyenda creada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/leyendas/{id_leyenda}")
def actualizar_leyenda(id_leyenda: int, leyenda: LeyendaUpdate):
    try:
        with engine.connect() as connection:
            query = text("""
                UPDATE leyendas
                SET titulo = :titulo, historia = :historia
                WHERE id_leyenda = :id_leyenda
            """)
            connection.execute(query, {
                "titulo": leyenda.titulo,
                "historia": leyenda.historia,
                "id_leyenda": id_leyenda
            })
            connection.commit()
            return {"mensaje": "Leyenda actualizada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/leyendas/{id_leyenda}")
def borrar_leyenda(id_leyenda: int):
    try:
        with engine.connect() as connection:
            query = text("DELETE FROM leyendas WHERE id_leyenda = :id_leyenda")
            connection.execute(query, {"id_leyenda": id_leyenda})
            connection.commit()
            return {"mensaje": "Leyenda borrada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/leyendas/{id_leyenda}/valorar")
def valorar_leyenda(id_leyenda: int, val: ValoracionLeyenda):
    try:
        with engine.connect() as connection:
            query = text("""
                INSERT INTO valoraciones (id_leyenda, id_usuario, puntuacion)
                VALUES (:id_leyenda, :id_usuario, :puntuacion)
                ON CONFLICT (id_leyenda, id_usuario) 
                DO UPDATE SET puntuacion = EXCLUDED.puntuacion
            """)
            connection.execute(query, {
                "id_leyenda": id_leyenda,
                "id_usuario": val.id_usuario,
                "puntuacion": val.puntuacion
            })
            connection.commit()
        return {"mensaje": "Valoración guardada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/leyendas/{id_leyenda}/reportar")
def reportar_leyenda(id_leyenda: int, reporte: ReporteLeyenda):
    try:
        with engine.connect() as connection:
            query = text("""
                INSERT INTO reportes (id_leyenda, id_usuario_denunciante, motivo, fecha)
                VALUES (:id_leyenda, :id_usuario, :motivo, NOW())
            """)
            connection.execute(query, {
                "id_leyenda": id_leyenda,
                "id_usuario": reporte.id_usuario, 
                "motivo": reporte.motivo
            })
            connection.commit()
            return {"mensaje": "Reporte enviado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/leyendas/{id_leyenda}/valoraciones/{id_usuario}")
def obtener_valoracion(id_leyenda: int, id_usuario: int):
    with engine.connect() as conn:
        res_promedio = conn.execute(text("SELECT AVG(puntuacion) FROM valoraciones WHERE id_leyenda = :id"), {"id": id_leyenda}).scalar()
        res_usuario = conn.execute(text("SELECT puntuacion FROM valoraciones WHERE id_leyenda = :idl AND id_usuario = :idu"), {"idl": id_leyenda, "idu": id_usuario}).scalar()

    return {
        "promedio": round(res_promedio, 1) if res_promedio else 0.0,
        "mi_voto": res_usuario if res_usuario else 0
    }

@app.post("/recuperar-password")
def recuperar_password(datos: EmailRecuperacion):
    try:
        res = supabase.auth.reset_password_email(datos.email)
        return {"mensaje": "Correo de recuperación enviado exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud de recuperación.")

@app.post("/actualizar-password")
def actualizar_password(datos: NuevaPassword):
    try:
        supabase.auth.set_session(datos.access_token, datos.refresh_token)
        supabase.auth.update_user({"password": datos.new_password})
        supabase.auth.sign_out()
        return {"mensaje": "Contraseña actualizada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="El enlace ha expirado o es inválido")

class ActualizarPlanRequest(BaseModel):
    id_usuario: int
    nuevo_plan: str

@app.post("/actualizar-plan")
def actualizar_plan(datos: ActualizarPlanRequest):
    try:
        with engine.connect() as connection:
            query = text("""
                UPDATE usuarios
                SET tipo_plan = :nuevo_plan
                WHERE id_usuario = :id_usuario
            """)
            resultado = connection.execute(query, {
                "nuevo_plan": datos.nuevo_plan,
                "id_usuario": datos.id_usuario
            })
            connection.commit()
            
            if resultado.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
                
        return {"mensaje": f"Plan actualizado exitosamente a {datos.nuevo_plan}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en base de datos: {str(e)}")