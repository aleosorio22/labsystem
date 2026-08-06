import { api } from './api';

const reporteService = {
  getDashboard: async () => {
    const { data } = await api.get('/reportes/dashboard');
    return data;
  },

  getVentas: async (desde, hasta) => {
    const { data } = await api.get('/reportes/ventas', { params: { desde, hasta } });
    return data;
  },

  getGanancias: async (desde, hasta) => {
    const { data } = await api.get('/reportes/ganancias', { params: { desde, hasta } });
    return data;
  },

  getComisionesMedicos: async (desde, hasta) => {
    const { data } = await api.get('/reportes/comisiones-medicos', { params: { desde, hasta } });
    return data;
  },

  /** Atajo genérico usado por la página de reportes con pestañas */
  getPorTipo: async (tipo, desde, hasta) => {
    const { data } = await api.get(`/reportes/${tipo}`, { params: { desde, hasta } });
    return data;
  },
};

export default reporteService;
