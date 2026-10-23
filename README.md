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
