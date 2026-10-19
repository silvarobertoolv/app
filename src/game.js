/** @typedef {{x:number,y:number}} Point */
/** @typedef {'up'|'down'|'left'|'right'} Direction */
/** @typedef {{snake:Point[],direction:Direction,food:Point|null,score:number,status:'ready'|'playing'|'paused'|'over'|'won',eaten:boolean}} Game */
export const SIZE = 14;
export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
export const SPEEDS = { tranquilinho: 360, aventureiro: 230, foguete: 145 };
/** @param {Point[]} snake @returns {Point|null} */
export function foodFor(snake, random = Math.random) {
  const available = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      if (!snake.some((p) => p.x === x && p.y === y)) available.push({ x, y });
    }
  return available.length
    ? available[Math.floor(random() * available.length)]
    : null;
}
/** @returns {Game} */
export function newGame() {
  const snake = [
    { x: 5, y: 7 },
    { x: 4, y: 7 },
    { x: 3, y: 7 },
  ];
  return {
    snake,
    direction: "right",
    food: { x: 9, y: 7 },
    score: 0,
    status: "ready",
    eaten: false,
  };
}
/** @param {Direction} current @param {Direction} next */
export function canTurn(current, next) {
  const a = DIRECTIONS[current],
    b = DIRECTIONS[next];
  return !!a && !!b && !(a.x + b.x === 0 && a.y + b.y === 0);
}
/** @param {Game} game @param {Direction} direction @returns {Game} */
export function advance(
  game,
  direction = game.direction,
  random = Math.random,
) {
  if (game.status !== "playing") return game;
  const nextDirection = canTurn(game.direction, direction)
    ? direction
    : game.direction;
  const d = DIRECTIONS[nextDirection];
  const head = { x: game.snake[0].x + d.x, y: game.snake[0].y + d.y };
  const eaten = !!game.food && head.x === game.food.x && head.y === game.food.y;
  const body = eaten ? game.snake : game.snake.slice(0, -1);
  if (
    head.x < 0 ||
    head.y < 0 ||
    head.x >= SIZE ||
    head.y >= SIZE ||
    body.some((p) => p.x === head.x && p.y === head.y)
  ) {
    return { ...game, status: "over", eaten: false };
  }
  const snake = [head, ...game.snake];
  if (!eaten) snake.pop();
  const food = eaten ? foodFor(snake, random) : game.food;
  return {
    ...game,
    snake,
    food,
    direction: nextDirection,
    score: game.score + (eaten ? 1 : 0),
    eaten,
    status: food ? "playing" : "won",
  };
}
