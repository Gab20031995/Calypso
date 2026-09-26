export default function Navbar({ user, cartCount, onOpenAccount, onOpenCart }) {
  return (
    <nav>
      <div className="wrap">
        <a href="#inicio" className="logo">🌶️ La Calypso</a>
        <div className="navlinks">
          <a href="#inicio">Inicio</a>
          <a href="#historia">Historia</a>
          <a href="#tienda">Tienda</a>
          <a href="#club">Club Calypso</a>
        </div>
        <div className="navicons">
          <button onClick={onOpenAccount}>{user ? user.name?.split(' ')[0] : 'Cuenta'}</button>
          <button onClick={onOpenCart}>Carrito <span id="cartCount">{cartCount}</span></button>
        </div>
      </div>
    </nav>
  );
}
