document.addEventListener('DOMContentLoaded', () => {
  // ==================================================
  // 1. 定数・変数宣言 (Constants & Variables)
  // ==================================================
  // ...（DOM要素の変数は変更なし）...
  const card = document.getElementById('card');
  const cardFront = document.getElementById('card-front');
  const cardBackText = document.getElementById('card-back-text');
  const cardImage = document.getElementById('card-image');
  const flashcardView = document.getElementById('flashcard-view');
  const galleryView = document.getElementById('gallery-view');
  const galleryGrid = document.getElementById('gallery-grid');
  const categoryFilter = document.getElementById('category-filter');
  const progressText = document.getElementById('progress');
  const memoTextarea = document.getElementById('memo-textarea');
  const memoStatus = document.getElementById('memo-status');
  const plusAlfaContainer = document.getElementById('plus-alfa-container');
  const plusAlfaText = document.getElementById('plus-alfa-text');
  const undoBtn = document.getElementById('undo-btn');

  // ▼▼▼ 間隔反復のための設定 ▼▼▼
  const srsIntervals = [0,1, 3, 7, 14, 30, 60]; // 復習間隔（日）

  // アプリの状態を管理する変数
  let fullDataset = [];
  let currentCards = [];
  let currentIndex = 0;
  let userProgress = JSON.parse(localStorage.getItem('pharmaUserProgress')) || {};
  let lastAction = null;

  // ==================================================
  // 2. メイン処理 (Main Execution)
  // ==================================================
  Papa.parse('data.csv', {
    download: true,
    header: true,
    complete: (results) => {
      fullDataset = results.data.filter(row => row.id && row.drug);
      initializeApp();
    },
    error: (err) => {
      console.error("CSV Parsing Error:", err);
      cardFront.textContent = "CSVファイルの読み込みに失敗しました。";
    }
  });

  // ==================================================
  // 3. 初期化系関数 (Initialization)
  // ==================================================
  function initializeApp() {
    populateCategories();
    populateGallery();
    addEventListeners();
    filterAndShuffle('default');
  }

  function addEventListeners() {
    // ...（他のイベントリスナーはほぼ変更なし）...
    document.getElementById('prev-btn').addEventListener('click', () => {
      undoBtn.classList.add('hidden');
      lastAction = null;
      prevCard();
    });
    document.getElementById('next-btn').addEventListener('click', () => {
      undoBtn.classList.add('hidden');
      lastAction = null;
      nextCard();
    });
    
    // ▼▼▼ 「今日復習する」ボタンのイベントリスナーを追加 ▼▼▼
    document.getElementById('review-due-btn').addEventListener('click', () => {
      categoryFilter.value = 'all';
      filterAndShuffle('reviewDue');
    });
    
    // ...（他のイベントリスナーは変更なし）...
    card.addEventListener('click', () => {
      card.classList.toggle('is-flipped');
      if (currentCards.length === 0) return;
      const cardData = currentCards[currentIndex];
      if (card.classList.contains('is-flipped') && cardData.plusAlfa && cardData.plusAlfa.trim() !== '') {
        plusAlfaText.textContent = cardData.plusAlfa;
        plusAlfaContainer.classList.remove('hidden');
      } else {
        plusAlfaContainer.classList.add('hidden');
      }
    });

    cardImage.onerror = () => { cardImage.style.display = 'none'; };
    document.getElementById('mark-learned-btn').addEventListener('click', () => markCard('learned'));
    document.getElementById('mark-review-btn').addEventListener('click', () => markCard('review'));
    document.getElementById('undo-btn').addEventListener('click', undoLastAction);
    categoryFilter.addEventListener('change', () => filterAndShuffle('default'));
    document.getElementById('review-mode-btn').addEventListener('click', () => {
      categoryFilter.value = 'all';
      filterAndShuffle('review');
    });
    document.getElementById('image-only-btn').addEventListener('click', () => {
      categoryFilter.value = 'all';
      filterAndShuffle('imageOnly');
    });
    document.getElementById('shuffle-btn').addEventListener('click', () => {
      categoryFilter.value = 'all';
      filterAndShuffle('default');
      showNotification('すべてのカードをシャッフルしました！');
    });
    document.getElementById('gallery-btn').addEventListener('click', () => toggleView(true));
    document.getElementById('back-to-flashcard-btn').addEventListener('click', () => toggleView(false));
    memoTextarea.addEventListener('blur', saveMemo);
    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('本当にすべての進捗（習熟度とメモ）をリセットしますか？')) {
        userProgress = {};
        saveUserProgress();
        alert('進捗をリセットしました。');
        filterAndShuffle();
      }
    });
  }

  // ==================================================
  // 4. UI更新系関数 (UI Updates)
  // ==================================================
  // ...（displayCard, updateProgress, populateCategories, populateGallery, toggleView, showNotification は変更なし）...
   function displayCard() {
    card.classList.remove('is-flipped');
    plusAlfaContainer.classList.add('hidden'); 
    
    if (currentCards.length === 0) {
      cardFront.textContent = '対象のカードがありません';
      cardBackText.textContent = '';
      cardImage.style.display = 'none';
      memoTextarea.value = '';
      memoTextarea.disabled = true;
      progressText.textContent = '0 / 0';
      return;
    }
    
    memoTextarea.disabled = false;
    const cardData = currentCards[currentIndex];
    
    cardFront.textContent = cardData.drug;
    cardBackText.textContent = cardData.mechanism;

    if (cardData.image && cardData.image.trim() !== '') {
      cardImage.src = `images/${cardData.image}`;
      cardImage.style.display = 'block';
    } else {
      cardImage.src = '';
      cardImage.style.display = 'none';
    }

    const cardId = cardData.id;
    memoTextarea.value = userProgress[cardId]?.memo || '';
    updateProgress();
  }

  function updateProgress() {
    progressText.textContent = `${currentIndex + 1} / ${currentCards.length}`;
  }

  function populateCategories() {
    const categories = [...new Set(fullDataset.map(item => item.category))];
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  function populateGallery() {
    galleryGrid.innerHTML = '';
    const itemsWithImages = fullDataset.filter(item => item.image && item.image.trim() !== '');
    itemsWithImages.forEach(item => {
      const galleryItem = document.createElement('div');
      galleryItem.className = 'gallery-item';
      const img = document.createElement('img');
      img.src = `images/${item.image}`;
      img.onerror = function() { this.parentElement.style.display = 'none'; };
      const name = document.createElement('p');
      name.textContent = item.drug;
      galleryItem.appendChild(img);
      galleryItem.appendChild(name);
      galleryGrid.appendChild(galleryItem);
    });
  }
   function toggleView(showGallery) {
    if (showGallery) {
      flashcardView.classList.add('hidden');
      galleryView.classList.remove('hidden');
    } else {
      flashcardView.classList.remove('hidden');
      galleryView.classList.add('hidden');
    }
  }
  function showNotification(message, duration = 2000) {
    memoStatus.textContent = message;
    setTimeout(() => {
      if (memoStatus.textContent === message) {
        memoStatus.textContent = '';
      }
    }, duration);
  }

  // ==================================================
  // 5. データ・状態管理系関数 (Data & State Management)
  // ==================================================
  // ...（saveUserProgress, saveMemo は変更なし）...
   function saveUserProgress() {
    localStorage.setItem('pharmaUserProgress', JSON.stringify(userProgress));
  }

  function saveMemo() {
    if (currentCards.length === 0) return;
    const cardId = currentCards[currentIndex].id;
    if (!userProgress[cardId]) userProgress[cardId] = {};
    userProgress[cardId].memo = memoTextarea.value;
    saveUserProgress();
    showNotification('メモを保存しました！');
  }

  // ▼▼▼ この関数を全面的に書き換える ▼▼▼
  /** カードの習熟度を記録し、次の復習日を計算する */
  function markCard(status) {
    if (currentCards.length === 0) return;
    const cardId = currentCards[currentIndex].id;
    if (!userProgress[cardId]) userProgress[cardId] = {};

    // --- 取り消し機能のための準備 ---
    const previousProgress = JSON.parse(JSON.stringify(userProgress[cardId]));
    lastAction = { cardId, previousProgress };
    undoBtn.classList.remove('hidden');
    // -------------------------

    if (status === 'learned') {
      const currentLevel = userProgress[cardId].srsLevel || 0;
      const nextLevel = currentLevel + 1;
      const interval = srsIntervals[Math.min(nextLevel - 1, srsIntervals.length - 1)];
      
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);

      userProgress[cardId].status = 'learning'; // 「学習中」というステータスに変更
      userProgress[cardId].srsLevel = nextLevel;
      userProgress[cardId].reviewDate = nextReviewDate.toISOString();

    } else if (status === 'review') {
      userProgress[cardId].status = 'review';
      userProgress[cardId].srsLevel = 0; // 苦手なのでレベルをリセット
      delete userProgress[cardId].reviewDate; // 復習日もリセット
    }

    saveUserProgress();
    nextCard();
  }
  
  // ▼▼▼ この関数を全面的に書き換える ▼▼▼
  /** 直前の操作を取り消す */
  function undoLastAction() {
    if (!lastAction) return;
    const { cardId, previousProgress } = lastAction;
    
    // 記録しておいた以前の状態に完全に戻す
    userProgress[cardId] = previousProgress;
    
    saveUserProgress();
    showNotification('操作を取り消しました。');
    
    lastAction = null;
    undoBtn.classList.add('hidden');
  }

  // ▼▼▼ この関数に新しいcaseを追加する ▼▼▼
  function filterAndShuffle(mode = 'default') {
    const selectedCategory = categoryFilter.value;
    let filteredData;

    switch (mode) {
      case 'reviewDue': // ★新しいcase
        const today = new Date().toISOString();
        filteredData = fullDataset.filter(item => {
          const progress = userProgress[item.id];
          return progress && progress.status === 'learning' && progress.reviewDate <= today;
        });
        if (filteredData.length === 0) {
          showNotification('今日復習するカードはありません。');
          return;
        }
        break;
      
      // ...（他のcaseは変更なし）...
      case 'review':
        filteredData = fullDataset.filter(item => userProgress[item.id]?.status === 'review');
        if (filteredData.length === 0) {
          showNotification('「苦手」にマークされたカードはありません。');
          return;
        }
        break;
      case 'imageOnly':
        filteredData = fullDataset.filter(item => item.image && item.image.trim() !== '');
        if (filteredData.length === 0) {
          showNotification('画像のあるカードはありません。');
          return;
        }
        break;
      default:
        filteredData = (selectedCategory === 'all')
          ? [...fullDataset]
          : fullDataset.filter(item => item.category === selectedCategory);
        break;
    }
    
    currentCards = filteredData.sort(() => Math.random() - 0.5);
    currentIndex = 0;
    displayCard();
  }

  // ==================================================
  // 6. カード操作系関数 (Card Navigation & Actions)
  // ==================================================
  // ...（nextCard, prevCard は変更なし）...
   function nextCard() {
    if (currentIndex < currentCards.length - 1) {
      currentIndex++;
      displayCard();
    } else {
      showNotification('このカテゴリの最後のカードです！');
    }
  }
  
  /** 前のカードへ戻る */
  function prevCard() {
    if (currentIndex > 0) {
      currentIndex--;
      displayCard();
    } else {
      showNotification('最初のカードです！');
    }
  }
});