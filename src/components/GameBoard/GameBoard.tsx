import { useEffect, useState, FC, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addOrUpdateScore, getScores } from '../../services/api';
import { GameOver } from '../GameOver/GameOver';
import { HighScores } from '../HighScores/HighScores';
import { Legend } from '../Legend/Legend';
import { ScoreBoard } from '../ScoreBoard/ScoreBoard';
import { GameField } from '../GameField/GameField';

interface GameBoardProps {
  playerName: string;
}

interface Position {
  x: number;
  y: number;
  id: string;
}

interface Segment extends Position {
  isHead: boolean;
}

interface Score {
  name: string;
  score: number;
  id: string;
}

enum FoodType {
  SMALL = 1,
  MEDIUM = 5,
  LARGE = 10,
}

export const GameBoard: FC<GameBoardProps> = ({ playerName }) => {
  const [snake, setSnake] = useState<Position[]>([
    { x: 10, y: 10, id: uuidv4() },
  ]);
  const [direction, setDirection] = useState<{ x: number; y: number }>({
    x: 0,
    y: -1,
  });
  const [food, setFood] = useState<{ position: Position; type: FoodType }>({
    position: { x: 5, y: 5, id: uuidv4() },
    type: FoodType.SMALL,
  });
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(200);
  const [displaySpeed, setDisplaySpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScores, setHighScores] = useState<Score[]>([]);

  const boardSize = 20;

  const moveSnake = useCallback(() => {
    setSnake(prev => {
      const newSnake = [...prev];
      const head = { ...newSnake[0] };
      head.x += direction.x;
      head.y += direction.y;
      head.id = uuidv4();
      newSnake.unshift(head);

      if (head.x === food.position.x && head.y === food.position.y) {
        setFood({
          position: {
            x: Math.floor(Math.random() * boardSize),
            y: Math.floor(Math.random() * boardSize),
            id: uuidv4(),
          },
          type: [FoodType.SMALL, FoodType.MEDIUM, FoodType.LARGE][
            Math.floor(Math.random() * 3)
          ],
        });
        const newScore = score + food.type;
        setScore(newScore);
        if (Math.floor(newScore / 50) > Math.floor(score / 50)) {
          setSpeed(prev => Math.max(prev - 10, 50));
          setDisplaySpeed(prev => prev + 0.5);
        }
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, [direction, food, score, boardSize]);

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setPaused(prev => !prev);
      }
      if (!paused) {
        switch (e.key) {
          case 'ArrowUp':
            setDirection({ x: 0, y: -1 });
            break;
          case 'ArrowDown':
            setDirection({ x: 0, y: 1 });
            break;
          case 'ArrowLeft':
            setDirection({ x: -1, y: 0 });
            break;
          case 'ArrowRight':
            setDirection({ x: 1, y: 0 });
            break;
        }
      }
    },
    [paused]
  );

  const checkCollision = useCallback(() => {
    const head = snake[0];
    if (
      head.x < 0 ||
      head.x >= boardSize ||
      head.y < 0 ||
      head.y >= boardSize
    ) {
      return true;
    }
    for (let i = 1; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        return true;
      }
    }
    return false;
  }, [snake, boardSize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => handleKeyPress(e);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    if (!paused && !gameOver) {
      const interval = setInterval(() => {
        moveSnake();
        if (checkCollision()) {
          setGameOver(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }
  }, [moveSnake, checkCollision, gameOver, speed, paused]);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10, id: uuidv4() }]);
    setDirection({ x: 0, y: -1 });
    setScore(0);
    setSpeed(200);
    setDisplaySpeed(1);
    setGameOver(false);
    setPaused(false);
  };

  useEffect(() => {
    if (gameOver) {
      const sendScore = async () => {
        try {
          await addOrUpdateScore(playerName, score);
          const scores = await getScores();
          setHighScores(scores);
        } catch (error) {
          console.error('Error adding or fetching scores:', error);
        }
      };

      sendScore();
    }
  }, [gameOver, playerName, score]);

  const snakeSegments: Segment[] = snake.map((segment, index) => ({
    ...segment,
    isHead: index === 0,
  }));

  return (
    <div className="flex flex-col items-center">
      {!gameOver ? (
        <>
          <h1 className="text-2xl font-bold mb-4 text-blue-500">
            Player: <span className="text-red-500">{playerName}</span>
          </h1>
          <GameField
            snakeSegments={snakeSegments}
            food={food}
            boardSize={boardSize}
            paused={paused}
          />
          <ScoreBoard score={score} speed={displaySpeed} />
          <Legend />
        </>
      ) : (
        <>
          <HighScores highScores={highScores} />
          <GameOver
            newScore={score}
            playerName={playerName}
            onReset={resetGame}
          />
        </>
      )}
    </div>
  );
};
