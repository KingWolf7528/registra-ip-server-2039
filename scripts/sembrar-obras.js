// REGISTRA-IP — Obras de prueba para la Práctica 05 (galería con filtros).
// Registra 10 obras con folio OBRA-2039-### a través del API real (POST /obras),
// variando categoría, tipo de archivo y fecha para poder probar búsqueda,
// filtros y ordenamiento.
//
// Uso (con el servidor encendido en otra terminal):  npm run sembrar
//
// Nota: POST /obras siempre guarda la fecha actual. Para probar el orden por
// fecha, este script ajusta después "fechaRegistro" en el JSON de cada obra de
// prueba y la marca con "prueba": true. Solo afecta a estas 10 obras.
const fs = require('node:fs/promises')
const path = require('node:path')
const zlib = require('node:zlib')

const API = process.env.API_URL || 'http://localhost:4000'
const CARPETA_OBRAS = path.join(__dirname, '..', 'data', 'obras')
const YO = 'Pineda Flores Christopher Javier'

// ----------------------------------------------------------------------------
// Generadores de archivos (sin librerías externas)
// ----------------------------------------------------------------------------
const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function bloque(tipo, datos) {
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, crc])
}
// Crea un PNG RGB de ancho × alto; pixel(x, y) devuelve [r, g, b].
function png(ancho, alto, pixel) {
  const filas = []
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(1 + ancho * 3)
    for (let x = 0; x < ancho; x++) {
      const [r, g, b] = pixel(x / ancho, y / alto)
      fila[1 + x * 3] = r
      fila[2 + x * 3] = g
      fila[3 + x * 3] = b
    }
    filas.push(fila)
  }
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(ancho, 0)
  cabecera.writeUInt32BE(alto, 4)
  cabecera[8] = 8 // bits por canal
  cabecera[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', cabecera),
    bloque('IDAT', zlib.deflateSync(Buffer.concat(filas))),
    bloque('IEND', Buffer.alloc(0)),
  ])
}
const mezcla = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))

// PDF mínimo de una página con texto.
function pdf(titulo, lineas) {
  const esc = (t) => t.replace(/[\\()]/g, '\\$&')
  const texto = [
    'BT /F1 22 Tf 72 740 Td (' + esc(titulo) + ') Tj ET',
    ...lineas.map((l, i) => `BT /F1 12 Tf 72 ${700 - i * 18} Td (${esc(l)}) Tj ET`),
  ].join('\n')
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(texto, 'latin1')} >>\nstream\n${texto}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ]
  let salida = '%PDF-1.4\n'
  const posiciones = []
  objetos.forEach((o, i) => {
    posiciones.push(Buffer.byteLength(salida, 'latin1'))
    salida += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = Buffer.byteLength(salida, 'latin1')
  salida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
  salida += posiciones.map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('')
  salida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(salida, 'latin1')
}

// WAV de 16 bits con una melodía corta (frecuencias en Hz).
function wav(notas, duracionNota = 0.35) {
  const tasa = 22050
  const muestras = []
  for (const f of notas) {
    const n = Math.floor(tasa * duracionNota)
    for (let i = 0; i < n; i++) {
      const envolvente = Math.min(1, i / 400, (n - i) / 800)
      muestras.push(Math.round(Math.sin((2 * Math.PI * f * i) / tasa) * 9000 * envolvente))
    }
  }
  const datos = Buffer.alloc(muestras.length * 2)
  muestras.forEach((m, i) => datos.writeInt16LE(m, i * 2))
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + datos.length, 4)
  h.write('WAVEfmt ', 8)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20)
  h.writeUInt16LE(1, 22)
  h.writeUInt32LE(tasa, 24)
  h.writeUInt32LE(tasa * 2, 28)
  h.writeUInt16LE(2, 32)
  h.writeUInt16LE(16, 34)
  h.write('data', 36)
  h.writeUInt32LE(datos.length, 40)
  return Buffer.concat([h, datos])
}

// ----------------------------------------------------------------------------
// Las 10 obras de prueba
// ----------------------------------------------------------------------------
const OBRAS = [
  {
    titulo: 'Atardecer en Xochimilco',
    categoria: 'Fotografía',
    descripcion: 'Trajineras al caer la tarde, tomada desde el embarcadero Nuevo Nativitas.',
    autor: YO,
    fecha: '2026-08-04T18:40:00-06:00',
    archivo: ['atardecer-xochimilco.png', 'image/png', () =>
      png(480, 360, (x, y) => {
        const sol = Math.hypot(x - 0.5, y - 0.55) < 0.12
        if (y > 0.62) return mezcla([40, 30, 60], [10, 20, 40], (y - 0.62) / 0.38)
        return sol ? [255, 214, 120] : mezcla([255, 140, 70], [120, 40, 90], y / 0.62)
      })],
  },
  {
    titulo: 'Logotipo para Café Raíz',
    categoria: 'Diseño gráfico',
    descripcion: 'Propuesta de identidad para una cafetería de especialidad.',
    autor: YO,
    fecha: '2026-08-12T10:15:00-06:00',
    archivo: ['logo-cafe-raiz.png', 'image/png', () =>
      png(400, 400, (x, y) => {
        const d = Math.hypot(x - 0.5, y - 0.5)
        if (d < 0.18) return [96, 32, 57]
        if (d < 0.22) return [245, 233, 238]
        if (d < 0.3) return [140, 90, 60]
        return [245, 240, 232]
      })],
  },
  {
    titulo: 'Cuento: La última trajinera',
    categoria: 'Literatura',
    descripcion: 'Cuento corto sobre un remero que guarda los secretos del canal.',
    autor: YO,
    fecha: '2026-08-21T21:05:00-06:00',
    archivo: ['la-ultima-trajinera.pdf', 'application/pdf', () =>
      pdf('La última trajinera', [
        'Autor: Pineda Flores Christopher Javier',
        '',
        'Don Ramiro remaba desde antes de que existieran los mapas del canal.',
        'Conocía cada chinampa por su olor y cada puente por su eco...',
        '',
        'Obra de prueba registrada en REGISTRA-IP (folio OBRA-2039).',
      ])],
  },
  {
    titulo: 'Ilustración: Ajolote guardián',
    categoria: 'Ilustración',
    descripcion: 'Ilustración digital de un ajolote rosa custodiando un lago.',
    autor: 'María López Ruiz',
    fecha: '2026-09-02T12:30:00-06:00',
    archivo: ['ajolote-guardian.png', 'image/png', () =>
      png(420, 420, (x, y) => {
        const cuerpo = ((x - 0.5) / 0.32) ** 2 + ((y - 0.6) / 0.18) ** 2 < 1
        const cabeza = Math.hypot(x - 0.5, y - 0.38) < 0.17
        const ojo = Math.hypot(x - 0.44, y - 0.36) < 0.025 || Math.hypot(x - 0.56, y - 0.36) < 0.025
        if (ojo) return [30, 20, 30]
        if (cuerpo || cabeza) return [244, 150, 170]
        return mezcla([90, 170, 190], [20, 70, 110], y)
      })],
  },
  {
    titulo: 'Son de la lluvia (demo)',
    categoria: 'Música',
    descripcion: 'Maqueta instrumental de 5 segundos.',
    autor: YO,
    fecha: '2026-09-10T17:45:00-06:00',
    archivo: ['son-de-la-lluvia.wav', 'audio/wav', () =>
      wav([392, 440, 494, 523, 494, 440, 392, 330, 349, 392, 440, 392, 349, 330])],
  },
  {
    titulo: 'Storyboard: Metro Balderas',
    categoria: 'Cine y video',
    descripcion: 'Storyboard de un cortometraje de 3 minutos en el metro.',
    autor: 'Diego Hernández Soto',
    fecha: '2026-09-18T09:20:00-06:00',
    archivo: ['storyboard-metro-balderas.png', 'image/png', () =>
      png(480, 320, (x, y) => {
        const marco = (x % 0.5 < 0.02 || x % 0.5 > 0.48 || y % 0.5 < 0.03 || y % 0.5 > 0.47)
        if (marco) return [28, 27, 31]
        const vagon = y % 0.5 > 0.25 && y % 0.5 < 0.4
        return vagon ? [240, 140, 40] : [232, 230, 224]
      })],
  },
  {
    titulo: 'Fotografía: Mercado de Jamaica',
    categoria: 'Fotografía',
    descripcion: 'Colores del pasillo de flores un domingo por la mañana.',
    autor: YO,
    fecha: '2026-09-27T08:10:00-06:00',
    archivo: ['mercado-jamaica.png', 'image/png', () =>
      png(480, 360, (x, y) => {
        const flores = [[230, 60, 90], [250, 200, 60], [150, 60, 170], [250, 120, 40], [240, 240, 240]]
        const i = Math.floor(x * 10 + Math.sin(y * 18) * 1.5 + 10) % flores.length
        return mezcla(flores[i], [40, 110, 50], y > 0.75 ? (y - 0.75) * 3 : 0)
      })],
  },
  {
    titulo: 'Poema: Ciudad de agua',
    categoria: 'Literatura',
    descripcion: 'Poema en verso libre sobre la Ciudad de México.',
    autor: 'Valeria Cruz Ramírez',
    fecha: '2026-10-05T22:00:00-06:00',
    archivo: ['ciudad-de-agua.txt', 'text/plain', () =>
      Buffer.from(
        'Ciudad de agua\n\nBajo el asfalto todavía late el lago,\n' +
          'cada bache es un recuerdo de la orilla.\n\n— Obra de prueba, REGISTRA-IP\n',
        'utf8',
      )],
  },
  {
    titulo: 'Cartel Festival de Diseño 2026',
    categoria: 'Diseño gráfico',
    descripcion: 'Cartel tipográfico con retícula modular.',
    autor: YO,
    fecha: '2026-10-12T13:35:00-06:00',
    archivo: ['cartel-festival-diseno.png', 'image/png', () =>
      png(360, 480, (x, y) => {
        const celda = (Math.floor(x * 6) + Math.floor(y * 8)) % 3
        if (y < 0.2) return [96, 32, 57]
        return [[245, 233, 238], [138, 58, 87], [31, 122, 92]][celda]
      })],
  },
  {
    titulo: 'Cortometraje: Lluvia en Coyoacán (póster)',
    categoria: 'Cine y video',
    descripcion: 'Póster del cortometraje; el video completo se entregará después.',
    autor: YO,
    fecha: '2026-10-19T19:50:00-06:00',
    archivo: ['poster-lluvia-coyoacan.png', 'image/png', () =>
      png(360, 480, (x, y) => {
        const gota = (Math.floor(x * 40) * 7 + Math.floor(y * 60)) % 23 === 0
        if (gota) return [200, 220, 255]
        return mezcla([30, 40, 70], [90, 60, 110], y)
      })],
  },
]

// ----------------------------------------------------------------------------
async function main() {
  console.log(`Conectando con ${API} ...`)
  let existentes
  try {
    existentes = await (await fetch(`${API}/obras`)).json()
  } catch {
    console.error('No hay conexión con el servidor. Enciéndelo con "npm start" y vuelve a intentar.')
    process.exit(1)
  }
  const titulos = new Set(existentes.map((o) => o.titulo))

  let registradas = 0
  for (const obra of OBRAS) {
    if (titulos.has(obra.titulo)) {
      console.log(`  = ya existe: ${obra.titulo}`)
      continue
    }
    const { folio } = await (await fetch(`${API}/obras/siguiente-folio`)).json()
    const [nombre, tipo, generar] = obra.archivo
    const datos = new FormData()
    datos.append('folio', folio)
    datos.append('titulo', obra.titulo)
    datos.append('categoria', obra.categoria)
    datos.append('descripcion', obra.descripcion)
    datos.append('autor', obra.autor)
    datos.append('correoAutor', '')
    datos.append('archivo', new Blob([generar()], { type: tipo }), nombre)

    const respuesta = await fetch(`${API}/obras`, { method: 'POST', body: datos })
    const cuerpo = await respuesta.json()
    if (!respuesta.ok) {
      console.error(`  ✗ ${obra.titulo}: ${(cuerpo.errores || []).join(' ')}`)
      continue
    }

    // Ajuste de fecha para probar el ordenamiento (ver nota al inicio).
    const archivoJson = path.join(CARPETA_OBRAS, `${cuerpo.folio}.json`)
    const guardada = JSON.parse(await fs.readFile(archivoJson, 'utf8'))
    guardada.fechaRegistro = new Date(obra.fecha).toISOString()
    guardada.prueba = true
    await fs.writeFile(archivoJson, JSON.stringify(guardada, null, 2), 'utf8')

    registradas++
    console.log(`  ✓ ${cuerpo.folio}  ${obra.categoria.padEnd(15)} ${obra.fecha.slice(0, 10)}  ${obra.titulo}`)
  }
  console.log(`\nListo: ${registradas} obras nuevas. Total en el sistema: ${existentes.length + registradas}.`)
}

main()
