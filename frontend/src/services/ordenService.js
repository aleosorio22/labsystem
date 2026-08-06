import { api, abrirPdf } from './api';

/** Estados del documento, iguales a los del sistema anterior */
export const ESTADO_DOC = { COTIZACION: 1, ANALISIS: 2, FINALIZADO: 3 };

const ordenService = {
  /** Devuelve { data, total, page, pages } */
  getAll: async (params = {}) => {
    const { data } = await api.get('/ordenes', { params });
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/ordenes/${id}`);
    return data;
  },

  create: async (orden) => {
    const { data } = await api.post('/ordenes', orden);
    return data;
  },

  update: async (id, orden) => {
    const { data } = await api.put(`/ordenes/${id}`, orden);
    return data;
  },

  /** Anular exige reconfirmar la contraseña del usuario */
  anular: async (id, passwordActual) => {
    const { data } = await api.post(`/ordenes/${id}/anular`, { password_actual: passwordActual });
    return data;
  },

  // --- Transiciones de estado ---
  convertirAVenta: async (id) => (await api.post(`/ordenes/${id}/convertir-venta`)).data,
  regresarACotizacion: async (id) => (await api.post(`/ordenes/${id}/regresar-cotizacion`)).data,
  finalizar: async (id) => (await api.post(`/ordenes/${id}/finalizar`)).data,
  reabrir: async (id) => (await api.post(`/ordenes/${id}/reabrir`)).data,

  // --- Captura de resultados ---
  guardarResultados: async (id, resultados) => {
    const { data } = await api.post(`/ordenes/${id}/resultados`, { resultados });
    return data;
  },

  guardarResultadosHeces: async (id, filas) => {
    const { data } = await api.post(`/ordenes/${id}/resultados-heces`, { filas });
    return data;
  },

  guardarResultadosOrina: async (id, filas) => {
    const { data } = await api.post(`/ordenes/${id}/resultados-orina`, { filas });
    return data;
  },

  // --- Impresión y envío ---
  abrirPdfCotizacion: (id) => abrirPdf(`/ordenes/${id}/pdf/cotizacion`),
  abrirPdfResultados: (id) => abrirPdf(`/ordenes/${id}/pdf/resultados`),

  /** Datos para armar el enlace de WhatsApp */
  getWhatsapp: async (id) => {
    const { data } = await api.get(`/ordenes/${id}/whatsapp`);
    return data;
  },
};

export default ordenService;
