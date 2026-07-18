import api from './axiosConfig';

export const actualizarDatosPersonales = async (datos) => {
    const response = await api.put('/agricultor/datos-personales', datos);
    return response.data;
};

export const cambiarPassword = async (datos) => {
    const response = await api.put('/agricultor/cambiar-password', datos);
    return response.data;
};

export const actualizarPerfilAgricola = async (datos) => {
    const response = await api.put('/agricultor/perfil-agricola', datos);
    return response.data;
};

export const obtenerPerfil = async () => {
    const response = await api.get('/agricultor/perfil');
    return response.data;
};

export const listarCultivos = async () => {
    const response = await api.get('/cultivos');
    return response.data;
};

export const registrarCultivo = async (datos) => {
    const response = await api.post('/cultivos', datos);
    return response.data;
};

export const actualizarCultivo = async (id, datos) => {
    const response = await api.put(`/cultivos/${id}`, datos);
    return response.data;
};

export const eliminarCultivo = async (id) => {
    const response = await api.delete(`/cultivos/${id}`);
    return response.data;
};

export const actualizarEtapasCultivo = async (id, datos) => {
    const response = await api.post(`/cultivos/${id}/etapas`, datos);
    return response.data;
};

export const listarProductos = async () => {
    const response = await api.get('/productos');
    return response.data;
};

export const listarVariedadesPorProducto = async (idProducto) => {
    const response = await api.get(`/productos/${idProducto}/variedades`);
    return response.data;
};

export const registrarMerma = async (idCultivo, datos) => {
    const response = await api.post(`/cultivos/${idCultivo}/merma`, datos);
    return response.data;
};

export const obtenerVentas = async () => {
    const response = await api.get('/agricultor/ventas');
    return response.data;
};

export const obtenerCatalogo = async () => {
    const response = await api.get('/productos/catalogo');
    return response.data;
};

export const exportarCultivosExcel = async () => {
    const response = await api.get('/reportes/mis-cultivos/excel', {
        responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'catalogo_cultivos.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportarVentasExcel = async () => {
    const response = await api.get('/reportes/mis-ventas/excel', {
        responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mis_ventas.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const obtenerHistorialCultivo = async (idCultivo) => {
    const response = await api.get(`/cultivos/${idCultivo}/etapas`);
    return response.data;
};

export const confirmarCosecha = async (idCultivo, volumenCosechado) => {
    const response = await api.post(`/cultivos/${idCultivo}/cosechar`, { volumenCosechado });
    return response.data;
};