import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { FLAVORS } from './data/flavors.js';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import Flavors from './components/Flavors.jsx';
import Story from './components/Story.jsx';
import Club from './components/Club.jsx';
import AuthModal from './components/AuthModal.jsx';
import CartModal from './components/CartModal.jsx';

export default function Site() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [cart, setCart] = useState([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [pendingRedemption, setPendingRedemption] = useState(false);

  // Escucha la sesión de Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Carga el perfil (con el contador de sellos) cuando hay usuario
  useEffect(() => {
    if (!user) { setProfile(null); setPendingRedemption(false); return; }
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setProfile(data));
    supabase.from('redemptions').select('id').eq('user_id', user.id).eq('status', 'pending')
      .then(({ data }) => setPendingRedemption((data?.length ?? 0) > 0));
  }, [user]);

  const addToCart = (flavorId) => setCart([...cart, flavorId]);
  const removeFromCart = (idx) => setCart(cart.filter((_, i) => i !== idx));

  const checkout = async () => {
    if (cart.length === 0) return;
    if (!user) { setCartOpen(false); setAuthOpen(true); return; }

    const items = Object.values(
      cart.reduce((acc, id) => {
        const price = id === 'FREE' ? 0 : FLAVORS.find((f) => f.id === id).price;
        const key = id;
        if (!acc[key]) acc[key] = { flavor: id, quantity: 0, price, is_free: id === 'FREE' };
        acc[key].quantity += 1;
        return acc;
      }, {})
    );

    const { data, error } = await supabase.rpc('register_order', { p_items: items });
    if (error) { alert('No se pudo procesar el pedido: ' + error.message); return; }

    setProfile({ ...profile, stickers_count: data });
    setCart([]);
    setCartOpen(false);
    alert('¡Pedido registrado con éxito! Conecta aquí tu pasarela de pago real (Stripe/Yappy) antes de producción.');
  };

  const redeemReward = async () => {
    const { error } = await supabase.rpc('redeem_reward');
    if (error) { alert(error.message); return; }
    setPendingRedemption(true);
    alert('¡Solicitud enviada! Te avisaremos cuando confirmemos la entrega de tu botella gratis.');
  };

  return (
    <>
      <Navbar
        user={profile}
        cartCount={cart.length}
        onOpenAccount={() => setAuthOpen(true)}
        onOpenCart={() => setCartOpen(true)}
      />
      <Hero />
      <Flavors onAddToCart={addToCart} />
      <Story />
      <Club
        user={user}
        stickers={profile?.stickers_count ?? 0}
        pendingRedemption={pendingRedemption}
        onRedeem={redeemReward}
        onOpenAccount={() => setAuthOpen(true)}
      />
      <footer>
        <div className="wrap">
          <div><strong>Salsas Calypso</strong><br />Picante artesanal panameño — 100% natural.</div>
          <div>hola@salsascalypso.com<br />@salsascalypso</div>
        </div>
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        user={user}
        profile={profile}
        onLoggedOut={() => { setUser(null); setProfile(null); }}
      />
      <CartModal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onRemove={removeFromCart}
        onCheckout={checkout}
      />
    </>
  );
}
