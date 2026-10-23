# REGISTRA-IP — Servidor

**Nombre:** Pineda Flores Christopher Javier
**Boleta:** 2024602039

API de REGISTRA-IP (Registro y verificación de autoría) para la materia Diseño de Interfaces de Usuario. Recibe las obras desde el frontend [registra-ip-2039](https://github.com/KingWolf7528/registra-ip-2039), guarda el archivo en `uploads/` y los metadatos en `data/obras/`.

## Tecnologías

- **Express**: servidor HTTP y rutas.
- **cors**: permite que el frontend (`localhost:5173`) llame a la API (`localhost:4000`).
- **multer**: recibe archivos enviados como `multipart/form-data`.

## Cómo ejecutar

```bash
npm install
npm start        # http://localhost:4000
```

## Estructura

```
registra-ip-server/
├── server.js       # Express: cors, multer y rutas
├── obras.js        # Lógica: folios, validación, guardado y lectura
├── uploads/        # Archivos reales de las obras (OBRA-2039-001.png, …)
└── data/obras/     # Un JSON de metadatos por obra (OBRA-2039-001.json, …)
```

`uploads/` y `data/obras/` están en `.gitignore`: los archivos de los usuarios viven en el servidor, no en el repositorio.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Estado del servicio |
| `GET` | `/obras` | Lista de todas las obras registradas |
| `GET` | `/obras/siguiente-folio` | Folio que recibirá la próxima obra |
| `GET` | `/categorias` | Categorías válidas |
| `POST` | `/obras` | Registra una obra (`multipart/form-data`) |
| `GET` | `/uploads/<archivo>` | Descarga el archivo guardado |

### `POST /obras`

Campos (`FormData`): `archivo` (el archivo, vía `multer.single("archivo")`), `folio`, `titulo`, `categoria`, `descripcion`, `autor`, `correoAutor`.

- **201**: devuelve la obra guardada con su `folio`.
- **400**: `{ "errores": [...] }` si falta el archivo, el título tiene menos de 5 caracteres, la categoría no es válida, el folio no tiene el formato o el archivo pasa de 10 MB.

## Folios

Formato **`OBRA-2039-###`** (2039 = últimos 4 dígitos de la boleta). El frontend propone el folio; si ya está ocupado, el servidor asigna el siguiente libre para que nunca se repita.

## Obras de prueba (Práctica 05)

Con el servidor encendido, en otra terminal:

```bash
npm run sembrar
```

`scripts/sembrar-obras.js` registra **10 obras de prueba** (`OBRA-2039-###`) usando el propio `POST /obras`. Las obras tienen:

- **6 categorías distintas:** Fotografía, Diseño gráfico, Literatura, Ilustración, Música, Cine y video.
- **5 tipos de archivo generados por el script:** PNG, PDF, WAV, TXT.
- **Fechas de agosto a octubre de 2026**, para probar el ordenamiento.
- **4 autores distintos**, para probar la búsqueda por autor.

Como `POST /obras` siempre guarda la fecha actual, el script ajusta después `fechaRegistro` en el JSON de cada obra de prueba y la marca con `"prueba": true`. Si se ejecuta dos veces, no duplica obras.
