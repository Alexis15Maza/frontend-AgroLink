import React, { useState } from 'react';
import { crearPedido } from '../../api/compradorService';

function BuyerCart() {
    const [cartItems, setCartItems] = useState(() => {
        const saved = localStorage.getItem('agrolink_cart');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Error reading cart from localStorage", e);
            }
        }
        return [];
    });

    const [gatewayModal, setGatewayModal] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [cardData, setCardData] = useState({ numero: '', vencimiento: '', cvv: '', titular: '' });
    const [paymentModal, setPaymentModal] = useState(false);
    const [paymentSummary, setPaymentSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    React.useEffect(() => {
        localStorage.setItem('agrolink_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const toggleSelection = (id) =>
        setCartItems(cartItems.map(item => item.id === id ? { ...item, seleccionado: !item.seleccionado } : item));

    const handleEliminar = (id) =>
        setCartItems(cartItems.filter(item => item.id !== id));

    const itemsSeleccionados = cartItems.filter(i => i.seleccionado);
    const totalPagar = itemsSeleccionados.reduce((acc, curr) => acc + curr.montoTotal, 0);
    const totalAdelanto = itemsSeleccionados.reduce((acc, curr) => acc + (curr.montoTotal * (curr.porcentajeAdelanto / 100)), 0);
    const metodoActivo = itemsSeleccionados[0]?.metodoPago; 
    
    const handleGenerateOrder = () => {
        if (itemsSeleccionados.length === 0) {
            alert("Selecciona al menos un producto.");
            return;
        }

        const metodosUnicos = [...new Set(itemsSeleccionados.map(i => i.metodoPago))];
        if (metodosUnicos.length > 1) {
            alert("No puedes pagar en un mismo pedido productos con métodos de pago distintos. Selecciona solo los que compartan el mismo método.");
            return;
        }

        setError(null);
        setGatewayModal(true);
    };

    const handleConfirmarPago = async () => {

    if (metodoActivo === 'Transferencia Bancaria') {
        const numeroLimpio = cardData.numero.replace(/\s/g, '');
        if (!cardData.titular.trim()) {
            alert("Ingresa el nombre del titular.");
            return;
        }
        if (numeroLimpio.length !== 16) {
            alert("El número de tarjeta debe tener 16 dígitos.");
            return;
        }
        if (!/^\d{2}\/\d{2}$/.test(cardData.vencimiento)) {
            alert("La fecha de vencimiento debe tener el formato MM/AA.");
            return;
        }
        if (cardData.cvv.length < 3) {
            alert("El CVV debe tener al menos 3 dígitos.");
            return;
        }
    }

    if (metodoActivo === 'Depósito en Efectivo') {
        if (!cardData.numeroOperacion?.trim()) {
            alert("Ingresa el número de operación del depósito.");
            return;
        }
    }

    // Crédito Comercial 30 días no requiere validación de datos, solo confirmar

    setProcessingPayment(true);
    setError(null);

    const pedidoPayload = {
        items: itemsSeleccionados.map(item => ({
            cultivoId: item.idCultivo || item.cultivoId,
            cantidad: parseFloat(item.cantidad),
            precioPactado: parseFloat(item.precio),
            direccionEntrega: item.direccionEntrega,
            metodoPago: item.metodoPago,                   
            porcentajeAdelanto: parseInt(item.porcentajeAdelanto) 
        }))
    };

    try {
        // Simulación de procesamiento de pago (visual, no real)
        await new Promise(resolve => setTimeout(resolve, 1500));

        const respuesta = await crearPedido(pedidoPayload);

        const defaultDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('es-PE');
        const getItemDate = (item) => {
            if (item.fechaEntregaEstimada) {
                const d = new Date(item.fechaEntregaEstimada);
                return isNaN(d) ? defaultDate : d.toLocaleDateString('es-PE');
            }
            return defaultDate;
        };

        const uniqueAddresses = [...new Set(itemsSeleccionados.map(i => i.direccionEntrega || 'Sin especificar'))];
        const headerAddress = uniqueAddresses.length === 1 ? uniqueAddresses[0] : 'Múltiples destinos (ver en lista de productos)';
        const uniqueDates = [...new Set(itemsSeleccionados.map(i => getItemDate(i)))];
        const headerDate = uniqueDates.length === 1 ? uniqueDates[0] : 'Múltiples fechas de entrega';

        const summary = {
            id: respuesta.id || respuesta.pedidoId || `PED-${Date.now().toString().slice(-4)}`,
            fecha: new Date().toLocaleDateString('es-PE'),
            fechaEntregaEstimada: headerDate,
            items: itemsSeleccionados,
            total: totalPagar,
            adelanto: totalAdelanto,
            contraEntrega: totalPagar - totalAdelanto
        };

        const savedOrders = JSON.parse(localStorage.getItem('agrolink_orders') || '[]');
        const newOrder = {
            id: summary.id,
            fecha: summary.fecha,
            fechaEntregaEstimada: headerDate,
            estado: 'Pendiente',
            metodoPago: itemsSeleccionados[0].metodoPago,
            direccionEntrega: headerAddress,
            productos: itemsSeleccionados.map(item => ({
                cultivoId: item.idCultivo || item.cultivoId,
                nombre: item.nombre,
                imagen: item.imagen,
                cantidad: `${item.cantidad} Kg`,
                loteParcial: item.loteParcial || `LP-${Math.floor(Math.random() * 1000)}`,
                agricultor: item.agricultor,
                adelanto: item.porcentajeAdelanto,
                precio: item.precio,
                montoTotal: item.montoTotal,
                montoAdelanto: `S/ ${(item.montoTotal * (item.porcentajeAdelanto / 100)).toFixed(2)}`,
                montoPendiente: `S/ ${(item.montoTotal * ((100 - item.porcentajeAdelanto) / 100)).toFixed(2)}`,
                direccionEntrega: item.direccionEntrega,
                fechaEntregaEstimada: getItemDate(item),
                metodoPago: item.metodoPago,
                detallesProducto: item.detallesProducto || null
            })),
            total: `S/ ${totalPagar.toFixed(2)}`
        };
        localStorage.setItem('agrolink_orders', JSON.stringify([newOrder, ...savedOrders]));

        setCartItems(cartItems.filter(item => !item.seleccionado));
        setGatewayModal(false);
        setCardData({ numero: '', vencimiento: '', cvv: '', titular: '' });
        setPaymentSummary(summary);
        setPaymentModal(true);

    } catch (err) {
        console.error('Error al crear pedido:', err);
        setGatewayModal(false);

        const data = err.response?.data;
        if (data && typeof data === 'object' && data.stockDisponible !== undefined) {
            setError(`No hay suficiente stock de "${data.nombreProducto}". Cantidad de stock actual: ${data.stockDisponible} ${data.unidad || ''}`);
        } else if (typeof data === 'string') {
            setError(data);
        } else {
            setError('Hubo un error al procesar tu pedido. Por favor intenta de nuevo.');
        }
    } finally {
        setProcessingPayment(false);
    }
};

    return (
        <div>
            <h2 style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-titles)', marginBottom: '10px', fontSize: '2rem' }}>Mi Carrito</h2>
            <p style={{ color: '#555', fontSize: '1.1rem', marginBottom: '30px' }}>Selecciona los productos para generar tu pedido y proceder al pago del adelanto.</p>

            {error && (
                <div style={{ backgroundColor: '#FFEBEE', border: '1px solid #ffcdd2', borderRadius: 'var(--radius-md)', padding: '15px', marginBottom: '20px', color: '#d32f2f', fontWeight: 'bold' }}>
                    ⚠️ {error}
                </div>
            )}

            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                {cartItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>🛒</span>
                        <p style={{ color: '#888', fontSize: '1.1rem' }}>Tu carrito está vacío. Ve al catálogo y añade productos.</p>
                    </div>
                ) : (
                    <div>
                        {cartItems.map(item => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #eee', backgroundColor: item.seleccionado ? '#F4F7F5' : 'white', transition: '0.2s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <input type="checkbox" checked={item.seleccionado} onChange={() => toggleSelection(item.id)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                    <img
                                        src={item.imagen || 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=600'}
                                        alt={item.nombre}
                                        style={{ width: '90px', height: '90px', borderRadius: 'var(--radius-md)', objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                                    />
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0', color: 'var(--color-text)', fontSize: '1.2rem' }}>{item.nombre}</h4>
                                        {item.agricultor && (
                                            <span style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '2px' }}>🌱 Agricultor: <strong>{item.agricultor}</strong></span>
                                        )}
                                        <span style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '2px' }}>📦 Lote: {item.lote}</span>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', display: 'block', fontWeight: 'bold' }}>💳 Pago: {item.metodoPago} | Adelanto: {item.porcentajeAdelanto}%</span>
                                        <span style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginTop: '4px' }}>📍 Entrega: <strong>{item.direccionEntrega || 'Almacén Av. Industrial 1250, Callao'}</strong></span>
                                        <button
                                            onClick={() => handleEliminar(item.id)}
                                            style={{ marginTop: '8px', background: 'transparent', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', padding: 0 }}
                                        >
                                            🗑 Eliminar
                                        </button>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'var(--color-secondary)', fontWeight: 'bold', fontSize: '1.3rem', marginBottom: '5px' }}>S/ {item.montoTotal.toFixed(2)}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '5px' }}>{item.cantidad} Kg @ S/ {item.precio}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#2E7D32', backgroundColor: '#E8F5E9', padding: '3px 8px', borderRadius: '10px', display: 'inline-block' }}>
                                        Adelanto: S/ {(item.montoTotal * (item.porcentajeAdelanto / 100)).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div style={{ marginTop: '30px', backgroundColor: '#E8F5E9', padding: '25px', borderRadius: 'var(--radius-md)', border: '1px solid #c8e6c9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><strong>Ítems Seleccionados:</strong><span>{itemsSeleccionados.length}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><strong>Total del Pedido:</strong><span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>S/ {totalPagar.toFixed(2)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2E7D32' }}><strong>A pagar ahora (Adelantos):</strong><span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>S/ {totalAdelanto.toFixed(2)}</span></div>
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleGenerateOrder}
                                disabled={itemsSeleccionados.length === 0 || loading}
                                style={{
                                    backgroundColor: itemsSeleccionados.length === 0 || loading ? '#ccc' : 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '14px 40px',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'bold',
                                    cursor: itemsSeleccionados.length === 0 || loading ? 'not-allowed' : 'pointer',
                                    fontSize: '1.1rem',
                                    boxShadow: '0 4px 6px rgba(46, 125, 50, 0.2)'
                                }}
                            >
                                {loading ? '⏳ Procesando...' : 'Proceder al Pago'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DE PAGO */}
            {gatewayModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '450px', position: 'relative' }}>
                        {!processingPayment ? (
    <>
        <h2 style={{ color: 'var(--color-primary)', textAlign: 'center', margin: '0 0 5px 0' }}>
            {metodoActivo === 'Transferencia Bancaria' && '🏦 Transferencia Bancaria'}
            {metodoActivo === 'Depósito en Efectivo' && '💵 Depósito en Efectivo'}
            {metodoActivo === 'Crédito Comercial 30 días' && '📄 Crédito Comercial'}
        </h2>
        <p style={{ textAlign: 'center', color: '#888', fontSize: '0.9rem', marginBottom: '25px' }}>
            {metodoActivo === 'Transferencia Bancaria' && 'Ingresa los datos de tu tarjeta o cuenta de origen'}
            {metodoActivo === 'Depósito en Efectivo' && 'Sube el comprobante de tu depósito'}
            {metodoActivo === 'Crédito Comercial 30 días' && 'Confirma las condiciones del crédito'}
        </p>

        <div style={{ backgroundColor: '#F1F8F5', padding: '15px', borderRadius: 'var(--radius-md)', marginBottom: '20px', textAlign: 'center' }}>
            <span style={{ color: '#666', fontSize: '0.9rem' }}>
                {metodoActivo === 'Crédito Comercial 30 días' ? 'Total del pedido' : 'Total a pagar ahora'}
            </span><br />
            <strong style={{ fontSize: '1.6rem', color: 'var(--color-secondary)' }}>
                S/ {metodoActivo === 'Crédito Comercial 30 días' ? totalPagar.toFixed(2) : totalAdelanto.toFixed(2)}
            </strong>
        </div>

        {/* --- TRANSFERENCIA BANCARIA: formulario de tarjeta --- */}
        {metodoActivo === 'Transferencia Bancaria' && (
            <>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Titular de la tarjeta</label>
                    <input type="text" value={cardData.titular} onChange={(e) => {
                        const soloLetras = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
                        setCardData({ ...cardData, titular: soloLetras });
                    }} placeholder="Nombre como aparece en la tarjeta" style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Número de tarjeta</label>
                    <input type="text" inputMode="numeric" value={cardData.numero} onChange={(e) => {
                        const soloDigitos = e.target.value.replace(/\D/g, '').slice(0, 16);
                        setCardData({ ...cardData, numero: soloDigitos.replace(/(.{4})/g, '$1 ').trim() });
                    }} placeholder="1234 5678 9012 3456" maxLength={19} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Vencimiento</label>
                        <input type="text" inputMode="numeric" value={cardData.vencimiento} onChange={(e) => {
                            let d = e.target.value.replace(/\D/g, '').slice(0, 4);
                            if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2);
                            setCardData({ ...cardData, vencimiento: d });
                        }} placeholder="MM/AA" maxLength={5} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>CVV</label>
                        <input type="text" inputMode="numeric" value={cardData.cvv} onChange={(e) => {
                            setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) });
                        }} placeholder="123" maxLength={4} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    </div>
                </div>
            </>
        )}

        {/* --- DEPÓSITO EN EFECTIVO: número de operación --- */}
        {metodoActivo === 'Depósito en Efectivo' && (
            <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>N° de operación / voucher</label>
                <input type="text" value={cardData.numeroOperacion || ''} onChange={(e) => {
                    setCardData({ ...cardData, numeroOperacion: e.target.value.replace(/[^a-zA-Z0-9-]/g, '') });
                }} placeholder="Ej. OP-4587921" style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '8px' }}>
                    Ingresa el número de operación del depósito realizado a la cuenta de AgroLink.
                </p>
            </div>
        )}

        {/* --- CRÉDITO COMERCIAL: solo confirmación, sin datos financieros --- */}
        {metodoActivo === 'Crédito Comercial 30 días' && (
            <div style={{ backgroundColor: '#FFF8E1', border: '1px solid #ffe082', borderRadius: 'var(--radius-md)', padding: '15px', marginBottom: '10px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#795548' }}>
                    Al confirmar, aceptas pagar el total de <strong>S/ {totalPagar.toFixed(2)}</strong> dentro de los
                    <strong> 30 días</strong> posteriores a la entrega del pedido.
                </p>
            </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button onClick={() => setGatewayModal(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #ccc', padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
            <button onClick={handleConfirmarPago} style={{ flex: 2, backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', padding: '12px', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}>
                {metodoActivo === 'Crédito Comercial 30 días' ? 'Confirmar Pedido' : `Pagar S/ ${(metodoActivo === 'Depósito en Efectivo' ? totalAdelanto : totalAdelanto).toFixed(2)}`}
            </button>
        </div>
    </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⏳</div>
                                <p style={{ color: '#555', fontWeight: 'bold' }}>
                                    {metodoActivo === 'Crédito Comercial 30 días' ? 'Registrando tu pedido...' : 'Procesando tu pago...'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* MODAL CONFIRMACIÓN */}
            {paymentModal && paymentSummary && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '550px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ textAlign: 'center', fontSize: '4rem', marginBottom: '10px' }}>✅</div>
                        <h2 style={{ color: 'var(--color-primary)', textAlign: 'center', margin: '0 0 20px 0' }}>¡Pedido Generado!</h2>

                        <div style={{ backgroundColor: '#F8F9FA', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid #eee', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', paddingBottom: '10px', marginBottom: '15px' }}>
                                <div><strong>N° Orden:</strong><br /><span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{paymentSummary.id}</span></div>
                                <div style={{ textAlign: 'right' }}><strong>Fecha de Compra:</strong><br /><span style={{ color: '#555' }}>{paymentSummary.fecha}</span></div>
                            </div>

                            <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '0.95rem' }}>Productos Asegurados:</h4>
                            {paymentSummary.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#555', marginBottom: '10px', backgroundColor: 'white', padding: '8px', borderRadius: '5px', borderLeft: '3px solid var(--color-primary)' }}>
                                    <img src={item.imagen || 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=600'} alt={item.nombre} style={{ width: '45px', height: '45px', borderRadius: '5px', objectFit: 'cover' }} />
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontWeight: 'bold', color: '#333' }}>{item.nombre}</span> ({item.cantidad} Kg)<br />
                                        {item.agricultor && <span style={{ fontSize: '0.8rem', color: '#777' }}>Agricultor: {item.agricultor}</span>}
                                    </div>
                                    <strong style={{ color: 'var(--color-secondary)' }}>S/ {item.montoTotal.toFixed(2)}</strong>
                                </div>
                            ))}

                            <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><span>Total Pedido:</span><strong>S/ {paymentSummary.total.toFixed(2)}</strong></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2E7D32', marginBottom: '5px' }}><span>Cobrado ahora (Adelantos):</span><strong>S/ {paymentSummary.adelanto.toFixed(2)}</strong></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d32f2f' }}><span>Saldo Contraentrega:</span><strong>S/ {paymentSummary.contraEntrega.toFixed(2)}</strong></div>
                            </div>
                        </div>

                        <button
                            onClick={() => setPaymentModal(false)}
                            style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BuyerCart;