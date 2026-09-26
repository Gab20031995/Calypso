export default function Hero() {
  return (
    <section id="inicio" className="hero" style={{ borderTop: 'none' }}>
      <div className="heroglow"></div>
      <div className="wrap">
        <h1>El chile panameño, embotellado con ritmo.</h1>
        <p className="lead">
          Salsas artesanales hechas con chile panameño y vinagre de sidra de manzana. Sin
          atajos, sin conservantes raros — solo picor vibrante y sabor fresco, listo para
          prenderle candela a tu plato.
        </p>
        <div className="ctarow">
          <button
            className="pill solid"
            onClick={() => document.getElementById('tienda').scrollIntoView()}
          >
            Ver la tienda
          </button>
          <button
            className="pill"
            onClick={() => document.getElementById('club').scrollIntoView()}
          >
            Únete al Club Calypso
          </button>
        </div>
      </div>
    </section>
  );
}
