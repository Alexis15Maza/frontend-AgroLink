import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const formatDate = (dateStr) => {
    if (!dateStr) return 'Presente';
    const parts = dateStr.toString().split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

function TrazabilidadCompleta({ cultivoId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exportando, setExportando] = useState(false);

    useEffect(() => {
        if (!cultivoId) return;
        const cargar = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await api.get(`/api/v1/trazabilidad/${cultivoId}`);
                setData(response.data);
            } catch (err) {
                setError(
                    err.response?.status === 403
                        ? 'No tienes permiso para ver esta trazabilidad.'
                        : 'No se pudo cargar la trazabilidad.'
                );
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, [cultivoId]);

    const handleExportarPdf = async () => {
        setExportando(true);
        try {
            const response = await api.get(`/api/v1/trazabilidad/${cultivoId}/export`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `trazabilidad_cultivo_${cultivoId}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            alert('Error al generar el PDF.');
        } finally {
            setExportando(false);
        }
    };

    return (
        <div className="buyer-modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="buyer-modal-container" style={{ backgroundColor: 'white', padding: '35px', borderRadius: 'var(--radius-lg)', maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '20px', background: 'transparent', border: 'none', fontSize: '1.8rem', cursor: 'pointer' }}>&times;</button>

                <h2 style={{ color: 'var(--color-primary)', marginTop: 0, marginBottom: '20px' }}>🔍 Trazabilidad Completa</h2>

                {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>⏳ Cargando trazabilidad...</div>}
                {error && <div style={{ textAlign: 'center', padding: '20px', color: '#d32f2f', fontWeight: 'bold' }}>{error}</div>}

                {data && (
                    <>
                        {/* AGRICULTOR */}
                        <div style={{ backgroundColor: '#F4F7F5', padding: '18px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
                            <h4 style={{ margin: '0 0 12px 0', color: 'var(--color-secondary)' }}>🌱 Agricultor</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Nombre</span>
                                    <strong>{data.agricultor.nombres} {data.agricultor.apellidoPaterno}</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Ubicación</span>
                                    <strong>{data.agricultor.ubicacion || '—'}</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Años de experiencia</span>
                                    <strong>{data.agricultor.anosExperiencia ?? '—'}</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Hectáreas totales</span>
                                    <strong>{data.agricultor.hectareasTotales ?? '—'}</strong>
                                </div>
                            </div>
                            {data.agricultor.certificaciones && (
                                <div style={{ marginTop: '12px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Certificaciones</span>
                                    <strong>{data.agricultor.certificaciones}</strong>
                                </div>
                            )}
                        </div>

                        {/* CULTIVO */}
                        <div style={{ backgroundColor: 'white', border: '1px solid #eee', padding: '18px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
                            <h4 style={{ margin: '0 0 12px 0', color: 'var(--color-secondary)' }}>🌾 Cultivo</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Producto</span>
                                    <strong>{data.cultivo.nombreProducto} - {data.cultivo.nombreVariedad}</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Lote</span>
                                    <strong>{data.cultivo.lote}</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Estado actual</span>
                                    <strong style={{ color: 'var(--color-primary)' }}>{data.cultivo.estadoActual}</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Fecha de siembra</span>
                                    <strong>{formatDate(data.cultivo.fechaSiembra)}</strong>
                                </div>
                            </div>
                            {data.cultivo.observaciones && (
                                <div style={{ marginTop: '12px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block' }}>Observaciones</span>
                                    <span>{data.cultivo.observaciones}</span>
                                </div>
                            )}
                        </div>

                        {/* HISTORIAL DE ETAPAS */}
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ color: 'var(--color-secondary)', marginBottom: '12px' }}>📅 Historial de Etapas</h4>
                            {data.historialEtapas.length === 0 ? (
                                <p style={{ color: '#888', fontSize: '0.9rem' }}>Sin etapas registradas.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {data.historialEtapas.map(etapa => (
                                        <div key={etapa.idHistorial} style={{
                                            backgroundColor: etapa.activa ? '#E8F5E9' : '#F8F9FA',
                                            border: `1px solid ${etapa.activa ? 'var(--color-primary)' : '#eee'}`,
                                            borderRadius: 'var(--radius-md)',
                                            padding: '12px 15px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                                <strong style={{ color: '#333' }}>{etapa.estadoCultivo}</strong>
                                                <span style={{ fontSize: '0.85rem', color: '#888' }}>
                                                    {formatDate(etapa.fechaInicio)} → {formatDate(etapa.fechaFin)}
                                                </span>
                                            </div>
                                            {etapa.alertaRetraso && (
                                                <span style={{ fontSize: '0.8rem', color: '#d32f2f', fontWeight: 'bold' }}>
                                                    ⚠️ Retraso del {etapa.porcentajeRetraso?.toFixed(1)}%
                                                </span>
                                            )}
                                            {etapa.observaciones && (
                                                <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#555' }}>{etapa.observaciones}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* PEDIDOS VINCULADOS */}
                        <div style={{ marginBottom: '10px' }}>
                            <h4 style={{ color: 'var(--color-secondary)', marginBottom: '12px' }}>📦 Pedidos Vinculados</h4>
                            {data.pedidosVinculados.length === 0 ? (
                                <p style={{ color: '#888', fontSize: '0.9rem' }}>Sin pedidos registrados para este cultivo.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {data.pedidosVinculados.map((p, idx) => (
                                        <div key={idx} style={{ backgroundColor: '#F8F9FA', border: '1px solid #eee', borderRadius: 'var(--radius-md)', padding: '12px 15px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '5px' }}>
                                                <strong style={{ color: 'var(--color-primary)' }}>Pedido #{p.idPedido}</strong>
                                                <span style={{ fontSize: '0.85rem', color: '#888' }}>{new Date(p.fechaCreacion).toLocaleDateString('es-PE')}</span>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#555' }}>
                                                {p.nombreComprador} {p.nombreNegocio ? `(${p.nombreNegocio})` : ''} — {p.cantidadSolicitada} {p.unidadMedida} — Estado: <strong>{p.estadoPedido}</strong>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                            <button onClick={handleExportarPdf} disabled={exportando} style={{ backgroundColor: '#E8F5E9', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: exportando ? 'default' : 'pointer' }}>
                                {exportando ? '⏳ Generando...' : '📄 Exportar PDF'}
                            </button>
                            <button onClick={onClose} style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}>Cerrar</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default TrazabilidadCompleta;