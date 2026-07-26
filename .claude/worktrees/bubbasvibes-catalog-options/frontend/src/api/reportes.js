import api from './cliente';

export const getReporteVentas     = (params = {}) => api.get('/reportes/ventas',     { params }).then(r => r.data.datos);
export const getReporteInventario = (params = {}) => api.get('/reportes/inventario', { params }).then(r => r.data.datos);
export const getReporteCompras    = (params = {}) => api.get('/reportes/compras',    { params }).then(r => r.data.datos);
export const getReporteCaja       = (params = {}) => api.get('/reportes/caja',       { params }).then(r => r.data.datos);
