import React, { useState, useEffect } from "react";
import { obtenerMisCompras, exportarComprasExcel } from '../../api/compradorService';
import TrazabilidadCompleta from "../../components/TrazabilidadCompleta";

function BuyerPurchases() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [exportStatus, setExportStatus] = useState("idle");
  const [trazabilidadCropId, setTrazabilidadCropId] = useState(null);

  useEffect(() => {
    const cargarCompras = async () => {
      try {
        const data = await obtenerMisCompras();
        setOrders(data);
      } catch (error) {
        console.error("Error al cargar compras:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarCompras();
  }, []);

  const filteredOrders = orders.filter(
    (o) =>
      String(o.id).includes(searchTerm) ||
      (o.detalles &&
        o.detalles.some((d) =>
          (d.nombreProducto || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
        )),
  );

  const handleExport = async () => {
    if (exportStatus !== "idle") return;
    setExportStatus("exporting");
    try {
      await exportarComprasExcel();
      setExportStatus("success");
      setTimeout(() => setExportStatus("idle"), 3000);
    } catch (err) {
      alert("Error al exportar. Intenta de nuevo.");
      setExportStatus("idle");
    }
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "60px", color: "#888" }}>
        ⏳ Cargando compras...
      </div>
    );

  return (
    <div>
      <h2
        style={{
          color: "var(--color-primary)",
          fontFamily: "var(--font-titles)",
          marginBottom: "10px",
          fontSize: "2rem",
        }}
      >
        Mis Compras
      </h2>
      <p style={{ color: "#555", fontSize: "1.1rem", marginBottom: "30px" }}>
        Historial de pedidos y pagos.
      </p>

      <div
        style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <input
            type="text"
            placeholder="Buscar por N° de pedido o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "12px 15px",
              borderRadius: "var(--radius-md)",
              border: "1px solid #ccc",
              fontSize: "1rem",
            }}
          />
          <button
            onClick={handleExport}
            disabled={exportStatus !== "idle"}
            style={{
              backgroundColor:
                exportStatus === "success" ? "#D4EDDA" : "#E8F5E9",
              color:
                exportStatus === "success" ? "#155724" : "var(--color-primary)",
              border: `1px solid ${exportStatus === "success" ? "#c3e6cb" : "var(--color-primary)"}`,
              padding: "10px 20px",
              borderRadius: "var(--radius-md)",
              fontWeight: "bold",
              cursor: exportStatus !== "idle" ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {exportStatus === "idle" && "📊 Exportar registro"}
            {exportStatus === "exporting" && "⏳ Generando Excel..."}
            {exportStatus === "success" && "✅ Excel Descargado"}
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="buyer-purchases-table">
            <thead>
              <tr
                style={{
                  backgroundColor: "#f8f9fa",
                  borderBottom: "2px solid #eee",
                }}
              >
                <th style={{ padding: "15px", color: "#555" }}>N° Pedido</th>
                <th style={{ padding: "15px", color: "#555" }}>Fecha</th>
                <th style={{ padding: "15px", color: "#555" }}>Estado</th>
                <th style={{ padding: "15px", color: "#555" }}>Productos</th>
                <th
                  style={{
                    padding: "15px",
                    color: "#555",
                    textAlign: "center",
                  }}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      color: "#888",
                    }}
                  >
                    No se encontraron pedidos.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td
                      style={{
                        padding: "15px",
                        fontWeight: "bold",
                        color: "var(--color-primary)",
                      }}
                    >
                      #{order.id}
                    </td>
                    <td style={{ padding: "15px", color: "#555" }}>
                      {new Date(order.fechaCreacion).toLocaleDateString(
                        "es-PE",
                      )}
                    </td>
                    <td style={{ padding: "15px" }}>
                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: "15px",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          backgroundColor:
                            order.estadoPedido === "Entregado"
                              ? "#D4EDDA"
                              : order.estadoPedido === "Cancelado"
                                ? "#FFEBEE"
                                : "#FFF3E0",
                          color:
                            order.estadoPedido === "Entregado"
                              ? "#155724"
                              : order.estadoPedido === "Cancelado"
                                ? "#d32f2f"
                                : "#E65100",
                        }}
                      >
                        {order.estadoPedido}
                      </span>
                    </td>
                    <td style={{ padding: "15px", color: "#555" }}>
                      {order.detalles &&
                        order.detalles.map((d) => d.nombreProducto).join(", ")}
                    </td>
                    <td style={{ padding: "15px", textAlign: "center" }}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        style={{
                          backgroundColor: "var(--color-primary)",
                          color: "white",
                          border: "none",
                          padding: "8px 15px",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                        }}
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {selectedOrder && (
        <div
          className="buyer-modal-overlay"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="buyer-modal-container"
            style={{
              backgroundColor: "white",
              padding: "35px",
              borderRadius: "var(--radius-lg)",
              maxWidth: "700px",
            }}
          >
            <button
              onClick={() => setSelectedOrder(null)}
              style={{
                position: "absolute",
                top: "15px",
                right: "20px",
                background: "transparent",
                border: "none",
                fontSize: "1.8rem",
                cursor: "pointer",
              }}
            >
              &times;
            </button>

            <div
              style={{
                marginBottom: "20px",
                borderBottom: "2px solid #eee",
                paddingBottom: "15px",
              }}
            >
              <h3 style={{ color: "var(--color-primary)" }}>
                Detalle Pedido #{selectedOrder.id}
              </h3>
              <span style={{ color: "#888", fontSize: "0.9rem" }}>
                Fecha:{" "}
                {new Date(selectedOrder.fechaCreacion).toLocaleDateString(
                  "es-PE",
                )}
              </span>
            </div>


            <div style={{ marginBottom: "20px" }}>
              <span
                style={{
                  padding: "6px 14px",
                  borderRadius: "15px",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  backgroundColor:
                    selectedOrder.estadoPedido === "Entregado"
                      ? "#D4EDDA"
                      : selectedOrder.estadoPedido === "Cancelado"
                        ? "#FFEBEE"
                        : "#FFF3E0",
                  color:
                    selectedOrder.estadoPedido === "Entregado"
                      ? "#155724"
                      : selectedOrder.estadoPedido === "Cancelado"
                        ? "#d32f2f"
                        : "#E65100",
                }}
              >
                Estado: {selectedOrder.estadoPedido}
              </span>
            </div>

            <h4 style={{ margin: "0 0 15px 0", color: "var(--color-text)" }}>
              📦 Productos en la Orden
            </h4>

            {selectedOrder.detalles &&
              selectedOrder.detalles.map((detalle, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "#F8F9FA",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid #eee",
                    padding: "18px",
                    marginBottom: "15px",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 12px 0",
                      color: "var(--color-primary)",
                    }}
                  >
                    {detalle.nombreProducto}
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "#888",
                          display: "block",
                          fontWeight: "bold",
                        }}
                      >
                        Cantidad
                      </span>
                      <strong>{detalle.cantidadSolicitada} kg</strong>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "#888",
                          display: "block",
                          fontWeight: "bold",
                        }}
                      >
                        Precio Unitario
                      </span>
                      <strong>
                        S/ {parseFloat(detalle.precioPactado).toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "#888",
                          display: "block",
                          fontWeight: "bold",
                        }}
                      >
                        Total
                      </span>
                      <strong style={{ color: "var(--color-secondary)" }}>
                        S/{" "}
                        {(
                          parseFloat(detalle.cantidadSolicitada) *
                          parseFloat(detalle.precioPactado)
                        ).toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "#888",
                          display: "block",
                          fontWeight: "bold",
                        }}
                      >
                        Dirección
                      </span>
                      <strong>📍 {detalle.direccion}</strong>
                    </div>
                    <button
                      onClick={() => setTrazabilidadCropId(detalle.idCultivo)}
                      style={{ marginTop: '10px', backgroundColor: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', padding: '8px 15px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', gridColumn: '1 / -1' }}
                  >
                      🔍 Ver Trazabilidad
                  </button>
                  </div>
                </div>
              ))}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                  border: "none",
                  padding: "12px 25px",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {trazabilidadCropId && (
        <TrazabilidadCompleta cultivoId={trazabilidadCropId} onClose={() => setTrazabilidadCropId(null)} />
      )}
    </div>
  );
}

export default BuyerPurchases;
