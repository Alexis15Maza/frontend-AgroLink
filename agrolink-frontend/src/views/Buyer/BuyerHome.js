import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";

import BuyerCatalog from "./BuyerCatalog";
import BuyerCart from "./BuyerCart";
import BuyerPurchases from "./BuyerPurchases";
import BuyerNotifications from "./BuyerNotifications";
import BuyerProfile from "./BuyerProfile";
import { logout } from '../../api/authService';

function BuyerHome() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // Estado global para ocultar productos ya añadidos al carrito
  const [acquiredIds, setAcquiredIds] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkNotifications = () => {
      const saved = localStorage.getItem("agrolink_notifications_comprador"); 
      let notifs = [];
      if (saved) {
        try {
          notifs = JSON.parse(saved);
        } catch (e) {
          console.error("Error reading notifications", e);
        }
      }
      const count = notifs.filter((n) => !n.leida).length;
      setUnreadNotificationsCount(count);
    };

    checkNotifications();
    window.addEventListener("notificationsUpdated", checkNotifications);
    return () => {
      window.removeEventListener("notificationsUpdated", checkNotifications);
    };
  }, []);

  const addAcquiredId = (id) => {
    if (!acquiredIds.includes(id)) {
      setAcquiredIds([...acquiredIds, id]);
    }
  };

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
    <div
      className="buyer-layout"
      style={{
        backgroundColor: "var(--color-bg)",
      }}
    >
      {/* HEADER MÓVIL */}
      <div className="buyer-mobile-header">
        <div className="buyer-mobile-logo">
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
          className="buyer-hamburger-btn"
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
          className="buyer-sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* BARRA LATERAL */}
      <nav
        className={`buyer-sidebar ${isMobileMenuOpen ? "open" : ""}`}
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
            Panel Comprador
          </p>
        </div>
        <div style={{ flex: 1, padding: "20px 0" }}>
          <Link
            to="/buyer"
            className="buyer-menu-link"
            style={linkStyle("/buyer")}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            🌿 Catálogo
          </Link>
          <Link
            to="/buyer/cart"
            className="buyer-menu-link"
            style={linkStyle("/buyer/cart")}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            🛒 Mi Carrito
          </Link>
          <Link
            to="/buyer/purchases"
            className="buyer-menu-link"
            style={linkStyle("/buyer/purchases")}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            📦 Mis Compras
          </Link>
          <Link
            to="/buyer/notifications"
            className="buyer-menu-link"
            style={{
              ...linkStyle("/buyer/notifications"),
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span>🔔 Notificaciones</span>
            {unreadNotificationsCount > 0 && (
              <span
                style={{
                  backgroundColor: "#d32f2f",
                  color: "white",
                  fontSize: "0.75rem",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  marginRight: "15px",
                }}
              >
                {unreadNotificationsCount}
              </span>
            )}
          </Link>
          <Link
            to="/buyer/profile"
            className="buyer-menu-link"
            style={linkStyle("/buyer/profile")}
            onClick={() => setIsMobileMenuOpen(false)}
          >
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

      {/* CONTENIDO PRINCIPAL */}
      <main className="buyer-main">
        <Routes>
          <Route
            path="/"
            element={
              <BuyerCatalog
                acquiredIds={acquiredIds}
                onAddToCart={addAcquiredId}
              />
            }
          />
          <Route
            path="catalog"
            element={
              <BuyerCatalog
                acquiredIds={acquiredIds}
                onAddToCart={addAcquiredId}
              />
            }
          />
          <Route path="cart" element={<BuyerCart />} />
          <Route path="purchases" element={<BuyerPurchases />} />
          <Route path="notifications" element={<BuyerNotifications />} />
          <Route path="profile" element={<BuyerProfile />} />
        </Routes>
      </main>
    </div>
  );
}

export default BuyerHome;
