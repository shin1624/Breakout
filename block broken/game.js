// ゲーム定数
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// ゲーム状態
let gameState = 'playing'; // 'playing', 'gameover', 'clear'
let score = 0;

// パドル
const paddle = {
  x: WIDTH / 2 - 40,
  y: HEIGHT - 30,
  w: 80,
  h: 12,
  speed: 7,
  dx: 0
};

// ボール
const ball = {
  x: WIDTH / 2,
  y: HEIGHT - 50,
  r: 8,
  speed: 5,
  dx: 4,
  dy: -4
};

// ブロック
let blocks = [];
const BLOCK_ROWS = 6;
const BLOCK_COLS = 8;
const BLOCK_W = 50;
const BLOCK_H = 20;
const BLOCK_PADDING = 8;
const BLOCK_OFFSET_TOP = 60;
const BLOCK_OFFSET_LEFT = 20;

// パワーアップ
let powerUps = [];
let activeEffects = [];
let effectMessages = [];

// キー入力
let leftPressed = false;
let rightPressed = false;

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') leftPressed = true;
  if (e.key === 'ArrowRight') rightPressed = true;
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') leftPressed = false;
  if (e.key === 'ArrowRight') rightPressed = false;
});

document.getElementById('restartBtn').onclick = () => {
  resetGame();
};

function resetGame() {
  score = 0;
  gameState = 'playing';
  paddle.x = WIDTH / 2 - paddle.w / 2;
  paddle.w = 80; // パドルサイズリセット
  ball.x = WIDTH / 2;
  ball.y = HEIGHT - 50;
  ball.dx = 4;
  ball.dy = -4;
  ball.pierce = 0; // 貫通効果リセット
  generateStage();
  powerUps = [];
  activeEffects = [];
  effectMessages = [];
}

function generateStage() {
  // ステージ自動生成: ランダム配置
  blocks = [];
  for (let row = 0; row < BLOCK_ROWS; row++) {
    for (let col = 0; col < BLOCK_COLS; col++) {
      if (Math.random() < 0.8) { // 80%の確率でブロック生成
        blocks.push({
          x: BLOCK_OFFSET_LEFT + col * (BLOCK_W + BLOCK_PADDING),
          y: BLOCK_OFFSET_TOP + row * (BLOCK_H + BLOCK_PADDING),
          w: BLOCK_W,
          h: BLOCK_H,
          hp: 1 + Math.floor(Math.random() * 2), // 1~2耐久
          type: Math.random() < 0.1 ? 'special' : 'normal' // 10%で特殊ブロック
        });
      }
    }
  }
}

function drawPaddle() {
  ctx.fillStyle = '#0af';
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.closePath();
}

function drawBlocks() {
  blocks.forEach(block => {
    ctx.fillStyle = block.type === 'special' ? '#f80' : '#0f0';
    ctx.globalAlpha = block.hp === 2 ? 0.7 : 1.0;
    ctx.fillRect(block.x, block.y, block.w, block.h);
    ctx.globalAlpha = 1.0;
  });
}

function drawPowerUps() {
  powerUps.forEach(pu => {
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = pu.color;
    ctx.fill();
    ctx.closePath();
    
    // パワーアップの説明テキスト
    ctx.fillStyle = pu.color;
    ctx.font = '12px sans-serif';
    ctx.fillText(getPowerUpName(pu.type), pu.x - 20, pu.y - 15);
  });
}

function drawEffects() {
  // アクティブな効果を表示
  let y = 30;
  activeEffects.forEach(effect => {
    ctx.fillStyle = effect.color;
    ctx.font = '14px sans-serif';
    ctx.fillText(`${effect.name}: ${effect.duration}秒`, 10, y);
    y += 20;
  });
  
  // エフェクトメッセージを表示
  effectMessages.forEach((msg, idx) => {
    ctx.fillStyle = msg.color;
    ctx.font = '20px sans-serif';
    ctx.globalAlpha = msg.alpha;
    ctx.fillText(msg.text, msg.x, msg.y);
    ctx.globalAlpha = 1.0;
  });
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawPaddle();
  drawBall();
  drawBlocks();
  drawPowerUps();
  drawEffects();
}

function update() {
  if (gameState !== 'playing') return;

  // パドル移動
  if (leftPressed && paddle.x > 0) paddle.x -= paddle.speed;
  if (rightPressed && paddle.x + paddle.w < WIDTH) paddle.x += paddle.speed;

  // ボール移動
  ball.x += ball.dx;
  ball.y += ball.dy;

  // 壁反射
  if (ball.x - ball.r < 0 || ball.x + ball.r > WIDTH) ball.dx *= -1;
  if (ball.y - ball.r < 0) ball.dy *= -1;

  // パドル反射
  if (
    ball.y + ball.r > paddle.y &&
    ball.x > paddle.x &&
    ball.x < paddle.x + paddle.w &&
    ball.dy > 0
  ) {
    ball.dy *= -1;
    // パドルのどこに当たったかで角度調整
    let hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    ball.dx = hitPos * 5;
  }

  // ブロック衝突
  for (let i = 0; i < blocks.length; i++) {
    let b = blocks[i];
    if (
      ball.x + ball.r > b.x &&
      ball.x - ball.r < b.x + b.w &&
      ball.y + ball.r > b.y &&
      ball.y - ball.r < b.y + b.h
    ) {
      if (ball.pierce > 0) {
        // 貫通弾の場合
        ball.pierce--;
        if (ball.pierce === 0) {
          ball.dy *= -1; // 最後の1回で反射
        }
      } else {
        ball.dy *= -1;
      }
      
      b.hp--;
      if (b.hp <= 0) {
        // パワーアップドロップ
        if (Math.random() < 0.2) {
          spawnPowerUp(b.x + b.w / 2, b.y + b.h / 2);
        }
        blocks.splice(i, 1);
        score += 100;
        i--;
      }
      break;
    }
  }

  // パワーアップ落下
  powerUps.forEach((pu, idx) => {
    pu.y += pu.speed;
    // パドル取得
    if (
      pu.y + 10 > paddle.y &&
      pu.x > paddle.x &&
      pu.x < paddle.x + paddle.w
    ) {
      applyPowerUp(pu.type);
      powerUps.splice(idx, 1);
    } else if (pu.y > HEIGHT) {
      powerUps.splice(idx, 1);
    }
  });
  
  // エフェクトの更新
  activeEffects.forEach((effect, idx) => {
    effect.duration -= 1/60; // 60FPS想定
    if (effect.duration <= 0) {
      removeEffect(effect.type);
      activeEffects.splice(idx, 1);
    }
  });
  
  // エフェクトメッセージの更新
  effectMessages.forEach((msg, idx) => {
    msg.y -= 1;
    msg.alpha -= 0.02;
    if (msg.alpha <= 0) {
      effectMessages.splice(idx, 1);
    }
  });

  // ボール落下
  if (ball.y - ball.r > HEIGHT) {
    gameState = 'gameover';
  }

  // クリア判定
  if (blocks.length === 0) {
    gameState = 'clear';
  }

  document.getElementById('score').textContent = `スコア: ${score}`;
}

function spawnPowerUp(x, y) {
  // ランダムでパワーアップ種類決定
  const types = [
    { type: 'expand', color: '#0ff', name: 'パドル拡大' },
    { type: 'multi', color: '#ff0', name: 'マルチボール' },
    { type: 'pierce', color: '#f0f', name: '貫通弾' },
    { type: 'slow', color: '#0f0', name: 'スロー' },
    { type: 'score2x', color: '#f00', name: 'スコア2倍' }
  ];
  const p = types[Math.floor(Math.random() * types.length)];
  powerUps.push({ x, y, type: p.type, color: p.color, speed: 3, name: p.name });
}

function getPowerUpName(type) {
  const names = {
    'expand': '拡大',
    'multi': 'マルチ',
    'pierce': '貫通',
    'slow': 'スロー',
    'score2x': '2倍'
  };
  return names[type] || type;
}

function applyPowerUp(type) {
  // エフェクトメッセージを表示
  const effectNames = {
    'expand': 'パドル拡大！',
    'multi': 'マルチボール！',
    'pierce': '貫通弾！',
    'slow': 'スロー！',
    'score2x': 'スコア2倍！'
  };
  
  effectMessages.push({
    text: effectNames[type] || 'パワーアップ！',
    x: WIDTH / 2 - 50,
    y: HEIGHT / 2,
    color: '#fff',
    alpha: 1.0
  });
  
  switch (type) {
    case 'expand':
      paddle.w = Math.min(paddle.w + 40, WIDTH - 20);
      addEffect('パドル拡大', '#0ff', 10);
      break;
    case 'multi':
      score += 500;
      addEffect('マルチボール', '#ff0', 5);
      break;
    case 'pierce':
      ball.pierce = 3; // 3回貫通
      addEffect('貫通弾', '#f0f', 8);
      break;
    case 'slow':
      ball.dx *= 0.7;
      ball.dy *= 0.7;
      addEffect('スロー', '#0f0', 6);
      break;
    case 'score2x':
      score += 1000;
      addEffect('スコア2倍', '#f00', 12);
      break;
  }
}

function addEffect(name, color, duration) {
  // 既存の同じ効果を削除
  activeEffects = activeEffects.filter(e => e.name !== name);
  activeEffects.push({ name, color, duration, type: name });
}

function removeEffect(type) {
  // 効果終了時の処理
  if (type === 'パドル拡大') {
    paddle.w = Math.max(paddle.w - 40, 80);
  } else if (type === 'スロー') {
    ball.dx /= 0.7;
    ball.dy /= 0.7;
  }
}

function gameLoop() {
  update();
  draw();
  if (gameState === 'gameover') {
    ctx.fillStyle = '#f44';
    ctx.font = '32px sans-serif';
    ctx.fillText('ゲームオーバー', WIDTH / 2 - 90, HEIGHT / 2);
  } else if (gameState === 'clear') {
    ctx.fillStyle = '#4f4';
    ctx.font = '32px sans-serif';
    ctx.fillText('クリア！', WIDTH / 2 - 60, HEIGHT / 2);
  } else {
    requestAnimationFrame(gameLoop);
  }
}

// 初期化
resetGame();
gameLoop(); 