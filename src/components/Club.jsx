export default function Club({ user, stickers, onRedeem, onOpenAccount }) {
  const remaining = Math.max(0, 6 - stickers);
  const canRedeem = stickers >= 6;

  return (
    <section id="club" className="club">
      <div className="wrap">
        <div className="section-head">
          <h2>Club Calypso</h2>
          <p style={{ color: 'rgba(255,255,255,.85)' }}>
            Por cada botella que compras, ganas un sello. Junta 6 y la próxima botella va por la casa.
          </p>
        </div>
        <div className="clubgrid">
          <div>
            <div className="stamps">
              {Array.from({ length: 6 }, (_, i) => i + 1).map((i) => (
                <div key={i} className={`stamp ${i <= stickers ? 'filled' : ''}`}>
                  {i <= stickers ? '🌶️' : i}
                </div>
              ))}
            </div>
            <p id="rewardMsg">
              {!user
                ? 'Inicia sesión para ver y acumular tus sellos.'
                : canRedeem
                ? '¡Botella gratis desbloqueada!'
                : `Te faltan ${remaining} sello(s) para tu botella gratis.`}
            </p>
            {canRedeem && (
              <button className="pill solid" onClick={onRedeem}>
                Canjear botella gratis
              </button>
            )}
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,.85)' }}>
              Inicia sesión, agrega botellas a tu carrito y finaliza el pedido: tus sellos se
              guardan en tu cuenta automáticamente para tu próxima compra.
            </p>
            {!user && (
              <button className="pill" style={{ borderColor: '#fff' }} onClick={onOpenAccount}>
                Entrar a mi cuenta
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
