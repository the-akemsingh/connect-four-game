import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { GameManager } from "./utils/gameManager";
import prisma from "./prismaClient";

const app = express();
app.use(cors(
  {
    origin: ['http://localhost:3000', 'https://connect-four-game-two.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true
  }
));
app.use(express.json());

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

app.get("/leaderboard", async (req, res) => {
  try {
    const leaderboard = await prisma.record.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(leaderboard);
  } catch (e) {
    res.status(500).send("Internal Server Error");
  }
});
