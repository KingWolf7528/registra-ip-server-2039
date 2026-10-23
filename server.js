// REGISTRA-IP — Servidor (Práctica 03)
// Autor: Pineda Flores Christopher Javier · Boleta 2024602039
const path = require('node:path')
const fs = require('node:fs')
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const { crearRepositorio, PREFIJO_FOLIO, CATEGORIAS } = require('./obras')

const PUERTO = process.env.PORT || 4000
const CARPETA_UPLOADS = path.join(__dirname, 'uploads')
const CARPETA_OBRAS = path.join(__dirname, 'data', 'obras')

// Nos aseguramos de que existan las carpetas de almacenamiento.
fs.mkdirSync(CARPETA_UPLOADS, { recursive: true })
fs.mkdirSync(CARPETA_OBRAS, { recursive: true })

const obras = crearRepositorio({
  carpetaObras: CARPETA_OBRAS,
  carpetaUploads: CARPETA_UPLOADS,
})

// ---------- multer: dónde y con qué nombre se guardan los archivos ----------
const almacenamiento = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CARPETA_UPLOADS),
  filename: (req, file, cb) => {
    // Nombre temporal único; al registrar la obra se renombra con su folio.
    const extension = path.extname(file.originalname).toLowerCase()
    cb(null, `tmp-${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`)
  },
})

const subir = multer({
  storage: almacenamiento,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
})

// ---------- Aplicación ----------
const app = express()
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(CARPETA_UPLOADS))

app.get('/', (req, res) => {
  res.json({ servicio: 'REGISTRA-IP API', estado: 'ok', prefijoFolio: PREFIJO_FOLIO })
})

// GET /obras → lista de todas las obras registradas
app.get('/obras', async (req, res, next) => {
  try {
    res.json(await obras.listar())
  } catch (err) {
    next(err)
  }
})

// GET /obras/siguiente-folio → folio que recibirá la próxima obra
app.get('/obras/siguiente-folio', async (req, res, next) => {
  try {
    res.json({ folio: await obras.siguienteFolio() })
  } catch (err) {
    next(err)
  }
})

// GET /categorias → categorías válidas
app.get('/categorias', (req, res) => res.json(CATEGORIAS))

// POST /obras → recibe el archivo (campo "archivo") y los metadatos
app.post('/obras', subir.single('archivo'), async (req, res, next) => {
  try {
    // multer convierte el nombre a latin1; lo regresamos a UTF-8 (acentos, ñ).
    if (req.file) {
      req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
    }
    const datos = req.body || {}
    const errores = obras.validar(datos, req.file)
    if (errores.length > 0) {
      if (req.file) fs.unlink(req.file.path, () => {})
      return res.status(400).json({ errores })
    }
    const obra = await obras.registrar(datos, req.file)
    console.log(`Obra registrada: ${obra.folio} — ${obra.titulo}`)
    res.status(201).json(obra)
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {})
    next(err)
  }
})

// Manejo de errores (archivo muy grande, errores inesperados, etc.)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const mensaje =
      err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el límite de 10 MB.' : err.message
    return res.status(400).json({ errores: [mensaje] })
  }
  console.error(err)
  res.status(500).json({ errores: ['Error interno del servidor.'] })
})

app.listen(PUERTO, () => {
  console.log(`REGISTRA-IP API escuchando en http://localhost:${PUERTO}`)
})
