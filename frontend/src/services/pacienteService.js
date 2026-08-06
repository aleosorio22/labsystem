import { api } from './api';

const pacienteService = {
  /** Devuelve { data, total, page, pages } */
  getAll: async (params = {}) => {
    const { data } = await api.get('/pacientes', { params });
    return data;
  },

  /** Búsqueda rápida para selectores (devuelve solo el arreglo) */
  buscar: async (q, limit = 10) => {
    const { data } = await api.get('/pacientes', { params: { q, limit } });
    return data.data;
  },

  getCumpleanios: async () => {
    const { data } = await api.get('/pacientes/cumpleanios');
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/pacientes/${id}`);
    return data;
  },

  create: async (paciente) => {
    const { data } = await api.post('/pacientes', paciente);
    return data;
  },

  update: async (id, paciente) => {
    const { data } = await api.put(`/pacientes/${id}`, paciente);
    return data;
  },

  eliminar: async (id) => {
    const { data } = await api.delete(`/pacientes/${id}`);
    return data;
  },
};

export default pacienteService;
