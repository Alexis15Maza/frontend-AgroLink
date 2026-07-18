import React, { useState, useEffect } from 'react';
import { obtenerPerfil } from '../../api/agricultorService';
import NotificationsPanel from '../../components/NotificationsPanel';

function FarmerNotifications() {
    const [agricultorId, setAgricultorId] = useState(null);

    useEffect(() => {
        obtenerPerfil().then(data => setAgricultorId(data.id)).catch(console.error);
    }, []);

    if (!agricultorId) return <p>Cargando...</p>;

    return <NotificationsPanel rol="agricultor" usuarioId={agricultorId} />;
}

export default FarmerNotifications;