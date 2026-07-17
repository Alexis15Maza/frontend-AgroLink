import React, { useState, useEffect } from "react";
import { obtenerVentas, exportarVentasExcel } from '../../api/agricultorService';
import api from '../../api/axiosConfig';

const ESTADOS_FLUJO = ["Pendiente", "En preparación", "Despachado", "Entregado"];

function FarmerSales() {
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSale, setSelectedSale] = useState(null);
    const [exportStatus, setExportStatus] = useState("idle");
    const [updatingEstado, setUpdatingEstado] = useState(false);

    const cargarVentas = async () => {
        try {
            const data = await obtenerVentas();
            setSalesData(data);
        } catch (error) {
            console.error("Error al cargar ventas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarVentas();
    }, []);

    const filteredSales = salesData.filter(
        (sale) =>
            (sale.producto || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sale.nombreProducto || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sale.comprador || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sale.empresa || "").toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const handleExport = async () => {
        if (exportStatus !== "idle") return;
        setExportStatus("exporting");
        try {
            await exportarVentasExcel();
            setExportStatus("success");
            setTimeout(() => setExportStatus("idle"), 3000);
        } catch (err) {
            alert("Error al exportar. Intenta de nuevo.");
            setExportStatus("idle");
        }
    };

    const handleCambiarEstado = async (nuevoEstado) => {
        if (!window.confirm(`¿Cambiar el estado a "${nuevoEstado}"?`)) return;
        setUpdatingEstado(true);
        try {
            await api.patch(`/api/v1/pedidos/${selectedSale.id}/estado`, {
                nuevo_estado: nuevoEstado
            });
            // Actualizar localmente
            const updatedSale = { ...selectedSale, estado: nuevoEstado };
            setSelectedSale(updatedSale);
            setSalesData(prev =>
                prev.map(s => s.id === selectedSale.id ? { ...s, estado: nuevoEstado } : s)
            );
        } catch (error) {
            alert("Error al cambiar el estado.");
            console.error(error);
        } finally {
            setUpdatingEstado(false);
        }
    };

    // Obtener el siguiente estado en el flujo
    const getSiguienteEstado = (estadoActual) => {
        const idx = ESTADOS_FLUJO.indexOf(estadoActual);
        if (idx === -1 || idx === ESTADOS_FLUJO.length - 1) return null;
        return ESTADOS_FLUJO[idx + 1];
    };

    const getColorEstado = (estado) => {
        const colores = {
            'Pendiente': { bg: '#FFF3E0', color: '#E65100' },
            'En preparación': { bg: '#E3F2FD', color: '#1565C0' },
            'Despachado': { bg: '#F3E5F5', color: '#6A1B9A' },
            'Entregado': { bg: '#D4EDDA', color: '#155724' },
        };
        return colores[estado] || { bg: '#FFF3E0', color: '#E65100' };
    };

    if (loading) return (
        <div style={{ textAlign: "center", padding: "60px", color: "#888" }}>
            ⏳ Cargando ventas...
        </div>
    );

    return (
        <div style={{ position: "relative" }}>
            <h2 style={{ color: "var(--color-primary)", fontFamily: "var(--font-titles)", marginBottom: "10px", fontSize: "2rem" }}>
                Mis Ventas
            </h2>
            <p style={{ color: "#555", fontSize: "1.1rem", marginBottom: "30px" }}>
                Monitorea el historial y estado de tus ventas o preventas adquiridas.
            </p>

            <div className="farmer-sales-card">
                <div className="farmer-sales-actions-bar">
                    <div style={{ flex: "1", minWidth: "300px" }}>
                        <input
                            type="text"
                            placeholder="Buscar por nombre de producto o empresa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: "100%", maxWidth: "400px", padding: "12px 15px", borderRadius: "var(--radius-md)", border: "1px solid #ccc", fontSize: "1rem" }}
                        />
                    </div>
                    <button onClick={handleExport} disabled={exportStatus !== "idle"} style={{
                        backgroundColor: exportStatus === "success" ? "#D4EDDA" : "#E8F5E9",
                        color: exportStatus === "success" ? "#155724" : "var(--color-primary)",
                        border: `1px solid ${exportStatus === "success" ? "#c3e6cb" : "var(--color-primary)"}`,
                        padding: "10px 20px", borderRadius: "var(--radius-md)", fontWeight: "bold",
                        cursor: exportStatus !== "idle" ? "default" : "pointer", fontSize: "0.95rem",
                        transition: "all 0.3s ease", display: "flex", alignItems: "center", gap: "8px"
                    }}>
                        {exportStatus === "idle" && "📊 Exportar registro de ventas"}
                        {exportStatus === "exporting" && "⏳ Generando Excel..."}
                        {exportStatus === "success" && "✅ Excel Descargado"}
                    </button>
                </div>

                <div className="farmer-sales-table-wrapper">
                    <table className="farmer-sales-table">
                        <thead>
                            <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                                <th style={{ color: "#555", fontWeight: "bold" }}>N° de Venta</th>
                                <th style={{ color: "#555", fontWeight: "bold" }}>Producto / Variedad</th>
                                <th style={{ color: "#555", fontWeight: "bold" }}>Comprador</th>
                                <th style={{ color: "#555", fontWeight: "bold" }}>Empresa</th>
                                <th style={{ color: "#555", fontWeight: "bold" }}>Estado</th>
                                <th style={{ color: "#555", fontWeight: "bold", textAlign: "center" }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#888" }}>
                                        No se encontraron ventas que coincidan con tu búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map((sale) => {
                                    const { bg, color } = getColorEstado(sale.estado);
                                    return (
                                        <tr key={`${sale.id}-${sale.producto}`} style={{ borderBottom: "1px solid #eee" }}>
                                            <td style={{ fontWeight: "bold", color: "var(--color-primary)" }}>{sale.id}</td>
                                            <td style={{ color: "#333" }}>{sale.nombreProducto} {sale.producto}</td>
                                            <td style={{ color: "#555" }}>{sale.comprador}</td>
                                            <td style={{ color: "#555" }}>{sale.empresa || "—"}</td>
                                            <td>
                                                <span style={{ padding: "4px 10px", borderRadius: "15px", fontSize: "0.85rem", fontWeight: "bold", backgroundColor: bg, color }}>
                                                    {sale.estado}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <button
                                                    onClick={() => setSelectedSale(sale)}
                                                    style={{ backgroundColor: "var(--color-primary)", color: "white", border: "none", padding: "8px 15px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
                                                >
                                                    Ver más detalle
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {selectedSale && (
                <div className="farmer-modal-overlay">
                    <div className="farmer-sales-modal">
                        <button onClick={() => setSelectedSale(null)} style={{ position: "absolute", top: "15px", right: "20px", background: "transparent", border: "none", fontSize: "1.8rem", color: "#888", cursor: "pointer" }}>
                            &times;
                        </button>

                        <div className="farmer-sales-modal-header">
                            <h3 style={{ color: "var(--color-primary)", margin: 0, fontSize: "1.6rem" }}>
                                Detalle de la Venta: <span style={{ color: "var(--color-text)" }}>{selectedSale.id}</span>
                            </h3>
                        </div>

                        <div className="farmer-sales-modal-grid">
                            <div>
                                <p style={{ margin: "0 0 15px 0" }}>
                                    <strong style={{ color: "#555" }}>Producto / Variedad:</strong><br />
                                    <span style={{ fontSize: "1.1rem", color: "#333" }}>
                                        {selectedSale.nombreProducto} {selectedSale.producto}
                                    </span>
                                </p>
                                <p style={{ margin: "0 0 15px 0" }}>
                                    <strong style={{ color: "#555" }}>Comprador:</strong><br />
                                    <span style={{ fontSize: "1.1rem", color: "#333" }}>{selectedSale.comprador}</span>
                                </p>
                                <p style={{ margin: "0 0 15px 0" }}>
                                    <strong style={{ color: "#555" }}>Empresa:</strong><br />
                                    <span style={{ fontSize: "1.1rem", color: "#333" }}>{selectedSale.empresa || "—"}</span>
                                </p>
                                <p style={{ margin: "0 0 15px 0" }}>
                                    <strong style={{ color: "#555" }}>Cantidad Acordada:</strong><br />
                                    <span style={{ fontSize: "1.1rem", color: "var(--color-primary)", fontWeight: "bold" }}>
                                        {selectedSale.cantidad} {selectedSale.unidad}
                                    </span>
                                </p>
                                <p style={{ margin: "0 0 15px 0" }}>
                                    <strong style={{ color: "#555" }}>Costo Total:</strong><br />
                                    <span style={{ fontSize: "1.1rem", color: "var(--color-secondary)", fontWeight: "bold" }}>
                                        {selectedSale.costo}
                                    </span>
                                </p>
                                <p style={{ margin: "0 0 15px 0" }}>
                                    <strong style={{ color: "#555" }}>Método de Pago:</strong><br />
                                    <span style={{ fontSize: "1.1rem", color: "#333" }}>{selectedSale.metodoPago}</span>
                                </p>
                                {selectedSale.porcentajeAdelanto > 0 && (
                                    <p style={{ margin: "0 0 15px 0" }}>
                                        <strong style={{ color: "#555" }}>Adelanto ({selectedSale.porcentajeAdelanto}%):</strong><br />
                                        <span style={{ fontSize: "1.1rem", color: "#2E7D32", fontWeight: "bold" }}>{selectedSale.montoAdelanto}</span>
                                        <span style={{ fontSize: "0.9rem", color: "#d32f2f", marginLeft: "10px" }}>
                                            (Contraentrega: {selectedSale.montoContraentrega})
                                        </span>
                                    </p>
                                )}
                            </div>
                            <div>
                                <p style={{ margin: "0 0 15px 0" }}>
                                    <strong style={{ color: "#555" }}>Fecha de Compra:</strong><br />
                                    <span style={{ fontSize: "1.1rem", color: "#333" }}>{selectedSale.fechaCompra}</span>
                                </p>
                                <p style={{ margin: "0 0 15px 0" }}>
                                    <strong style={{ color: "#555" }}>Lote:</strong><br />
                                    <span style={{ fontSize: "1.1rem", color: "#333", fontWeight: "bold" }}>{selectedSale.lote}</span>
                                </p>

                                {/* Estado actual */}
                                <div style={{ backgroundColor: "#F4F7F5", padding: "15px", borderRadius: "var(--radius-md)", marginTop: "10px" }}>
                                    <p style={{ margin: "0 0 10px 0" }}>
                                        <strong style={{ color: "#555" }}>Estado actual:</strong><br />
                                        <span style={{
                                            display: "inline-block", marginTop: "5px", padding: "5px 10px",
                                            borderRadius: "15px", fontSize: "0.9rem", fontWeight: "bold",
                                            ...getColorEstado(selectedSale.estado)
                                        }}>
                                            {selectedSale.estado}
                                        </span>
                                    </p>

                                    {/* Botón avanzar estado */}
                                    {getSiguienteEstado(selectedSale.estado) && (
                                        <button
                                            onClick={() => handleCambiarEstado(getSiguienteEstado(selectedSale.estado))}
                                            disabled={updatingEstado}
                                            style={{
                                                width: "100%", marginTop: "10px",
                                                backgroundColor: updatingEstado ? "#ccc" : "var(--color-primary)",
                                                color: "white", border: "none", padding: "10px",
                                                borderRadius: "var(--radius-md)", fontWeight: "bold",
                                                cursor: updatingEstado ? "default" : "pointer", fontSize: "0.9rem"
                                            }}
                                        >
                                            {updatingEstado ? "⏳ Actualizando..." : `Marcar como "${getSiguienteEstado(selectedSale.estado)}"`}
                                        </button>
                                    )}

                                    {/* Indicador flujo */}
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px", gap: "4px" }}>
                                        {ESTADOS_FLUJO.map((e, idx) => {
                                            const idxActual = ESTADOS_FLUJO.indexOf(selectedSale.estado);
                                            const completado = idx <= idxActual;
                                            return (
                                                <div key={e} style={{ flex: 1, textAlign: "center" }}>
                                                    <div style={{
                                                        height: "6px", borderRadius: "3px",
                                                        backgroundColor: completado ? "var(--color-primary)" : "#e0e0e0",
                                                        marginBottom: "4px"
                                                    }} />
                                                    <span style={{ fontSize: "0.65rem", color: completado ? "var(--color-primary)" : "#aaa", fontWeight: completado ? "bold" : "normal" }}>
                                                        {e}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: "20px", borderTop: "1px solid #eee", paddingTop: "15px" }}>
                            <p style={{ margin: 0 }}>
                                <strong style={{ color: "#555" }}>Dirección de Entrega:</strong><br />
                                <span style={{ fontSize: "1.1rem", color: "#333" }}>📍 {selectedSale.direccionEntrega || "—"}</span>
                            </p>
                        </div>

                        <div className="farmer-sales-modal-actions">
                            <button onClick={() => setSelectedSale(null)} style={{ backgroundColor: "var(--color-primary)", color: "white", border: "none", padding: "10px 20px", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: "bold" }}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FarmerSales;