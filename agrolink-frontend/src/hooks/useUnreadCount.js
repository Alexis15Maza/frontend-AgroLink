import { useState, useEffect } from 'react';

export function useUnreadCount(rol) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const calcular = () => {
            const saved = localStorage.getItem(`agrolink_notifications_${rol}`);
            if (!saved) {
                setCount(0);
                return;
            }
            try {
                const lista = JSON.parse(saved);
                setCount(lista.filter(n => !n.leida).length);
            } catch {
                setCount(0);
            }
        };

        calcular(); // al montar

        window.addEventListener('notificationsUpdated', calcular);
        return () => window.removeEventListener('notificationsUpdated', calcular);
    }, [rol]);

    return count;
}