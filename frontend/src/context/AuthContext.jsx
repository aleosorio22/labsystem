import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al montar: si hay token guardado, recupera la sesión
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setCargando(false); return; }
    authService.me()
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(async (usuario, password) => {
    const { token, user: datos } = await authService.login(usuario, password);
    localStorage.setItem('token', token);
    setUser(datos);
    return datos;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  /** ¿El usuario tiene alguno de estos permisos? */
  const can = useCallback(
    (...permisos) => permisos.some((p) => user?.permisos?.includes(p)),
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, cargando, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
