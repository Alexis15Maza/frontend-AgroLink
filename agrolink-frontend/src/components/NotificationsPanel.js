import { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import api from '../api/axiosConfig';

function NotificationsPanel({ rol, usuarioId }) {
    const [notifications, setNotifications] = useState(() => {
        const saved = localStorage.getItem(`agrolink_notifications_${rol}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [activeTab, setActiveTab] = useState('new');
    const stompClient = useRef(null);

    useEffect(() => {
        localStorage.setItem(`agrolink_notifications_${rol}`, JSON.stringify(notifications));
        window.dispatchEvent(new Event('notificationsUpdated'));
    }, [notifications, rol]);

    const upsertNotificacion = (nueva) => {
        setNotifications(prev => {
            const existe = prev.find(n => n.id === nueva.id);
            if (existe) return prev.map(n => n.id === nueva.id ? { ...nueva, leida: n.leida } : n);
            return [{ ...nueva, leida: false }, ...prev];
        });
    };

    const cargarNotificaciones = () => {
        api.get('/api/notificaciones').then(res => {
            res.data.forEach(upsertNotificacion);
        }).catch(err => console.error('Error cargando notificaciones', err));
    };

    useEffect(() => {
        cargarNotificaciones();

        if (rol === 'agricultor' && usuarioId) {
            const token = localStorage.getItem('token');
            const socket = new SockJS('http://localhost:8080/ws-agrolink');
            const client = Stomp.over(socket);
            client.connect({ Authorization: `Bearer ${token}` }, () => {
                client.subscribe(`/topic/agricultor/${usuarioId}`, (msg) => {
                    upsertNotificacion(JSON.parse(msg.body));
                });
            });
            stompClient.current = client;
            return () => client.disconnect();
        } else {
            const interval = setInterval(cargarNotificaciones, 5000);
            return () => clearInterval(interval);
        }
    }, [rol, usuarioId]);

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    };

    const newNotifications = notifications.filter(n => !n.leida);
    const readNotifications = notifications.filter(n => n.leida);
    const displayed = activeTab === 'new' ? newNotifications : readNotifications;

    const tipoLabel = (tipo) => {
        switch (tipo) {
            case 'PEDIDO_RECIBIDO': return '📦 Nuevo pedido';
            case 'PEDIDO_ESTADO': return '📦 Actualización de pedido';
            case 'CULTIVO_LISTO': return '🌾 Cultivo listo';
            default: return tipo;
        }
    };

    const esAlerta = (tipo) => tipo === 'CULTIVO_LISTO';

    return (
        <div>
            <h2 style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-titles)', marginBottom: '10px', fontSize: '2rem' }}>
                Notificaciones
            </h2>
            <p style={{ color: '#555', fontSize: '1.1rem', marginBottom: '30px' }}>
                {rol === 'agricultor'
                    ? 'Alertas sobre tus pedidos y el estado de tus cultivos.'
                    : 'Alertas sobre tus pedidos y problemas en los cultivos adquiridos.'}
            </p>

            <div className="buyer-notifications-tabs">
                <button onClick={() => setActiveTab('new')} style={{
                    background: 'transparent', border: 'none',
                    borderBottom: activeTab === 'new' ? '3px solid var(--color-primary)' : '3px solid transparent',
                    color: activeTab === 'new' ? 'var(--color-primary)' : '#666',
                    padding: '8px 16px', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', marginBottom: '-15px'
                }}>
                    Nuevas
                    <span style={{
                        backgroundColor: newNotifications.length > 0 ? '#d32f2f' : '#ccc',
                        color: 'white', fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold'
                    }}>
                        {newNotifications.length}
                    </span>
                </button>
                <button onClick={() => setActiveTab('read')} style={{
                    background: 'transparent', border: 'none',
                    borderBottom: activeTab === 'read' ? '3px solid var(--color-primary)' : '3px solid transparent',
                    color: activeTab === 'read' ? 'var(--color-primary)' : '#666',
                    padding: '8px 16px', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', marginBottom: '-15px'
                }}>
                    Leídas
                    <span style={{
                        backgroundColor: '#777', color: 'white', fontSize: '0.8rem',
                        padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold'
                    }}>
                        {readNotifications.length}
                    </span>
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {displayed.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '50px 20px', backgroundColor: 'white',
                        borderRadius: 'var(--radius-lg)', border: '1px solid #eee', boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
                    }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>
                            {activeTab === 'new' ? '🍃' : '📁'}
                        </span>
                        <p style={{ color: '#888', fontSize: '1.1rem', margin: 0 }}>
                            {activeTab === 'new' ? '¡Todo al día! No tienes notificaciones nuevas.' : 'No tienes notificaciones leídas archivadas.'}
                        </p>
                    </div>
                ) : (
                    displayed.map(notif => (
                        <div key={notif.id} className="buyer-notification-card" style={{
                            backgroundColor: 'white', borderRadius: 'var(--radius-lg)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                            borderLeft: esAlerta(notif.tipo) ? '5px solid #d32f2f' : '5px solid var(--color-primary)',
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 'bold', color: esAlerta(notif.tipo) ? '#d32f2f' : 'var(--color-primary)' }}>
                                        {tipoLabel(notif.tipo)}
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: '#888' }}>
                                        {new Date(notif.fecha).toLocaleString()}
                                    </span>
                                </div>
                                <p style={{ margin: 0, color: '#555', fontSize: '1rem', lineHeight: '1.5' }}>{notif.mensaje}</p>
                            </div>
                            {!notif.leida && (
                                <button onClick={() => markAsRead(notif.id)} style={{
                                    backgroundColor: 'transparent', border: '1.5px solid var(--color-primary)',
                                    color: 'var(--color-primary)', padding: '8px 16px', borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', transition: 'all 0.2s'
                                }}>
                                    Marcar como leída
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default NotificationsPanel;