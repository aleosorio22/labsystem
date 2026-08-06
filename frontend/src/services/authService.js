import { api } from './api';

const authService = {
  login: async (usuario, password) => {
    const { data } = await api.post('/auth/login', { usuario, password });
    return data; // { token, user }
  },

  me: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },

  cambiarPassword: async (passwordActual, passwordNueva) => {
    const { data } = await api.post('/auth/cambiar-password', {
      password_actual: passwordActual,
      password_nueva: passwordNueva,
    });
    return data;
  },
};

export default authService;
