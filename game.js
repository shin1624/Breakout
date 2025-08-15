// ゲーム定数
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// ゲーム状態
let gameState = 'title'; // 'title', 'playing', 'paused', 'gameover', 'clear'
let score = 0;
let stage = 1;

// パドル
const paddle = {
  x: WIDTH / 2 - 40,
  y: HEIGHT - 30,
  w: 80,
  h: 12,
  speed: 7,
  dx: 0,
  shield: false,
  shieldTimer: 0
};

// ライフシステム
let lives = 3;
let maxLives = 5;

// レーザーシステム
let lasers = [];
let laserCooldown = 0;

// ボール配列（マルチボール対応）
let balls = [{
  x: WIDTH / 2,
  y: HEIGHT - 50,
  r: 8,
  speed: 5,
  dx: 3,
  dy: -3,
  pierce: 0,
  fallen: false
}];

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

// パーティクルシステム
let particles = [];

// アニメーション用変数
let animationFrame = 0;
let backgroundOffset = 0;

// キー入力
let leftPressed = false;
let rightPressed = false;

// マウス座標
let mouseX = 0;
let mouseY = 0;

// サウンドエフェクト
const SE = {
  hit: new Audio('se/hit.wav'),
  break: new Audio('se/break.wav'),
  powerup: new Audio('se/powerup.wav'),
  gameover: new Audio('se/gameover.wav'),
  clear: new Audio('se/clear.wav')
};
Object.values(SE).forEach(audio => { audio.volume = 0.4; });

function playSE(name) {
  if (SE[name]) {
    // 同時再生対応のためcloneして再生
    const se = SE[name].cloneNode();
    se.volume = SE[name].volume;
    se.play();
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') leftPressed = true;
  if (e.key === 'ArrowRight') rightPressed = true;
  if (gameState === 'title' && e.code === 'Space') {
    startGame();
  }
  if (gameState === 'clear' && e.code === 'Space') {
    stage++;
    resetGame(true);
    gameState = 'playing';
  }
  // ポーズ機能 - PキーまたはSpaceキーでポーズ/再開
  if (gameState === 'playing' && (e.key === 'p' || e.key === 'P' || e.code === 'Space')) {
    gameState = 'paused';
  } else if (gameState === 'paused' && (e.key === 'p' || e.key === 'P' || e.code === 'Space')) {
    gameState = 'playing';
  }
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') leftPressed = false;
  if (e.key === 'ArrowRight') rightPressed = false;
});

// マウスイベント
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
  if (gameState === 'title') {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // スタートボタンのクリック判定
    const buttonY = HEIGHT * 0.7;
    const buttonW = 200;
    const buttonH = 50;
    const buttonX = WIDTH / 2 - buttonW / 2;
    
    if (clickX >= buttonX && clickX <= buttonX + buttonW && 
        clickY >= buttonY && clickY <= buttonY + buttonH) {
      startGame();
    }
  }
});

document.getElementById('restartBtn').onclick = () => {
  if (gameState === 'gameover' || gameState === 'clear') {
    gameState = 'title';
  } else {
    resetGame();
  }
};

function startGame() {
  gameState = 'playing';
  resetGame();
}

function resetGame(isNextStage = false) {
  if (!isNextStage) {
    stage = 1;
    score = 0;
    lives = 3; // ライフリセット
  }
  gameState = 'playing';
  paddle.x = WIDTH / 2 - paddle.w / 2;
  paddle.w = 80; // パドルサイズリセット
  paddle.shield = false; // シールドリセット
  paddle.shieldTimer = 0;
  balls = [{
    x: WIDTH / 2,
    y: HEIGHT - 50,
    r: 8,
    speed: 5,
    dx: 3,
    dy: -3,
    pierce: 0,
    fallen: false
  }];
  generateStage(stage);
  powerUps = [];
  activeEffects = [];
  effectMessages = [];
  particles = [];
  lasers = [];
  laserCooldown = 0;
  document.getElementById('stage').textContent = `ステージ: ${stage}`;
}

function generateStage(stageNum = 1) {
  // ステージ自動生成: ステージごとにブロック数や耐久を増やす
  blocks = [];
  const rows = Math.min(6 + Math.floor(stageNum / 2), 12);
  const cols = Math.min(8 + Math.floor(stageNum / 3), 14);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (Math.random() < 0.8) {
        blocks.push({
          x: BLOCK_OFFSET_LEFT + col * (BLOCK_W + BLOCK_PADDING),
          y: BLOCK_OFFSET_TOP + row * (BLOCK_H + BLOCK_PADDING),
          w: BLOCK_W,
          h: BLOCK_H,
          hp: 1 + Math.floor(Math.random() * (1 + Math.floor(stageNum / 2))),
          type: Math.random() < 0.1 + stageNum * 0.01 ? 'special' : 'normal'
        });
      }
    }
  }
}

function drawPaddle() {
  // パドルのグラデーション効果
  const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h);
  gradient.addColorStop(0, '#e3f0ff');
  gradient.addColorStop(1, '#b3d8ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  // パワーアップ時のエフェクト
  activeEffects.forEach(effect => {
    if (effect.name === 'パドル拡大') {
      ctx.strokeStyle = '#4f8cff';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5 + Math.sin(animationFrame * 0.5) * 0.3;
      ctx.strokeRect(paddle.x - 2, paddle.y - 2, paddle.w + 4, paddle.h + 4);
      ctx.globalAlpha = 1.0;
    }
  });
  
  // シールド効果の描画
  if (paddle.shield) {
    ctx.strokeStyle = '#00f';
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.6 + Math.sin(animationFrame * 0.3) * 0.4;
    ctx.strokeRect(paddle.x - 4, paddle.y - 4, paddle.w + 8, paddle.h + 8);
    ctx.globalAlpha = 1.0;
  }
}

function drawBall() {
  balls.forEach(ball => {
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 0.1 - i * 0.02;
      ctx.beginPath();
      ctx.arc(ball.x - ball.dx * i * 0.5, ball.y - ball.dy * i * 0.5, ball.r - i * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#b3d8ff';
      ctx.fill();
      ctx.closePath();
    }
    ctx.globalAlpha = 1.0;
    const gradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x, ball.y, ball.r);
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(1, '#4f8cff');
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
    if (ball.pierce > 0) {
      ctx.strokeStyle = '#6ed6ff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7 + Math.sin(animationFrame * 0.8) * 0.3;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.closePath();
      ctx.globalAlpha = 1.0;
    }
  });
}

function drawBlocks() {
  blocks.forEach(block => {
    const pulse = 1 + Math.sin(animationFrame * 0.1 + block.x * 0.01) * 0.05;
    ctx.save();
    ctx.translate(block.x + block.w / 2, block.y + block.h / 2);
    ctx.scale(pulse, 1);
    ctx.translate(-block.w / 2, -block.h / 2);
    const gradient = ctx.createLinearGradient(0, 0, 0, block.h);
    if (block.type === 'special') {
      gradient.addColorStop(0, '#ffe7ba');
      gradient.addColorStop(1, '#ffd6e0');
    } else {
      gradient.addColorStop(0, '#e3f0ff');
      gradient.addColorStop(1, '#b3d8ff');
    }
    ctx.fillStyle = gradient;
    ctx.globalAlpha = block.hp === 2 ? 0.7 : 1.0;
    ctx.fillRect(0, 0, block.w, block.h);
    if (block.type === 'special') {
      ctx.strokeStyle = '#ffb86b';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + Math.sin(animationFrame * 0.3) * 0.3;
      ctx.strokeRect(0, 0, block.w, block.h);
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();
  });
}

function drawPowerUps() {
  powerUps.forEach(pu => {
    const rotation = animationFrame * 0.1;
    const scale = 1 + Math.sin(animationFrame * 0.2) * 0.2;
    ctx.save();
    ctx.translate(pu.x, pu.y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    if (pu.type === 'expand') gradient.addColorStop(0, '#4f8cff');
    else if (pu.type === 'multi') gradient.addColorStop(0, '#6ed6ff');
    else if (pu.type === 'pierce') gradient.addColorStop(0, '#ffd6e0');
    else if (pu.type === 'slow') gradient.addColorStop(0, '#b3d8ff');
    else if (pu.type === 'score2x') gradient.addColorStop(0, '#ffb86b');
    else if (pu.type === 'shield') gradient.addColorStop(0, '#4f8cff');
    else if (pu.type === 'laser') gradient.addColorStop(0, '#ff8c00');
    else if (pu.type === 'bomb') gradient.addColorStop(0, '#8b0000');
    else if (pu.type === 'life') gradient.addColorStop(0, '#00ff8c');
    else if (pu.type === 'speedup') gradient.addColorStop(0, '#ff00ff');
    gradient.addColorStop(1, '#fff');
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 0.5 + Math.sin(animationFrame * 0.3) * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#e9ecef';
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1.0;
    ctx.restore();
    ctx.fillStyle = '#4f8cff';
    ctx.font = '12px sans-serif';
    ctx.fillText(getPowerUpName(pu.type), pu.x - 20, pu.y - 15);
  });
}

function drawLasers() {
  lasers.forEach(laser => {
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y);
    ctx.lineTo(laser.x, 0);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  });
}

function drawEffects() {
  // ライフの表示
  ctx.fillStyle = '#f00';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ライフ: ${lives}`, 10, 20);
  
  // アクティブな効果を表示
  let y = 50;
  activeEffects.forEach(effect => {
    ctx.fillStyle = effect.color;
    ctx.font = '14px sans-serif';
    ctx.fillText(`${effect.name}: ${Math.ceil(effect.duration)}秒`, 10, y);
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

function drawParticles() {
  particles.forEach((particle, idx) => {
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1.0;
  });
}

function drawBackground() {
  // 動的背景エフェクト
  backgroundOffset += 0.5;
  
  // 星のような背景
  for (let i = 0; i < 50; i++) {
    const x = (i * 37) % WIDTH;
    const y = (i * 73 + backgroundOffset) % HEIGHT;
    const size = Math.sin(i + animationFrame * 0.1) * 0.5 + 0.5;
    
    ctx.globalAlpha = 0.3 + Math.sin(animationFrame * 0.05 + i) * 0.2;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }
  ctx.globalAlpha = 1.0;
}

function drawTitle() {
  drawBackground();
  // タイトル
  ctx.fillStyle = '#222';
  ctx.font = 'bold 48px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('新型ブロック崩し', WIDTH / 2, HEIGHT / 3);
  // サブタイトル
  ctx.font = '18px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
  ctx.fillStyle = '#4f8cff';
  ctx.fillText('パワーアップとアニメーションで', WIDTH / 2, HEIGHT / 3 + 40);
  ctx.fillText('進化したブロック崩し', WIDTH / 2, HEIGHT / 3 + 60);
  // 操作方法
  ctx.font = '16px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText('操作方法: 左右矢印キーでパドル操作', WIDTH / 2, HEIGHT / 2 + 20);
  ctx.fillText('Pキーまたはスペースキーでポーズ', WIDTH / 2, HEIGHT / 2 + 40);
  ctx.fillText('パワーアップを取得して', WIDTH / 2, HEIGHT / 2 + 60);
  ctx.fillText('ステージをクリアしよう！', WIDTH / 2, HEIGHT / 2 + 80);
  // スタートボタン
  const buttonY = HEIGHT * 0.75;
  const buttonW = 200;
  const buttonH = 50;
  const buttonX = WIDTH / 2 - buttonW / 2;
  // ボタンの背景
  ctx.save();
  ctx.shadowColor = '#4f8cff33';
  ctx.shadowBlur = 16;
  ctx.fillStyle = 'linear-gradient(90deg, #4f8cff 0%, #6ed6ff 100%)';
  ctx.fillStyle = '#4f8cff';
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(buttonX + 16, buttonY);
  ctx.lineTo(buttonX + buttonW - 16, buttonY);
  ctx.quadraticCurveTo(buttonX + buttonW, buttonY, buttonX + buttonW, buttonY + 16);
  ctx.lineTo(buttonX + buttonW, buttonY + buttonH - 16);
  ctx.quadraticCurveTo(buttonX + buttonW, buttonY + buttonH, buttonX + buttonW - 16, buttonY + buttonH);
  ctx.lineTo(buttonX + 16, buttonY + buttonH);
  ctx.quadraticCurveTo(buttonX, buttonY + buttonH, buttonX, buttonY + buttonH - 16);
  ctx.lineTo(buttonX, buttonY + 16);
  ctx.quadraticCurveTo(buttonX, buttonY, buttonX + 16, buttonY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // ボタンのテキスト
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
  ctx.fillText('スタート', WIDTH / 2, buttonY + 32);
  // ボタンのホバーエフェクト
  if (mouseX >= buttonX && mouseX <= buttonX + buttonW && 
      mouseY >= buttonY && mouseY <= buttonY + buttonH) {
    ctx.strokeStyle = '#6ed6ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(buttonX - 2, buttonY - 2, buttonW + 4, buttonH + 4);
  }
  // バージョン情報
  ctx.font = '12px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
  ctx.fillStyle = '#bbb';
  ctx.fillText('Version 1.0', WIDTH / 2, HEIGHT - 20);
  ctx.textAlign = 'left';
}

function draw() {
  try {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
  
    if (gameState === 'title') {
      drawTitle();
    } else {
      drawBackground();
      drawPaddle();
      drawBall();
      drawBlocks();
      drawPowerUps();
      drawLasers();
      drawEffects();
      drawParticles();
      if (gameState === 'clear') {
        ctx.fillStyle = '#4f4';
        ctx.font = '32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('クリア！', WIDTH / 2, HEIGHT / 2);
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText('スペースキーで次のステージへ', WIDTH / 2, HEIGHT / 2 + 40);
        ctx.textAlign = 'left';
      } else if (gameState === 'paused') {
        // ポーズ画面のオーバーレイ
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        // ポーズタイトル
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ポーズ', WIDTH / 2, HEIGHT / 2 - 40);
        
        // 再開方法の説明
        ctx.font = '24px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
        ctx.fillStyle = '#4f8cff';
        ctx.fillText('Pキーまたはスペースキーで再開', WIDTH / 2, HEIGHT / 2 + 20);
        
        // 操作方法の再表示
        ctx.font = '16px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
        ctx.fillStyle = '#ccc';
        ctx.fillText('操作方法: 左右矢印キーでパドル操作', WIDTH / 2, HEIGHT / 2 + 60);
        
        ctx.textAlign = 'left';
      }
    }
  } catch (e) {
    console.error('draw error:', e);
  }
}

function update() {
  try {
    if (gameState !== 'playing') return;

    // パドル移動
    if (leftPressed && paddle.x > 0) paddle.x -= paddle.speed;
    if (rightPressed && paddle.x + paddle.w < WIDTH) paddle.x += paddle.speed;
    
    // シールド効果の更新
    if (paddle.shield) {
      paddle.shieldTimer--;
      if (paddle.shieldTimer <= 0) {
        paddle.shield = false;
        paddle.shieldTimer = 0;
      }
    }

    // ボール移動
    balls.forEach((ball, ballIndex) => {
      ball.x += ball.dx;
      ball.y += ball.dy;

      // 壁反射（画面端での正確な位置調整）
      if (ball.x - ball.r <= 0) {
        ball.x = ball.r; // 左端で位置を固定
        ball.dx = Math.abs(ball.dx); // 右方向に反射
        playSE('hit');
      } else if (ball.x + ball.r >= WIDTH) {
        ball.x = WIDTH - ball.r; // 右端で位置を固定
        ball.dx = -Math.abs(ball.dx); // 左方向に反射
        playSE('hit');
      }
      if (ball.y - ball.r <= 0) {
        ball.y = ball.r; // 上端で位置を固定
        ball.dy = Math.abs(ball.dy); // 下方向に反射
        playSE('hit');
      }
      
      // 画面下に到達した場合の即座の落下判定
      if (ball.y - ball.r > HEIGHT) {
        // ボールを落下状態としてマーク
        ball.fallen = true;
      }
    });

    // パドル反射
    balls.forEach(ball => {
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
        // ボールの速度を制限（極端に速くならないように）
        const maxSpeed = 8;
        ball.dx = Math.max(-maxSpeed, Math.min(maxSpeed, ball.dx));
        ball.dy = Math.max(-maxSpeed, Math.min(maxSpeed, ball.dy));
        playSE('hit');
      }
    });

    // ブロック衝突
    for (let i = 0; i < blocks.length; i++) {
      let b = blocks[i];
      let blockHit = false;
      
      balls.forEach(ball => {
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
          
          blockHit = true;
        }
      });
      
      if (blockHit) {
        b.hp--;
        if (b.hp <= 0) {
          // パーティクルエフェクト生成
          createParticleExplosion(b.x + b.w / 2, b.y + b.h / 2, b.type === 'special' ? '#f80' : '#0f0');
          
          // パワーアップドロップ
          if (Math.random() < 0.2) {
            spawnPowerUp(b.x + b.w / 2, b.y + b.h / 2);
          }
          blocks.splice(i, 1);
          score += 100;
          i--;
          playSE('break');
        }
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
        playSE('powerup');
        powerUps.splice(idx, 1);
      } else if (pu.y > HEIGHT) {
        powerUps.splice(idx, 1);
      }
    });
    
    // レーザーの更新
    if (laserCooldown > 0) {
      laserCooldown--;
      // レーザー発射（自動）
      if (laserCooldown % 20 === 0) { // 20フレームごとに発射
        lasers.push({
          x: paddle.x + paddle.w / 2,
          y: paddle.y
        });
      }
    }
    
    // レーザーの移動と衝突判定
    lasers.forEach((laser, idx) => {
      // ブロックとの衝突判定
      for (let i = 0; i < blocks.length; i++) {
        let b = blocks[i];
        if (laser.x > b.x && laser.x < b.x + b.w && laser.y < b.y + b.h) {
          b.hp--;
          if (b.hp <= 0) {
            createParticleExplosion(b.x + b.w / 2, b.y + b.h / 2, b.type === 'special' ? '#f80' : '#0f0');
            if (Math.random() < 0.2) {
              spawnPowerUp(b.x + b.w / 2, b.y + b.h / 2);
            }
            blocks.splice(i, 1);
            score += 100;
            i--;
            playSE('break');
          }
          lasers.splice(idx, 1);
          break;
        }
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
    
    // パーティクルの更新
    particles.forEach((particle, idx) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // 重力
      particle.alpha -= 0.02;
      particle.size -= 0.1;
      
      if (particle.alpha <= 0 || particle.size <= 0) {
        particles.splice(idx, 1);
      }
    });
    
    // アニメーションフレーム更新
    animationFrame++;

    // ボール落下チェック
    const fallenBalls = balls.filter(ball => ball.fallen); // fallenフラグが立っているボールを取得
    balls = balls.filter(ball => !ball.fallen); // fallenフラグが立っているボールを除外
    
    // デバッグ用：ボール落下ログ
    if (fallenBalls.length > 0) {
      console.log('ボール落下検出:', fallenBalls.length, '個');
      console.log('残りライフ:', lives);
      console.log('残りボール:', balls.length);
    }
    
    // ボールが落下した場合のライフ処理
    if (fallenBalls.length > 0) {
      if (paddle.shield) {
        // シールドがある場合はライフを減らさない
        paddle.shield = false;
        paddle.shieldTimer = 0;
        addEffect('シールド破損', '#00f', 3);
        console.log('シールドでライフ保護');
      } else {
        // ライフを減らす
        lives--;
        console.log('ライフ減少:', lives);
        if (lives <= 0) {
          gameState = 'gameover';
          playSE('gameover');
          console.log('ゲームオーバー');
        } else {
          // 新しいボールを生成（残っているボールがある場合は生成しない）
          if (balls.length === 0) {
            balls.push({
              x: WIDTH / 2,
              y: HEIGHT - 50,
              r: 8,
              speed: 5,
              dx: 4,
              dy: -4,
              pierce: 0,
              fallen: false
            });
            console.log('新しいボール生成');
          }
        }
      }
    }
    
    // ゲームオーバー判定（ボールが0個になった場合）
    if (balls.length === 0 && gameState === 'playing') {
      // ボールが0個になった場合、ライフを減らす
      lives--;
      if (lives <= 0) {
        gameState = 'gameover';
        playSE('gameover');
      } else {
        // 新しいボールを生成
        balls.push({
          x: WIDTH / 2,
          y: HEIGHT - 50,
          r: 8,
          speed: 5,
          dx: 4,
          dy: -4,
          pierce: 0,
          fallen: false
        });
      }
    }

    // クリア判定
    if (blocks.length === 0) {
      gameState = 'clear';
      playSE('clear');
      console.log('ステージクリア！ブロック数:', blocks.length);
    }
    
    // デバッグ用：ブロック数の表示
    if (gameState === 'playing' && animationFrame % 60 === 0) {
      console.log('現在のブロック数:', blocks.length);
    }

    document.getElementById('score').textContent = `スコア: ${score}`;
  } catch (e) {
    console.error('update error:', e);
  }
}

function spawnPowerUp(x, y) {
  // ランダムでパワーアップ種類決定
  const types = [
    { type: 'expand', color: '#0ff', name: 'パドル拡大' },
    { type: 'multi', color: '#ff0', name: 'マルチボール' },
    { type: 'pierce', color: '#f0f', name: '貫通弾' },
    { type: 'slow', color: '#0f0', name: 'スロー' },
    { type: 'score2x', color: '#f00', name: 'スコア2倍' },
    { type: 'shield', color: '#00f', name: 'シールド' },
    { type: 'laser', color: '#f80', name: 'レーザー' },
    { type: 'bomb', color: '#800', name: '爆弾' },
    { type: 'life', color: '#0f8', name: 'ライフ増加' },
    { type: 'speedup', color: '#f0f', name: 'スピードアップ' }
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
    'score2x': '2倍',
    'shield': 'シールド',
    'laser': 'レーザー',
    'bomb': '爆弾',
    'life': 'ライフ',
    'speedup': 'スピード'
  };
  return names[type] || type;
}

function applyPowerUp(type) {
  try {
    // エフェクトメッセージを表示
    const effectNames = {
      'expand': 'パドル拡大！',
      'multi': 'マルチボール！',
      'pierce': '貫通弾！',
      'slow': 'スロー！',
      'score2x': 'スコア2倍！',
      'shield': 'シールド有効！',
      'laser': 'レーザー有効！',
      'bomb': '爆弾発動！',
      'life': 'ライフ増加！',
      'speedup': 'スピードアップ！'
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
        // マルチボール効果：現在のボールを複製
        const currentBalls = [...balls];
        currentBalls.forEach(ball => {
          // 新しいボールを2個生成（合計3個になる）
          for (let i = 0; i < 2; i++) {
            const newBall = {
              x: ball.x,
              y: ball.y,
              r: ball.r,
              speed: ball.speed,
              dx: ball.dx + (Math.random() - 0.5) * 2, // 少しランダムな方向
              dy: ball.dy + (Math.random() - 0.5) * 2,
              pierce: ball.pierce
            };
            balls.push(newBall);
          }
        });
        addEffect('マルチボール', '#ff0', 10);
        break;
      case 'pierce':
        // すべてのボールに貫通効果を適用
        balls.forEach(ball => {
          ball.pierce = 3; // 3回貫通
        });
        addEffect('貫通弾', '#f0f', 8);
        break;
      case 'slow':
        // すべてのボールをスローにする
        balls.forEach(ball => {
          ball.dx *= 0.7;
          ball.dy *= 0.7;
        });
        addEffect('スロー', '#0f0', 6);
        break;
      case 'score2x':
        score += 1000;
        addEffect('スコア2倍', '#f00', 12);
        break;
      case 'shield':
        // シールド効果を有効化
        paddle.shield = true;
        paddle.shieldTimer = 300; // 5秒間（60FPS想定）
        addEffect('シールド有効', '#00f', 10);
        break;
      case 'laser':
        // レーザー効果を有効化
        laserCooldown = 120; // 2秒間（60FPS想定）
        addEffect('レーザー有効', '#f80', 8);
        break;
      case 'bomb':
        // 爆弾効果：画面内のブロックを一掃
        blocks.forEach(block => {
          score += 100;
          createParticleExplosion(block.x + block.w/2, block.y + block.h/2, '#f00');
        });
        blocks = [];
        addEffect('爆弾発動！', '#800', 15);
        break;
      case 'life':
        // ライフ増加
        lives = Math.min(lives + 1, maxLives);
        addEffect('ライフ増加', '#0f8', 10);
        break;
      case 'speedup':
        // ボールの速度を上げる
        balls.forEach(ball => {
          ball.dx *= 1.5;
          ball.dy *= 1.5;
        });
        addEffect('スピードアップ', '#f0f', 8);
        break;
    }
  } catch (e) {
    console.error('applyPowerUp error:', e);
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
    // すべてのボールの速度を元に戻す
    balls.forEach(ball => {
      ball.dx /= 0.7;
      ball.dy /= 0.7;
    });
  }
}

function createParticleExplosion(x, y, color) {
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const speed = 2 + Math.random() * 3;
    
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 3,
      color: color,
      alpha: 1.0
    });
  }
}

function gameLoop() {
  try {
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
    }
    requestAnimationFrame(gameLoop);
  } catch (e) {
    console.error('gameLoop error:', e);
  }
}

// 初期化
gameState = 'title';
gameLoop(); 