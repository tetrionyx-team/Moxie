import { Link, useLocation } from "react-router-dom";
import "./NavBottom.css";

function NavBottom() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="bottom-items">
      <ul className="bottom-menu">
        <li className={isActive("/") ? "active" : ""}><Link to="/">Home</Link></li>
        <li className={isActive("/products/watches") ? "active" : ""}><Link to="/products/watches">Watches</Link></li>
        <li className={isActive("/products/shoes") ? "active" : ""}><Link to="/products/shoes">Shoes</Link></li>
        <li className={isActive("/products/air-buds") ? "active" : ""}><Link to="/products/air-buds">Air Buds</Link></li>
        <li className={isActive("/products/sliders") ? "active" : ""}><Link to="/products/sliders">Sliders</Link></li>
        <li className={isActive("/products/caps") ? "active" : ""}><Link to="/products/caps">Caps</Link></li>
        <li className={isActive("/products/accessories") ? "active" : ""}><Link to="/products/accessories">Accessories</Link></li>
        <li className={isActive("/products/deals") ? "active" : ""}><Link to="/products/deals">Deals</Link></li>
      </ul>
    </div>
  );
}

export default NavBottom;