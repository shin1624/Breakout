// ポモドーロタイマー テストスイート

class PomodoroTimerTest {
    constructor() {
        this.testResults = [];
        this.timer = null;
    }
    
    async runAllTests() {
        console.log('🧪 ポモドーロタイマーのテストを開始します...\n');
        
        // テストの実行
        await this.testInitialization();
        await this.testStartFunction();
        await this.testPauseFunction();
        await this.testResetFunction();
        await this.testTimerTick();
        await this.testSessionCompletion();
        await this.testSettingsChange();
        await this.testUIUpdates();
        
        // 結果の表示
        this.displayResults();
    }
    
    async testInitialization() {
        console.log('📋 Test 1: 初期化のテスト');
        try {
            // タイマーの新規作成
            this.timer = new PomodoroTimer();
            
            // 初期状態の確認
            this.assert(this.timer.isRunning === false, '初期状態でタイマーは停止している');
            this.assert(this.timer.isPaused === false, '初期状態で一時停止ではない');
            this.assert(this.timer.currentSession === 'work', '初期セッションは作業時間');
            this.assert(this.timer.sessionCount === 0, 'セッション数は0');
            this.assert(this.timer.timeLeft === 25 * 60, '初期時間は25分（1500秒）');
            
            // DOM要素の確認
            this.assert(this.timer.timeDisplay.textContent === '25:00', 'タイマー表示が25:00');
            this.assert(this.timer.startBtn.disabled === false, '開始ボタンは有効');
            this.assert(this.timer.pauseBtn.disabled === true, '一時停止ボタンは無効');
            
            this.testResults.push({ test: '初期化', passed: true });
            console.log('✅ 初期化のテスト: 成功\n');
        } catch (error) {
            this.testResults.push({ test: '初期化', passed: false, error: error.message });
            console.error('❌ 初期化のテスト: 失敗', error.message, '\n');
        }
    }
    
    async testStartFunction() {
        console.log('📋 Test 2: 開始機能のテスト');
        try {
            // タイマーを開始
            this.timer.start();
            
            // 状態の確認
            this.assert(this.timer.isRunning === true, 'タイマーが実行中');
            this.assert(this.timer.isPaused === false, '一時停止状態ではない');
            this.assert(this.timer.startBtn.disabled === true, '開始ボタンが無効化');
            this.assert(this.timer.pauseBtn.disabled === false, '一時停止ボタンが有効化');
            this.assert(this.timer.intervalId !== null, 'インターバルIDが設定されている');
            
            // UIクラスの確認
            const container = document.querySelector('.container');
            this.assert(container.classList.contains('timer-active'), 'timer-activeクラスが追加されている');
            
            // タイマーを停止（次のテストのため）
            clearInterval(this.timer.intervalId);
            
            this.testResults.push({ test: '開始機能', passed: true });
            console.log('✅ 開始機能のテスト: 成功\n');
        } catch (error) {
            this.testResults.push({ test: '開始機能', passed: false, error: error.message });
            console.error('❌ 開始機能のテスト: 失敗', error.message, '\n');
        }
    }
    
    async testPauseFunction() {
        console.log('📋 Test 3: 一時停止機能のテスト');
        try {
            // タイマーをリセットして開始
            this.timer.reset();
            this.timer.start();
            
            // 一時停止
            this.timer.pause();
            this.assert(this.timer.isPaused === true, '一時停止状態になっている');
            this.assert(this.timer.pauseBtn.textContent === '再開', 'ボタンテキストが「再開」に変更');
            
            const container = document.querySelector('.container');
            this.assert(!container.classList.contains('timer-active'), 'timer-activeクラスが削除されている');
            
            // 再開
            this.timer.pause();
            this.assert(this.timer.isPaused === false, '一時停止が解除されている');
            this.assert(this.timer.pauseBtn.textContent === '一時停止', 'ボタンテキストが「一時停止」に戻る');
            this.assert(container.classList.contains('timer-active'), 'timer-activeクラスが再度追加されている');
            
            // クリーンアップ
            clearInterval(this.timer.intervalId);
            
            this.testResults.push({ test: '一時停止機能', passed: true });
            console.log('✅ 一時停止機能のテスト: 成功\n');
        } catch (error) {
            this.testResults.push({ test: '一時停止機能', passed: false, error: error.message });
            console.error('❌ 一時停止機能のテスト: 失敗', error.message, '\n');
        }
    }
    
    async testResetFunction() {
        console.log('📋 Test 4: リセット機能のテスト');
        try {
            // タイマーを開始してから時間を進める
            this.timer.reset();
            this.timer.start();
            this.timer.timeLeft = 1000; // 時間を変更
            this.timer.sessionCount = 3; // セッション数を変更
            
            // リセット
            this.timer.reset();
            
            // 状態の確認
            this.assert(this.timer.isRunning === false, 'タイマーが停止している');
            this.assert(this.timer.isPaused === false, '一時停止状態が解除されている');
            this.assert(this.timer.currentSession === 'work', 'セッションが作業時間にリセット');
            this.assert(this.timer.sessionCount === 0, 'セッション数が0にリセット');
            this.assert(this.timer.timeLeft === 25 * 60, '時間が初期値にリセット');
            this.assert(this.timer.startBtn.disabled === false, '開始ボタンが有効化');
            this.assert(this.timer.pauseBtn.disabled === true, '一時停止ボタンが無効化');
            
            this.testResults.push({ test: 'リセット機能', passed: true });
            console.log('✅ リセット機能のテスト: 成功\n');
        } catch (error) {
            this.testResults.push({ test: 'リセット機能', passed: false, error: error.message });
            console.error('❌ リセット機能のテスト: 失敗', error.message, '\n');
        }
    }
    
    async testTimerTick() {
        console.log('📋 Test 5: タイマーカウントダウンのテスト');
        try {
            this.timer.reset();
            const initialTime = this.timer.timeLeft;
            
            // tick関数を手動で実行
            this.timer.tick();
            this.assert(this.timer.timeLeft === initialTime - 1, '時間が1秒減少');
            
            // 表示の更新確認
            const minutes = Math.floor(this.timer.timeLeft / 60);
            const seconds = this.timer.timeLeft % 60;
            const expectedDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            this.assert(this.timer.timeDisplay.textContent === expectedDisplay, '表示が正しく更新されている');
            
            // プログレスバーの更新確認
            const expectedProgress = ((this.timer.totalTime - this.timer.timeLeft) / this.timer.totalTime) * 100;
            const actualProgress = parseFloat(this.timer.progressFill.style.width);
            this.assert(Math.abs(actualProgress - expectedProgress) < 0.1, 'プログレスバーが正しく更新されている');
            
            this.testResults.push({ test: 'タイマーカウントダウン', passed: true });
            console.log('✅ タイマーカウントダウンのテスト: 成功\n');
        } catch (error) {
            this.testResults.push({ test: 'タイマーカウントダウン', passed: false, error: error.message });
            console.error('❌ タイマーカウントダウンのテスト: 失敗', error.message, '\n');
        }
    }
    
    async testSessionCompletion() {
        console.log('📋 Test 6: セッション完了のテスト');
        try {
            // アラートをモック
            const originalAlert = window.alert;
            let alertMessage = '';
            window.alert = (msg) => { alertMessage = msg; };
            
            // 作業セッションの完了
            this.timer.reset();
            this.timer.currentSession = 'work';
            this.timer.timeLeft = 0;
            this.timer.completeSession();
            
            this.assert(this.timer.sessionCount === 1, 'セッション数が増加');
            this.assert(this.timer.currentSession === 'break', '休憩時間に切り替わる');
            this.assert(alertMessage.includes('休憩'), '休憩のアラートが表示される');
            
            // 4セッション目の完了（長い休憩）
            this.timer.sessionCount = 3;
            this.timer.currentSession = 'work';
            this.timer.timeLeft = 0;
            this.timer.completeSession();
            
            this.assert(this.timer.sessionCount === 4, 'セッション数が4');
            this.assert(this.timer.currentSession === 'longBreak', '長い休憩に切り替わる');
            this.assert(alertMessage.includes('長い休憩'), '長い休憩のアラートが表示される');
            
            // アラートを元に戻す
            window.alert = originalAlert;
            
            this.testResults.push({ test: 'セッション完了', passed: true });
            console.log('✅ セッション完了のテスト: 成功\n');
        } catch (error) {
            this.testResults.push({ test: 'セッション完了', passed: false, error: error.message });
            console.error('❌ セッション完了のテスト: 失敗', error.message, '\n');
        }
    }
    
    async testSettingsChange() {
        console.log('📋 Test 7: 設定変更のテスト');
        try {
            this.timer.reset();
            
            // 作業時間の設定変更
            this.timer.workDurationInput.value = 30;
            this.timer.workDurationInput.dispatchEvent(new Event('change'));
            
            this.assert(this.timer.timeLeft === 30 * 60, '作業時間が30分に変更');
            this.assert(this.timer.timeDisplay.textContent === '30:00', '表示が30:00に更新');
            
            // タイマー実行中は設定変更が無効
            this.timer.start();
            this.timer.workDurationInput.value = 20;
            this.timer.workDurationInput.dispatchEvent(new Event('change'));
            
            this.assert(this.timer.timeLeft !== 20 * 60, 'タイマー実行中は設定変更が無効');
            
            // クリーンアップ
            clearInterval(this.timer.intervalId);
            this.timer.reset();
            this.timer.workDurationInput.value = 25; // デフォルトに戻す
            
            this.testResults.push({ test: '設定変更', passed: true });
            console.log('✅ 設定変更のテスト: 成功\n');
        } catch (error) {
            this.testResults.push({ test: '設定変更', passed: false, error: error.message });
            console.error('❌ 設定変更のテスト: 失敗', error.message, '\n');
        }
    }
    
    async testUIUpdates() {
        console.log('📋 Test 8: UI更新のテスト');
        try {
            this.timer.reset();
            
            // タイトルの更新
            this.timer.updateDisplay();
            this.assert(document.title.includes('25:00'), 'ページタイトルにタイマーが表示される');
            
            // プログレスバーの初期状態
            this.timer.updateProgress();
            this.assert(this.timer.progressFill.style.width === '0%', 'プログレスバーが0%');
            
            // プログレスバーの中間状態
            this.timer.timeLeft = this.timer.totalTime / 2;
            this.timer.updateProgress();
            const progress = parseFloat(this.timer.progressFill.style.width);
            this.assert(Math.abs(progress - 50) < 0.1, 'プログレスバーが約50%');
            
            // 入力フィールドの無効化
            this.timer.disableInputs(true);
            this.assert(this.timer.workDurationInput.disabled === true, '作業時間入力が無効化');
            this.assert(this.timer.breakDurationInput.disabled === true, '休憩時間入力が無効化');
            this.assert(this.timer.longBreakDurationInput.disabled === true, '長い休憩時間入力が無効化');
            
            this.timer.disableInputs(false);
            this.assert(this.timer.workDurationInput.disabled === false, '作業時間入力が有効化');
            
            this.testResults.push({ test: 'UI更新', passed: true });
            console.log('✅ UI更新のテスト: 成功\n');
        } catch (error) {
            this.testResults.push({ test: 'UI更新', passed: false, error: error.message });
            console.error('❌ UI更新のテスト: 失敗', error.message, '\n');
        }
    }
    
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }
    
    displayResults() {
        console.log('\n📊 テスト結果サマリー:');
        console.log('='.repeat(50));
        
        let passedCount = 0;
        let failedCount = 0;
        
        this.testResults.forEach(result => {
            if (result.passed) {
                console.log(`✅ ${result.test}: 成功`);
                passedCount++;
            } else {
                console.log(`❌ ${result.test}: 失敗 - ${result.error}`);
                failedCount++;
            }
        });
        
        console.log('='.repeat(50));
        console.log(`合計: ${this.testResults.length} テスト`);
        console.log(`成功: ${passedCount} テスト`);
        console.log(`失敗: ${failedCount} テスト`);
        console.log(`成功率: ${((passedCount / this.testResults.length) * 100).toFixed(1)}%`);
        
        if (failedCount === 0) {
            console.log('\n🎉 すべてのテストが成功しました！');
        } else {
            console.log('\n⚠️ 一部のテストが失敗しました。');
        }
    }
}

// テストの実行
console.log('ポモドーロタイマーのテストを実行するには、以下のコマンドを実行してください:');
console.log('const test = new PomodoroTimerTest(); test.runAllTests();');