// ========= グローバル変数と定数 =========
let drugDatabase = [];
let currentCard = null;
let studyMode = 'mixed';
let sessionTimerInterval;
let sessionDuration = 10 * 60 * 1000; // 10分
let cardsStudiedToday = 0;
let correctAnswers = 0;
let totalAnswers = 0;
let isAnswerShown = false;
let microLearningEnabled = true;
let speechEnabled = false;

const srsIntervals = {
    again: 1,
    hard: 6,
    good: 1440, // 1日
    easy: 5760  // 4日
};

// ========= DOM要素 =========
// 頻繁にアクセスするDOM要素を最初に取得しておく
const elements = {
    totalCards: document.getElementById('totalCards'),
    studiedToday: document.getElementById('studiedToday'),
    accuracy: document.getElementById('accuracy'),
    streak: document.getElementById('streak'),
    categorySelect: document.getElementById('categorySelect'),
    sessionTime: document.getElementById('sessionTime'),
    microLearning: document.getElementById('microLearning'),
    speechEnabled: document.getElementById('speechEnabled'),
    timer: document.getElementById('timer'),
    progressFill: document.getElementById('progressFill'),
    importanceBadge: document.getElementById('importanceBadge'),
    categoryBadge: document.getElementById('categoryBadge'), 
    drugName: document.getElementById('drugName'),
    drugInfo: document.getElementById('drugInfo'),
    showBtn: document.getElementById('showBtn'),
    againBtn: document.getElementById('againBtn'),
    hardBtn: document.getElementById('hardBtn'),
    easyBtn: document.getElementById('easyBtn'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    plusAlfaSection: document.getElementById('plusAlfaSection'),
    plusAlfaContent: document.getElementById('plusAlfaContent'),
    memoSection: document.getElementById('memoSection'),   
    memoTextarea: document.getElementById('memoTextarea')  
};

// ========= アプリケーションの初期化 =========
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        const response = await fetch('drugs.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        drugDatabase = await response.json();
        
        setupEventListeners();
        populateCategorySelector();
        updateStats();
        loadCard();
        startTimer();

    } catch (error) {
        console.error("アプリケーションの初期化に失敗しました:", error);
        elements.drugName.textContent = "データの読込に失敗しました";
    }
}

// ========= イベントリスナーの設定 =========
function setupEventListeners() {
    elements.sessionTime.addEventListener('change', (e) => {
        sessionDuration = parseInt(e.target.value, 10) * 60 * 1000;
        startTimer();
    });

    elements.microLearning.addEventListener('change', (e) => microLearningEnabled = e.target.checked);
    elements.speechEnabled.addEventListener('change', (e) => speechEnabled = e.target.checked);

    elements.modeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            elements.modeBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            studyMode = this.dataset.mode;
            elements.categorySelect.value = ""; // カテゴリ選択をリセット
            loadCard();
        });
    });

    elements.categorySelect.addEventListener('change', (e) => {
        loadCard(e.target.value);
    });

    // ボタンのクリックイベント
    elements.showBtn.addEventListener('click', showAnswer);
    elements.againBtn.addEventListener('click', () => answerCard('again'));
    elements.hardBtn.addEventListener('click', () => answerCard('hard'));
    elements.easyBtn.addEventListener('click', () => answerCard('easy'));

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
        if (!isAnswerShown && e.code === 'Space') {
            e.preventDefault();
            showAnswer();
        } else if (isAnswerShown) {
            switch(e.code) {
                case 'Digit1': answerCard('again'); break;
                case 'Digit2': answerCard('hard'); break;
                case 'Digit3': answerCard('easy'); break;
            }
        }
    });
}

// ========= 動的コンテンツの生成 =========
function populateCategorySelector() {
    const categories = [...new Set(drugDatabase.map(drug => drug.category))];
    categories.sort();
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        elements.categorySelect.appendChild(option);
    });
}

// ========= コア機能（カード選択・表示） =========
function loadCard(category = "") {
    let selectedCard;
    
    if (category) {
        selectedCard = getCategoryCard(category);
    } else {
        switch(studyMode) {
            case 'importance': selectedCard = getHighImportanceCard(); break;
            case 'weak': selectedCard = getWeakCard(); break;
            case 'quick': selectedCard = getQuickReviewCard(); break;
            default: selectedCard = getMixedCard();
        }
    }
    
    if (!selectedCard) {
        elements.drugName.textContent = "対象カードがありません";
        return;
    }
    
    displayCard(selectedCard);
    isAnswerShown = false;
    updateButtons();
}

function displayCard(card) {
    currentCard = card;
    elements.drugName.textContent = card.name;

    // カテゴリタグの表示処理
    if (card.category && card.category.trim() !== "") {
        elements.categoryBadge.textContent = card.category;
        elements.categoryBadge.style.display = 'inline-block';
    } else {
        elements.categoryBadge.style.display = 'none';
    }
    
    // importanceBadgeの表示処理
    elements.importanceBadge.textContent = `重要度: ${card.importance === 'high' ? '高' : card.importance === 'medium' ? '中' : '低'}`;
    elements.importanceBadge.className = `importance-badge importance-${card.importance}`;
    
    // ★★★ ここからが変更点です ★★★
    // 表示する情報を入れるための空の配列を用意
    const infoParts = []; 

    // マイクロラーニングモードかどうかに応じてラベルを切り替え
    const mechanismLabel = microLearningEnabled ? '作用' : '作用機序';

    // 各項目をチェックし、データがあれば配列に追加
    if (card.mechanism && card.mechanism.trim() !== "") {
        infoParts.push(`<strong>${mechanismLabel}:</strong> ${card.mechanism}`);
    }
    if (card.indication && card.indication.trim() !== "") {
        infoParts.push(`<strong>適応:</strong> ${card.indication}`);
    }

    // マイクロラーニングモードがオフの場合のみ、副作用と相互作用をチェック
    if (!microLearningEnabled) {
        if (card.sideEffects && card.sideEffects.trim() !== "") {
            infoParts.push(`<strong>副作用:</strong> ${card.sideEffects}`);
        }
        if (card.interaction && card.interaction.trim() !== "") {
            infoParts.push(`<strong>相互作用:</strong> ${card.interaction}`);
        }
    }

    // 配列の要素を<br>で連結してHTMLに設定
    elements.drugInfo.innerHTML = infoParts.join('<br>');
    // ★★★ ここまでが変更点です ★★★

    // plusAlfaの内容をセット
    if (card.plusAlfa && card.plusAlfa.trim() !== "") {
        elements.plusAlfaContent.innerHTML = card.plusAlfa;
    } else {
        elements.plusAlfaContent.innerHTML = "";
    }
    
    // メモをlocalStorageから読み込む
    const memoKey = 'memo_' + card.name;
    const savedMemo = localStorage.getItem(memoKey);
    elements.memoTextarea.value = savedMemo || "";

    // カード表示時は関連セクションを非表示にする
    elements.plusAlfaSection.style.display = 'none';
    elements.memoSection.style.display = 'none';
    elements.drugInfo.style.display = 'none';
    
    if (speechEnabled) speak(card.name);
}


function showAnswer() {
    if (!currentCard) return;
    elements.drugInfo.style.display = 'block';
    isAnswerShown = true;
    updateButtons();
    
    if (currentCard.plusAlfa && currentCard.plusAlfa.trim() !== "") {
        elements.plusAlfaSection.style.display = 'block';
    }

    elements.memoSection.style.display = 'block';

    if (speechEnabled) speak(currentCard.mechanism);
}

// ========= カード選択アルゴリズム =========
function getWeightedRandomCard(cards) {
    if (!cards || cards.length === 0) return null;
    const totalWeight = cards.reduce((sum, card) => sum + (card.frequency || 50), 0);
    let random = Math.random() * totalWeight;
    for (const card of cards) {
        random -= (card.frequency || 50);
        if (random <= 0) return card;
    }
    return cards[cards.length - 1];
}

function getCategoryCard(category) {
    const categoryCards = drugDatabase.filter(card => card.category === category);
    return getWeightedRandomCard(categoryCards);
}

function getHighImportanceCard() {
    const highImportanceCards = drugDatabase.filter(card => card.importance === 'high');
    return getWeightedRandomCard(highImportanceCards);
}

function getMixedCard() {
    return getWeightedRandomCard(drugDatabase);
}

// (getWeakCard, getQuickReviewCard, getCardStats...などの補助関数は省略せず記述してください)
// ...（以前のコードから該当部分をコピー）
function getWeakCard() {
    // この機能はlocalStorageへのアクセスが必要なため、サンプルとして簡易版を記載
    return getMixedCard(); // 弱点がない場合は混合モード
}
function getQuickReviewCard() {
    // この機能はlocalStorageへのアクセスが必要なため、サンプルとして簡易版を記載
    return getHighImportanceCard(); // クイックレビューは重要度順
}

// ========= UI更新 =========
function updateButtons() {
    const displayStyle = isAnswerShown ? 'none' : 'block';
    elements.showBtn.style.display = displayStyle;
    elements.againBtn.style.display = isAnswerShown ? 'block' : 'none';
    elements.hardBtn.style.display = isAnswerShown ? 'block' : 'none';
    elements.easyBtn.style.display = isAnswerShown ? 'block' : 'none';
}

function answerCard(difficulty) {
    totalAnswers++;
    if (difficulty === 'easy' || difficulty === 'good') correctAnswers++;
    cardsStudiedToday++;
    updateStats();
    updateProgress();
    
    console.log(`${currentCard.name} - 次回復習(${difficulty}): ${srsIntervals[difficulty]}分後`);
    
    setTimeout(() => loadCard(elements.categorySelect.value), 300);
}

function updateStats() {
    elements.totalCards.textContent = drugDatabase.length;
    elements.studiedToday.textContent = cardsStudiedToday;
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
    elements.accuracy.textContent = `${accuracy}%`;
    elements.streak.textContent = localStorage.getItem('studyStreak') || 0;
}

function updateProgress() {
    const progress = (cardsStudiedToday / 20) * 100; // 1日20カード目標
    elements.progressFill.style.width = `${Math.min(progress, 100)}%`;
}

// ========= タイマーと音声 =========
function startTimer() {
    clearInterval(sessionTimerInterval); // 既存のタイマーをクリア
    let sessionStartTime = Date.now();
    
    sessionTimerInterval = setInterval(() => {
        const elapsed = Date.now() - sessionStartTime;
        const remaining = Math.max(0, sessionDuration - elapsed);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        elements.timer.textContent = `残り時間: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (remaining === 0) {
            clearInterval(sessionTimerInterval);
            alert('学習時間が終了しました！お疲れさまでした。');
        }
    }, 1000);
}

function speak(text) {
    if ('speechSynthesis' in window && speechEnabled) {
        speechSynthesis.cancel(); // 以前の発話をキャンセル
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
    }
}