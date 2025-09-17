// 薬剤追加モーダルの表示・登録ロジック
document.addEventListener('DOMContentLoaded', () => {
    const addDrugBtn = document.getElementById('addDrugBtn');
    const addDrugModal = document.getElementById('addDrugModal');
    const addDrugClose = document.getElementById('addDrugClose');
    const addDrugForm = document.getElementById('addDrugForm');
    if (addDrugBtn && addDrugModal && addDrugClose && addDrugForm) {
        addDrugBtn.addEventListener('click', () => {
            addDrugModal.style.display = 'flex';
        });
        addDrugClose.addEventListener('click', () => {
            addDrugModal.style.display = 'none';
        });
        addDrugModal.addEventListener('click', (e) => {
            if (e.target === addDrugModal) addDrugModal.style.display = 'none';
        });
        addDrugForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('addDrugName').value.trim();
            const category = document.getElementById('addDrugCategory').value.trim() || '未分類';
            const importance = document.getElementById('addDrugImportance').value;
            const mechanism = document.getElementById('addDrugMechanism').value.trim();
            if (!name) return;
            // 既存薬剤と重複チェック
            let drugs = JSON.parse(localStorage.getItem('userDrugs') || '[]');
            if (drugs.some(d => d.name === name)) {
                alert('同名の薬剤が既に追加されています');
                return;
            }
            const newDrug = {
                name,
                category,
                importance,
                mechanism: mechanism || '（作用機序未入力）'
            };
            drugs.push(newDrug);
            localStorage.setItem('userDrugs', JSON.stringify(drugs));
            // 画面にも即時反映
            if (window.app) {
                window.app.allDrugs.push(newDrug);
                window.app.drugDatabase.push(newDrug);
                window.app.loadNewCard();
            }
            addDrugModal.style.display = 'none';
            addDrugForm.reset();
        });
    }
});
// 使い方モーダルの表示制御
document.addEventListener('DOMContentLoaded', () => {
    const howToBtn = document.getElementById('howToBtn');
    const howToModal = document.getElementById('howToModal');
    const howToClose = document.getElementById('howToClose');
    if (howToBtn && howToModal && howToClose) {
        howToBtn.addEventListener('click', () => {
            howToModal.style.display = 'flex';
        });
        howToClose.addEventListener('click', () => {
            howToModal.style.display = 'none';
        });
        howToModal.addEventListener('click', (e) => {
            if (e.target === howToModal) howToModal.style.display = 'none';
        });
    }
});
    // 分野ごとの正答率を集計し、苦手TOP3分野を返す
    function getWeakCategories(topN = 3) {
        // カテゴリごとに正答数・試行数を集計
        const categoryStats = {};
        for (const card of this.allDrugs) {
            const cat = card.category || '未分類';
            if (!categoryStats[cat]) categoryStats[cat] = { correct: 0, attempts: 0 };
            const stats = this.getCardStats(card.name);
            categoryStats[cat].correct += stats.correct || 0;
            categoryStats[cat].attempts += stats.attempts || 0;
        }
        // 正答率を計算
        const categoryRates = Object.entries(categoryStats).map(([cat, s]) => ({
            category: cat,
            accuracy: s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : 0,
            attempts: s.attempts
        }));
        // 試行数が一定以上のカテゴリのみを対象にし、正答率昇順でソート
        const filtered = categoryRates.filter(c => c.attempts >= 3);
        filtered.sort((a, b) => a.accuracy - b.accuracy);
        return filtered.slice(0, topN);
    }
// アプリケーションクラス
class PharmaFlashcardApp {
    // カードを1枚選んで表示する（最低限の実装）
    loadNewCard() {
        this.currentCard = this.selectCard();
        this.updateCardDisplay();
    }
    // セッションタイマーのダミー実装（必要に応じて本実装可）
    // app.js の startTimer 関数を丸ごと書き換え

startTimer() {
    // 既にタイマーが動いていたら一度停止する
    if (this.timerInterval) {
        clearInterval(this.timerInterval);
    }
    
    // 開始時刻を現在時刻にリセット
    this.sessionStartTime = Date.now();

    // 1秒ごとに実行する処理を開始
    this.timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - this.sessionStartTime; // 経過時間
        const remainingTime = this.sessionDuration - elapsedTime; // 残り時間

        // 残り時間が0になったらタイマーを停止
        if (remainingTime <= 0) {
            clearInterval(this.timerInterval);
            document.getElementById('timer').textContent = "⏰ 時間です！";
            document.getElementById('progressBar').style.width = '100%';
            // 時間切れになったらカード操作をできなくするなどの処理も追加可能
            return;
        }

        // プログレスバーの幅を更新
        const progressPercentage = (elapsedTime / this.sessionDuration) * 100;
        document.getElementById('progressBar').style.width = `${progressPercentage}%`;

        // MM:SS 形式で残り時間を表示
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        // 秒が1桁の場合、`05`のように0で埋める
        const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timer').textContent = `残り時間: ${formattedTime}`;

    }, 1000); // 1000ミリ秒 = 1秒ごとに実行
    }
    // 苦手分野TOP3をUIに表示
    // (重複定義を削除しました)
    // 分野ごとの正答率を集計し、苦手TOP3分野を返す
    getWeakCategories(topN = 3) {
        // 重要度ごとの重み
        const importanceWeight = { high: 1.5, medium: 1.0, low: 0.7, 未分類: 1.0 };
        // カテゴリごとに正答数・試行数・重み合計を集計
        const categoryStats = {};
        for (const card of this.allDrugs) {
            const cat = card.category || '未分類';
            const imp = card.importance || '未分類';
            if (!categoryStats[cat]) categoryStats[cat] = { correct: 0, attempts: 0, weightedAttempts: 0, weightedCorrect: 0 };
            const stats = this.getCardStats(card.name);
            const w = importanceWeight[imp] || 1.0;
            categoryStats[cat].correct += stats.correct || 0;
            categoryStats[cat].attempts += stats.attempts || 0;
            categoryStats[cat].weightedCorrect += (stats.correct || 0) * w;
            categoryStats[cat].weightedAttempts += (stats.attempts || 0) * w;
        }
        // 重み付き正答率を計算
        const categoryRates = Object.entries(categoryStats).map(([cat, s]) => ({
            category: cat,
            accuracy: s.weightedAttempts > 0 ? Math.round((s.weightedCorrect / s.weightedAttempts) * 100) : 0,
            attempts: s.attempts
        }));
        // 試行数が一定以上のカテゴリのみを対象にし、重み付き正答率昇順でソート
        const filtered = categoryRates.filter(c => c.attempts >= 3);
        filtered.sort((a, b) => a.accuracy - b.accuracy);
        return filtered.slice(0, topN);
    }

    async init() {
    await this.loadDrugDatabase();
    this.stats.streak = this.getStreak();
    this.updateToggleUI(); // ★ UIに設定を反映
    this.populateCategoryFilter();
    this.setupEventListeners();
    this.startTimer();
    this.loadNewCard();
    this.updateStats();
    this.updateWeakCategoriesUI();
    this.updateProgressVisualUI();
    this.setupVoice();
    }

    async loadDrugDatabase() {
        try {
            const response = await fetch('./drugs.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const baseDrugs = await response.json();
            // 追加薬剤をlocalStorageから取得し、結合
            const userDrugs = JSON.parse(localStorage.getItem('userDrugs') || '[]');
            this.allDrugs = Array.isArray(userDrugs) && userDrugs.length > 0 ? baseDrugs.concat(userDrugs) : baseDrugs;
            this.drugDatabase = [...this.allDrugs];
        } catch (error) {
            console.error("薬剤データベースの読み込みに失敗しました:", error);
            document.getElementById('drugName').textContent = "データ読込失敗";
            alert("drugs.jsonの読み込みに失敗しました。\n" + error + "\n\nファイル名・配置・サーバー起動状況を確認してください。");
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

    // ★★★ UIに設定の状態を反映させる関数を追加 ★★★
    updateToggleUI() {
        document.getElementById('microToggle').classList.toggle('active', this.settings.microLearning);
        document.getElementById('voiceToggle').classList.toggle('active', this.settings.voiceEnabled);
        document.getElementById('autoToggle').classList.toggle('active', this.settings.autoProgress);
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

        // ▼▼▼ スワイプ・タップイベントの重複取得を避けるため、cardContainer取得は1回だけ ▼▼▼
        const cardContainer = document.getElementById('cardContainer');

        // スワイプイベント
        ['touchstart', 'mousedown'].forEach(evt =>
            cardContainer.addEventListener(evt, e => this.handleSwipeStart(e), { passive: true })
        );
        ['touchmove', 'mousemove'].forEach(evt =>
            cardContainer.addEventListener(evt, e => this.handleSwipeMove(e), { passive: true })
        );
        ['touchend', 'mouseup'].forEach(evt =>
            cardContainer.addEventListener(evt, e => this.handleSwipeEnd(e))
        );
        cardContainer.addEventListener('mouseleave', e => this.handleSwipeCancel(e));

        // タップ/クリックで表裏切り替え（autoProgress時は無効化）
        this.tapLock = false;
        this.suppressNextTap = false; // スワイプで進めた直後のタップ抑制用
        cardContainer.addEventListener('click', (e) => {
            if (
                e.target.closest('#memoSection') ||
                e.target.closest('.button-container') ||
                e.target.closest('button')
            ) return;
            if (this.settings.autoProgress) return;
            if (this.tapLock) return;
            if (this.suppressNextTap) {
                this.suppressNextTap = false;
                return;
            }
            this.tapLock = true;
            this.tapLock = false;
            this.cancelAutoProgress();
            if (!this.isAnswerShown) {
                this.showAnswer();
            } else {
                // 裏面タップ時は表面に戻す
                this.isAnswerShown = false;
                document.getElementById('drugDetails').classList.remove('show');
                this.updateButtons();
                document.getElementById('plusAlfaSection').style.display = 'none';
                document.getElementById('memoSection').style.display = 'none';
            }
        });
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
        
        // ★★★ 変更点：設定の変更をlocalStorageに保存 ★★★
        localStorage.setItem('pharma_settings', JSON.stringify(this.settings));
        
        if (settingName === 'microLearning' && this.isAnswerShown) {
            this.updateCardDisplay();
        }
    }

    constructor() {
        this.currentCard = null;
        this.allDrugs = [];
        this.drugDatabase = [];
        this.studyMode = 'mixed';
        this.sessionStartTime = Date.now();
        this.sessionDuration = 10 * 60 * 1000;
        this.isAnswerShown = false;
        this.timerInterval = null; // ← この行を追加！

        // ★★★ 変更点：localStorageから設定と統計を読み込む ★★★
        const savedSettings = JSON.parse(localStorage.getItem('pharma_settings'));
        this.settings = {
            microLearning: true,
            voiceEnabled: false,
            autoProgress: false,
        };
        if (savedSettings) Object.assign(this.settings, savedSettings);

        const savedStats = JSON.parse(localStorage.getItem('pharma_stats'));
        this.stats = {
            todayStudied: 0,
            correctAnswers: 0,
            totalAnswers: 0,
            streak: 1,
            level: 1,
            xp: 0,
        };
        if (savedStats) Object.assign(this.stats, savedStats);

        // drugs.json読込時にuserDrugsを結合するため、ここではallDrugs初期化しない
    }
    
    selectCard() {
        let candidates = [...this.drugDatabase];
        // SRS最適化: nextReviewが今より過去のカードを優先
        const now = Date.now();
        let dueCards = candidates.filter(card => {
            const stats = this.getCardStats(card.name);
            return !stats.nextReview || stats.nextReview <= now;
        });
        // studyModeごとの絞り込み
        switch (this.studyMode) {
            case 'weak':
                dueCards = dueCards.filter(card => this.getCardStats(card.name).accuracy < 70);
                break;
            case 'important':
                dueCards = dueCards.filter(card => card.importance === 'high');
                break;
            case 'quick':
                dueCards = this.getRecentErrorCards();
                break;
        }
        // 出題候補がなければ全カードから選ぶ
        if (dueCards.length === 0) dueCards = candidates;
        return this.weightedRandomSelect(dueCards);
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
        // ★★★ 禁忌(NG)を追加 ★★★
        const detailMap = {
            mechanism: '作用機序',
            indication: '適応症',
            sideEffects: '副作用',
            interactions: '相互作用',
            ng: '禁忌' // ← 追加
        };
        // microLearning時は禁忌も表示したい場合はここに 'ng' を追加
        const displayKeys = this.settings.microLearning ? ['mechanism', 'indication', 'ng'] : Object.keys(detailMap);

        displayKeys.forEach(key => {
            // NG項目はjsonで "NG" というキーなので cardData.NG で取得
            if (key === 'ng' && cardData.NG) {
                infoParts.push(`<div class="detail-item"><div class="detail-label">${detailMap[key]}</div><div class="detail-content">${cardData.NG}</div></div>`);
            } else if (cardData[key]) {
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

        this.isAnswerShown = false; // ← 状態をリセット
        detailsContainerEl.classList.remove('show'); // ← UIもリセット
        this.updateButtons(); // ← ボタンの表示もリセット
        
    }

    showAnswer() {
        if (!this.currentCard || this.isAnswerShown) return;
        document.getElementById('drugDetails').classList.add('show');
        this.isAnswerShown = true;
        this.updateButtons();

        if (this.currentCard.plusAlfa) document.getElementById('plusAlfaSection').style.display = 'block';
        document.getElementById('memoSection').style.display = 'block';

        // ★★★ 自動進行ロジックを修正 ★★★
        if (this.settings.autoProgress) {
            const nextAction = () => this.answerCard('good');
            if (this.settings.voiceEnabled && this.currentCard.mechanism) {
                // 音声が有効なら、読み上げ完了後に次のカードへ
                this.speak(this.currentCard.mechanism, nextAction);
            } else {
                // 音声が無効なら、2.5秒後に次のカードへ
                // タイマーIDを保存しておく
                this.autoProgressTimer = setTimeout(() => {
                    this.autoProgressTimer = null;
                    nextAction();
                }, 2500);
            }
        } else if (this.settings.voiceEnabled) {
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
            this.updateStats(); // ここでのstats更新も重要
            this.updateWeakCategoriesUI();
            this.updateProgressVisualUI();
        }, 300);
    }

    // モダンな全体進捗バー描画（ダーク対応）
    updateProgressVisualUI() {
        const total = this.allDrugs.length;
        let correct = 0, attempts = 0;
        for (const card of this.allDrugs) {
            const stats = this.getCardStats(card.name);
            correct += stats.correct || 0;
            attempts += stats.attempts || 0;
        }
        const overall = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
        const bar = document.getElementById('overallProgressBar');
        const label = document.getElementById('overallProgressLabel');
        if (bar && label) {
            // アニメーションで幅をセット
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = overall + '%';
            }, 80);
            label.textContent = `${overall}%（${correct} / ${attempts}）`;
        }
    }

    // 苦手分野TOP3をアニメーション付きグラフでUI表示
    updateWeakCategoriesUI() {
        const panel = document.getElementById('weakCategoriesPanel');
        const graph = document.getElementById('weakCategoriesGraph');
        if (!panel || !graph) return;
        const top3 = this.getWeakCategories();
        graph.innerHTML = '';
        if (top3.length === 0) {
            panel.style.display = 'none';
            return;
        }
        panel.style.display = 'block';
        // 最大値でスケール
        const maxAttempts = Math.max(...top3.map(c => c.attempts), 1);
        for (const cat of top3) {
            const row = document.createElement('div');
            row.className = 'weak-bar-row';
            // ラベル
            const label = document.createElement('span');
            label.className = 'weak-bar-label';
            label.textContent = cat.category;
            row.appendChild(label);
            // バー
            const bar = document.createElement('div');
            bar.className = 'weak-bar';
            const barInner = document.createElement('div');
            barInner.className = 'weak-bar-inner';
            // 最初は0%、後でアニメーション
            barInner.style.width = '0%';
            bar.appendChild(barInner);
            row.appendChild(bar);
            // 値
            const value = document.createElement('span');
            value.className = 'weak-bar-value';
            value.textContent = `${cat.accuracy}%（${cat.attempts}問）`;
            row.appendChild(value);
            graph.appendChild(row);
            // アニメーションで幅をセット
            setTimeout(() => {
                barInner.style.width = (cat.attempts / maxAttempts * 100) + '%';
            }, 80);
        }
    }
    
    updateSessionStats(isCorrect) {
        this.stats.todayStudied++;
        this.stats.totalAnswers++;
        if (isCorrect) {
            this.stats.correctAnswers++;
            this.stats.xp += 10;
        } else {
            this.stats.xp += 2;
        }

        const requiredXp = this.stats.level * 50;
        if (this.stats.xp >= requiredXp) {
            this.stats.level++;
            this.stats.xp -= requiredXp;
        }

        // ★★★ 変更点：学習状況をlocalStorageに保存 ★★★
        localStorage.setItem('pharma_stats', JSON.stringify(this.stats));
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

    // ★★★ 変更点：統計情報と日付を1つのオブジェクトで管理 ★★★
    getStreak() {
        try {
            const savedData = JSON.parse(localStorage.getItem('pharma_streak_data') || '{}');
            let streak = savedData.streak || 0;
            const lastStudyDate = savedData.lastStudyDate;
            const today = new Date().toDateString();

            if (lastStudyDate !== today) {
                if (this.isYesterday(lastStudyDate)) {
                    streak++;
                } else {
                    streak = 1;
                }
                // 新しいデータを保存
                localStorage.setItem('pharma_streak_data', JSON.stringify({ streak, lastStudyDate: today }));
                // 今日の学習データをリセット
                this.stats = { ...this.stats, todayStudied: 0, correctAnswers: 0, totalAnswers: 0 };
                localStorage.setItem('pharma_stats', JSON.stringify(this.stats));
            }
            return streak;
        } catch (e) {
            return 1;
        }
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

    handleTouchStart(e) {
        // メモ欄でのスワイプは無効化
        if (e.target && e.target.closest && e.target.closest('#memoTextarea')) return;
        if (!this.isAnswerShown) return; // 答えが表示されていなければスワイプしない
        this.touchStartX = e.touches ? e.touches[0].clientX : e.clientX;
        this.isSwiping = true;
    }

    handleTouchMove(e) {
        // メモ欄でのスワイプは無効化
        if (e.target && e.target.closest && e.target.closest('#memoTextarea')) return;
        if (!this.isSwiping || !this.isAnswerShown) return;
        this.touchCurrentX = e.touches ? e.touches[0].clientX : e.clientX;
        const diffX = this.touchCurrentX - this.touchStartX;
        const cardContainer = document.getElementById('cardContainer');

        cardContainer.style.transform = `translateX(${diffX}px) rotate(${diffX / 20}deg)`;
        
        // 背景色のフィードバック
        if (diffX > 20) cardContainer.classList.add('swiping-right');
        else cardContainer.classList.remove('swiping-right');
        
        if (diffX < -20) cardContainer.classList.add('swiping-left');
        else cardContainer.classList.remove('swiping-left');
    }

    handleTouchEnd(e) {
        // メモ欄でのスワイプは無効化
        if (e.target && e.target.closest && e.target.closest('#memoTextarea')) return;
        if (!this.isSwiping || !this.isAnswerShown) return;
        this.isSwiping = false;
        
        const diffX = this.touchCurrentX - this.touchStartX;
        const cardContainer = document.getElementById('cardContainer');
        
        cardContainer.style.transform = ''; // 元の位置に戻す
        cardContainer.classList.remove('swiping-left', 'swiping-right');

        // スワイプ距離のしきい値
        const swipeThreshold = 80;

        if (diffX > swipeThreshold) {
            // 右スワイプ -> 覚えた (easy)
            this.answerCard('easy');
        } else if (diffX < -swipeThreshold) {
            // 左スワイプ -> 忘れた (again)
            this.answerCard('again');
        }
        
        // スタート位置をリセット
        this.touchStartX = 0;
        this.touchCurrentX = 0;
    }

    handleMouseLeave(e) {
        // マウスがカード外に出たらスワイプをキャンセル
        if (this.isSwiping) {
            this.isSwiping = false;
            const cardContainer = document.getElementById('cardContainer');
            cardContainer.style.transform = '';
            cardContainer.classList.remove('swiping-left', 'swiping-right');
            this.touchStartX = 0;
            this.touchCurrentX = 0;
        }
    }

    // ...（このsetupEventListeners定義全体を削除）...

    // スワイプ系の処理をまとめて簡潔に
    handleSwipeStart(e) {
    if (e.target && e.target.closest && e.target.closest('#memoTextarea')) return;
    
    // スワイプが始まっていなくても、タップの判定用に座標と時刻を記録
    this.touchStartX = e.touches ? e.touches[0].clientX : e.clientX;
    this.touchStartY = e.touches ? e.touches[0].clientY : e.clientY; // Y座標も記録
    this.touchStartTime = Date.now(); // タップ開始時刻を記録
    
    // 答えが表示されている時のみスワイプを有効にする
    if (this.isAnswerShown) {
        this.isSwiping = true;
    }
    }

    handleSwipeMove(e) {
        if (e.target && e.target.closest && e.target.closest('#memoTextarea')) return;
        if (!this.isSwiping || !this.isAnswerShown) return;
        this.touchCurrentX = e.touches ? e.touches[0].clientX : e.clientX;
        const diffX = this.touchCurrentX - this.touchStartX;
        const cardContainer = document.getElementById('cardContainer');
        cardContainer.style.transform = `translateX(${diffX}px) rotate(${diffX / 20}deg)`;
        cardContainer.classList.toggle('swiping-right', diffX > 20);
        cardContainer.classList.toggle('swiping-left', diffX < -20);
    }
    handleSwipeEnd(e) {
    if (e.target && e.target.closest && e.target.closest('#memoTextarea')) return;

    const touchEndX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const touchEndY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

    const diffX = touchEndX - this.touchStartX;
    const diffY = touchEndY - this.touchStartY; // Y方向の移動量
    const touchDuration = Date.now() - this.touchStartTime; // タップ時間を計算

    // スワイプ操作の判定
    if (this.isAnswerShown && this.isSwiping) {
        const swipeThreshold = 80; // スワイプと判定する最小距離
        if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
            // 左右のスワイプが確定した場合
            if (diffX > swipeThreshold) {
                this.answerCard('easy');
            } else if (diffX < -swipeThreshold) {
                this.answerCard('again');
            }
            this.suppressNextTap = true;
        }
    }
    
    // タップ操作の判定（移動距離が小さく、時間も短い場合）
    if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10 && touchDuration < 200) {
        if (this.settings.autoProgress) return;
        
        // 既存のタップ処理をここに移動
        this.cancelAutoProgress();
        if (!this.isAnswerShown) {
            this.showAnswer();
        } else {
            // 裏面タップ時は表面に戻す
            this.isAnswerShown = false;
            document.getElementById('drugDetails').classList.remove('show');
            this.updateButtons();
            document.getElementById('plusAlfaSection').style.display = 'none';
            document.getElementById('memoSection').style.display = 'none';
        }
    }

    // スワイプ状態とカードの見た目をリセット
    this.isSwiping = false;
    const cardContainer = document.getElementById('cardContainer');
    cardContainer.style.transform = '';
    cardContainer.classList.remove('swiping-left', 'swiping-right');
    
    // 各種座標・時刻をリセット
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchCurrentX = 0;
    this.touchStartTime = 0;
    }

    handleSwipeCancel(e) {
        if (this.isSwiping) {
            this.isSwiping = false;
            const cardContainer = document.getElementById('cardContainer');
            cardContainer.style.transform = '';
            cardContainer.classList.remove('swiping-left', 'swiping-right');
            this.touchStartX = 0;
            this.touchCurrentX = 0;
        }
    }

    // 自動進行や音声読み上げのキャンセルをまとめる
    cancelAutoProgress() {
        if (this.autoProgressTimer) {
            clearTimeout(this.autoProgressTimer);
            this.autoProgressTimer = null;
        }
        if (this.speechSynthesis && this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
        }
    }

    showAnswer() {
        if (!this.currentCard || this.isAnswerShown) return;
        document.getElementById('drugDetails').classList.add('show');
        this.isAnswerShown = true;
        this.updateButtons();
        if (this.currentCard.plusAlfa) document.getElementById('plusAlfaSection').style.display = 'block';
        document.getElementById('memoSection').style.display = 'block';

        const nextAction = () => this.answerCard('good');
        if (this.settings.autoProgress) {
            if (this.settings.voiceEnabled && this.currentCard.mechanism) {
                this.speak(this.currentCard.mechanism, nextAction);
            } else {
                this.autoProgressTimer = setTimeout(() => {
                    this.autoProgressTimer = null;
                    nextAction();
                }, 2500);
            }
        } else if (this.settings.voiceEnabled) {
            this.speak(this.currentCard.mechanism);
        }
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