import PdfPrinter from 'pdfmake';
import { db } from '../../db/knex.js';
import { obtenerOrden } from './ordenes.service.js';

const printer = new PdfPrinter({
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
});

const fmtQ = (n) => `Q ${Number(n).toFixed(2)}`;
const fmtFecha = (d) => new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });

async function encabezado(titulo, orden) {
  const empresa = await db('empresa').first();
  return [
    { text: empresa?.nombre_comercial || 'Laboratorio', style: 'empresa' },
    empresa?.direccion ? { text: empresa.direccion, style: 'sub' } : null,
    empresa?.telefonos ? { text: `Tel: ${empresa.telefonos}`, style: 'sub' } : null,
    { text: titulo, style: 'titulo', margin: [0, 12, 0, 8] },
    {
      columns: [
        [
          { text: [{ text: 'Paciente: ', bold: true }, orden.paciente] },
          { text: [{ text: 'Edad: ', bold: true }, `${orden.edad_paciente} años`] },
          { text: [{ text: 'Médico: ', bold: true }, orden.medico] },
        ],
        [
          { text: [{ text: 'Orden No: ', bold: true }, String(orden.id)], alignment: 'right' },
          { text: [{ text: 'Fecha: ', bold: true }, fmtFecha(orden.fecha_cotizacion)], alignment: 'right' },
        ],
      ],
      margin: [0, 0, 0, 10],
    },
  ].filter(Boolean);
}

const estilos = {
  empresa: { fontSize: 15, bold: true, alignment: 'center' },
  sub: { fontSize: 9, alignment: 'center', color: '#555555' },
  titulo: { fontSize: 12, bold: true, alignment: 'center', decoration: 'underline' },
  th: { bold: true, fillColor: '#f0f0f0', fontSize: 9 },
  td: { fontSize: 9 },
  categoria: { bold: true, fontSize: 10, margin: [0, 8, 0, 2] },
};

function docBase(content) {
  return {
    pageSize: 'LETTER',
    pageMargins: [40, 40, 40, 50],
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    styles: estilos,
    content,
    footer: (page, pages) => ({
      text: `Página ${page} de ${pages}`, alignment: 'center', fontSize: 8, color: '#888888',
    }),
  };
}

export async function pdfCotizacion(idOrden) {
  const orden = await obtenerOrden(idOrden);
  const filas = orden.detalles.map((d) => [
    { text: d.codigo, style: 'td' },
    { text: d.examen, style: 'td' },
    { text: fmtQ(d.precio), style: 'td', alignment: 'right' },
  ]);

  const content = [
    ...await encabezado('COTIZACIÓN', orden),
    {
      table: {
        headerRows: 1,
        widths: [70, '*', 80],
        body: [
          [{ text: 'Código', style: 'th' }, { text: 'Examen', style: 'th' }, { text: 'Precio', style: 'th', alignment: 'right' }],
          ...filas,
          [{ text: '', border: [false, false, false, false] },
           { text: 'TOTAL', bold: true, alignment: 'right' },
           { text: fmtQ(orden.total), bold: true, alignment: 'right' }],
        ],
      },
      layout: 'lightHorizontalLines',
    },
    orden.observaciones
      ? { text: [{ text: 'Observaciones: ', bold: true }, orden.observaciones], margin: [0, 10, 0, 0], fontSize: 9 }
      : null,
  ].filter(Boolean);

  return printer.createPdfKitDocument(docBase(content));
}

function filaResultado(d) {
  const tipo = Number(d.tipo_examen);
  let referencia = '';
  if (tipo === 1 && (d.rango_inferior != null || d.rango_superior != null)) {
    referencia = `${d.rango_inferior ?? ''} - ${d.rango_superior ?? ''} ${d.unidad_medida ?? ''}`.trim();
  } else if (d.valor_deseado) {
    referencia = d.valor_deseado;
  }
  return [
    { text: d.examen, style: 'td' },
    { text: d.resultado ?? '', style: 'td', bold: true },
    { text: tipo === 1 ? (d.unidad_medida ?? '') : '', style: 'td' },
    { text: referencia, style: 'td', color: '#444444' },
  ];
}

export async function pdfResultados(idOrden) {
  const orden = await obtenerOrden(idOrden);

  // Agrupar por categoría, respetando el orden de impresión
  const porCategoria = new Map();
  for (const d of orden.detalles) {
    if (Number(d.tipo_examen) === 4 || Number(d.tipo_examen) === 5) continue; // heces/orina van aparte
    if (!porCategoria.has(d.categoria)) porCategoria.set(d.categoria, []);
    porCategoria.get(d.categoria).push(d);
  }

  const content = [...await encabezado('RESULTADOS DE LABORATORIO', orden)];

  for (const [categoria, dets] of porCategoria) {
    content.push({ text: categoria, style: 'categoria' });
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 90, 70, 150],
        body: [
          [{ text: 'Examen', style: 'th' }, { text: 'Resultado', style: 'th' },
           { text: 'Unidad', style: 'th' }, { text: 'Valores de referencia', style: 'th' }],
          ...dets.map(filaResultado),
        ],
      },
      layout: 'lightHorizontalLines',
    });
  }

  // Sección de heces
  if (orden.resultado_heces.length) {
    const cats = await db('categoria_heces').where('estado', 1).orderBy('orden');
    const params = await db('parametros_heces');
    content.push({ text: 'EXAMEN DE HECES', style: 'categoria', pageBreak: porCategoria.size ? 'before' : undefined });
    const body = [[{ text: 'Parámetro', style: 'th' }, { text: 'Resultado', style: 'th' }]];
    for (const cat of cats) {
      const sel = orden.resultado_heces.filter((r) => r.id_categoria_heces === cat.id);
      if (!sel.length) continue;
      const valores = sel.map((r) => params.find((p) => p.id === r.id_parametro_heces)?.nombre).filter(Boolean).join(', ');
      body.push([{ text: cat.nombre, style: 'td' }, { text: valores, style: 'td', bold: true }]);
    }
    content.push({ table: { headerRows: 1, widths: [180, '*'], body }, layout: 'lightHorizontalLines' });
  }

  // Sección de orina
  if (orden.resultado_orina.length) {
    const cats = await db('categoria_orinas').where('estado', 1).orderBy('orden');
    const params = await db('parametros_orinas');
    content.push({ text: 'EXAMEN DE ORINA', style: 'categoria' });
    const body = [[{ text: 'Parámetro', style: 'th' }, { text: 'Resultado', style: 'th' }]];
    for (const cat of cats) {
      const sel = orden.resultado_orina.filter((r) => r.id_categoria_orina === cat.id);
      if (!sel.length) continue;
      const valores = sel.map((r) =>
        r.valor || params.find((p) => p.id === r.id_parametro_orina)?.nombre).filter(Boolean).join(', ');
      body.push([{ text: cat.nombre, style: 'td' }, { text: valores, style: 'td', bold: true }]);
    }
    content.push({ table: { headerRows: 1, widths: [180, '*'], body }, layout: 'lightHorizontalLines' });
  }

  content.push({
    text: '_______________________________\nFirma y sello',
    alignment: 'center', margin: [0, 40, 0, 0], fontSize: 9,
  });

  return printer.createPdfKitDocument(docBase(content));
}
