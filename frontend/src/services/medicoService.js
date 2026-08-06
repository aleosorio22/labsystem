import { api } from './api';

const medicoService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/medicos', { params });
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/medicos/${id}`);
    return data;
  },

  create: async (medico) => {
    const { data } = await api.post('/medicos', medico);
    return data;
  },

  update: async (id, medico) => {
    const { data } = await api.put(`/medicos/${id}`, medico);
    return data;
  },

  eliminar: async (id) => {
    const { data } = await api.delete(`/medicos/${id}`);
    return data;
  },
};

export default medicoService;
