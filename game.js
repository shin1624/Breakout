// ゲーム定数
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// ゲーム状態
let gameState = 'title'; // 'title', 'playing', 'gameover', 'clear', 'boss'
let score = 0;
let stage = 1;

// ボスシステム
let boss = null;
let isBossStage = false;
let bossHP = 0;
let bossMaxHP = 0;
let bossPattern = 0;
let bossAttackTimer = 0;
let bossWarning = false;
let bossWarningTimer = 0;

// パドル
const paddle = {
  x: WIDTH / 2 - 40,
  y: HEIGHT - 30,
  w: 80,
  h: 12,
  speed: 7,
  dx: 0
};

// ボール配列（マルチボール対応）
let balls = [{
  x: WIDTH / 2,
  y: HEIGHT - 50,
  r: 8,
  speed: 5,
  dx: 4,
  dy: -4,
  pierce: 0
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
  }
  gameState = 'playing';
  paddle.x = WIDTH / 2 - paddle.w / 2;
  paddle.w = 80; // パドルサイズリセット
  balls = [{
    x: WIDTH / 2,
    y: HEIGHT - 50,
    r: 8,
    speed: 5,
    dx: 4,
    dy: -4,
    pierce: 0
  }];
  generateStage(stage);
  powerUps = [];
  activeEffects = [];
  effectMessages = [];
  particles = [];
  document.getElementById('stage').textContent = `ステージ: ${stage}`;
  isBossStage = false;
  boss = null;
  bossHP = 0;
  bossMaxHP = 0;
  bossPattern = 0;
  bossAttackTimer = 0;
  bossWarning = false;
  bossWarningTimer = 0;
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
  
  // ボスステージ判定（5の倍数のステージでボス戦）
  if (stageNum % 5 === 0) {
    isBossStage = true;
    bossWarning = true;
    bossWarningTimer = 180; // 3秒間の警告
  } else {
    isBossStage = false;
    boss = null;
  }
}

function generateBoss(stageNum) {
  const bossTypes = [
    {
      name: 'レーザーガーディアン',
      width: 120,
      height: 60,
      hp: 20 + stageNum * 5,
      color: '#ff4444',
      pattern: 'laser'
    },
    {
      name: 'ミサイルマスター',
      width: 100,
      height: 80,
      hp: 25 + stageNum * 6,
      color: '#ff8800',
      pattern: 'missile'
    },
    {
      name: 'シールドブレーカー',
      width: 140,
      height: 50,
      hp: 30 + stageNum * 7,
      color: '#8800ff',
      pattern: 'shield'
    }
  ];
  
  const bossType = bossTypes[(stageNum / 5 - 1) % bossTypes.length];
  
  boss = {
    x: WIDTH / 2 - bossType.width / 2,
    y: 80,
    w: bossType.width,
    h: bossType.height,
    hp: bossType.hp,
    maxHP: bossType.hp,
    name: bossType.name,
    color: bossType.color,
    pattern: bossType.pattern,
    dx: 2,
    attackCooldown: 0,
    lastAttack: 0,
    phase: 1
  };
  
  bossHP = boss.hp;
  bossMaxHP = boss.maxHP;
  bossPattern = 0;
  bossAttackTimer = 0;
  
  // ボス戦開始の演出
  createBossIntroEffect();
}

function createBossIntroEffect() {
  // ボス登場時のパーティクルエフェクト
  for (let i = 0; i < 50; i++) {
    const angle = (Math.PI * 2 * i) / 50;
    const speed = 3 + Math.random() * 4;
    
    particles.push({
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 4 + Math.random() * 4,
      color: '#ff0000',
      alpha: 1.0,
      life: 60 + Math.random() * 60
    });
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

function drawBoss() {
  if (!boss) return;
  
  // 無敵状態の場合は点滅エフェクト
  if (boss.invincible && Math.floor(animationFrame / 5) % 2 === 0) {
    return; // 点滅中は描画しない
  }
  
  // ボスの影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(boss.x + 4, boss.y + 4, boss.w, boss.h);
  
  // ボスの本体
  const gradient = ctx.createLinearGradient(boss.x, boss.y, boss.x, boss.y + boss.h);
  gradient.addColorStop(0, boss.color);
  gradient.addColorStop(1, darkenColor(boss.color, 0.3));
  
  ctx.fillStyle = gradient;
  ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
  
  // ボスの縁取り
  ctx.strokeStyle = lightenColor(boss.color, 0.5);
  ctx.lineWidth = 3;
  ctx.strokeRect(boss.x, boss.y, boss.w, boss.h);
  
  // ボスの名前
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(boss.name, boss.x + boss.w / 2, boss.y - 10);
  ctx.textAlign = 'left';
  
  // ボスのHPバー
  drawBossHPBar();
  
  // ボスの攻撃エフェクト
  if (boss.pattern === 'laser') {
    drawLaserEffect();
  } else if (boss.pattern === 'missile') {
    drawMissileEffect();
  } else if (boss.pattern === 'shield') {
    drawShieldEffect();
  }
}

function drawBossHPBar() {
  if (!boss) return;
  
  const barWidth = 200;
  const barHeight = 20;
  const barX = WIDTH / 2 - barWidth / 2;
  const barY = 20;
  
  // HPバーの背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  // HPバーの枠
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
  
  // HPバーの本体
  const hpRatio = boss.hp / boss.maxHP;
  const hpColor = hpRatio > 0.6 ? '#00ff00' : hpRatio > 0.3 ? '#ffff00' : '#ff0000';
  
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * hpRatio, barHeight - 4);
  
  // HP数値
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${boss.hp}/${boss.maxHP}`, barX + barWidth / 2, barY + barHeight / 2 + 4);
  ctx.textAlign = 'left';
}

function drawLaserEffect() {
  if (!boss || boss.attackCooldown <= 0) return;
  
  // レーザー充填エフェクト
  const chargeProgress = 1 - (boss.attackCooldown / 120);
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5 + Math.sin(animationFrame * 0.5) * 0.3;
  
  ctx.beginPath();
  ctx.moveTo(boss.x + boss.w / 2, boss.y + boss.h);
  ctx.lineTo(boss.x + boss.w / 2, HEIGHT);
  ctx.stroke();
  
  // 充填完了時の警告
  if (chargeProgress > 0.8) {
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.8 + Math.sin(animationFrame * 0.2) * 0.2;
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1.0;
}

function drawMissileEffect() {
  if (!boss || boss.attackCooldown <= 0) return;
  
  // ミサイル発射準備エフェクト
  const chargeProgress = 1 - (boss.attackCooldown / 90);
  ctx.fillStyle = '#ff8800';
  ctx.globalAlpha = 0.6 + Math.sin(animationFrame * 0.3) * 0.4;
  
  // ミサイル発射口
  ctx.beginPath();
  ctx.arc(boss.x + boss.w / 2, boss.y + boss.h, 8, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.globalAlpha = 1.0;
}

function drawShieldEffect() {
  if (!boss) return;
  
  // シールドエフェクト
  ctx.strokeStyle = '#8800ff';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.3 + Math.sin(animationFrame * 0.2) * 0.2;
  
  ctx.beginPath();
  ctx.arc(boss.x + boss.w / 2, boss.y + boss.h / 2, boss.w * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.globalAlpha = 1.0;
}

// 色の明度調整用ヘルパー関数
function lightenColor(color, amount) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * amount * 100);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function darkenColor(color, amount) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * amount * 100);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
    (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
    (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
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

function drawEffects() {
  // アクティブな効果を表示
  let y = 30;
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
  
  // ボス戦警告表示
  if (bossWarning && bossWarningTimer > 0) {
    drawBossWarning();
  }
}

function drawBossWarning() {
  const warningText = '⚠️ ボス戦開始！ ⚠️';
  const fontSize = 32;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  
  // 警告テキストの影
  ctx.fillStyle = '#000';
  ctx.fillText(warningText, WIDTH / 2 + 2, HEIGHT / 2 + 2);
  
  // 警告テキスト
  ctx.fillStyle = '#ff0000';
  ctx.fillText(warningText, WIDTH / 2, HEIGHT / 2);
  
  // 点滅エフェクト
  if (Math.floor(bossWarningTimer / 10) % 2 === 0) {
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.strokeText(warningText, WIDTH / 2, HEIGHT / 2);
  }
  
  ctx.textAlign = 'left';
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
  ctx.font = '20px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
  ctx.fillStyle = '#4f8cff';
  ctx.fillText('パワーアップとアニメーションで進化したブロック崩し', WIDTH / 2, HEIGHT / 3 + 40);
  // 操作方法
  ctx.font = '16px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText('操作方法: 左右矢印キーでパドル操作', WIDTH / 2, HEIGHT / 2 + 20);
  ctx.fillText('パワーアップを取得してステージをクリアしよう！', WIDTH / 2, HEIGHT / 2 + 40);
  // スタートボタン
  const buttonY = HEIGHT * 0.7;
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
      drawBoss(); // ボスの描画を追加
      drawPowerUps();
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
      }
    }
  } catch (e) {
    console.error('draw error:', e);
  }
}

function update() {
  try {
    if (gameState !== 'playing') return;

    // ボス戦警告タイマー更新
    if (bossWarning && bossWarningTimer > 0) {
      bossWarningTimer--;
      if (bossWarningTimer === 0) {
        bossWarning = false;
        if (isBossStage && !boss) {
          generateBoss(stage);
        }
      }
    }

    // パドル移動
    if (leftPressed && paddle.x > 0) paddle.x -= paddle.speed;
    if (rightPressed && paddle.x + paddle.w < WIDTH) paddle.x += paddle.speed;

    // ボール移動
    balls.forEach((ball, ballIndex) => {
      ball.x += ball.dx;
      ball.y += ball.dy;

      // 壁反射
      if (ball.x - ball.r < 0 || ball.x + ball.r > WIDTH) {
        ball.dx *= -1;
        playSE('hit');
      }
      if (ball.y - ball.r < 0) {
        ball.dy *= -1;
        playSE('hit');
      }

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
        playSE('hit');
      }
    });

    // ボス戦の更新
    if (boss && isBossStage) {
      updateBoss();
    }

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
          blocks.splice(i, 1);
          score += 100;
          createParticleExplosion(b.x + b.w / 2, b.y + b.h / 2, '#4f8cff');
          playSE('break');
          
          // パワーアップの確率
          if (Math.random() < 0.1) {
            createPowerUp(b.x + b.w / 2, b.y + b.h / 2);
          }
        }
        i--;
      }
    }

    // ボスとの衝突判定
    if (boss && isBossStage) {
      balls.forEach(ball => {
        if (
          ball.x + ball.r > boss.x &&
          ball.x - ball.r < boss.x + boss.w &&
          ball.y + ball.r > boss.y &&
          ball.y - ball.r < boss.y + boss.h
        ) {
          // 無敵状態の場合はダメージを与えない
          if (!boss.invincible) {
            // ボスにダメージ
            boss.hp--;
            bossHP = boss.hp;
            
            // ボスダメージエフェクト
            createBossDamageEffect(ball.x, ball.y);
            
            // ボス撃破判定
            if (boss.hp <= 0) {
              bossDefeated();
            }
          }
          
          if (ball.pierce > 0) {
            ball.pierce--;
            if (ball.pierce === 0) {
              ball.dy *= -1;
            }
          } else {
            ball.dy *= -1;
          }
          
          playSE('hit');
        }
      });
    }

    // パワーアップの更新
    powerUps.forEach((pu, idx) => {
      pu.y += pu.speed;
      if (pu.y > HEIGHT) {
        powerUps.splice(idx, 1);
      }
      
      // パドルとの衝突
      if (
        pu.y + 10 > paddle.y &&
        pu.x > paddle.x &&
        pu.x < paddle.x + paddle.w
      ) {
        applyPowerUp(pu.type);
        powerUps.splice(idx, 1);
        playSE('powerup');
      }
    });

    // エフェクトの更新
    activeEffects.forEach((effect, idx) => {
      effect.duration--;
      if (effect.duration <= 0) {
        removeEffect(effect.type);
        activeEffects.splice(idx, 1);
      }
    });

    // エフェクトメッセージの更新
    effectMessages.forEach((msg, idx) => {
      msg.alpha -= 0.02;
      msg.y -= 0.5;
      if (msg.alpha <= 0) {
        effectMessages.splice(idx, 1);
      }
    });

    // パーティクルの更新
    particles.forEach((particle, idx) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.alpha -= 0.02;
      if (particle.life !== undefined) {
        particle.life--;
        if (particle.life <= 0) {
          particle.alpha -= 0.05;
        }
      }
      
      // ミサイルタイプのパーティクルの衝突判定
      if (particle.type === 'missile') {
        // パドルとの衝突
        if (
          particle.y + particle.size > paddle.y &&
          particle.x > paddle.x &&
          particle.x < paddle.x + paddle.w
        ) {
          // パドルにダメージ（ボールを1つ減らす）
          if (balls.length > 1) {
            balls.pop();
            createParticleExplosion(particle.x, particle.y, '#ff8800');
          }
          particles.splice(idx, 1);
          continue;
        }
      }
      
      if (particle.alpha <= 0) {
        particles.splice(idx, 1);
      }
    });

    // ボールが画面外に出た場合の処理
    balls = balls.filter(ball => ball.y < HEIGHT + 50);

    // ゲームオーバー判定
    if (balls.length === 0) {
      gameState = 'gameover';
      playSE('gameover');
    }

    // クリア判定
    if (blocks.length === 0 && !isBossStage) {
      gameState = 'clear';
      playSE('clear');
    }

    // アニメーションフレーム更新
    animationFrame++;
  } catch (e) {
    console.error('update error:', e);
  }
}

function updateBoss() {
  if (!boss) return;
  
  // 無敵状態の処理
  if (boss.invincible) {
    boss.invincibleTimer--;
    if (boss.invincibleTimer <= 0) {
      boss.invincible = false;
    }
  }
  
  // ボスの移動
  boss.x += boss.dx;
  if (boss.x <= 0 || boss.x + boss.w >= WIDTH) {
    boss.dx *= -1;
  }
  
  // ボスの攻撃パターン
  boss.attackCooldown--;
  if (boss.attackCooldown <= 0) {
    executeBossAttack();
  }
  
  // フェーズ変更（HPが50%以下でフェーズ2）
  if (boss.hp <= boss.maxHP * 0.5 && boss.phase === 1) {
    boss.phase = 2;
    boss.dx *= 1.5; // 移動速度アップ
    boss.attackCooldown = 30; // 攻撃間隔短縮
  }
}

function executeBossAttack() {
  if (!boss) return;
  
  switch (boss.pattern) {
    case 'laser':
      // レーザー攻撃
      boss.attackCooldown = 120; // 2秒間隔
      createLaserAttack();
      break;
      
    case 'missile':
      // ミサイル攻撃
      boss.attackCooldown = 90; // 1.5秒間隔
      createMissileAttack();
      break;
      
    case 'shield':
      // シールド攻撃
      boss.attackCooldown = 150; // 2.5秒間隔
      createShieldAttack();
      break;
  }
}

function createLaserAttack() {
  // レーザー攻撃の実装
  const laserWidth = 8;
  const laserX = boss.x + boss.w / 2 - laserWidth / 2;
  
  // レーザーエフェクト
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: laserX + Math.random() * laserWidth,
      y: boss.y + boss.h,
      vx: (Math.random() - 0.5) * 2,
      vy: 3 + Math.random() * 2,
      size: 2 + Math.random() * 3,
      color: '#ff0000',
      alpha: 1.0,
      life: 30
    });
  }
  
  // パドルとの衝突判定
  if (laserX < paddle.x + paddle.w && laserX + laserWidth > paddle.x) {
    // パドルにダメージ（ボールを1つ減らす）
    if (balls.length > 1) {
      balls.pop();
      createParticleExplosion(paddle.x + paddle.w / 2, paddle.y, '#ff0000');
    }
  }
}

function createMissileAttack() {
  // ミサイル攻撃の実装
  const missileCount = boss.phase === 2 ? 3 : 2;
  
  for (let i = 0; i < missileCount; i++) {
    const missileX = boss.x + (boss.w / (missileCount + 1)) * (i + 1);
    
    particles.push({
      x: missileX,
      y: boss.y + boss.h,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 2,
      size: 6,
      color: '#ff8800',
      alpha: 1.0,
      life: 60,
      type: 'missile'
    });
  }
}

function createShieldAttack() {
  // シールド攻撃の実装
  // ボスが一時的に無敵になる
  boss.invincible = true;
  boss.invincibleTimer = 60; // 1秒間無敵
  
  // シールドエフェクト
  for (let i = 0; i < 30; i++) {
    const angle = (Math.PI * 2 * i) / 30;
    const radius = boss.w * 0.6;
    
    particles.push({
      x: boss.x + boss.w / 2 + Math.cos(angle) * radius,
      y: boss.y + boss.h / 2 + Math.sin(angle) * radius,
      vx: Math.cos(angle) * 2,
      vy: Math.sin(angle) * 2,
      size: 3 + Math.random() * 2,
      color: '#8800ff',
      alpha: 0.8,
      life: 45
    });
  }
}

function bossDefeated() {
  // ボス撃破時の処理
  createBossDefeatEffect();
  score += 5000; // ボス撃破ボーナス
  isBossStage = false;
  boss = null;
  
  // ボス撃破メッセージ
  effectMessages.push({
    text: 'ボス撃破！',
    x: WIDTH / 2 - 50,
    y: HEIGHT / 2,
    color: '#ff0000',
    alpha: 1.0
  });
  
  // ステージクリア
  gameState = 'clear';
  playSE('clear');
}

function createBossDamageEffect(x, y) {
  // ボスダメージ時のエフェクト
  for (let i = 0; i < 15; i++) {
    const angle = (Math.PI * 2 * i) / 15;
    const speed = 2 + Math.random() * 3;
    
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 4 + Math.random() * 3,
      color: '#ff0000',
      alpha: 1.0,
      life: 30
    });
  }
}

function createBossDefeatEffect() {
  // ボス撃破時の豪華なエフェクト
  for (let i = 0; i < 100; i++) {
    const angle = (Math.PI * 2 * i) / 100;
    const speed = 3 + Math.random() * 5;
    
    particles.push({
      x: boss.x + boss.w / 2,
      y: boss.y + boss.h / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 5,
      color: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'][Math.floor(Math.random() * 6)],
      alpha: 1.0,
      life: 90 + Math.random() * 60
    });
  }
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
  try {
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