// ゲーム定数
const GAME_CONFIG = {
  CANVAS_ID: 'gameCanvas',
  MAX_BALLS: 12,
  BALL_RADIUS: 8,
  BALL_SPEED: 5,
  MAX_LIVES: 5,
  INITIAL_LIVES: 3,
  PADDLE: {
    WIDTH: 80,
    HEIGHT: 12,
    SPEED: 7,
    Y_OFFSET: 30
  },
  BLOCK: {
    ROWS: 6,
    COLS: 8,
    WIDTH: 50,
    HEIGHT: 20,
    PADDING: 8,
    OFFSET_TOP: 60,
    OFFSET_LEFT: 20
  },
  POWERUP: {
    SPEED: 3,
    DROP_CHANCE: 0.2
  },
  LASER: {
    SPEED: 8,
    COOLDOWN_INTERVAL: 20
  }
};

const GAME_STATES = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
  CLEAR: 'clear'
};

const POWERUP_TYPES = {
  EXPAND: 'expand',
  MULTI: 'multi',
  PIERCE: 'pierce',
  SLOW: 'slow',
  SCORE2X: 'score2x',
  SHIELD: 'shield',
  LASER: 'laser',
  BOMB: 'bomb',
  LIFE: 'life',
  SPEEDUP: 'speedup'
};

// Ballエンティティクラス
class Ball {
  constructor(x, y, dx = 3, dy = -3) {
    this.x = x;
    this.y = y;
    this.r = GAME_CONFIG.BALL_RADIUS;
    this.speed = GAME_CONFIG.BALL_SPEED;
    this.dx = dx;
    this.dy = dy;
    this.pierce = 0;
    this.fallen = false;
  }
  
  update(canvas) {
    this.x += this.dx;
    this.y += this.dy;
    
    // 壁反射
    if (this.x - this.r <= 0) {
      this.x = this.r;
      this.dx = Math.abs(this.dx);
      return 'wall';
    } else if (this.x + this.r >= canvas.width) {
      this.x = canvas.width - this.r;
      this.dx = -Math.abs(this.dx);
      return 'wall';
    }
    if (this.y - this.r <= 0) {
      this.y = this.r;
      this.dy = Math.abs(this.dy);
      return 'wall';
    }
    
    // 落下判定
    if (this.y - this.r > canvas.height) {
      this.fallen = true;
      return 'fallen';
    }
    
    return null;
  }
  
  bounceOffPaddle(paddle) {
    if (
      this.y + this.r > paddle.y &&
      this.x > paddle.x &&
      this.x < paddle.x + paddle.w &&
      this.dy > 0
    ) {
      this.dy *= -1;
      // パドルのどこに当たったかで角度調整
      let hitPos = (this.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      this.dx = hitPos * 5;
      
      // 速度制限
      const maxSpeed = 8;
      this.dx = Math.max(-maxSpeed, Math.min(maxSpeed, this.dx));
      this.dy = Math.max(-maxSpeed, Math.min(maxSpeed, this.dy));
      
      return true;
    }
    return false;
  }
  
  collidesWith(block) {
    return (
      this.x + this.r > block.x &&
      this.x - this.r < block.x + block.w &&
      this.y + this.r > block.y &&
      this.y - this.r < block.y + block.h
    );
  }
  
  handleBlockCollision() {
    if (this.pierce > 0) {
      this.pierce--;
      if (this.pierce === 0) {
        this.dy *= -1;
      }
    } else {
      this.dy *= -1;
    }
  }
  
  applySlowEffect() {
    this.dx *= 0.7;
    this.dy *= 0.7;
  }
  
  removeSlowEffect() {
    this.dx /= 0.7;
    this.dy /= 0.7;
  }
  
  applySpeedUp() {
    this.dx *= 1.5;
    this.dy *= 1.5;
  }
  
  setPierce(pierceCount) {
    this.pierce = pierceCount;
  }
}

// Paddleエンティティクラス
class Paddle {
  constructor(canvas) {
    this.x = canvas.width / 2 - GAME_CONFIG.PADDLE.WIDTH / 2;
    this.y = canvas.height - GAME_CONFIG.PADDLE.Y_OFFSET;
    this.w = GAME_CONFIG.PADDLE.WIDTH;
    this.h = GAME_CONFIG.PADDLE.HEIGHT;
    this.speed = GAME_CONFIG.PADDLE.SPEED;
    this.dx = 0;
    this.shield = false;
    this.shieldTimer = 0;
    this.canvas = canvas;
  }
  
  update(inputManager) {
    // パドル移動
    if (inputManager.leftPressed && this.x > 0) {
      this.x -= this.speed;
    }
    if (inputManager.rightPressed && this.x + this.w < this.canvas.width) {
      this.x += this.speed;
    }
    
    // シールド更新
    if (this.shield) {
      this.shieldTimer--;
      if (this.shieldTimer <= 0) {
        this.shield = false;
        this.shieldTimer = 0;
      }
    }
  }
  
  reset() {
    this.x = this.canvas.width / 2 - this.w / 2;
    this.w = GAME_CONFIG.PADDLE.WIDTH;
    this.shield = false;
    this.shieldTimer = 0;
  }
  
  expand() {
    this.w = Math.min(this.w + 40, this.canvas.width - 20);
  }
  
  shrink() {
    this.w = Math.max(this.w - 40, GAME_CONFIG.PADDLE.WIDTH);
  }
  
  activateShield(duration = 300) {
    this.shield = true;
    this.shieldTimer = duration;
  }
  
  getLaserPosition() {
    return {
      x: this.x + this.w / 2,
      y: this.y
    };
  }
}

// Blockエンティティクラス
class Block {
  constructor(x, y, hp = 1, type = 'normal') {
    this.x = x;
    this.y = y;
    this.w = GAME_CONFIG.BLOCK.WIDTH;
    this.h = GAME_CONFIG.BLOCK.HEIGHT;
    this.hp = hp;
    this.maxHp = hp;
    this.type = type; // 'normal' or 'special'
  }
  
  takeDamage() {
    this.hp--;
    return this.hp <= 0;
  }
  
  isDestroyed() {
    return this.hp <= 0;
  }
  
  getCenter() {
    return {
      x: this.x + this.w / 2,
      y: this.y + this.h / 2
    };
  }
  
  shouldDropPowerUp() {
    return Math.random() < GAME_CONFIG.POWERUP.DROP_CHANCE;
  }
  
  getColor() {
    if (this.type === 'special') {
      return { start: '#ffe7ba', end: '#ffd6e0' };
    } else {
      return { start: '#e3f0ff', end: '#b3d8ff' };
    }
  }
  
  getAlpha() {
    return this.hp === 2 ? 0.7 : 1.0;
  }
}

// PowerUpエンティティクラス
class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.speed = GAME_CONFIG.POWERUP.SPEED;
    this.radius = 10;
    this.rotationAngle = 0;
    this.scaleAnimation = 0;
  }
  
  update() {
    this.y += this.speed;
    this.rotationAngle += 0.1;
    this.scaleAnimation += 0.2;
  }
  
  isOffScreen(canvas) {
    return this.y > canvas.height;
  }
  
  collidesWith(paddle) {
    return (
      this.y + this.radius > paddle.y &&
      this.x > paddle.x &&
      this.x < paddle.x + paddle.w
    );
  }
  
  getColor() {
    const colors = {
      [POWERUP_TYPES.EXPAND]: '#4f8cff',
      [POWERUP_TYPES.MULTI]: '#6ed6ff',
      [POWERUP_TYPES.PIERCE]: '#ffd6e0',
      [POWERUP_TYPES.SLOW]: '#b3d8ff',
      [POWERUP_TYPES.SCORE2X]: '#ffb86b',
      [POWERUP_TYPES.SHIELD]: '#4f8cff',
      [POWERUP_TYPES.LASER]: '#ff8c00',
      [POWERUP_TYPES.BOMB]: '#8b0000',
      [POWERUP_TYPES.LIFE]: '#00ff8c',
      [POWERUP_TYPES.SPEEDUP]: '#ff00ff'
    };
    return colors[this.type] || '#ffffff';
  }
  
  getName() {
    const names = {
      [POWERUP_TYPES.EXPAND]: '拡大',
      [POWERUP_TYPES.MULTI]: 'マルチ',
      [POWERUP_TYPES.PIERCE]: '貫通',
      [POWERUP_TYPES.SLOW]: 'スロー',
      [POWERUP_TYPES.SCORE2X]: '2倍',
      [POWERUP_TYPES.SHIELD]: 'シールド',
      [POWERUP_TYPES.LASER]: 'レーザー',
      [POWERUP_TYPES.BOMB]: '爆弾',
      [POWERUP_TYPES.LIFE]: 'ライフ',
      [POWERUP_TYPES.SPEEDUP]: 'スピード'
    };
    return names[this.type] || this.type;
  }
  
  getScale() {
    return 1 + Math.sin(this.scaleAnimation) * 0.2;
  }
}

class GameCanvas {
  constructor() {
    this.canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}

class GameState {
  constructor() {
    this.current = GAME_STATES.TITLE;
    this.score = 0;
    this.stage = 1;
    this.lives = GAME_CONFIG.INITIAL_LIVES;
    this.animationFrame = 0;
    this.backgroundOffset = 0;
  }

  reset(isNextStage = false) {
    if (!isNextStage) {
      this.stage = 1;
      this.score = 0;
      this.lives = GAME_CONFIG.INITIAL_LIVES;
    }
    this.current = GAME_STATES.PLAYING;
    this.updateStageDisplay();
  }

  updateStageDisplay() {
    document.getElementById('stage').textContent = `ステージ: ${this.stage}`;
  }

  updateScoreDisplay() {
    document.getElementById('score').textContent = `スコア: ${this.score}`;
  }

  isGameOver() {
    return this.lives <= 0;
  }

  loseLife() {
    this.lives--;
    return this.isGameOver();
  }

  gainLife() {
    this.lives = Math.min(this.lives + 1, GAME_CONFIG.MAX_LIVES);
  }

  addScore(points) {
    this.score += points;
    this.updateScoreDisplay();
  }
}

class InputManager {
  constructor() {
    this.leftPressed = false;
    this.rightPressed = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    const canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    canvas.addEventListener('click', (e) => this.handleMouseClick(e));
  }

  handleKeyDown(e) {
    if (e.key === 'ArrowLeft') this.leftPressed = true;
    if (e.key === 'ArrowRight') this.rightPressed = true;
  }

  handleKeyUp(e) {
    if (e.key === 'ArrowLeft') this.leftPressed = false;
    if (e.key === 'ArrowRight') this.rightPressed = false;
  }

  handleMouseMove(e) {
    const rect = e.target.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  handleMouseClick(e) {
    // マウスクリック処理は Game クラスで実装
  }
}

// メインのGameクラス
class Game {
  constructor() {
    this.canvas = new GameCanvas();
    this.gameState = new GameState();
    this.inputManager = new InputManager();
    
    // ゲームエンティティ
    this.balls = [];
    this.blocks = [];
    this.powerUps = [];
    this.activeEffects = [];
    this.effectMessages = [];
    this.particles = [];
    this.lasers = [];
    this.laserCooldown = 0;
    this.laserTrails = [];
    
    // パドル
    this.paddle = {
      x: this.canvas.width / 2 - GAME_CONFIG.PADDLE.WIDTH / 2,
      y: this.canvas.height - GAME_CONFIG.PADDLE.Y_OFFSET,
      w: GAME_CONFIG.PADDLE.WIDTH,
      h: GAME_CONFIG.PADDLE.HEIGHT,
      speed: GAME_CONFIG.PADDLE.SPEED,
      dx: 0,
      shield: false,
      shieldTimer: 0,
      expand: function() {
        this.w = Math.min(this.w + 40, 480 - 20);
      },
      shrink: function() {
        this.w = Math.max(this.w - 40, 60);
      },
      activateShield: function(duration) {
        this.shield = true;
        this.shieldTimer = duration;
      }
    };
    
    this.setupGame();
  }
  
  setupGame() {
    // 初期ボールを作成
    this.balls = [this.createNewBall()];
    
    // イベントリスナーを設定
    this.setupEventListeners();
    
    // 最初のステージを生成
    this.generateStage(this.gameState.stage);
  }
  
  setupEventListeners() {
    // Gameクラス専用のイベントリスナー
    document.addEventListener('keydown', (e) => this.handleGameKeyDown(e));
    
    // マウスクリック処理
    this.canvas.canvas.addEventListener('click', (e) => this.handleMouseClick(e));
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.onclick = () => this.handleRestart();
    }
  }
  
  handleGameKeyDown(e) {
    if (this.gameState.current === GAME_STATES.TITLE && e.code === 'Space') {
      this.startGame();
    }
    if (this.gameState.current === GAME_STATES.CLEAR && e.code === 'Space') {
      this.gameState.stage++;
      this.resetGame(true);
      this.gameState.current = GAME_STATES.PLAYING;
    }
    // ポーズ機能
    if (this.gameState.current === GAME_STATES.PLAYING && (e.key === 'p' || e.key === 'P' || e.code === 'Space')) {
      this.gameState.current = GAME_STATES.PAUSED;
    } else if (this.gameState.current === GAME_STATES.PAUSED && (e.key === 'p' || e.key === 'P' || e.code === 'Space')) {
      this.gameState.current = GAME_STATES.PLAYING;
    }
  }
  
  handleRestart() {
    if (this.gameState.current === GAME_STATES.GAMEOVER || this.gameState.current === GAME_STATES.CLEAR) {
      this.gameState.current = GAME_STATES.TITLE;
    } else {
      this.resetGame();
    }
  }

  handleMouseClick(e) {
    if (this.gameState.current === GAME_STATES.TITLE) {
      const rect = this.canvas.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      // スタートボタンのクリック判定
      const buttonY = this.canvas.height * 0.75;
      const buttonW = 200;
      const buttonH = 50;
      const buttonX = this.canvas.width / 2 - buttonW / 2;
      
      if (clickX >= buttonX && clickX <= buttonX + buttonW && 
          clickY >= buttonY && clickY <= buttonY + buttonH) {
        this.startGame();
      }
    }
  }
  
  startGame() {
    this.gameState.current = GAME_STATES.PLAYING;
    this.resetGame();
  }
  
  resetGame(isNextStage = false) {
    this.gameState.reset(isNextStage);
    
    // パドルリセット
    this.paddle.x = this.canvas.width / 2 - this.paddle.w / 2;
    this.paddle.w = GAME_CONFIG.PADDLE.WIDTH;
    this.paddle.shield = false;
    this.paddle.shieldTimer = 0;
    
    // ボールリセット
    this.balls = [this.createNewBall()];
    
    // その他の要素をリセット
    this.generateStage(this.gameState.stage);
    this.powerUps = [];
    this.activeEffects = [];
    this.effectMessages = [];
    this.particles = [];
    this.lasers = [];
    this.laserCooldown = 0;
    this.laserTrails = [];
  }
  
  generateStage(stageNum = 1) {
    this.blocks = [];
    const rows = Math.min(6 + Math.floor(stageNum / 2), 12);
    const cols = Math.min(8 + Math.floor(stageNum / 3), 14);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (Math.random() < 0.8) {
          this.blocks.push({
            x: GAME_CONFIG.BLOCK.OFFSET_LEFT + col * (GAME_CONFIG.BLOCK.WIDTH + GAME_CONFIG.BLOCK.PADDING),
            y: GAME_CONFIG.BLOCK.OFFSET_TOP + row * (GAME_CONFIG.BLOCK.HEIGHT + GAME_CONFIG.BLOCK.PADDING),
            w: GAME_CONFIG.BLOCK.WIDTH,
            h: GAME_CONFIG.BLOCK.HEIGHT,
            hp: 1 + Math.floor(Math.random() * (1 + Math.floor(stageNum / 2))),
            type: Math.random() < 0.1 + stageNum * 0.01 ? 'special' : 'normal'
          });
        }
      }
    }
  }
  
  createNewBall() {
    return new Ball(
      this.canvas.width / 2,
      this.canvas.height - 50,
      4,
      -4
    );
  }
  
  update() {
    try {
      if (this.gameState.current !== GAME_STATES.PLAYING) return;

      this.updatePaddle();
      this.updateBalls();
      this.updatePaddleBallCollision();
      this.updateBlockCollision();
      this.updatePowerUps();
      this.updateLasers();
      this.updateEffects();
      this.updateParticles();
      this.gameState.animationFrame++;
      this.updateGameState();
    } catch (e) {
      console.error('update error:', e);
    }
  }
  
  draw() {
    try {
      this.canvas.clear();
    
      if (this.gameState.current === GAME_STATES.TITLE) {
        this.drawTitle();
      } else {
        this.drawBackground();
        this.drawPaddle();
        this.drawBalls();
        this.drawBlocks();
        this.drawPowerUps();
        this.drawLasers();
        this.drawEffects();
        this.drawParticles();
        
        if (this.gameState.current === GAME_STATES.CLEAR) {
          this.drawClearScreen();
        } else if (this.gameState.current === GAME_STATES.PAUSED) {
          this.drawPauseScreen();
        } else if (this.gameState.current === GAME_STATES.GAMEOVER) {
          this.drawGameOverScreen();
        }
      }
    } catch (e) {
      console.error('draw error:', e);
    }
  }
  
  gameLoop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }

  // 描画メソッド
  drawTitle() {
    this.drawBackground();
    
    // タイトル
    this.canvas.ctx.fillStyle = '#222';
    this.canvas.ctx.font = 'bold 48px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
    this.canvas.ctx.textAlign = 'center';
    this.canvas.ctx.fillText('新型ブロック崩し', this.canvas.width / 2, this.canvas.height / 3);
    
    // サブタイトル
    this.canvas.ctx.font = '18px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
    this.canvas.ctx.fillStyle = '#4f8cff';
    this.canvas.ctx.fillText('パワーアップとアニメーションで', this.canvas.width / 2, this.canvas.height / 3 + 40);
    this.canvas.ctx.fillText('進化したブロック崩し', this.canvas.width / 2, this.canvas.height / 3 + 60);
    
    // 操作方法
    this.canvas.ctx.font = '16px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
    this.canvas.ctx.fillStyle = '#888';
    this.canvas.ctx.fillText('操作方法: 左右矢印キーでパドル操作', this.canvas.width / 2, this.canvas.height / 2 + 20);
    this.canvas.ctx.fillText('Pキーまたはスペースキーでポーズ', this.canvas.width / 2, this.canvas.height / 2 + 40);
    this.canvas.ctx.fillText('パワーアップを取得して', this.canvas.width / 2, this.canvas.height / 2 + 60);
    this.canvas.ctx.fillText('ステージをクリアしよう！', this.canvas.width / 2, this.canvas.height / 2 + 80);
    
    // スタートボタン
    const buttonY = this.canvas.height * 0.75;
    const buttonW = 200;
    const buttonH = 50;
    const buttonX = this.canvas.width / 2 - buttonW / 2;
    
    // ボタンの背景
    this.canvas.ctx.save();
    this.canvas.ctx.shadowColor = '#4f8cff33';
    this.canvas.ctx.shadowBlur = 16;
    this.canvas.ctx.fillStyle = '#4f8cff';
    this.canvas.ctx.globalAlpha = 0.95;
    this.canvas.ctx.beginPath();
    this.canvas.ctx.moveTo(buttonX + 16, buttonY);
    this.canvas.ctx.lineTo(buttonX + buttonW - 16, buttonY);
    this.canvas.ctx.quadraticCurveTo(buttonX + buttonW, buttonY, buttonX + buttonW, buttonY + 16);
    this.canvas.ctx.lineTo(buttonX + buttonW, buttonY + buttonH - 16);
    this.canvas.ctx.quadraticCurveTo(buttonX + buttonW, buttonY + buttonH, buttonX + buttonW - 16, buttonY + buttonH);
    this.canvas.ctx.lineTo(buttonX + 16, buttonY + buttonH);
    this.canvas.ctx.quadraticCurveTo(buttonX, buttonY + buttonH, buttonX, buttonY + buttonH - 16);
    this.canvas.ctx.lineTo(buttonX, buttonY + 16);
    this.canvas.ctx.quadraticCurveTo(buttonX, buttonY, buttonX + 16, buttonY);
    this.canvas.ctx.closePath();
    this.canvas.ctx.fill();
    this.canvas.ctx.restore();
    
    // ボタンのテキスト
    this.canvas.ctx.fillStyle = '#fff';
    this.canvas.ctx.font = 'bold 24px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
    this.canvas.ctx.fillText('スタート', this.canvas.width / 2, buttonY + 32);
    
    // バージョン情報
    this.canvas.ctx.font = '12px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
    this.canvas.ctx.fillStyle = '#bbb';
    this.canvas.ctx.fillText('Version 1.0', this.canvas.width / 2, this.canvas.height - 20);
    this.canvas.ctx.textAlign = 'left';
  }

  drawBackground() {
    // 背景のグラデーション
    const gradient = this.canvas.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.canvas.ctx.fillStyle = gradient;
    this.canvas.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawPauseScreen() {
    // ポーズ画面のオーバーレイ
    this.canvas.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.canvas.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // ポーズタイトル
    this.canvas.ctx.fillStyle = '#fff';
    this.canvas.ctx.font = 'bold 48px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
    this.canvas.ctx.textAlign = 'center';
    this.canvas.ctx.fillText('ポーズ', this.canvas.width / 2, this.canvas.height / 2 - 40);
    
    // 再開方法の説明
    this.canvas.ctx.font = '24px "Segoe UI", "Noto Sans JP", Arial, sans-serif';
    this.canvas.ctx.fillStyle = '#4f8cff';
    this.canvas.ctx.fillText('Pキーまたはスペースキーで再開', this.canvas.width / 2, this.canvas.height / 2 + 20);
    
    this.canvas.ctx.textAlign = 'left';
  }

  drawGameOverScreen() {
    this.canvas.ctx.fillStyle = '#f44';
    this.canvas.ctx.font = '32px sans-serif';
    this.canvas.ctx.textAlign = 'center';
    this.canvas.ctx.fillText('ゲームオーバー', this.canvas.width / 2, this.canvas.height / 2);
    this.canvas.ctx.textAlign = 'left';
  }

  drawClearScreen() {
    this.canvas.ctx.fillStyle = '#4f4';
    this.canvas.ctx.font = '32px sans-serif';
    this.canvas.ctx.textAlign = 'center';
    this.canvas.ctx.fillText('クリア！', this.canvas.width / 2, this.canvas.height / 2);
    this.canvas.ctx.font = '20px sans-serif';
    this.canvas.ctx.fillStyle = '#fff';
    this.canvas.ctx.fillText('スペースキーで次のステージへ', this.canvas.width / 2, this.canvas.height / 2 + 40);
    this.canvas.ctx.textAlign = 'left';
  }

  drawPaddle() {
    // パドルの描画処理はここに実装
    this.canvas.ctx.fillStyle = '#4f8cff';
    this.canvas.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);
    
    // シールドエフェクト
    if (this.paddle.shield) {
      this.canvas.ctx.strokeStyle = '#00f';
      this.canvas.ctx.lineWidth = 3;
      this.canvas.ctx.strokeRect(this.paddle.x - 3, this.paddle.y - 3, this.paddle.w + 6, this.paddle.h + 6);
    }
  }

  drawBalls() {
    this.balls.forEach(ball => {
      this.canvas.ctx.fillStyle = '#fff';
      this.canvas.ctx.beginPath();
      this.canvas.ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      this.canvas.ctx.fill();
    });
  }

  drawBlocks() {
    this.blocks.forEach(block => {
      this.canvas.ctx.fillStyle = block.type === 'special' ? '#f80' : '#4f8cff';
      this.canvas.ctx.fillRect(block.x, block.y, block.w, block.h);
      
      // HP表示
      if (block.hp > 1) {
        this.canvas.ctx.fillStyle = '#fff';
        this.canvas.ctx.font = '12px sans-serif';
        this.canvas.ctx.textAlign = 'center';
        this.canvas.ctx.fillText(block.hp.toString(), block.x + block.w/2, block.y + block.h/2 + 4);
        this.canvas.ctx.textAlign = 'left';
      }
    });
  }

  drawPowerUps() {
    this.powerUps.forEach(pu => {
      this.canvas.ctx.fillStyle = pu.color;
      this.canvas.ctx.fillRect(pu.x - 8, pu.y - 8, 16, 16);
    });
  }

  drawLasers() {
    this.lasers.forEach(laser => {
      this.canvas.ctx.strokeStyle = '#ff8c00';
      this.canvas.ctx.lineWidth = 3;
      this.canvas.ctx.beginPath();
      this.canvas.ctx.moveTo(laser.x, laser.y);
      this.canvas.ctx.lineTo(laser.x, laser.y + 10);
      this.canvas.ctx.stroke();
    });
  }

  drawEffects() {
    // エフェクトメッセージの描画
    this.effectMessages.forEach(msg => {
      this.canvas.ctx.globalAlpha = msg.alpha;
      this.canvas.ctx.fillStyle = msg.color;
      this.canvas.ctx.font = '20px sans-serif';
      this.canvas.ctx.textAlign = 'center';
      this.canvas.ctx.fillText(msg.text, msg.x, msg.y);
      this.canvas.ctx.textAlign = 'left';
    });
    this.canvas.ctx.globalAlpha = 1.0;
  }

  drawParticles() {
    this.particles.forEach(particle => {
      this.canvas.ctx.globalAlpha = particle.alpha;
      this.canvas.ctx.fillStyle = particle.color;
      this.canvas.ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, particle.size, particle.size);
    });
    this.canvas.ctx.globalAlpha = 1.0;
  }

  // Update methods
  updatePaddle() {
    // パドル更新処理
    if (this.inputManager.leftPressed && this.paddle.x > 0) {
      this.paddle.x -= this.paddle.speed;
    }
    if (this.inputManager.rightPressed && this.paddle.x < this.canvas.width - this.paddle.w) {
      this.paddle.x += this.paddle.speed;
    }
    
    // シールドタイマー
    if (this.paddle.shield && this.paddle.shieldTimer > 0) {
      this.paddle.shieldTimer--;
      if (this.paddle.shieldTimer <= 0) {
        this.paddle.shield = false;
      }
    }
  }

  updateBalls() {
    this.balls.forEach(ball => {
      ball.x += ball.dx;
      ball.y += ball.dy;
      
      // 壁との衝突
      if (ball.x <= ball.r || ball.x >= this.canvas.width - ball.r) {
        ball.dx *= -1;
      }
      if (ball.y <= ball.r) {
        ball.dy *= -1;
      }
      
      // 下に落ちた場合
      if (ball.y > this.canvas.height) {
        ball.fallen = true;
      }
    });
  }

  updatePaddleBallCollision() {
    this.balls.forEach(ball => {
      if (ball.y + ball.r > this.paddle.y &&
          ball.y - ball.r < this.paddle.y + this.paddle.h &&
          ball.x > this.paddle.x &&
          ball.x < this.paddle.x + this.paddle.w) {
        
        ball.dy = -Math.abs(ball.dy);
        
        // パドルの位置によって角度を変える
        const hitPos = (ball.x - this.paddle.x) / this.paddle.w;
        ball.dx = (hitPos - 0.5) * 8;
      }
    });
  }

  updateBlockCollision() {
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      let blockHit = false;
      
      this.balls.forEach(ball => {
        if (ball.x + ball.r > block.x &&
            ball.x - ball.r < block.x + block.w &&
            ball.y + ball.r > block.y &&
            ball.y - ball.r < block.y + block.h) {
          
          blockHit = true;
          ball.dy *= -1;
          
          block.hp--;
          if (block.hp <= 0) {
            this.gameState.addScore(100);
            this.createParticleExplosion(block.x + block.w/2, block.y + block.h/2, '#4f8cff');
            
            if (Math.random() < 0.3) {
              this.spawnPowerUp(block.x + block.w/2, block.y + block.h/2);
            }
            
            this.blocks.splice(i, 1);
          }
        }
      });
      
      if (blockHit) break;
    }
  }

  updatePowerUps() {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.y += pu.speed;
      
      // パドルとの衝突
      if (pu.y + 8 > this.paddle.y &&
          pu.y - 8 < this.paddle.y + this.paddle.h &&
          pu.x + 8 > this.paddle.x &&
          pu.x - 8 < this.paddle.x + this.paddle.w) {
        
        this.applyPowerUp(pu.type);
        playSE('powerup');
        this.powerUps.splice(i, 1);
      }
      // 画面外に出た場合
      else if (pu.y > this.canvas.height) {
        this.powerUps.splice(i, 1);
      }
    }
  }

  updateLasers() {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.y -= 8;
      
      if (laser.y < 0) {
        this.lasers.splice(i, 1);
        continue;
      }
      
      // ブロックとの衝突
      for (let j = this.blocks.length - 1; j >= 0; j--) {
        const block = this.blocks[j];
        if (laser.x > block.x && laser.x < block.x + block.w &&
            laser.y < block.y + block.h && laser.y > block.y) {
          
          block.hp--;
          if (block.hp <= 0) {
            this.gameState.addScore(100);
            this.createParticleExplosion(block.x + block.w/2, block.y + block.h/2, '#ff8c00');
            this.blocks.splice(j, 1);
          }
          
          this.lasers.splice(i, 1);
          break;
        }
      }
    }
  }
  
  // パーティクル関連メソッド
  createParticleExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 2 + Math.random() * 3;
      
      this.particles.push({
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
  
  createLaserParticles(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 3 + Math.random() * 4;
      const size = 2 + Math.random() * 3;
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        color: i % 2 === 0 ? '#ff8c00' : '#fff',
        alpha: 1.0,
        type: 'laser'
      });
    }
  }
  
  createLaserHitExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 5 + Math.random() * 8;
      const size = 1 + Math.random() * 3;
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        color: '#ff0000',
        alpha: 1.0,
        type: 'explosion'
      });
    }
  }
  
  createLaserHitEffect(x, y) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const speed = 2 + Math.random() * 4;
      const size = 0.5 + Math.random() * 1.5;
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        color: '#ff8c00',
        alpha: 1.0,
        type: 'hit'
      });
    }
  }
  
  // パワーアップ関連メソッド
  spawnPowerUp(x, y) {
    const types = [
      { type: POWERUP_TYPES.EXPAND, color: '#0ff', name: 'パドル拡大' },
      { type: POWERUP_TYPES.MULTI, color: '#ff0', name: 'マルチボール' },
      { type: POWERUP_TYPES.PIERCE, color: '#f0f', name: '貫通弾' },
      { type: POWERUP_TYPES.SLOW, color: '#0f0', name: 'スロー' },
      { type: POWERUP_TYPES.SCORE2X, color: '#f00', name: 'スコア2倍' },
      { type: POWERUP_TYPES.SHIELD, color: '#00f', name: 'シールド' },
      { type: POWERUP_TYPES.LASER, color: '#f80', name: 'レーザー' },
      { type: POWERUP_TYPES.BOMB, color: '#800', name: '爆弾' },
      { type: POWERUP_TYPES.LIFE, color: '#0f8', name: 'ライフ増加' },
      { type: POWERUP_TYPES.SPEEDUP, color: '#f0f', name: 'スピードアップ' }
    ];
    const p = types[Math.floor(Math.random() * types.length)];
    this.powerUps.push({ x, y, type: p.type, color: p.color, speed: GAME_CONFIG.POWERUP.SPEED, name: p.name });
  }
  
  applyPowerUp(type) {
    try {
      // エフェクトメッセージを表示
      const effectNames = {
        [POWERUP_TYPES.EXPAND]: 'パドル拡大！',
        [POWERUP_TYPES.MULTI]: 'マルチボール！',
        [POWERUP_TYPES.PIERCE]: '貫通弾！',
        [POWERUP_TYPES.SLOW]: 'スロー！',
        [POWERUP_TYPES.SCORE2X]: 'スコア2倍！',
        [POWERUP_TYPES.SHIELD]: 'シールド有効！',
        [POWERUP_TYPES.LASER]: 'レーザー有効！',
        [POWERUP_TYPES.BOMB]: '爆弾発動！',
        [POWERUP_TYPES.LIFE]: 'ライフ増加！',
        [POWERUP_TYPES.SPEEDUP]: 'スピードアップ！'
      };
      
      this.effectMessages.push({
        text: effectNames[type] || 'パワーアップ！',
        x: this.canvas.width / 2 - 50,
        y: this.canvas.height / 2,
        color: '#fff',
        alpha: 1.0
      });
      
      switch (type) {
        case POWERUP_TYPES.EXPAND:
          this.paddle.expand();
          this.addEffect('パドル拡大', '#0ff', 10);
          break;
        case POWERUP_TYPES.MULTI:
          if (this.balls.length < GAME_CONFIG.MAX_BALLS) {
            const currentBalls = [...this.balls];
            currentBalls.forEach(ball => {
              if (this.balls.length < GAME_CONFIG.MAX_BALLS) {
                const newBall = {
                  x: ball.x,
                  y: ball.y,
                  r: ball.r,
                  speed: ball.speed,
                  dx: ball.dx + (Math.random() - 0.5) * 2,
                  dy: ball.dy + (Math.random() - 0.5) * 2,
                  pierce: ball.pierce,
                  fallen: false
                };
                this.balls.push(newBall);
              }
            });
            this.addEffect('マルチボール', '#ff0', 10);
          } else {
            this.gameState.addScore(500);
            this.addEffect('ボール数上限', '#ff0', 5);
          }
          break;
        case POWERUP_TYPES.PIERCE:
          this.balls.forEach(ball => {
            ball.setPierce(3);
          });
          this.addEffect('貫通弾', '#f0f', 8);
          break;
        case POWERUP_TYPES.SLOW:
          this.balls.forEach(ball => {
            ball.applySlowEffect();
          });
          this.addEffect('スロー', '#0f0', 6);
          break;
        case POWERUP_TYPES.SCORE2X:
          this.gameState.addScore(1000);
          this.addEffect('スコア2倍', '#f00', 12);
          break;
        case POWERUP_TYPES.SHIELD:
          this.paddle.activateShield(300);
          this.addEffect('シールド有効', '#00f', 10);
          break;
        case POWERUP_TYPES.LASER:
          this.laserCooldown = 120;
          this.addEffect('レーザー有効', '#f80', 8);
          break;
        case POWERUP_TYPES.BOMB:
          this.blocks.forEach(block => {
            this.gameState.addScore(100);
            this.createParticleExplosion(block.x + block.w/2, block.y + block.h/2, '#f00');
          });
          this.blocks = [];
          this.addEffect('爆弾発動！', '#800', 15);
          break;
        case POWERUP_TYPES.LIFE:
          this.gameState.gainLife();
          this.addEffect('ライフ増加', '#0f8', 10);
          break;
        case POWERUP_TYPES.SPEEDUP:
          this.balls.forEach(ball => {
            ball.applySpeedUp();
          });
          this.addEffect('スピードアップ', '#f0f', 8);
          break;
      }
    } catch (e) {
      console.error('applyPowerUp error:', e);
    }
  }
  
  addEffect(name, color, duration) {
    this.activeEffects = this.activeEffects.filter(e => e.name !== name);
    this.activeEffects.push({ name, color, duration, type: name });
  }
  
  removeEffect(type) {
    if (type === 'パドル拡大') {
      this.paddle.shrink();
    } else if (type === 'スロー') {
      this.balls.forEach(ball => {
        ball.removeSlowEffect();
      });
    }
  }
  
  // 更新処理メソッド
  updateEffects() {
    this.activeEffects.forEach((effect, idx) => {
      effect.duration -= 1/60;
      if (effect.duration <= 0) {
        this.removeEffect(effect.type);
        this.activeEffects.splice(idx, 1);
      }
    });
    
    this.effectMessages.forEach((msg, idx) => {
      msg.y -= 1;
      msg.alpha -= 0.02;
      if (msg.alpha <= 0) {
        this.effectMessages.splice(idx, 1);
      }
    });
  }
  
  updateParticles() {
    this.particles.forEach((particle, idx) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1;
      particle.alpha -= 0.02;
      particle.size -= 0.1;
      
      if (particle.alpha <= 0 || particle.size <= 0) {
        this.particles.splice(idx, 1);
      }
    });
  }
  
  updateGameState() {
    const fallenBalls = this.balls.filter(ball => ball.fallen);
    this.balls = this.balls.filter(ball => !ball.fallen);
    
    if (fallenBalls.length > 0) {
      if (this.paddle.shield) {
        this.paddle.shield = false;
        this.paddle.shieldTimer = 0;
        this.addEffect('シールド破損', '#00f', 3);
      } else {
        if (this.gameState.loseLife()) {
          this.gameState.current = GAME_STATES.GAMEOVER;
          playSE('gameover');
        } else {
          if (this.balls.length === 0) {
            this.balls.push(this.createNewBall());
          }
        }
      }
    }
    
    if (this.balls.length === 0 && this.gameState.current === GAME_STATES.PLAYING) {
      if (this.gameState.loseLife()) {
        this.gameState.current = GAME_STATES.GAMEOVER;
        playSE('gameover');
      } else {
        this.balls.push(this.createNewBall());
      }
    }

    if (this.blocks.length === 0) {
      this.gameState.current = GAME_STATES.CLEAR;
      playSE('clear');
    }
  }
}

// グローバルゲームインスタンス（DOM読み込み後に初期化）
let game;

// 後方互換性のための変数（初期化後に設定されます）
let inputManager, balls, blocks, powerUps, activeEffects, effectMessages, particles, lasers;
let laserCooldown, laserTrails, paddle;

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

// キャンバスの取得（後方互換性のため）
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WIDTH = 480;
const HEIGHT = 640;

// パドル初期設定（後方互換性のため）
paddle = {
  x: WIDTH / 2 - 40,
  y: HEIGHT - 30,
  w: 80,
  h: 10,
  speed: 6,
  dx: 0,
  shield: false,
  shieldTimer: 0,
  expand: function() {
    this.w = Math.min(this.w + 40, WIDTH - 20);
  },
  shrink: function() {
    this.w = Math.max(this.w - 40, 60);
  },
  activateShield: function(duration) {
    this.shield = true;
    this.shieldTimer = duration;
  }
};

// グローバル変数の初期化
let gameState = 'title';
let gameCanvas = { width: WIDTH, height: HEIGHT };
let stage = 1;
let score = 0;
let lives = 3;
let maxLives = 5;
let animationFrame = 0;
let backgroundOffset = 0;
let leftPressed = false;
let rightPressed = false;
let mouseX = 0;
let mouseY = 0;

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
    r: GAME_CONFIG.BALL_RADIUS,
    speed: GAME_CONFIG.BALL_SPEED,
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
  laserTrails = []; // レーザーの軌跡をリセット
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
          x: GAME_CONFIG.BLOCK.OFFSET_LEFT + col * (GAME_CONFIG.BLOCK.WIDTH + GAME_CONFIG.BLOCK.PADDING),
          y: GAME_CONFIG.BLOCK.OFFSET_TOP + row * (GAME_CONFIG.BLOCK.HEIGHT + GAME_CONFIG.BLOCK.PADDING),
          w: GAME_CONFIG.BLOCK.WIDTH,
          h: GAME_CONFIG.BLOCK.HEIGHT,
          hp: 1 + Math.floor(Math.random() * (1 + Math.floor(stageNum / 2))),
          type: Math.random() < 0.1 + stageNum * 0.01 ? 'special' : 'normal'
        });
      }
    }
  }
}

function drawPaddle() {
  // パドルの描画
  ctx.fillStyle = '#4f8cff';
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  
  // シールド効果の描画
  if (paddle.shield) {
    ctx.strokeStyle = '#00f';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6;
    ctx.strokeRect(paddle.x - 5, paddle.y - 5, paddle.w + 10, paddle.h + 10);
    ctx.globalAlpha = 1.0;
  }
  
  // レーザー効果の描画
  if (laserCooldown > 0) {
    // パドル周りの光るエフェクト
    ctx.globalAlpha = 0.3 + Math.sin(animationFrame * 0.3) * 0.2;
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.arc(paddle.x + paddle.w / 2, paddle.y + paddle.h / 2, paddle.w / 2 + 8, 0, Math.PI * 2);
    ctx.fill();
    
    // レーザー発射口の光
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(paddle.x + paddle.w / 2, paddle.y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1.0;
  }
  
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
  // レーザーの軌跡を描画
  laserTrails.forEach((trail, trailIndex) => {
    // 軌跡のフェードアウト
    trail.alpha -= 0.02;
    if (trail.alpha <= 0) {
      laserTrails.splice(trailIndex, 1);
      return;
    }
    
    // 軌跡の描画
    ctx.globalAlpha = trail.alpha;
    ctx.strokeStyle = trail.color;
    ctx.lineWidth = trail.width;
    ctx.beginPath();
    ctx.moveTo(trail.x, trail.y);
    ctx.lineTo(trail.x, trail.yEnd);
    ctx.stroke();
  });
  
  // 現在のレーザーを描画
  lasers.forEach(laser => {
    // メインレーザービーム
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y);
    ctx.lineTo(laser.x, 0);
    ctx.stroke();
    
    // レーザーの中心線（より明るい）
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.moveTo(laser.x, laser.y);
    ctx.lineTo(laser.x, 0);
    ctx.stroke();
    
    // レーザーの発射点の光る効果
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.arc(laser.x, laser.y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // 発射点の外側の光
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(laser.x, laser.y, 12, 0, Math.PI * 2);
    ctx.fill();
    
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
  if (this.inputManager.mouseX >= buttonX && this.inputManager.mouseX <= buttonX + buttonW && 
      this.inputManager.mouseY >= buttonY && this.inputManager.mouseY <= buttonY + buttonH) {
    this.canvas.ctx.strokeStyle = '#6ed6ff';
    this.canvas.ctx.lineWidth = 3;
    this.canvas.ctx.strokeRect(buttonX - 2, buttonY - 2, buttonW + 4, buttonH + 4);
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

// パドル移動の処理（Gameクラスのメソッドとして移動予定）
Game.prototype.updatePaddle = function() {
  if (this.inputManager.leftPressed && this.paddle.x > 0) this.paddle.x -= this.paddle.speed;
  if (this.inputManager.rightPressed && this.paddle.x + this.paddle.w < this.canvas.width) this.paddle.x += this.paddle.speed;
  
  // シールド効果の更新
  if (this.paddle.shield) {
    this.paddle.shieldTimer--;
    if (this.paddle.shieldTimer <= 0) {
      this.paddle.shield = false;
      this.paddle.shieldTimer = 0;
    }
  }
};

// ボールの移動と壁の衝突判定（Gameクラスのメソッドとして移動予定）
Game.prototype.updateBalls = function() {
  this.balls.forEach((ball, ballIndex) => {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // 壁反射（画面端での正確な位置調整）
    if (ball.x - ball.r <= 0) {
      ball.x = ball.r; // 左端で位置を固定
      ball.dx = Math.abs(ball.dx); // 右方向に反射
      playSE('hit');
    } else if (ball.x + ball.r >= this.canvas.width) {
      ball.x = this.canvas.width - ball.r; // 右端で位置を固定
      ball.dx = -Math.abs(ball.dx); // 左方向に反射
      playSE('hit');
    }
    if (ball.y - ball.r <= 0) {
      ball.y = ball.r; // 上端で位置を固定
      ball.dy = Math.abs(ball.dy); // 下方向に反射
      playSE('hit');
    }
    
    // 画面下に到達した場合の即座の落下判定
    if (ball.y - ball.r > this.canvas.height) {
      // ボールを落下状態としてマーク
      ball.fallen = true;
    }
  });
};

// パドルとボールの衝突判定
function updatePaddleBallCollision() {
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
}

// ブロックとボールの衝突判定
function updateBlockCollision() {
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
        if (Math.random() < GAME_CONFIG.POWERUP.DROP_CHANCE) {
          spawnPowerUp(b.x + b.w / 2, b.y + b.h / 2);
        }
        blocks.splice(i, 1);
        gameState.addScore(100);
        i--;
        playSE('break');
      }
    }
  }
}

function update() {
  try {
    if (gameState.current !== GAME_STATES.PLAYING) return;

    updatePaddle();
    updateBalls();
    updatePaddleBallCollision();
    updateBlockCollision();


    updatePowerUps();
    updateLasers();
    updateEffects();
    updateParticles();
    gameState.animationFrame++;
    updateGameState();
  } catch (e) {
    console.error('update error:', e);
  }
}

// パワーアップの更新処理
function updatePowerUps() {
  powerUps.forEach((pu, idx) => {
    pu.y += GAME_CONFIG.POWERUP.SPEED;
    // パドル取得
    if (
      pu.y + 10 > paddle.y &&
      pu.x > paddle.x &&
      pu.x < paddle.x + paddle.w
    ) {
      applyPowerUp(pu.type);
      playSE('powerup');
      powerUps.splice(idx, 1);
    } else if (pu.y > gameCanvas.height) {
      powerUps.splice(idx, 1);
    }
  });
}

// レーザーシステムの更新処理
function updateLasers() {
  // レーザーの更新
  if (laserCooldown > 0) {
    laserCooldown--;
    // レーザー発射（自動）
    if (laserCooldown % GAME_CONFIG.LASER.COOLDOWN_INTERVAL === 0) {
      const laserX = paddle.x + paddle.w / 2;
      const laserY = paddle.y;
      lasers.push({
        x: laserX,
        y: laserY
      });
      
      // レーザーの軌跡を生成
      for (let i = 0; i < 15; i++) {
        const alpha = (1 - i / 15) * 0.8;
        const width = (1 - i / 15) * 5 + 1;
        const y = laserY - i * 3;
        
        if (y > 0) {
          laserTrails.push({
            x: laserX,
            y: y,
            yEnd: Math.max(0, y - 15),
            color: `rgba(255, 140, 0, ${alpha})`,
            width: width,
            alpha: alpha
          });
        }
      }
      
      // レーザー発射時のパーティクルエフェクト
      createLaserParticles(laserX, laserY);
    }
  }
  
  // レーザーの移動と衝突判定
  lasers.forEach((laser, idx) => {
    // レーザーを上方向に移動
    laser.y -= GAME_CONFIG.LASER.SPEED;
    
    // レーザーが画面外に出た場合の処理
    if (laser.y < 0) {
      lasers.splice(idx, 1);
      // 該当するレーザーの軌跡も削除
      laserTrails = laserTrails.filter(trail => 
        Math.abs(trail.x - laser.x) > 5 || trail.alpha < 0.1
      );
      return;
    }
    
    // ブロックとの衝突判定
    for (let i = 0; i < blocks.length; i++) {
      let b = blocks[i];
      if (laser.x > b.x && laser.x < b.x + b.w && laser.y < b.y + b.h) {
        b.hp--;
        if (b.hp <= 0) {
          // レーザー命中時の特別な爆発エフェクト
          createLaserHitExplosion(b.x + b.w / 2, b.y + b.h / 2);
          if (Math.random() < GAME_CONFIG.POWERUP.DROP_CHANCE) {
            spawnPowerUp(b.x + b.w / 2, b.y + b.h / 2);
          }
          blocks.splice(i, 1);
          gameState.addScore(100);
          i--;
          playSE('break');
        } else {
          // ブロックが破壊されない場合も小さなヒットエフェクト
          createLaserHitEffect(laser.x, b.y + b.h / 2);
        }
        
        // レーザーを削除
        lasers.splice(idx, 1);
        
        // 該当するレーザーの軌跡も削除
        laserTrails = laserTrails.filter(trail => 
          Math.abs(trail.x - laser.x) > 5 || trail.alpha < 0.1
        );
        
        break;
      }
    }
  });
}

// エフェクトの更新処理（互換性関数）
function updateEffects() {
  game.updateEffects();
}

// パーティクルの更新処理（互換性関数）
function updateParticles() {
  game.updateParticles();
}

// ゲーム状態の更新処理（互換性関数）
function updateGameState() {
  game.updateGameState();
}

// 新しいボールを作成する関数（互換性関数）
function createNewBall() {
  return game.createNewBall();
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
        // マルチボール効果：ボール数の上限を設定
        if (balls.length < GAME_CONFIG.MAX_BALLS) {
          const currentBalls = [...balls];
          currentBalls.forEach(ball => {
            // ボール数が上限に達するまで新しいボールを生成
            if (balls.length < GAME_CONFIG.MAX_BALLS) {
              const newBall = {
                x: ball.x,
                y: ball.y,
                r: ball.r,
                speed: ball.speed,
                dx: ball.dx + (Math.random() - 0.5) * 2, // 少しランダムな方向
                dy: ball.dy + (Math.random() - 0.5) * 2,
                pierce: ball.pierce,
                fallen: false
              };
              balls.push(newBall);
            }
          });
          addEffect('マルチボール', '#ff0', 10);
          console.log('マルチボール発動: ボール数', balls.length);
        } else {
          // ボール数が上限に達している場合はスコアボーナスのみ
          score += 500;
          addEffect('ボール数上限', '#ff0', 5);
          console.log('ボール数上限のためスコアボーナスのみ');
        }
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
        // レーザー有効時の特別なエフェクトメッセージ
        effectMessages.push({
          text: '🔥 レーザー発射！ 🔥',
          x: WIDTH / 2,
          y: HEIGHT / 2,
          color: '#ff8c00',
          alpha: 1.0
        });
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

function createLaserParticles(x, y) {
  // レーザー発射時の光のパーティクル
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const speed = 3 + Math.random() * 4;
    const size = 2 + Math.random() * 3;
    
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: size,
      color: i % 2 === 0 ? '#ff8c00' : '#fff', // オレンジと白を交互
      alpha: 1.0,
      type: 'laser' // レーザー用パーティクル
    });
  }
}

function createLaserHitExplosion(x, y) {
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20;
    const speed = 5 + Math.random() * 8;
    const size = 1 + Math.random() * 3;
    
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: size,
      color: '#ff0000', // 赤色の爆発
      alpha: 1.0,
      type: 'explosion' // 爆発用パーティクル
    });
  }
}

function createLaserHitEffect(x, y) {
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10;
    const speed = 2 + Math.random() * 4;
    const size = 0.5 + Math.random() * 1.5;
    
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: size,
      color: '#ff8c00', // オレンジ色のヒットエフェクト
      alpha: 1.0,
      type: 'hit' // ヒット用パーティクル
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
// 旧のグローバル関数との互換性を保つためのラッパー関数
function draw() {
  game.draw();
}

function gameLoop() {
  game.gameLoop();
}

// DOM読み込み完了後にゲーム開始
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('Initializing game...');
    game = new Game();
    console.log('Game initialized successfully');
    
    // 後方互換性のための変数を設定
  inputManager = game.inputManager;
  balls = game.balls;
  blocks = game.blocks;
  powerUps = game.powerUps;
  activeEffects = game.activeEffects;
  effectMessages = game.effectMessages;
  particles = game.particles;
  lasers = game.lasers;
  laserCooldown = game.laserCooldown;
  laserTrails = game.laserTrails;
  paddle = game.paddle;
  
  game.gameState.current = GAME_STATES.TITLE;
  console.log('Starting game loop...');
  game.gameLoop();
  } catch (error) {
    console.error('Game initialization error:', error);
  }
}); 