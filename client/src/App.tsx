import { useEffect, useState } from "react";
import useSocket from "./hooks/useSocket";
import Slot from "./components/slot";

function App() {
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [myColor, setMyColor] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  // const [opponentName, setOpponentName] = useState<string | null>(null);
  const [game, setGame] = useState<string[][]>([
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
  ]);
  const [movesCount, setMovesCount] = useState<number>(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState<boolean>(false);

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case "INIT_GAME":
          setIsStarted(true);
          setIsWaiting(false);
          setGameId(message.gameId);
          setMyColor(message.color);
          localStorage.setItem("connectFour-gameId", message.gameId);
          break;
        case "MOVE":
          const { move } = message;
          setGame((prevGame) => {
            const newGame = prevGame.map((row) => [...row]);
            newGame[move.row][move.column] = message.move.color;
            return newGame;
          });
          setMovesCount((prevCount) => prevCount + 1);
          break;
        case "OPPONENT_LEFT":
          setWinner(myColor);
          break;
        case "GAME_OVER":
          setWinner(message.winner);
          break;
        case "GAME_DRAW":
          setIsDraw(true);
          break;
      }
    }
  }, [socket])


  const startGameHandler = () => {
    try {
      socket?.send(JSON.stringify({
        type: "INIT_GAME",
        name: playerName,
      }))
      setIsStarted(true);
      setIsWaiting(true);
    }
    catch (err) {
      console.error("Error starting game:", err);
    }
  }
  const handleClick = ({ column }: { column: number }) => {
    try {
      if (winner || isDraw || movesCount === 42) return;
      if (movesCount % 2 === 0 && myColor !== "red" || movesCount % 2 === 1 && myColor !== "black") {
        return;
      }
      let targetRow = -1;
      for (let r = game.length - 1; r >= 0; r--) {
        if (game[r][column] === "") {
          targetRow = r;
          break;
        }
      }

      if (targetRow === -1) {
        return;
      }

      //updating the board state locally
      setGame((prevGame) => {
        const newGame = prevGame.map((row) => [...row]);
        newGame[targetRow][column] = myColor as string;
        return newGame;
      });

      setMovesCount((prevCount) => prevCount + 1);

      //sending move coordingates to the server
      socket!.send(JSON.stringify({
        type: "MOVE",
        move: { row: targetRow, column },
      }));


    } catch (e) {
      console.error("Error occurred while taking a move:", e);
    }
  };

  if (!socket) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <div className="text-2xl font-bold text-red-600">
          Connecting..
        </div>
      </div>
    );
  }
  else if (!isStarted) {
    return (
      <div className="min-h-screen flex  justify-center bg-gray-100">
        <div className="mt-20 flex flex-col items-center space-y-4">
          <span className="text-4xl  font-bold text-blue-600">
            Connect 4
          </span>
          <input className="border" onChange={(e) => setPlayerName(e.target.value)} type="text" placeholder="enter your name" />
          <button onClick={startGameHandler} className="bg-blue-600 text-white py-2 px-4 rounded cursor-pointer">Join Game</button>
        </div>
      </div>
    )
  }
  else if (isStarted && isWaiting) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <div className="text-2xl font-bold text-blue-600">
          Searching opponent...
        </div>
      </div>
    );
  }
  else {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100">

        <div className="text-4xl">Your Color : {myColor}</div>
        {!winner ? (
          movesCount % 2 === 0 && myColor === "red" ? (
            <div className="text-2xl font-bold">Your Turn</div>
          ) : movesCount % 2 === 1 && myColor === "black" ? (
            <div className="text-2xl font-bold">Your Turn</div>
          ) : (
            <div className="text-2xl font-bold">Waiting for opponent's move...</div>
          )
        ) : (
          winner === myColor ? (
            <div className="text-2xl font-bold text-green-600">You Win!</div>
          ) : (
            <div className="text-2xl font-bold text-red-600">You Lose!</div>
          )
        )}
        {isDraw && (
          <div className="text-2xl font-bold text-yellow-600">It's a Draw!</div>
        )}

        <div className="grid grid-cols-7 border min-w-4xl bg-green-100 min-h-[500px] ">
          {game.map((row, rowIndex) => (
            row.map((cell, colIndex) => (
              <Slot
                handleClick={handleClick}
                color={cell}
                x={colIndex}
                y={rowIndex}
              />
            ))
          ))}
        </div>
      </div>
    );
  }

}

export default App
