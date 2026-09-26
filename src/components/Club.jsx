export default function Club({ user, stickers, pendingRedemption, onRedeem, onOpenAccount }) {
  const remaining = Math.max(0, 6 - stickers);
  const canRedeem = stickers >= 6 && !pendingRedemption;

  let message = 'Inicia sesión para ver y acumular tus sellos.';
  if (user) {
    if (pendingRedemption) message = 'Tu solicitud de botella gratis está en revisión. Te avisaremos pronto.';
    else if (stickers >= 6) message = '¡Botella gratis desbloqueada!';
    else message = `Te faltan ${remaining} sello(s) para tu botella gratis.`;
  }

  return (
    <section id="club" className="club">
      <div className="wrap">
        <div className="section-head">
          <h2>Club Calypso</h2>
          <p style={{ color: 'rgba(255,255,255,.85)' }}>
            Por cada botella que compras, ganas un sello. Junta 6 y solicita tu botella gratis —
            nuestro equipo confirma la entrega.
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
            <p id="rewardMsg">{message}</p>
            {canRedeem && (
              <button className="pill solid" onClick={onRedeem}>
                Solicitar botella gratis
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
