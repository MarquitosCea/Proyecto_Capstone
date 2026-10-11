from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from supabase import create_client, Client

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

engine = create_engine(DATABASE_URL)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="GeoNyx API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
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

@app.post("/login")
async def login(user: UsuarioLogin):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })
        
        real_id = None
        alias_usuario = "Explorador"
        
        with engine.connect() as connection:
            query = text("SELECT id_usuario, alias FROM usuarios WHERE email = :email")
            resultado = connection.execute(query, {"email": user.email})
            db_user = resultado.fetchone()
            if db_user:
                real_id = db_user[0]
                alias_usuario = db_user[1]
        
        return {
            "mensaje": "Login exitoso",
            "token": response.session.access_token,
            "usuario_id": real_id, 
            "alias": alias_usuario 
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    
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
        print(f"Error al valorar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/leyendas/{id_leyenda}/reportar")
def reportar_leyenda(id_leyenda: int, reporte: ReporteLeyenda):
    try:
        with engine.connect() as connection:
            # CAMBIO: Usamos id_usuario_denunciante y fecha para coincidir con la base de datos
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
        # 1. Buscar promedio global
        res_promedio = conn.execute(text("SELECT AVG(puntuacion) FROM valoraciones WHERE id_leyenda = :id"), {"id": id_leyenda}).scalar()
        # 2. Buscar voto de este usuario
        res_usuario = conn.execute(text("SELECT puntuacion FROM valoraciones WHERE id_leyenda = :idl AND id_usuario = :idu"), {"idl": id_leyenda, "idu": id_usuario}).scalar()

    return {
        "promedio": round(res_promedio, 1) if res_promedio else 0.0,
        "mi_voto": res_usuario if res_usuario else 0
    }

@app.post("/recuperar-password")
def recuperar_password(datos: EmailRecuperacion):
    try:
        # Supabase envía automáticamente el correo de reseteo configurado en tu proyecto
        res = supabase.auth.reset_password_email(datos.email)
        return {"mensaje": "Correo de recuperación enviado exitosamente"}
    except Exception as e:
        print(f"Error al enviar recuperación: {e}")
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud de recuperación.")

@app.post("/actualizar-password")
def actualizar_password(datos: NuevaPassword):
    try:
        # 1. Establecer la sesión temporal con los tokens recibidos
        supabase.auth.set_session(datos.access_token, datos.refresh_token)
        
        # 2. Cambiar la contraseña del usuario autenticado
        supabase.auth.update_user({"password": datos.new_password})
        
        # 3. Cerrar la sesión temporal para obligarlo a hacer login normal
        supabase.auth.sign_out()
        
        return {"mensaje": "Contraseña actualizada exitosamente"}
    except Exception as e:
        print(f"Error actualizando password: {e}")
        raise HTTPException(status_code=400, detail="El enlace ha expirado o es inválido")