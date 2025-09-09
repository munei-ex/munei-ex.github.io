// アプリケーションクラス
class PharmaFlashcardApp {
    constructor() {
        this.currentCard = null;
        this.allDrugs = []; // 全薬剤を保持
        this.drugDatabase = []; // 現在の学習対象(フィルター後)を保持
        this.studyMode = 'mixed';
        this.sessionStartTime = Date.now();
        this.sessionDuration = 10 * 60 * 1000;
        this.settings = { microLearning: true, voiceEnabled: false, autoProgress: false };
        this.stats = { todayStudied: 0, correctAnswers: 0, totalAnswers: 0, streak: 0, level: 1 };
        this.isAnswerShown = false;
    }

    async init() {
        await this.loadDrugDatabase();
        this.stats.streak = this.getStreak();
        this.populateCategoryFilter();
        this.setupEventListeners();
        this.startTimer();
        this.loadNewCard();
        this.updateStats();
        this.setupVoice();
    }

    async loadDrugDatabase() {
        try {
            const response = await fetch('drugs.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.allDrugs = await response.json();
            this.drugDatabase = [...this.allDrugs];
        } catch (error) {
            console.error("薬剤データベースの読み込みに失敗しました:", error);
            document.getElementById('drugName').textContent = "データ読込失敗";
        }
    }

    populateCategoryFilter() {
        const filter = document.getElementById('categoryFilter');
        const categories = [...new Set(this.allDrugs.map(drug => drug.category))];
        categories.sort();
        categories.forEach(category => {
            if (category) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                filter.appendChild(option);
            }
        });
    }

    setupEventListeners() {
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.studyMode = e.target.dataset.mode;
                this.loadNewCard();
            });
        });

        document.getElementById('microToggle').addEventListener('click', () => this.toggleSetting('microLearning', 'microToggle'));
        document.getElementById('voiceToggle').addEventListener('click', () => this.toggleSetting('voiceEnabled', 'voiceToggle'));
        document.getElementById('autoToggle').addEventListener('click', () => this.toggleSetting('autoProgress', 'autoToggle'));

        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterDrugs(e.target.value, document.getElementById('categoryFilter').value);
        });
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.filterDrugs(document.getElementById('searchInput').value, e.target.value);
        });
        
        document.getElementById('showAnswerBtn').addEventListener('click', () => this.showAnswer());

        document.getElementById('memoTextarea').addEventListener('input', () => {
            if (!this.currentCard) return;
            const memoKey = 'memo_' + this.currentCard.name;
            localStorage.setItem(memoKey, document.getElementById('memoTextarea').value);
        });

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    filterDrugs(searchTerm, category) {
        searchTerm = searchTerm.toLowerCase().trim();
        this.drugDatabase = this.allDrugs.filter(drug => {
            const nameMatch = drug.name.toLowerCase().includes(searchTerm);
            const categoryMatch = !category || drug.category === category;
            return nameMatch && categoryMatch;
        });
        this.loadNewCard();
    }

    toggleSetting(settingName, elementId) {
        this.settings[settingName] = !this.settings[settingName];
        document.getElementById(elementId).classList.toggle('active', this.settings[settingName]);
        
        if (settingName === 'microLearning' && this.isAnswerShown) {
            this.updateCardDisplay();
        }
    }

    startTimer() {
        const updateTimer = () => {
            const elapsed = Date.now() - this.sessionStartTime;
            const remaining = Math.max(0, this.sessionDuration - elapsed);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            
            document.getElementById('timer').textContent = `残り時間: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            const progress = ((this.sessionDuration - remaining) / this.sessionDuration) * 100;
            document.getElementById('progressBar').style.width = `${progress}%`;
            
            if (remaining > 0) {
                setTimeout(updateTimer, 1000);
            } else {
                this.showFeedback('⏰', '学習時間が終了しました！\nお疲れさまでした。', 'success');
            }
        };
        updateTimer();
    }

    // ★★★ loadNewCard関数を修正 ★★★
    loadNewCard() {
        this.currentCard = this.selectCard();
        this.updateCardDisplay();
        this.isAnswerShown = false;
        this.updateButtons();
        
        // 自動進行モードのロジックをここに集約
        if (this.settings.autoProgress && this.settings.voiceEnabled && this.currentCard) {
            // 薬剤名を読み上げ、終わったら自動で答えを表示する
            this.speak(this.currentCard.name, () => this.showAnswer());
        } else if (this.settings.voiceEnabled && this.currentCard) {
            // 通常の音声読み上げ
            this.speak(this.currentCard.name);
        }
    }
    
    selectCard() {
        let candidates = [...this.drugDatabase];
        switch (this.studyMode) {
            case 'weak':
                candidates = candidates.filter(card => this.getCardStats(card.name).accuracy < 70);
                break;
            case 'important':
                candidates = candidates.filter(card => card.importance === 'high');
                break;
            case 'quick':
                candidates = this.getRecentErrorCards();
                break;
        }
        if (candidates.length === 0) candidates = this.drugDatabase;
        return this.weightedRandomSelect(candidates);
    }

    weightedRandomSelect(cards) {
        if (!cards || cards.length === 0) return null;
        const totalWeight = cards.reduce((sum, card) => sum + (card.frequency || 50), 0);
        let random = Math.random() * totalWeight;
        for (let card of cards) {
            random -= (card.frequency || 50);
            if (random <= 0) return card;
        }
        return cards[cards.length - 1];
    }

    updateCardDisplay() {
        const drugNameEl = document.getElementById('drugName');
        const categoryTagEl = document.getElementById('categoryTag');
        const importanceBadgeEl = document.getElementById('importanceBadge');
        const detailsContainerEl = document.getElementById('drugDetails');
        const plusAlfaSectionEl = document.getElementById('plusAlfaSection');
        const memoSectionEl = document.getElementById('memoSection');

        if (!this.currentCard) {
            drugNameEl.textContent = "対象の薬剤がありません";
            categoryTagEl.textContent = "";
            importanceBadgeEl.style.display = 'none';
            detailsContainerEl.innerHTML = "";
            plusAlfaSectionEl.style.display = 'none';
            memoSectionEl.style.display = 'none';
            return;
        }

        importanceBadgeEl.style.display = 'block';
        drugNameEl.textContent = this.currentCard.name || '';
        categoryTagEl.textContent = this.currentCard.category || '';
        
        importanceBadgeEl.textContent = `重要度: ${this.getImportanceText(this.currentCard.importance)}`;
        importanceBadgeEl.className = `importance-badge badge-${this.currentCard.importance || 'medium'}`;
        
        const infoParts = [];
        const cardData = this.currentCard;
        const detailMap = {
            mechanism: '作用機序', indication: '適応症',
            sideEffects: '副作用', interactions: '相互作用'
        };
        const displayKeys = this.settings.microLearning ? ['mechanism', 'indication'] : Object.keys(detailMap);

        displayKeys.forEach(key => {
            if (cardData[key]) {
                infoParts.push(`<div class="detail-item"><div class="detail-label">${detailMap[key]}</div><div class="detail-content">${cardData[key]}</div></div>`);
            }
        });
        detailsContainerEl.innerHTML = infoParts.join('');

        document.getElementById('plusAlfaContent').textContent = cardData.plusAlfa || '';
        plusAlfaSectionEl.style.display = 'none';
        
        const memoKey = 'memo_' + cardData.name;
        document.getElementById('memoTextarea').value = localStorage.getItem(memoKey) || '';
        memoSectionEl.style.display = 'none';
        
        detailsContainerEl.classList.remove('show');
    }

    showAnswer() {
        if (!this.currentCard || this.isAnswerShown) return; // 既に表示済みの場合は何もしない
        document.getElementById('drugDetails').classList.add('show');
        this.isAnswerShown = true;
        this.updateButtons();

        if (this.currentCard.plusAlfa) document.getElementById('plusAlfaSection').style.display = 'block';
        document.getElementById('memoSection').style.display = 'block';
        
        // ★★★ 自動進行ロジックを修正 ★★★
        const nextAction = () => this.answerCard('good');
        
        if (this.settings.autoProgress) {
            if (this.settings.voiceEnabled && this.currentCard.mechanism) {
                // 音声が有効なら、読み上げ完了後に次のカードへ
                this.speak(this.currentCard.mechanism, nextAction);
            } else {
                // 音声が無効なら、2.5秒後に次のカードへ
                setTimeout(nextAction, 2500);
            }
        } else if (this.settings.voiceEnabled) {
            // 通常の答え読み上げ
            this.speak(this.currentCard.mechanism);
        }
    }
    
    updateButtons() {
        document.getElementById('initialButtons').style.display = this.isAnswerShown ? 'none' : 'flex';
        document.getElementById('answerButtons').style.display = this.isAnswerShown ? 'flex' : 'none';
    }

    answerCard(difficulty) {
        if (!this.currentCard) return;
        
        const isCorrect = difficulty === 'easy' || difficulty === 'good';
        
        this.updateCardStats(this.currentCard.name, isCorrect);
        this.updateSessionStats(isCorrect);
        this.processSRS(this.currentCard.name, difficulty);
        
        setTimeout(() => {
            this.loadNewCard();
            this.updateStats();
        }, 300);
    }

    showFeedback(icon, message) {
        const container = document.getElementById('feedbackContainer');
        document.getElementById('feedbackIcon').textContent = icon;
        document.getElementById('feedbackMessage').textContent = message;
        container.classList.add('show');
        setTimeout(() => container.classList.remove('show'), 2000);
    }

    updateSessionStats(isCorrect) {
        this.stats.todayStudied++;
        this.stats.totalAnswers++;
        if (isCorrect) this.stats.correctAnswers++;
        this.stats.level = Math.floor(this.stats.todayStudied / 10) + 1;
    }

    updateCardStats(drugName, isCorrect) {
        const stats = this.getCardStats(drugName);
        stats.attempts++;
        stats.lastStudied = Date.now();
        if (isCorrect) {
            stats.correct++;
            stats.consecutiveCorrect++;
        } else {
            stats.consecutiveCorrect = 0;
            this.addToRecentErrors(drugName);
        }
        stats.accuracy = Math.round((stats.correct / stats.attempts) * 100);
        this.saveCardStats(drugName, stats);
    }

    getCardStats(drugName) {
        try {
            const saved = localStorage.getItem(`cardStats_${drugName}`);
            return saved ? JSON.parse(saved) : { attempts: 0, correct: 0, accuracy: 0, lastStudied: null, consecutiveCorrect: 0, nextReview: null };
        } catch (e) {
            return { attempts: 0, correct: 0, accuracy: 0, lastStudied: null, consecutiveCorrect: 0, nextReview: null };
        }
    }

    saveCardStats(drugName, stats) {
        try { localStorage.setItem(`cardStats_${drugName}`, JSON.stringify(stats)); } catch (e) { /* LocalStorage disabled */ }
    }

    processSRS(drugName, difficulty) {
        const intervals = { again: 1, hard: 6, good: 1440, easy: 5760 };
        const stats = this.getCardStats(drugName);
        const intervalMinutes = intervals[difficulty] || intervals.good;
        stats.nextReview = Date.now() + (intervalMinutes * 60 * 1000);
        this.saveCardStats(drugName, stats);
    }

    addToRecentErrors(drugName) {
        let errors = this.getRecentErrorCards(true);
        errors = errors.filter(name => name !== drugName);
        errors.unshift(drugName);
        try { localStorage.setItem('recentErrors', JSON.stringify(errors.slice(0, 10))); } catch (e) { /* LocalStorage disabled */ }
    }

    getRecentErrorCards(getNamesOnly = false) {
        try {
            const errorNames = JSON.parse(localStorage.getItem('recentErrors') || '[]');
            return getNamesOnly ? errorNames : this.drugDatabase.filter(drug => errorNames.includes(drug.name));
        } catch (e) { return []; }
    }

    updateStats() {
        document.getElementById('totalStudied').textContent = this.stats.todayStudied;
        document.getElementById('level').textContent = this.stats.level;
        const accuracy = this.stats.totalAnswers > 0 ? Math.round((this.stats.correctAnswers / this.stats.totalAnswers) * 100) : 0;
        document.getElementById('accuracy').textContent = `${accuracy}%`;
        document.getElementById('streak').textContent = this.stats.streak;
    }

    getStreak() {
        try {
            const lastStudyDate = localStorage.getItem('lastStudyDate');
            let streak = parseInt(localStorage.getItem('studyStreak') || '0');
            const today = new Date().toDateString();
            if (lastStudyDate !== today) {
                if (this.isYesterday(lastStudyDate)) streak++; else streak = 1;
                localStorage.setItem('studyStreak', streak.toString());
                localStorage.setItem('lastStudyDate', today);
            }
            return streak;
        } catch (e) { return 1; }
    }

    isYesterday(dateString) {
        if (!dateString) return false;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toDateString() === dateString;
    }

    setupVoice() {
        if ('speechSynthesis' in window) {
            this.speechSynthesis = window.speechSynthesis;
            this.speechUtterance = new SpeechSynthesisUtterance();
            this.speechUtterance.lang = 'ja-JP';
            this.speechUtterance.rate = 0.9;
            this.speechUtterance.pitch = 1;
        }
    }

    speak(text, onEndCallback = null) {
        if (this.settings.voiceEnabled && this.speechSynthesis && text) {
            this.speechSynthesis.cancel();
            this.speechUtterance.text = text;
            
            this.speechUtterance.onend = () => {
                if (onEndCallback) onEndCallback();
                this.speechUtterance.onend = null; 
            };
            
            this.speechSynthesis.speak(this.speechUtterance);
        } else {
            if(onEndCallback) {
                // 音声が無効でもコールバックは即時実行
                onEndCallback();
            }
        }
    }

    handleKeyboard(e) {
        if (e.code === 'Space' && !this.isAnswerShown) {
            e.preventDefault();
            this.showAnswer();
        } else if (this.isAnswerShown) {
            const keyMap = {
                'Digit1': 'again', 'Numpad1': 'again',
                'Digit2': 'hard',  'Numpad2': 'hard',
                'Digit3': 'good',  'Numpad3': 'good',
                'Digit4': 'easy',  'Numpad4': 'easy'
            };
            if (keyMap[e.code]) {
                e.preventDefault();
                this.answerCard(keyMap[e.code]);
            }
        }
    }

    getImportanceText(importance) {
        const texts = { high: '高', medium: '中', low: '低' };
        return texts[importance] || '不明';
    }
}

let app;
function answerCard(difficulty) { if (app) app.answerCard(difficulty); }
document.addEventListener('DOMContentLoaded', async () => {
    app = new PharmaFlashcardApp();
    await app.init();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => console.log('Service Worker registration failed'));
    });
}