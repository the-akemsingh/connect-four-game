import { WebSocket } from "ws";
import { GAME_DRAW, GAME_OVER, INIT_GAME, MOVE } from "./messageTypes";
import { v4 as uuidv4 } from "uuid";
import prisma from "../prismaClient";

export class Game {
  public Player1: WebSocket;
  public Player2: WebSocket;
  public player1Name: string;
  public player2Name: string;
  public player1Id: string;
  public player2Id: string;
  public gameId: string;
  private game: string[][] = [];
  private movesCount: number;

  constructor({
    Player1,
    Player2,
    player1Name,
    player2Name,
  }: {
    Player1: WebSocket;
    Player2: WebSocket;
    player1Name: string;
    player2Name: string;
  }) {
    this.Player1 = Player1;
    this.Player2 = Player2;
    this.player1Name = player1Name;
    this.player2Name = player2Name;
    this.gameId = Math.random().toString();
    this.game = [
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
    ];
    this.player1Id = uuidv4();
    this.player2Id = uuidv4();
    this.Player1.send(
      JSON.stringify({
        type: INIT_GAME,
        color: "red",
        gameId: this.gameId,
        playerId: this.player1Id,
      })
    );
    this.Player2.send(
      JSON.stringify({
        type: INIT_GAME,
        color: "black",
        gameId: this.gameId,
        playerId: this.player2Id,
      })
    );
    this.movesCount = 0;
  }

  async makeMove({
    socket,
    move,
  }: {
    socket: WebSocket;
    move: { row: number; column: number };
  }) {
    try {
      if (
        (this.movesCount % 2 === 0 && socket !== this.Player1) ||
        (this.movesCount % 2 === 1 && socket !== this.Player2)
      ) {
        return;
      }

      const { row, column } = move;
      if (this.game[row][column] !== "") {
        return;
      }

      this.game[row][column] = socket === this.Player1 ? "red" : "black";

      const result = this.checkGameResult(row, column);
      if (result.gameOver) {
        if (result.winner) {
          const winnerColor = result.winner;
          const loserSocket =
            winnerColor === "red" ? this.Player2 : this.Player1;
          loserSocket.send(
            JSON.stringify({
              type: MOVE,
              move: { row, column, color: winnerColor },
            })
          );
          loserSocket.send(
            JSON.stringify({
              type: GAME_OVER,
              winner: winnerColor,
              gameId: this.gameId,
            })
          );
          socket.send(
            JSON.stringify({
              type: GAME_OVER,
              winner: winnerColor,
              gameId: this.gameId,
            })
          );
          const record = await prisma.record.create({
            data: {
              player1: this.player1Id,
              player2: this.player2Id,
              winner:
                socket === this.Player1 ? this.player1Name : this.player2Name,
            },
          });
          console.log("Game record created:", record);
        } else {
          // Draw
          this.Player1.send(
            JSON.stringify({
              type: GAME_DRAW,
              winner: null,
              gameId: this.gameId,
            })
          );
          this.Player2.send(
            JSON.stringify({
              type: GAME_DRAW,
              winner: null,
              gameId: this.gameId,
            })
          );
          const record = await prisma.record.create({
            data: {
              player1: this.player1Id,
              player2: this.player2Id,
              winner: "draw",
            },
          });
          console.log("Game record created:", record);
        }
      } else {
        //sending the updated game state to opponent
        if (this.movesCount % 2 === 0) {
          this.Player2.send(
            JSON.stringify({
              type: "MOVE",
              move: { row, column, color: "red" },
            })
          );
        } else {
          this.Player1.send(
            JSON.stringify({
              type: "MOVE",
              move: { row, column, color: "black" },
            })
          );
        }
        this.movesCount++;
      }
    } catch (e) {
      console.error("Error making move:", e);
      return;
    }
  }

  private checkGameResult(row: number, column: number) {
    const currentPlayer = this.game[row][column];

    const winningCells = this.checkWin(row, column, currentPlayer);
    if (winningCells.length > 0) {
      return {
        gameOver: true,
        winner: currentPlayer,
        winningCells: winningCells,
      };
    }

    if (this.movesCount === 41) {
      return {
        gameOver: true,
        winner: null,
      };
    }

    return {
      gameOver: false,
      winner: null,
    };
  }

  private checkWin(row: number, column: number, color: string): number[][] {
    const directions = [
      [0, 1], // horizontal
      [1, 0], // vertical
      [1, 1], // diagonal ( bottom-right)
      [1, -1], // diagonal (bottom-left)
    ];

    for (const [dx, dy] of directions) {
      const winningCells = this.checkDirection(row, column, color, dx, dy);
      if (winningCells.length >= 4) {
        return winningCells;
      }
    }

    return [];
  }

  private checkDirection(
    row: number,
    column: number,
    color: string,
    dx: number,
    dy: number
  ): number[][] {
    const connectedCells: number[][] = [[row, column]];

    // Check in the positive direction
    let r = row + dx;
    let c = column + dy;
    while (r >= 0 && r < 6 && c >= 0 && c < 7 && this.game[r][c] === color) {
      connectedCells.push([r, c]);
      r += dx;
      c += dy;
    }

    // Check in the negative direction
    r = row - dx;
    c = column - dy;
    while (r >= 0 && r < 6 && c >= 0 && c < 7 && this.game[r][c] === color) {
      connectedCells.push([r, c]);
      r -= dx;
      c -= dy;
    }

    return connectedCells;
  }
}
