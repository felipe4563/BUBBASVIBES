import { io } from 'socket.io-client';
import { BASE_URL } from './api/configuracion';
import { useAuthStore } from './store/authStore';

const socket = io(BASE_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
});

function unirseSucursalActiva() {
  const sucursalId = useAuthStore.getState().usuario?.sucursal_activa?.id;
  if (sucursalId) socket.emit('unirse_sucursal', sucursalId);
}

// Al reconectar (incluye la primera conexión) y cada vez que cambia el usuario logueado
socket.on('connect', unirseSucursalActiva);
useAuthStore.subscribe((state, prevState) => {
  if (state.usuario?.sucursal_activa?.id !== prevState.usuario?.sucursal_activa?.id) {
    unirseSucursalActiva();
  }
});

export default socket;
