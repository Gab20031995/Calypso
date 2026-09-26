import { FLAVORS } from '../data/flavors.js';

export default function Flavors({ onAddToCart }) {
  return (
    <section id="tienda">
      <div className="wrap">
        <div className="section-head">
          <h2>Tres sabores, un mismo ritmo</h2>
          <p>Elabora tus pedidos y acumula sellos en el Club Calypso con cada botella.</p>
        </div>
        <div className="flavors">
          {FLAVORS.map((f) => (
            <div className="fcard" key={f.id}>
              <div className="swatch" style={{ background: f.accent }}></div>
              <h3>{f.name}</h3>
              <p>{f.desc}</p>
              <div className="price">${f.price.toFixed(2)}</div>
              <button className="pill" onClick={() => onAddToCart(f.id)}>
                Agregar al carrito
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
