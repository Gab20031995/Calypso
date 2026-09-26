import { FLAVORS } from '../data/flavors.js';

export default function CartModal({ open, onClose, cart, onRemove, onCheckout }) {
  if (!open) return null;

  const lines = cart.map((id, i) => {
    if (id === 'FREE') return { i, name: 'Botella gratis (Club Calypso)', price: 0 };
    const f = FLAVORS.find((x) => x.id === id);
    return { i, name: f.name, price: f.price };
  });
  const total = lines.reduce((sum, l) => sum + l.price, 0);

  return (
    <div className="modal-bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="close-x" onClick={onClose}>✕</button>
        <h3>Tu carrito</h3>
        {lines.length === 0 ? (
          <p style={{ opacity: 0.6 }}>Aún no has agregado botellas.</p>
        ) : (
          <div>
            {lines.map((l) => (
              <div className="cartline" key={l.i}>
                <span>{l.name} — ${l.price.toFixed(2)}</span>
                <button onClick={() => onRemove(l.i)}>quitar</button>
              </div>
            ))}
          </div>
        )}
        {lines.length > 0 && <div id="cartTotal">Total: ${total.toFixed(2)}</div>}
        <div className="row">
          <button className="pill solid" onClick={onCheckout}>Finalizar pedido</button>
        </div>
      </div>
    </div>
  );
}
