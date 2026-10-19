const { test } = require("node:test");
const assert = require("node:assert/strict");
let api;
const load = async () => (api ||= await import("../src/game.js"));
test("a cobrinha anda e mantém seu tamanho", async () => {
  const { advance, newGame } = await load();
  const g = advance({ ...newGame(), status: "playing" });
  assert.deepEqual(g.snake[0], { x: 6, y: 7 });
  assert.equal(g.snake.length, 3);
});
test("comer aumenta corpo e pontuação; fruta nasce fora do corpo", async () => {
  const { advance, newGame } = await load();
  const g = advance(
    { ...newGame(), food: { x: 6, y: 7 }, status: "playing" },
    "right",
    () => 0,
  );
  assert.equal(g.score, 1);
  assert.equal(g.snake.length, 4);
  assert.ok(!g.snake.some((p) => p.x === g.food.x && p.y === g.food.y));
});
test("não permite dar meia-volta", async () => {
  const { advance, newGame } = await load();
  assert.equal(
    advance({ ...newGame(), status: "playing" }, "left").direction,
    "right",
  );
});
test("bater na parede encerra a partida", async () => {
  const { advance, newGame } = await load();
  let g = { ...newGame(), status: "playing" };
  for (let i = 0; i < 9; i++) g = advance(g);
  assert.equal(g.status, "over");
});
test("pausa impede movimento", async () => {
  const { advance, newGame } = await load();
  const g = { ...newGame(), status: "paused" };
  assert.equal(advance(g), g);
});
test("bater no corpo encerra a partida", async () => {
  const { advance, newGame } = await load();
  const g = advance(
    {
      ...newGame(),
      status: "playing",
      direction: "up",
      snake: [
        { x: 3, y: 3 },
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 4, y: 3 },
        { x: 4, y: 2 },
      ],
    },
    "right",
  );
  assert.equal(g.status, "over");
});
test("pode ocupar a posição da cauda quando ela se move", async () => {
  const { advance, newGame } = await load();
  const g = advance(
    {
      ...newGame(),
      status: "playing",
      direction: "up",
      snake: [
        { x: 3, y: 3 },
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 4, y: 3 },
      ],
    },
    "right",
  );
  assert.equal(g.status, "playing");
});
test("preencher o jardim vence a partida", async () => {
  const { advance, SIZE } = await load();
  const snake = [{ x: SIZE - 2, y: 0 }];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++)
      if (!(y === 0 && (x === SIZE - 1 || x === SIZE - 2)))
        snake.push({ x, y });
  const g = advance({
    snake,
    direction: "right",
    food: { x: SIZE - 1, y: 0 },
    score: 192,
    status: "playing",
  });
  assert.equal(g.status, "won");
  assert.equal(g.food, null);
});
