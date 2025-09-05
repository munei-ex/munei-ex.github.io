document.addEventListener('DOMContentLoaded', () => {
  // ==================================================
  // 1. 定数・変数宣言 (Constants & Variables)
  // ==================================================
  // DOM要素（一度取得したら変わらないのでconst）
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

  // アプリの状態を管理する変数（中身が変わるのでlet）
  let fullDataset = [];
  let currentCards = [];
  let currentIndex = 0;
  let userProgress = JSON.parse(localStorage.getItem('pharmaUserProgress')) || {};

  // ==================================================
  // 2. メイン処理 (Main Execution)
  // ==================================================
  // CSVファイルを読み込み、成功したらアプリを初期化
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
  /** アプリの初期設定を行う */
  function initializeApp() {
    populateCategories();
    populateGallery();
    addEventListeners();
    filterAndShuffle('default');
  }

  /** すべてのイベントリスナーを登録する */
  function addEventListeners() {
    card.addEventListener('click', () => card.classList.toggle('is-flipped'));
    cardImage.onerror = () => { cardImage.style.display = 'none'; };
    
    document.getElementById('prev-btn').addEventListener('click', prevCard);
    document.getElementById('next-btn').addEventListener('click', nextCard);
    document.getElementById('mark-learned-btn').addEventListener('click', () => markCard('learned'));
    document.getElementById('mark-review-btn').addEventListener('click', () => markCard('review'));
    
    // カテゴリーフィルターが変更された時
    categoryFilter.addEventListener('change', () => filterAndShuffle('default'));
    
    // 「苦手だけ復習」ボタンが押された時
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
  function displayCard() {
    card.classList.remove('is-flipped');
    
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
    
    // ▼▼▼【修正点1】plusAlfaの内容を裏面に表示 ▼▼▼
    let backContent = cardData.mechanism;
    if (cardData.plusAlfa && cardData.plusAlfa.trim() !== '') {
      backContent += `\n\n💡 +α:\n${cardData.plusAlfa}`;
    }
    cardFront.textContent = cardData.drug;
    cardBackText.textContent = backContent;
    // ▲▲▲ ここまで ▲▲▲

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
  
  // ▼▼▼【修正点2】通知表示用の関数を追加 ▼▼▼
  function showNotification(message, duration = 2000) {
    memoStatus.textContent = message;
    setTimeout(() => {
      if (memoStatus.textContent === message) {
        memoStatus.textContent = '';
      }
    }, duration);
  }
  // ▲▲▲ ここまで ▲▲▲

  // ==================================================
  // 5. データ・状態管理系関数 (Data & State Management)
  // ==================================================
  function saveUserProgress() {
    localStorage.setItem('pharmaUserProgress', JSON.stringify(userProgress));
  }

  function saveMemo() {
    if (currentCards.length === 0) return;
    const cardId = currentCards[currentIndex].id;
    if (!userProgress[cardId]) userProgress[cardId] = {};
    userProgress[cardId].memo = memoTextarea.value;
    saveUserProgress();
    showNotification('メモを保存しました！'); // ← ここもついでに変更
  }

  function markCard(status) {
    if (currentCards.length === 0) return;
    const cardId = currentCards[currentIndex].id;
    if (!userProgress[cardId]) userProgress[cardId] = {};
    userProgress[cardId].status = status;
    saveUserProgress();
    nextCard();
  }

  function filterAndShuffle(mode = 'default') {
    const selectedCategory = categoryFilter.value;
    let filteredData;

    switch (mode) {
      case 'review':
        const reviewIds = Object.keys(userProgress).filter(id => userProgress[id]?.status === 'review');
        filteredData = fullDataset.filter(item => reviewIds.includes(item.id));
        if (filteredData.length === 0) { 
            showNotification('「苦手」にマークされたカードはありません。'); // ← alertから変更
            return; 
        }
        break;
      case 'imageOnly':
        filteredData = fullDataset.filter(item => item.image && item.image.trim() !== '');
        if (filteredData.length === 0) {
            showNotification('画像のあるカードはありません。'); // ← alertから変更
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
  function nextCard() {
    if (currentIndex < currentCards.length - 1) {
      currentIndex++;
      displayCard();
    } else {
      showNotification('このカテゴリの最後のカードです！'); // ← alertから変更
    }
  }
  
  /** 前のカードへ戻る */
  function prevCard() {
    if (currentIndex > 0) {
      currentIndex--;
      displayCard();
    } else {
      showNotification('最初のカードです！'); // ← alertから変更
    }
  }
});