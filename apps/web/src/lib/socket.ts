import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
    socket = io(serverUrl, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
