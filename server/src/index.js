import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";

import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/auth.routes.js";
import lobbyRoutes from "./routes/lobby.routes.js";
import gameRoutes from "./routes/game.routes.js";
import tagRoutes from "./routes/tag.routes.js";

import { lobbyHandler } from "./socket/lobbyHandler.js";
import { initCleanupService } from "./services/cleanup.service.js";

// Start Cleanup Service
initCleanupService();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

// Make io accessible in routes
app.set("io", io);

// Socket Handler
const onConnection = (socket) => {
  lobbyHandler(io, socket);
};

io.on("connection", onConnection);

// Routes
app.use("/api", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/lobbies", lobbyRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/tags", tagRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
