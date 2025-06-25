import { WebSocket } from "ws";
import { Game } from "./game";
import { INIT_GAME, MOVE, OPPONENT_LEFT } from "./messageTypes";
import prisma from "../prismaClient";

export class GameManager {
  private static instance: GameManager;
  private games: Game[];
  private allPlayers: Set<WebSocket>;
  private pendingPlayer: { socket: WebSocket; name: string } | null;

  constructor() {
    this.games = [];
    this.allPlayers = new Set();
    this.pendingPlayer = null;
  }

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  addUser(socket: WebSocket) {
    try {
      this.allPlayers.add(socket);
      this.addingToGameHandler(socket);
    } catch (e) {
      console.error("Error adding user:", e);
    }
  }

  private addingToGameHandler = (socket: WebSocket) => {
    try {
      socket.on("message", (data: string) => {
        const message = JSON.parse(data);

        if (message.type === INIT_GAME) {
          if (this.pendingPlayer) {
            const game = new Game({
              Player1: this.pendingPlayer.socket,
              Player2: socket,
              player1Name: this.pendingPlayer.name,
              player2Name: message.name,
            });
            this.games.push(game);
            this.pendingPlayer!.socket.send(
              JSON.stringify({ message: "Game started", gameId: game.gameId })
            );
            socket.send(
              JSON.stringify({ message: "Game started", gameId: game.gameId })
            );
            this.pendingPlayer = null;
          } else {
            this.pendingPlayer = { socket: socket, name: message.name };
            socket.send(
              JSON.stringify({
                message: "Waiting for the other player to join",
              })
            );
          }
        } else if (message.type === MOVE) {
          const game = this.games.find((game) => {
            return game.Player1 === socket || game.Player2 === socket;
          });
          if (game) {
            game.makeMove({ socket, move: message.move });
          }
        } else {
          console.error("Unknown message type:", message.type);
        }
      });
      socket.on("close", async () => {
        //remove the player from all games
        //notify the other player
        this.allPlayers.delete(socket);
        if (this.pendingPlayer && this.pendingPlayer.socket === socket) {
          this.pendingPlayer = null;
        }

        const game = this.games.find((game) => {
          return game.Player1 === socket || game.Player2 === socket;
        });

        if (game) {
          const opponent =
            game.Player1 === socket ? game.Player2 : game.Player1;
          if (opponent.readyState === WebSocket.OPEN) {
            opponent.send(
              JSON.stringify({
                type: OPPONENT_LEFT,
              })
            );
          }

          // Only create a record if the game wasn't already completed
          const gameIndex = this.games.indexOf(game);
          if (gameIndex !== -1) {
            // Create a record only if a player leaves mid-game
            const record = await prisma.record.create({
              data: {
                player1: game.player1Name,
                player2: game.player2Name,
                winner: game.Player1 === socket ? game.player2Name : game.player1Name,
              },
            });
            console.log("Game record created due to player disconnect:", record);

            // Remove the game from the active games list
            this.games.splice(gameIndex, 1);
          }
        }
      });
    } catch (e) {
      console.error("Error adding user to game:", e);
    }
  };
}
