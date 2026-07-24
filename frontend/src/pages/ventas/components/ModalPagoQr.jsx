import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { consultarEstadoPagoQr, cancelarPagoQr } from '../../../api/pagosQr';
import Modal from '../../../components/ui/Modal';

export default function ModalPagoQr({ pedidoId, pagoQr, onClose, onCompletado, onReintentar }) {
  const [restanteMs, setRestanteMs] = useState(() => Math.max(0, new Date(pagoQr.expires_at).getTime() - Date.now()));

  const estadoQuery = useQuery({
    queryKey: ['pago-qr-estado', pedidoId, pagoQr.tx_id],
    queryFn: () => consultarEstadoPagoQr(pedidoId),
    refetchInterval: (query) => {
      const estado = query.state.data?.estado;
      return (!estado || estado === 'pendiente') ? 3000 : false;
    },
  });

  const cancelar = useMutation({
    mutationFn: () => cancelarPagoQr(pedidoId),
    onSuccess: () => onClose(),
  });

  useEffect(() => {
    const intervalo = setInterval(() => {
      setRestanteMs(Math.max(0, new Date(pagoQr.expires_at).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(intervalo);
  }, [pagoQr.expires_at]);

  const estado = estadoQuery.data?.estado ?? 'pendiente';

  const handleClose = () => {
    if (estado === 'pendiente') {
      if (!cancelar.isPending) cancelar.mutate();
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (estado === 'completado' && estadoQuery.data?.pedido) {
      onCompletado(estadoQuery.data.pedido);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const minutos = Math.floor(restanteMs / 60000);
  const segundos = Math.floor((restanteMs % 60000) / 1000);

  return (
    <Modal titulo="Cobro por QR" onClose={handleClose} ancho="max-w-sm">
      <div className="space-y-4 text-center">
        {estado === 'pendiente' && (
          <>
            <img
              src={pagoQr.qr_code}
              alt="Código QR de pago"
              className="mx-auto w-56 h-56 sm:w-64 sm:h-64 rounded-xl border border-gray-200 dark:border-gray-700 object-contain"
            />
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total que paga el cliente</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                Bs {Number(pagoQr.monto_total ?? pagoQr.monto_neto).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Expira en {minutos}:{String(segundos).padStart(2, '0')}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={cancelar.isPending}
              className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
            >
              Cancelar cobro QR
            </button>
          </>
        )}

        {(estado === 'fallido' || estado === 'expirado') && (
          <div className="space-y-4">
            <p className="text-sm text-red-600">
              {estado === 'expirado' ? 'El QR expiró sin que se registre el pago.' : 'El pago no se completó.'}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cambiar método de pago
              </button>
              <button
                onClick={onReintentar}
                className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
