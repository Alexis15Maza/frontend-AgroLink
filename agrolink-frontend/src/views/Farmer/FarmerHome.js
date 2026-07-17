import React, { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useUnreadCount } from "../../hooks/useUnreadCount";

// Importamos las sub-vistas
import FarmerDashboard from "./FarmerDashboard";
import FarmerProducts from "./FarmerProducts";
import FarmerSales from "./FarmerSales";
import FarmerProfile from "./FarmerProfile";
import FarmerNotifications from "./FarmerNotifications";
import FarmerCatalog from "./FarmerCatalog";
import { logout } from '../../api/authService';


function FarmerHome() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const unreadCount = useUnreadCount('agricultor');

  // Función auxiliar para determinar si un enlace está activo
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Estilo común para los enlaces del menú lateral
  const linkStyle = (path) => ({
    display: "block",
    padding: "15px 20px",
    color: isActive(path) ? "var(--color-primary)" : "#555",
    textDecoration: "none",
    fontWeight: isActive(path) ? "bold" : "normal",
    backgroundColor: isActive(path) ? "#E8F5E9" : "transparent",
    borderLeft: isActive(path)
      ? "4px solid var(--color-primary)"
      : "4px solid transparent",
    transition: "all 0.2s",
  });

  return (
    <div className="farmer-layout" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* HEADER MÓVIL */}
      <div className="farmer-mobile-header">
        <div className="farmer-mobile-logo">
          <h2
            style={{
              color: "var(--color-primary)",
              fontFamily: "var(--font-titles)",
              margin: 0,
              fontSize: "1.35rem",
            }}
          >
            Agro<span style={{ color: "var(--color-secondary)" }}>Link</span>
          </h2>
        </div>
        <button
          className="farmer-hamburger-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            color: "var(--color-primary)",
          }}
          aria-label="Abrir menú"
        >
          ☰
        </button>
      </div>

      {/* OVERLAY PARA MÓVIL */}
      {isMobileMenuOpen && (
        <div
          className="farmer-sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* BARRA LATERAL (Sidebar) */}
      <nav
        className={`farmer-sidebar ${isMobileMenuOpen ? "open" : ""}`}
        style={{
          backgroundColor: "white",
          boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            padding: "30px 20px",
            textAlign: "center",
            borderBottom: "1px solid #eee",
          }}
        >
          <h2
            style={{
              color: "var(--color-primary)",
              fontFamily: "var(--font-titles)",
              margin: 0,
              fontSize: "1.5rem",
            }}
          >
            Agro<span style={{ color: "var(--color-secondary)" }}>Link</span>
          </h2>
          <p style={{ color: "#888", fontSize: "0.9rem", margin: "5px 0 0 0" }}>
            Panel Agricultor
          </p>
        </div>

        <div style={{ flex: 1, padding: "20px 0" }}>
          <Link to="/farmer" style={linkStyle("/farmer")} onClick={() => setIsMobileMenuOpen(false)}>
            🏠 Inicio
          </Link>
          <Link to="/farmer/products" style={linkStyle("/farmer/products")} onClick={() => setIsMobileMenuOpen(false)}>
            🌾 Mis Cultivos
          </Link>
          <Link to="/farmer/catalog" style={linkStyle("/farmer/catalog")} onClick={() => setIsMobileMenuOpen(false)}>
            📦 Historial Productos
          </Link>
          <Link to="/farmer/sales" style={linkStyle("/farmer/sales")} onClick={() => setIsMobileMenuOpen(false)}>
            💰 Mis Ventas
          </Link>
          <Link to="/farmer/notifications" style={linkStyle("/farmer/notifications")} onClick={() => setIsMobileMenuOpen(false)}>
            🔔 Notificaciones
            {unreadCount > 0 && (
                <span style={{
                    backgroundColor: '#d32f2f',
                    color: 'white',
                    fontSize: '0.75rem',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    marginLeft: '8px'
                }}>
                    {unreadCount}
                </span>
            )}
        </Link>
          <Link to="/farmer/profile" style={linkStyle("/farmer/profile")} onClick={() => setIsMobileMenuOpen(false)}>
            👤 Mi Perfil
          </Link>
        </div>

        <div style={{ padding: "20px", borderTop: "1px solid #eee" }}>
          <Link
            to="/"
            onClick={() => {
              logout();
              setIsMobileMenuOpen(false);
            }}
            style={{
              color: "#dc3545",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            🚪 Cerrar Sesión
          </Link>
        </div>
      </nav>

      {/* ÁREA PRINCIPAL (Contenido dinámico) */}
      <main className="farmer-main">
        <Routes>
          <Route path="/" element={<FarmerDashboard />} />
          <Route path="products" element={<FarmerProducts />} />
          <Route path="catalog" element={<FarmerCatalog />} />
          <Route path="sales" element={<FarmerSales />} />
          <Route path="notifications" element={<FarmerNotifications />} />
          <Route path="profile" element={<FarmerProfile />} />
        </Routes>
      </main>
    </div>
  );
}

export default FarmerHome;
