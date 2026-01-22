import { io } from 'socket.io-client';

function createSocket(token) {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return io(url, {
    autoConnect: false,
    auth: {
      token,
    },
  });
}

export { createSocket };
