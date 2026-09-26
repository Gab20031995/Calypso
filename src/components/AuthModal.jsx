import { useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function AuthModal({ open, onClose, user, profile, onLoggedOut }) {
  const [mode, setMode] = useState('signup'); // 'signup' | 'signin'
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSignUp = async () => {
    setError('');
    if (!form.name || !form.email || !form.password) {
      setError('Nombre, correo y contraseña son obligatorios.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name, phone: form.phone, address: form.address } },
    });
    setLoading(false);
    if (error) setError(error.message);
    else onClose();
  };

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (error) setError(error.message);
    else onClose();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLoggedOut();
  };

  return (
    <div className="modal-bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="close-x" onClick={onClose}>✕</button>

        {user ? (
          <>
            <h3>¡Hola de nuevo!</h3>
            <p>Sesión iniciada como {profile?.name || user.email} ({user.email}).</p>
            <p>Sellos acumulados: <strong>{profile?.stickers_count ?? 0}</strong>/6</p>
            <div className="row">
              <button className="pill" onClick={handleLogout}>Cerrar sesión</button>
            </div>
          </>
        ) : (
          <>
            <h3>{mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}</h3>
            {mode === 'signup' && (
              <>
                <label>Nombre</label>
                <input value={form.name} onChange={update('name')} placeholder="Tu nombre" />
              </>
            )}
            <label>Correo</label>
            <input value={form.email} onChange={update('email')} type="email" placeholder="tu@correo.com" />
            {mode === 'signup' && (
              <>
                <label>Teléfono</label>
                <input value={form.phone} onChange={update('phone')} placeholder="8888-8888" />
                <label>Dirección de envío</label>
                <input value={form.address} onChange={update('address')} placeholder="Provincia, dirección" />
              </>
            )}
            <label>Contraseña</label>
            <input value={form.password} onChange={update('password')} type="password" placeholder="••••••••" />

            {error && <p style={{ color: '#7C2415', marginTop: 10 }}>{error}</p>}

            <div className="row">
              <button
                className="pill solid"
                disabled={loading}
                onClick={mode === 'signup' ? handleSignUp : handleSignIn}
              >
                {loading ? 'Un momento…' : mode === 'signup' ? 'Crear cuenta' : 'Ingresar'}
              </button>
            </div>
            <p style={{ marginTop: 14, fontSize: '.85rem' }}>
              {mode === 'signup' ? '¿Ya tienes cuenta? ' : '¿Aún no tienes cuenta? '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'signup' ? 'signin' : 'signup'); }}>
                {mode === 'signup' ? 'Inicia sesión' : 'Regístrate'}
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
