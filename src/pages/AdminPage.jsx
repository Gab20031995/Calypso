import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function AdminPage() {
  const [status, setStatus] = useState('loading'); // loading | denied | ready
  const [customers, setCustomers] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [adjustAmounts, setAdjustAmounts] = useState({});
  const [error, setError] = useState('');

  const STATUS_LABEL = {
    pending: 'Pendiente',
    accepted: 'Aceptado',
    shipped: 'Despachado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };
  const NEXT_ACTION = {
    pending: { next: 'accepted', label: 'Aceptar pedido' },
    accepted: { next: 'shipped', label: 'Marcar como despachado' },
    shipped: { next: 'delivered', label: 'Marcar como entregado' },
  };

  const loadData = async () => {
    const { data: customersData, error: customersErr } = await supabase
      .from('profiles')
      .select('*')
      .order('stickers_count', { ascending: false });
    if (customersErr) { setError(customersErr.message); return; }
    setCustomers(customersData || []);

    const { data: redemptionsData, error: redemptionsErr } = await supabase
      .from('redemptions')
      .select('*, profiles(name, email)')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });
    if (redemptionsErr) { setError(redemptionsErr.message); return; }
    setRedemptions(redemptionsData || []);

    const { data: ordersData, error: ordersErr } = await supabase
      .from('orders')
      .select('*, profiles(name, email), order_items(flavor, quantity, price, is_free)')
      .order('created_at', { ascending: false });
    if (ordersErr) { setError(ordersErr.message); return; }
    setOrders(ordersData || []);
  };

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) { setStatus('denied'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', user.id).single();

      if (!profile?.is_admin) { setStatus('denied'); return; }

      await loadData();
      setStatus('ready');
    })();
  }, []);

  const adjustStickers = async (userId, delta) => {
    const { error } = await supabase.rpc('admin_adjust_stickers', {
      p_user_id: userId,
      p_delta: delta,
    });
    if (error) { alert(error.message); return; }
    loadData();
  };

  const applyCustomAmount = (userId) => {
    const raw = adjustAmounts[userId];
    const amount = parseInt(raw, 10);
    if (!amount) return;
    adjustStickers(userId, amount);
    setAdjustAmounts({ ...adjustAmounts, [userId]: '' });
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase.rpc('admin_update_order_status', {
      p_order_id: orderId,
      p_status: newStatus,
    });
    if (error) { alert(error.message); return; }
    loadData();
  };

  const fulfillRedemption = async (id) => {
    const { error } = await supabase.rpc('admin_fulfill_redemption', { p_redemption_id: id });
    if (error) { alert(error.message); return; }
    loadData();
  };

  const cancelRedemption = async (id) => {
    const { error } = await supabase.rpc('admin_cancel_redemption', { p_redemption_id: id });
    if (error) { alert(error.message); return; }
    loadData();
  };

  if (status === 'loading') {
    return <div className="admin-wrap"><p>Cargando…</p></div>;
  }

  if (status === 'denied') {
    return (
      <div className="admin-wrap">
        <h1>Acceso restringido</h1>
        <p>Inicia sesión con una cuenta de administrador para ver este panel.</p>
        <a className="pill" href="/">Volver al sitio</a>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <header className="admin-header">
        <h1>Panel Calypso</h1>
        <a className="pill" href="/">Volver al sitio</a>
      </header>

      {error && <p style={{ color: '#7C2415' }}>{error}</p>}

      <section>
        <h2>Solicitudes de canje pendientes ({redemptions.length})</h2>
        {redemptions.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No hay solicitudes pendientes.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Cliente</th><th>Correo</th><th>Solicitado</th><th>Acción</th></tr>
            </thead>
            <tbody>
              {redemptions.map((r) => (
                <tr key={r.id}>
                  <td>{r.profiles?.name || '—'}</td>
                  <td>{r.profiles?.email || '—'}</td>
                  <td>{new Date(r.requested_at).toLocaleString()}</td>
                  <td>
                    <button className="pill solid small" onClick={() => fulfillRedemption(r.id)}>Aceptar canje</button>{' '}
                    <button className="pill small" onClick={() => cancelRedemption(r.id)}>Rechazar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Pedidos ({orders.length})</h2>
        {orders.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Todavía no hay pedidos.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Cliente</th><th>Fecha</th><th>Botellas</th><th>Total</th><th>Estado</th><th>Acción</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const items = (o.order_items || [])
                  .map((it) => `${it.is_free ? 'Gratis: ' : ''}${it.flavor} x${it.quantity}`)
                  .join(', ');
                const action = NEXT_ACTION[o.status];
                return (
                  <tr key={o.id}>
                    <td>{o.profiles?.name || '—'}<br /><span style={{ opacity: .6, fontSize: '.8rem' }}>{o.profiles?.email}</span></td>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td>{items || '—'}</td>
                    <td>${Number(o.total).toFixed(2)}</td>
                    <td>{STATUS_LABEL[o.status] || o.status}</td>
                    <td>
                      {action && (
                        <button className="pill solid small" onClick={() => updateOrderStatus(o.id, action.next)}>
                          {action.label}
                        </button>
                      )}{' '}
                      {o.status !== 'cancelled' && o.status !== 'delivered' && (
                        <button className="pill small" onClick={() => updateOrderStatus(o.id, 'cancelled')}>
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Clientes activos ({customers.length})</h2>
        <table className="admin-table">
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Sellos</th><th>Agregar / restar</th></tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name || '—'}</td>
                <td>{c.email || '—'}</td>
                <td>{c.phone || '—'}</td>
                <td><strong>{c.stickers_count}</strong>/6</td>
                <td>
                  <button className="pill small" onClick={() => adjustStickers(c.id, -1)}>−1</button>{' '}
                  <button className="pill small" onClick={() => adjustStickers(c.id, 1)}>+1</button>{' '}
                  <input
                    className="admin-mini-input"
                    type="number"
                    placeholder="cant."
                    value={adjustAmounts[c.id] || ''}
                    onChange={(e) => setAdjustAmounts({ ...adjustAmounts, [c.id]: e.target.value })}
                  />
                  <button className="pill small" onClick={() => applyCustomAmount(c.id)}>Aplicar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
