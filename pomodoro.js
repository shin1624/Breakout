// ポモドーロタイマー JavaScript

class PomodoroTimer {
    constructor() {
        // タイマーの状態
        this.isRunning = false;
        this.isPaused = false;
        this.timeLeft = 0;
        this.currentSession = 'work'; // 'work', 'break', 'longBreak'
        this.sessionCount = 0;
        this.totalTime = 0;
        this.intervalId = null;
        
        // DOM要素
        this.timeDisplay = document.getElementById('time-display');
        this.sessionTypeDisplay = document.getElementById('session-type');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.sessionCountDisplay = document.getElementById('session-count');
        this.progressFill = document.getElementById('progress-fill');
        this.notificationSound = document.getElementById('notification-sound');
        
        // 設定入力
        this.workDurationInput = document.getElementById('work-duration');
        this.breakDurationInput = document.getElementById('break-duration');
        this.longBreakDurationInput = document.getElementById('long-break-duration');
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // 初期化
        this.init();
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        // 設定変更時のリスナー
        this.workDurationInput.addEventListener('change', () => {
            if (!this.isRunning) {
                this.init();
            }
        });
        
        this.breakDurationInput.addEventListener('change', () => {
            if (!this.isRunning && this.currentSession === 'break') {
                this.init();
            }
        });
        
        this.longBreakDurationInput.addEventListener('change', () => {
            if (!this.isRunning && this.currentSession === 'longBreak') {
                this.init();
            }
        });
    }
    
    init() {
        // 現在のセッションに応じて初期時間を設定
        switch (this.currentSession) {
            case 'work':
                this.timeLeft = this.workDurationInput.value * 60;
                this.sessionTypeDisplay.textContent = '作業時間';
                break;
            case 'break':
                this.timeLeft = this.breakDurationInput.value * 60;
                this.sessionTypeDisplay.textContent = '休憩時間';
                break;
            case 'longBreak':
                this.timeLeft = this.longBreakDurationInput.value * 60;
                this.sessionTypeDisplay.textContent = '長い休憩時間';
                break;
        }
        
        this.totalTime = this.timeLeft;
        this.updateDisplay();
        this.updateProgress();
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.disableInputs(true);
            document.querySelector('.container').classList.add('timer-active');
            
            this.intervalId = setInterval(() => this.tick(), 1000);
        }
    }
    
    pause() {
        if (this.isRunning && !this.isPaused) {
            // 一時停止
            this.isPaused = true;
            clearInterval(this.intervalId);
            this.pauseBtn.textContent = '再開';
            document.querySelector('.container').classList.remove('timer-active');
        } else if (this.isRunning && this.isPaused) {
            // 再開
            this.isPaused = false;
            this.pauseBtn.textContent = '一時停止';
            document.querySelector('.container').classList.add('timer-active');
            this.intervalId = setInterval(() => this.tick(), 1000);
        }
    }
    
    reset() {
        clearInterval(this.intervalId);
        this.isRunning = false;
        this.isPaused = false;
        this.currentSession = 'work';
        this.sessionCount = 0;
        
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.pauseBtn.textContent = '一時停止';
        this.disableInputs(false);
        document.querySelector('.container').classList.remove('timer-active');
        
        this.sessionCountDisplay.textContent = this.sessionCount;
        this.init();
    }
    
    tick() {
        this.timeLeft--;
        this.updateDisplay();
        this.updateProgress();
        
        if (this.timeLeft <= 0) {
            this.completeSession();
        }
    }
    
    completeSession() {
        clearInterval(this.intervalId);
        this.playNotification();
        
        if (this.currentSession === 'work') {
            this.sessionCount++;
            this.sessionCountDisplay.textContent = this.sessionCount;
            
            // 4セッション完了したら長い休憩
            if (this.sessionCount % 4 === 0) {
                this.currentSession = 'longBreak';
                alert('お疲れ様でした！長い休憩を取りましょう。');
            } else {
                this.currentSession = 'break';
                alert('作業時間が終了しました！休憩しましょう。');
            }
        } else {
            this.currentSession = 'work';
            alert('休憩時間が終了しました！作業を再開しましょう。');
        }
        
        this.isRunning = false;
        this.isPaused = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.pauseBtn.textContent = '一時停止';
        this.disableInputs(false);
        document.querySelector('.container').classList.remove('timer-active');
        
        this.init();
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // タイトルにも表示
        document.title = `${this.timeDisplay.textContent} - ポモドーロタイマー`;
    }
    
    updateProgress() {
        const progress = ((this.totalTime - this.timeLeft) / this.totalTime) * 100;
        this.progressFill.style.width = `${progress}%`;
    }
    
    playNotification() {
        // 音声ファイルが存在しない場合のフォールバック
        try {
            this.notificationSound.play().catch(() => {
                // ブラウザの音声再生ポリシーによりエラーが発生する可能性があるため
                console.log('音声の再生に失敗しました');
            });
        } catch (e) {
            console.log('音声ファイルが見つかりません');
        }
        
        // ブラウザ通知（許可が必要）
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('ポモドーロタイマー', {
                body: this.currentSession === 'work' ? '作業時間が終了しました！' : '休憩時間が終了しました！',
                icon: '/favicon.ico'
            });
        }
    }
    
    disableInputs(disabled) {
        this.workDurationInput.disabled = disabled;
        this.breakDurationInput.disabled = disabled;
        this.longBreakDurationInput.disabled = disabled;
    }
}

// 通知の許可を要求
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// DOMContentLoadedイベントでタイマーを初期化
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});