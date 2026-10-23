// Lógica de las obras: folios, guardado de metadatos y lectura.
// Separada de server.js para poder probarla sin levantar el servidor.
const path = require('node:path')
const fs = require('node:fs/promises')

// Personalización obligatoria: últimos 4 dígitos de la boleta 2024602039.
const PREFIJO_FOLIO = 'OBRA-2039'
const REGEX_FOLIO = /^OBRA-2039-(\d{3})$/

const CATEGORIAS = [
  'Diseño gráfico',
  'Fotografía',
  'Ilustración',
  'Literatura',
  'Música',
  'Cine y video',
  'Otro',
]

function crearRepositorio({ carpetaObras, carpetaUploads }) {
  async function listar() {
    const archivos = await fs.readdir(carpetaObras)
    const obras = []
    for (const nombre of archivos.filter((n) => n.endsWith('.json'))) {
      try {
        const texto = await fs.readFile(path.join(carpetaObras, nombre), 'utf8')
        obras.push(JSON.parse(texto))
      } catch {
        // Un JSON dañado no debe tumbar la lista completa.
      }
    }
    return obras.sort((a, b) => a.folio.localeCompare(b.folio))
  }

  async function siguienteFolio() {
    const obras = await listar()
    const mayor = obras.reduce((max, obra) => {
      const m = REGEX_FOLIO.exec(obra.folio)
      return m ? Math.max(max, Number(m[1])) : max
    }, 0)
    return `${PREFIJO_FOLIO}-${String(mayor + 1).padStart(3, '0')}`
  }

  // Valida los metadatos; devuelve una lista de mensajes de error.
  function validar(datos, archivo) {
    const errores = []
    if (!archivo) errores.push('Falta el archivo de la obra (campo "archivo").')
    if (!datos.titulo || datos.titulo.trim().length < 5)
      errores.push('El título debe tener al menos 5 caracteres.')
    if (!CATEGORIAS.includes(datos.categoria))
      errores.push(`La categoría debe ser una de: ${CATEGORIAS.join(', ')}.`)
    if (!datos.autor || !datos.autor.trim()) errores.push('Falta el autor.')
    if (datos.folio && !REGEX_FOLIO.test(datos.folio))
      errores.push(`El folio debe tener el formato ${PREFIJO_FOLIO}-###.`)
    return errores
  }

  // Guarda una obra: renombra el archivo subido con su folio y escribe el JSON.
  async function registrar(datos, archivo) {
    const existentes = new Set((await listar()).map((o) => o.folio))
    // Se respeta el folio que propone el frontend si está libre;
    // si ya existe (dos registros al mismo tiempo), se asigna el siguiente.
    const folio = datos.folio && !existentes.has(datos.folio) ? datos.folio : await siguienteFolio()

    const extension = path.extname(archivo.originalname).toLowerCase()
    const nombreGuardado = `${folio}${extension}`
    await fs.rename(archivo.path, path.join(carpetaUploads, nombreGuardado))

    const obra = {
      folio,
      titulo: datos.titulo.trim(),
      categoria: datos.categoria,
      descripcion: (datos.descripcion || '').trim(),
      autor: datos.autor.trim(),
      correoAutor: (datos.correoAutor || '').trim(),
      archivo: {
        nombreOriginal: archivo.originalname,
        nombreGuardado,
        tipo: archivo.mimetype,
        tamano: archivo.size,
        url: `/uploads/${encodeURIComponent(nombreGuardado)}`,
      },
      fechaRegistro: new Date().toISOString(),
    }
    await fs.writeFile(
      path.join(carpetaObras, `${folio}.json`),
      JSON.stringify(obra, null, 2),
      'utf8',
    )
    return obra
  }

  return { listar, siguienteFolio, validar, registrar }
}

module.exports = { crearRepositorio, PREFIJO_FOLIO, CATEGORIAS }
