import { api } from './api';

const empresaService = {
  get: async () => {
    const { data } = await api.get('/empresa');
    return data;
  },

  update: async (empresa) => {
    const { data } = await api.put('/empresa', empresa);
    return data;
  },
};

export default empresaService;
