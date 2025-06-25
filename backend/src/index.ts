import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { GameManager } from "./utils/gameManager";
import prisma from "./prismaClient";

const app = express();
app.use(
  cors({
    origin: "*", // Allow all origins temporarily for debugging
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Health check endpoint for Netlify
app.get("/", (req, res) => {
  res.status(200).send("Connect Four API is running");
});

// Adding serverless function handler for Netlify
export const handler = app;

// Only start the WebSocket server when running locally
if (process.env.NODE_ENV !== 'production') {
  const httpServer = app.listen(3000, () => {
    console.log("Server is running on port 3000");
  });

  const wss = new WebSocketServer({ server: httpServer });
  const gameManager = GameManager.getInstance();

  wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    try {
      gameManager.addUser(ws);
    } catch (e) {
      console.error("Error in WebSocket connection:", e);
    }

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
} else {
  // For production, just start the express app without WebSockets
  app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
  });
}

app.get("/leaderboard", async (req, res) => {
  try {
    const leaderboard = await prisma.record.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(leaderboard);
  } catch (e) {
    console.error("Error fetching leaderboard:", e);
    res.status(500).send("Internal Server Error");
  }
});
