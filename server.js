// REGISTRA-IP — Servidor (Práctica 03)
// Autor: Pineda Flores Christopher Javier · Boleta 2024602039
const path = require('node:path')
const fs = require('node:fs')
const express = require('express')
const cors = require('cors')
const multer = require('multer')

const PUERTO = process.env.PORT || 4000
const CARPETA_UPLOADS = path.join(__dirname, 'uploads')
const CARPETA_OBRAS = path.join(__dirname, 'data', 'obras')

// Nos aseguramos de que existan las carpetas de almacenamiento.
fs.mkdirSync(CARPETA_UPLOADS, { recursive: true })
fs.mkdirSync(CARPETA_OBRAS, { recursive: true })

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
  res.json({ servicio: 'REGISTRA-IP API', estado: 'ok' })
})

app.listen(PUERTO, () => {
  console.log(`REGISTRA-IP API escuchando en http://localhost:${PUERTO}`)
})

module.exports = { app, subir }
