(function initializeSnakeGame(global) {
  'use strict';

  const GRID_SIZE = 20;
  const TICK_MS = 125;
  const HIGH_SCORE_KEY = 'portfolio-snake-high-score';
  const DIRECTIONS = Object.freeze({
    up: Object.freeze({ x: 0, y: -1 }),
    down: Object.freeze({ x: 0, y: 1 }),
    left: Object.freeze({ x: -1, y: 0 }),
    right: Object.freeze({ x: 1, y: 0 })
  });

  function samePosition(first, second) {
    return first.x === second.x && first.y === second.y;
  }

  function isOpposite(first, second) {
    return first.x + second.x === 0 && first.y + second.y === 0;
  }

  function placeFood(snake, random = Math.random) {
    const openCells = [];

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const candidate = { x, y };
        if (!snake.some((segment) => samePosition(segment, candidate))) {
          openCells.push(candidate);
        }
      }
    }

    if (openCells.length === 0) {
      return null;
    }

    const randomValue = Math.min(Math.max(Number(random()), 0), 0.999999999);
    return openCells[Math.floor(randomValue * openCells.length)];
  }

  function createInitialState(random = Math.random) {
    const snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];

    return {
      snake,
      food: placeFood(snake, random),
      direction: DIRECTIONS.right,
      queuedDirection: DIRECTIONS.right,
      score: 0,
      status: 'idle'
    };
  }

  function start(state) {
    if (state.status !== 'idle') {
      return state;
    }
    return { ...state, status: 'running' };
  }

  function togglePause(state) {
    if (state.status === 'running') {
      return { ...state, status: 'paused' };
    }
    if (state.status === 'paused') {
      return { ...state, status: 'running' };
    }
    return state;
  }

  function restart(random = Math.random) {
    return { ...createInitialState(random), status: 'running' };
  }

  function queueDirection(state, directionName) {
    const requested = DIRECTIONS[directionName];
    if (!requested || isOpposite(state.direction, requested)) {
      return state;
    }
    return { ...state, queuedDirection: requested };
  }

  function tick(state, random = Math.random) {
    if (state.status !== 'running') {
      return state;
    }

    const direction = state.queuedDirection;
    const head = {
      x: state.snake[0].x + direction.x,
      y: state.snake[0].y + direction.y
    };
    const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID_SIZE || head.y >= GRID_SIZE;

    if (hitWall) {
      return { ...state, direction, status: 'gameover' };
    }

    const ateFood = state.food !== null && samePosition(head, state.food);
    const collisionBody = ateFood ? state.snake : state.snake.slice(0, -1);
    if (collisionBody.some((segment) => samePosition(segment, head))) {
      return { ...state, direction, status: 'gameover' };
    }

    const snake = [head, ...state.snake];
    if (!ateFood) {
      snake.pop();
    }

    const food = ateFood ? placeFood(snake, random) : state.food;
    const filledBoard = food === null;

    return {
      snake,
      food,
      direction,
      queuedDirection: direction,
      score: state.score + (ateFood ? 1 : 0),
      status: filledBoard ? 'gameover' : 'running'
    };
  }

  const core = Object.freeze({
    GRID_SIZE,
    DIRECTIONS,
    createInitialState,
    isOpposite,
    placeFood,
    queueDirection,
    restart,
    samePosition,
    start,
    tick,
    togglePause
  });

  global.SnakeGameCore = core;

  if (typeof document === 'undefined') {
    return;
  }

  const canvas = document.querySelector('#game-board');
  if (!canvas) {
    return;
  }

  const context = canvas.getContext('2d');
  const scoreElement = document.querySelector('#game-score');
  const highScoreElement = document.querySelector('#game-high-score');
  const statusElement = document.querySelector('#game-status');
  const startButton = document.querySelector('#game-start');
  const pauseButton = document.querySelector('#game-pause');
  const restartButton = document.querySelector('#game-restart');
  const directionButtons = document.querySelectorAll('[data-direction]');
  const cellSize = canvas.width / GRID_SIZE;
  let state = createInitialState();
  let timerId = null;
  let highScore = readHighScore();

  function readHighScore() {
    try {
      const stored = Number(global.localStorage.getItem(HIGH_SCORE_KEY));
      return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0;
    } catch (error) {
      return 0;
    }
  }

  function writeHighScore(value) {
    highScore = Math.max(highScore, value);
    try {
      global.localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    } catch (error) {
      // The game remains playable when storage is unavailable.
    }
  }

  function stopLoop() {
    if (timerId !== null) {
      global.clearInterval(timerId);
      timerId = null;
    }
  }

  function startLoop() {
    if (timerId === null && state.status === 'running') {
      timerId = global.setInterval(runTick, TICK_MS);
    }
  }

  function drawCell(position, color, inset = 2) {
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(
      position.x * cellSize + inset,
      position.y * cellSize + inset,
      cellSize - inset * 2,
      cellSize - inset * 2,
      5
    );
    context.fill();
  }

  function render() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#0b1220';
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (state.food) {
      drawCell(state.food, '#ff6b6b', 3);
    }
    state.snake.forEach((segment, index) => {
      drawCell(segment, index === 0 ? '#66a6ff' : '#3182f6');
    });

    scoreElement.textContent = String(state.score);
    highScoreElement.textContent = String(highScore);
    const startUnavailable = state.status !== 'idle';
    startButton.disabled = false;
    startButton.removeAttribute('aria-disabled');
    startButton.textContent = startUnavailable ? '진행 중' : '시작';
    pauseButton.disabled = state.status === 'idle' || state.status === 'gameover';
    pauseButton.textContent = state.status === 'paused' ? '계속하기' : '일시정지';

    const messages = {
      idle: '시작 버튼을 눌러 게임을 시작하세요.',
      running: '게임 진행 중',
      paused: '게임이 일시정지되었습니다.',
      gameover: `게임 오버. 최종 점수 ${state.score}점`
    };
    statusElement.textContent = messages[state.status];
  }

  function runTick() {
    state = tick(state);
    if (state.score > highScore) {
      writeHighScore(state.score);
    }
    if (state.status === 'gameover') {
      stopLoop();
    }
    render();
  }

  function beginGame() {
    state = start(state);
    startLoop();
    render();
    canvas.focus();
  }

  function pauseGame() {
    state = togglePause(state);
    if (state.status === 'paused') {
      stopLoop();
    } else {
      startLoop();
    }
    render();
    canvas.focus();
  }

  function restartGame() {
    stopLoop();
    state = restart();
    startLoop();
    render();
    canvas.focus();
  }

  function changeDirection(directionName) {
    if (state.status === 'running') {
      state = queueDirection(state, directionName);
    }
  }

  const keyDirections = {
    ArrowUp: 'up',
    w: 'up',
    W: 'up',
    ArrowDown: 'down',
    s: 'down',
    S: 'down',
    ArrowLeft: 'left',
    a: 'left',
    A: 'left',
    ArrowRight: 'right',
    d: 'right',
    D: 'right'
  };

  canvas.addEventListener('keydown', (event) => {
    const directionName = keyDirections[event.key];
    if (directionName) {
      event.preventDefault();
      changeDirection(directionName);
    } else if (event.code === 'Space') {
      event.preventDefault();
      pauseGame();
    }
  });

  directionButtons.forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      changeDirection(button.dataset.direction);
      canvas.focus();
    });
  });

  startButton.addEventListener('click', beginGame);
  pauseButton.addEventListener('click', pauseGame);
  restartButton.addEventListener('click', restartGame);

  global.SnakeGameController = Object.freeze({
    getState: () => ({ ...state, snake: state.snake.map((segment) => ({ ...segment })) }),
    isTimerActive: () => timerId !== null,
    pause: pauseGame,
    restart: restartGame,
    start: beginGame
  });

  render();
})(globalThis);
