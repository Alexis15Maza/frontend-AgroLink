import React, { useState, useEffect } from 'react';
import { obtenerCatalogo } from '../../api/compradorService';

function BuyerCatalog({ acquiredIds, onAddToCart }) {
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCrop, setSelectedCrop] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    const [cartItems, setCartItems] = useState(() => {
        const saved = localStorage.getItem('agrolink_cart');
        if (saved) {
            try { return JSON.parse(saved); } 
            catch (e) { return []; }
        }
        return [];
    });

    const [purchaseData, setPurchaseData] = useState({
        cantidad: '', metodoPago: '', porcentajeAdelanto: 0,
        direccionEntrega: '', fechaEntregaEstimada: ''
    });

    // ← Cargar catálogo del backend
    useEffect(() => {
        const cargarCatalogo = async () => {
            setLoading(true);
            try {
                const data = await obtenerCatalogo();
                setCatalog(data);
            } catch (err) {
                console.error('Error cargando catálogo:', err);
            } finally {
                setLoading(false);
            }
        };
        cargarCatalogo();
    }, []);

    useEffect(() => {
        localStorage.setItem('agrolink_cart', JSON.stringify(cartItems));
        window.dispatchEvent(new Event('cartUpdated'));
    }, [cartItems]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    const getProfileAddress = () => {
        const saved = localStorage.getItem('agrolink_buyer_profile');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.direccionEntrega) return data.direccionEntrega;
            } catch (e) {}
        }
        return "Almacén Av. Industrial 1250, Callao";
    };

    const handleCloseModal = () => {
        setSelectedCrop(null);
        setPurchaseData({ cantidad: '', metodoPago: '', porcentajeAdelanto: 0, direccionEntrega: '', fechaEntregaEstimada: '' });
    };

    const normalizeText = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    // Filtrar localmente por búsqueda
    const filteredCrops = catalog.filter(crop => {
        const cleanSearch = normalizeText(searchTerm);
        return (
            normalizeText(crop.productoVariedad?.nombreProductosVariedad || '').includes(cleanSearch)
        );
    });

    const totalPages = Math.ceil(filteredCrops.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const visibleCrops = filteredCrops.slice(startIndex, startIndex + itemsPerPage);

    const handleAddToCart = () => {
        if (!purchaseData.cantidad || parseFloat(purchaseData.cantidad) <= 0) {
            alert('Por favor ingresa una cantidad válida.');
            return;
        }
        if (!purchaseData.metodoPago) {
            alert('Por favor selecciona un método de pago.');
            return;
        }
        if (!purchaseData.direccionEntrega?.trim()) {
            alert('Por favor ingresa una dirección de entrega.');
            return;
        }

        const precio = parseFloat(selectedCrop.precio);
        const cantidad = parseFloat(purchaseData.cantidad);
        const total = precio * cantidad;

        const newItem = {
            id: `CART-${Date.now()}`,
            idCultivo: selectedCrop.id,
            nombre: `${selectedCrop.productoVariedad?.producto?.nombre ?? ''}  ${selectedCrop.productoVariedad?.nombreProductosVariedad ?? ''}`,
            lote: selectedCrop.lote,
            cantidad: purchaseData.cantidad,
            precio: precio,
            metodoPago: purchaseData.metodoPago,
            porcentajeAdelanto: parseInt(purchaseData.porcentajeAdelanto),
            montoTotal: total,
            direccionEntrega: purchaseData.direccionEntrega,
            fechaEntregaEstimada: purchaseData.fechaEntregaEstimada,
            seleccionado: true,
            imagen: selectedCrop.imagenUrl || 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=600',
        };

        setCartItems([...cartItems, newItem]);
        if (onAddToCart) onAddToCart(selectedCrop.id);
        alert(`¡${selectedCrop.productoVariedad?.producto?.nombre}  ${selectedCrop.productoVariedad?.nombreProductosVariedad} añadido al carrito!`);
        handleCloseModal();
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>⏳ Cargando catálogo...</div>;

    return (
        <div>
            <h2 style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-titles)', marginBottom: '5px', fontSize: '2rem' }}>Catálogo de Cultivos</h2>
            <p style={{ color: '#555', fontSize: '1.1rem', marginBottom: '25px' }}>Explora las siembras disponibles y asegura tu compra con adelantos.</p>

            {/* BARRA DE BÚSQUEDA */}
            <div className="buyer-catalog-search" style={{ backgroundColor: 'white', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por cultivo o lote..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '12px 15px 12px 45px', borderRadius: 'var(--radius-md)', border: '1px solid #ddd', fontSize: '0.95rem', boxSizing: 'border-box' }}
                    />
                </div>
            </div>

            {/* GRILLA DE PRODUCTOS */}
            <div className="buyer-catalog-grid">
                {visibleCrops.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: 'var(--radius-lg)' }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>🍃</span>
                        <p style={{ color: '#888', fontSize: '1.1rem' }}>No se encontraron cultivos disponibles.</p>
                    </div>
                ) : (
                    visibleCrops.map(crop => (
                        <div key={crop.id} style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ height: '180px', backgroundImage: `url(${crop.imagenUrl || 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=600'})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ color: '#888', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px' }}>LOTE: {crop.lote}</div>
                                    <h3 style={{ margin: '0 0 12px 0', color: 'var(--color-text)', fontSize: '1.25rem' }}>
                                        {crop.productoVariedad?.producto?.nombre}  {crop.productoVariedad?.nombreProductosVariedad}
                                    </h3>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#666' }}>Disponible:</span>
                                        <strong style={{ color: 'var(--color-primary)' }}>{crop.cantidadDisponible} {crop.unidad}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <span style={{ color: '#666', fontSize: '0.9rem' }}>Precio:</span>
                                        <strong style={{ color: 'var(--color-secondary)', fontSize: '1.15rem' }}>S/ {parseFloat(crop.precio).toFixed(2)} / {crop.unidad}</strong>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedCrop(crop);
                                            setPurchaseData(prev => ({ ...prev, direccionEntrega: '' }));
                                        }}
                                        style={{ width: '100%', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', padding: '12px', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        Ver más detalle
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '45px' }}>
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #ddd', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
                        &laquo; Anterior
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button key={page} onClick={() => setCurrentPage(page)} style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', border: page === currentPage ? '2px solid var(--color-primary)' : '1px solid #ddd', backgroundColor: page === currentPage ? 'var(--color-primary)' : 'white', color: page === currentPage ? 'white' : 'var(--color-text)', fontWeight: 'bold', cursor: 'pointer' }}>
                            {page}
                        </button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid #ddd', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>
                        Siguiente &raquo;
                    </button>
                </div>
            )}

            {/* MODAL DETALLE Y COMPRA */}
            {selectedCrop && (
                <div className="buyer-modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <div className="buyer-modal-container" style={{ backgroundColor: 'white', padding: '40px', borderRadius: 'var(--radius-lg)' }}>
                        <button onClick={handleCloseModal} style={{ position: 'absolute', top: '15px', right: '20px', background: 'transparent', border: 'none', fontSize: '1.8rem', color: '#888', cursor: 'pointer' }}>&times;</button>

                        <h3 style={{ color: 'var(--color-primary)', margin: '0 0 20px 0', fontSize: '1.6rem' }}>
                            {selectedCrop.productoVariedad?.producto?.nombre}  {selectedCrop.productoVariedad?.nombreProductosVariedad}
                        </h3>

                        <div className="buyer-modal-details-grid" style={{ backgroundColor: '#F1F8F5', padding: '18px', borderRadius: 'var(--radius-md)' }}>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>Precio x {selectedCrop.unidad}</span>
                                <strong style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>S/ {parseFloat(selectedCrop.precio).toFixed(2)}</strong>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>Disponible</span>
                                <strong style={{ fontSize: '1.1rem' }}>{selectedCrop.cantidadDisponible} {selectedCrop.unidad}</strong>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>Mínimo de compra</span>
                                <strong>{selectedCrop.minimoVenta} {selectedCrop.unidad}</strong>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>Lote</span>
                                <strong>{selectedCrop.lote}</strong>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Cantidad a Comprar ({selectedCrop.unidad})</label>
                            <input type="number" value={purchaseData.cantidad} onChange={(e) => setPurchaseData({ ...purchaseData, cantidad: e.target.value })} placeholder={`Mínimo: ${selectedCrop.minimoVenta}`} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }} />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Dirección de Entrega</label>
                            <input
                            type="text"
                            value={purchaseData.direccionEntrega}
                            onChange={(e) => setPurchaseData({ ...purchaseData, direccionEntrega: e.target.value })}
                            placeholder={getProfileAddress()}
                            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
                        />
                        </div>

                        <div className="buyer-modal-fields-grid">
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Método de Pago</label>
                                <select value={purchaseData.metodoPago} onChange={(e) => setPurchaseData({ ...purchaseData, metodoPago: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #ccc', fontSize: '1rem', backgroundColor: 'white' }}>
                                    <option value="">-- Seleccionar --</option>
                                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                                    <option value="Depósito en Efectivo">Depósito en Efectivo</option>
                                    <option value="Crédito Comercial 30 días">Crédito Comercial (30 días)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Porcentaje de Adelanto</label>
                                <select value={purchaseData.porcentajeAdelanto} onChange={(e) => setPurchaseData({ ...purchaseData, porcentajeAdelanto: parseInt(e.target.value) })} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #ccc', fontSize: '1rem', backgroundColor: 'white' }}>
                                    <option value={0}>Sin Adelanto</option>
                                    <option value={30}>30% Adelanto</option>
                                    <option value={50}>50% Adelanto</option>
                                </select>
                            </div>
                        </div>

                        {purchaseData.cantidad > 0 && (
                            <div style={{ backgroundColor: '#F4F7F5', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '25px' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: 'var(--color-primary)' }}>Resumen</h4>
                                <p style={{ margin: '0 0 8px 0' }}>Total: <strong>S/ {(parseFloat(purchaseData.cantidad) * parseFloat(selectedCrop.precio)).toFixed(2)}</strong></p>
                                <p style={{ margin: '0 0 8px 0', color: '#2E7D32' }}>Adelanto ({purchaseData.porcentajeAdelanto}%): <strong>S/ {((parseFloat(purchaseData.cantidad) * parseFloat(selectedCrop.precio)) * (purchaseData.porcentajeAdelanto / 100)).toFixed(2)}</strong></p>
                                <p style={{ margin: 0, color: '#d32f2f' }}>Contraentrega: <strong>S/ {((parseFloat(purchaseData.cantidad) * parseFloat(selectedCrop.precio)) * ((100 - purchaseData.porcentajeAdelanto) / 100)).toFixed(2)}</strong></p>
                            </div>
                        )}

                        <div className="buyer-modal-actions">
                            <button onClick={handleCloseModal} style={{ background: 'transparent', border: '1px solid #ccc', padding: '10px 20px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                            <button onClick={handleAddToCart} style={{ backgroundColor: 'var(--color-secondary)', color: 'white', border: 'none', padding: '10px 25px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}>
                                🛒 Añadir al Carrito
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BuyerCatalog;