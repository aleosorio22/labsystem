import { api } from './api';

const bitacoraService = {
  /** Devuelve { data, total, page, pages } */
  getAll: async (params = {}) => {
    const { data } = await api.get('/bitacora', { params });
    return data;
  },
};

export default bitacoraService;
