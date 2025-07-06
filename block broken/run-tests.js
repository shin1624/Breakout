#!/usr/bin/env node

/**
 * ブロック崩しゲーム - 自動テストスクリプト
 * 
 * 使用方法:
 * node run-tests.js
 */

const fs = require('fs');
const path = require('path');

// テスト結果の色付き出力
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'green' : 'red';
  log(`${status} ${testName}${message ? ': ' + message : ''}`, color);
}

// テストスイート
class GameTestSuite {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.total = 0;
  }

  // ファイル存在テスト
  testFileExists() {
    log('\n📁 ファイル存在テスト', 'cyan');
    
    const requiredFiles = [
      'index.html',
      'style.css', 
      'game.js',
      'README.md'
    ];

    requiredFiles.forEach(file => {
      const exists = fs.existsSync(path.join(__dirname, file));
      logTest(`ファイル存在: ${file}`, exists);
      if (exists) this.passed++;
      else this.failed++;
      this.total++;
    });
  }

  // ファイル内容テスト
  testFileContents() {
    log('\n📄 ファイル内容テスト', 'cyan');
    
    try {
      // HTMLファイルテスト
      const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      const htmlHasCanvas = htmlContent.includes('<canvas');
      const hasGameScript = htmlContent.includes('game.js');
      const htmlHasTitle = htmlContent.includes('新型ブロック崩し');
      
      logTest('HTML: Canvas要素存在', htmlHasCanvas);
      if (htmlHasCanvas) this.passed++; else this.failed++; this.total++;
      
      logTest('HTML: ゲームスクリプト読み込み', hasGameScript);
      if (hasGameScript) this.passed++; else this.failed++; this.total++;
      
      logTest('HTML: タイトル設定', htmlHasTitle);
      if (htmlHasTitle) this.passed++; else this.failed++; this.total++;

      // CSSファイルテスト
      const cssContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
      const hasCanvasStyle = cssContent.includes('#gameCanvas');
      const hasBodyStyle = cssContent.includes('body');
      
      logTest('CSS: Canvasスタイル定義', hasCanvasStyle);
      if (hasCanvasStyle) this.passed++; else this.failed++; this.total++;
      
      logTest('CSS: Bodyスタイル定義', hasBodyStyle);
      if (hasBodyStyle) this.passed++; else this.failed++; this.total++;

      // JavaScriptファイルテスト
      const jsContent = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
      const jsHasCanvas = jsContent.includes('getElementById(\'gameCanvas\')');
      const hasGameLoop = jsContent.includes('function gameLoop');
      const hasPowerUps = jsContent.includes('powerUps');
      const hasParticles = jsContent.includes('particles');
      const hasAnimations = jsContent.includes('animationFrame');
      
      logTest('JS: Canvas取得処理', jsHasCanvas);
      if (jsHasCanvas) this.passed++; else this.failed++; this.total++;
      
      logTest('JS: ゲームループ関数', hasGameLoop);
      if (hasGameLoop) this.passed++; else this.failed++; this.total++;
      
      logTest('JS: パワーアップシステム', hasPowerUps);
      if (hasPowerUps) this.passed++; else this.failed++; this.total++;
      
      logTest('JS: パーティクルシステム', hasParticles);
      if (hasParticles) this.passed++; else this.failed++; this.total++;
      
      logTest('JS: アニメーション機能', hasAnimations);
      if (hasAnimations) this.passed++; else this.failed++; this.total++;

      // READMEファイルテスト
      const readmeContent = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
      const readmeHasTitle = readmeContent.includes('# 新型ブロック崩し');
      const hasFeatures = readmeContent.includes('## 特徴');
      const hasUsage = readmeContent.includes('## 遊び方');
      
      logTest('README: タイトル存在', readmeHasTitle);
      if (readmeHasTitle) this.passed++; else this.failed++; this.total++;
      
      logTest('README: 特徴セクション', hasFeatures);
      if (hasFeatures) this.passed++; else this.failed++; this.total++;
      
      logTest('README: 遊び方セクション', hasUsage);
      if (hasUsage) this.passed++; else this.failed++; this.total++;

    } catch (error) {
      logTest('ファイル読み込み', false, error.message);
      this.failed++;
      this.total++;
    }
  }

  // コード品質テスト
  testCodeQuality() {
    log('\n🔍 コード品質テスト', 'cyan');
    
    try {
      const jsContent = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
      
      // 関数定義テスト
      const functions = [
        'function draw',
        'function update',
        'function resetGame',
        'function generateStage',
        'function spawnPowerUp',
        'function applyPowerUp',
        'function createParticleExplosion'
      ];
      
      functions.forEach(func => {
        const exists = jsContent.includes(func);
        logTest(`関数定義: ${func}`, exists);
        if (exists) this.passed++; else this.failed++; this.total++;
      });

      // 変数定義テスト
      const variables = [
        'const canvas',
        'const ctx',
        'const WIDTH',
        'const HEIGHT',
        'let gameState',
        'let score',
        'let blocks',
        'let powerUps',
        'let particles'
      ];
      
      variables.forEach(variable => {
        const exists = jsContent.includes(variable);
        logTest(`変数定義: ${variable}`, exists);
        if (exists) this.passed++; else this.failed++; this.total++;
      });

      // エラーハンドリングテスト
      const hasErrorHandling = jsContent.includes('try') || jsContent.includes('catch');
      logTest('エラーハンドリング', hasErrorHandling);
      if (hasErrorHandling) this.passed++; else this.failed++; this.total++;

      // コメントテスト
      const commentLines = jsContent.split('\n').filter(line => 
        line.trim().startsWith('//') || line.trim().startsWith('/*')
      ).length;
      const hasComments = commentLines > 5;
      logTest('コードコメント', hasComments, `${commentLines}行のコメント`);
      if (hasComments) this.passed++; else this.failed++; this.total++;

    } catch (error) {
      logTest('コード品質チェック', false, error.message);
      this.failed++;
      this.total++;
    }
  }

  // パフォーマンステスト
  testPerformance() {
    log('\n⚡ パフォーマンステスト', 'cyan');
    
    try {
      const jsContent = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
      
      // ファイルサイズテスト
      const fileSize = fs.statSync(path.join(__dirname, 'game.js')).size;
      const sizeKB = (fileSize / 1024).toFixed(2);
      const isReasonableSize = fileSize < 50000; // 50KB以下
      
      logTest('ファイルサイズ', isReasonableSize, `${sizeKB}KB`);
      if (isReasonableSize) this.passed++; else this.failed++; this.total++;

      // 関数の複雑度テスト
      const lines = jsContent.split('\n').length;
      const isReasonableLength = lines < 1000;
      
      logTest('コード行数', isReasonableLength, `${lines}行`);
      if (isReasonableLength) this.passed++; else this.failed++; this.total++;

      // メモリリーク対策テスト
      const hasCleanup = jsContent.includes('splice') || jsContent.includes('filter');
      logTest('メモリリーク対策', hasCleanup);
      if (hasCleanup) this.passed++; else this.failed++; this.total++;

    } catch (error) {
      logTest('パフォーマンスチェック', false, error.message);
      this.failed++;
      this.total++;
    }
  }

  // セキュリティテスト
  testSecurity() {
    log('\n🔒 セキュリティテスト', 'cyan');
    
    try {
      const jsContent = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
      
      // 危険な関数の使用チェック
      const dangerousFunctions = ['eval', 'innerHTML', 'document.write'];
      let hasDangerousCode = false;
      
      dangerousFunctions.forEach(func => {
        if (jsContent.includes(func)) {
          hasDangerousCode = true;
        }
      });
      
      logTest('危険なコードの使用', !hasDangerousCode);
      if (!hasDangerousCode) this.passed++; else this.failed++; this.total++;

      // XSS対策テスト
      const hasXSSVulnerability = jsContent.includes('innerHTML') || jsContent.includes('document.write');
      logTest('XSS脆弱性', !hasXSSVulnerability);
      if (!hasXSSVulnerability) this.passed++; else this.failed++; this.total++;

    } catch (error) {
      logTest('セキュリティチェック', false, error.message);
      this.failed++;
      this.total++;
    }
  }

  // 結果表示
  showResults() {
    log('\n📊 テスト結果サマリー', 'bright');
    log('=' * 50, 'cyan');
    
    log(`総テスト数: ${this.total}`, 'blue');
    log(`成功: ${this.passed}`, 'green');
    log(`失敗: ${this.failed}`, 'red');
    
    const successRate = ((this.passed / this.total) * 100).toFixed(1);
    log(`成功率: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
    
    if (this.failed === 0) {
      log('\n🎉 すべてのテストが成功しました！', 'green');
    } else {
      log('\n⚠️ いくつかのテストが失敗しました。', 'yellow');
    }
    
    log('=' * 50, 'cyan');
  }

  // 全テスト実行
  runAllTests() {
    log('🚀 ブロック崩しゲーム - 自動テスト開始', 'bright');
    log('=' * 50, 'cyan');
    
    this.testFileExists();
    this.testFileContents();
    this.testCodeQuality();
    this.testPerformance();
    this.testSecurity();
    
    this.showResults();
  }
}

// テスト実行
if (require.main === module) {
  const testSuite = new GameTestSuite();
  testSuite.runAllTests();
}

module.exports = GameTestSuite; 