import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getServerUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SERVER_URL?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!rawUrl) {
      const message =
        '[SOCKET FATAL] Missing NEXT_PUBLIC_SERVER_URL in production environment. ' +
        'Please configure NEXT_PUBLIC_SERVER_URL with your Railway backend domain.';
      console.error(message);
      throw new Error(message);
    }
    return rawUrl.replace(/\/+$/, '');
  }
  return (rawUrl || 'http://localhost:4000').replace(/\/+$/, '');
}

export function getSocket(): Socket {
  if (!socket) {
    const serverUrl = getServerUrl();
    socket = io(serverUrl, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

