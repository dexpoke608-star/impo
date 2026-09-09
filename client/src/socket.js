import { io } from "socket.io-client";

// Same-origin in production (server serves the built client); Vite's dev
// proxy forwards /socket.io to the backend during local development.
export const socket = io({ autoConnect: true });
