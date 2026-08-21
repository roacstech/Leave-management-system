import http from "http";
import { Server } from "socket.io";

const PORT = parseInt(process.env.SOCKET_PORT || "3002", 10);

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", clients: io.engine.clientsCount }));
    return;
  }

  // Internal emit endpoint called by Next.js backend
  if (url.pathname === "/emit" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { userId, event, data } = JSON.parse(body);
        if (!userId || !event) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "userId and event required" }));
          return;
        }

        const room = `user:${userId}`;
        io.to(room).emit(event, data);
        console.log(`[Socket Server] Emitted event "${event}" to room "${room}"`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on("connection", (socket) => {
  console.log(`[Socket Server] Client connected: ${socket.id}`);

  // Auto-join from query params if available
  const queryUserId = socket.handshake.query?.userId || socket.handshake.auth?.userId;
  if (queryUserId) {
    const room = `user:${queryUserId}`;
    socket.join(room);
    console.log(`[Socket Server] Socket ${socket.id} joined room "${room}" via handshake`);
  }

  // Handle explicit join-room request
  socket.on("join", (data) => {
    const userId = typeof data === "object" ? data?.userId : data;
    if (userId) {
      const room = `user:${userId}`;
      socket.join(room);
      console.log(`[Socket Server] Socket ${socket.id} joined room "${room}"`);
      socket.emit("joined", { room, userId });
    }
  });

  socket.on("leave", (data) => {
    const userId = typeof data === "object" ? data?.userId : data;
    if (userId) {
      const room = `user:${userId}`;
      socket.leave(room);
      console.log(`[Socket Server] Socket ${socket.id} left room "${room}"`);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[Socket Server] Client disconnected: ${socket.id} (${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Realtime Notification Socket Server listening on port ${PORT}`);
});
