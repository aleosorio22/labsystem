import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { errorMsg } from '../services/api';
import { Button, Input } from '../components/ui';
import { icons } from '../config/icons';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const LogoIcon = icons.laboratorio;

  const onSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      await login(usuario, password);
      navigate('/');
    } catch (err) {
      toast.error(errorMsg(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center size-12 rounded-lg bg-primary-soft border border-primary-border mb-3">
            <LogoIcon size={24} className="text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-text">LabSystem</h1>
          <p className="text-sm text-text-muted">Sistema de laboratorio clínico</p>
        </div>

        <form onSubmit={onSubmit} className="bg-surface border border-border rounded-lg p-6 space-y-4 shadow-xs">
          <Input
            label="Usuario o correo"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoFocus
            autoComplete="username"
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Button type="submit" loading={cargando} className="w-full justify-center">
            Ingresar
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
