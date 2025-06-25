import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { GameManager } from "./utils/gameManager";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

const wss = new WebSocketServer({ server: httpServer });

const gameManager=GameManager.getInstance();

wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  try{
    gameManager.addUser(ws)
  }catch(e){
    console.error("Error in WebSocket connection:", e);
  }

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});
