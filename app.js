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
      categoryFilter.value = 'all'; // ← この行を追加！
      filterAndShuffle('review');
    });

    // 「画像ありのみ」ボタンが押された時
    document.getElementById('image-only-btn').addEventListener('click', () => {
      categoryFilter.value = 'all'; // ← この行を追加！
      filterAndShuffle('imageOnly');
    });
// 「シャッフル」ボタンが押された時、フィルターをリセットして全体をシャッフル
    document.getElementById('shuffle-btn').addEventListener('click', () => {
      categoryFilter.value = 'all'; // 分野フィルターを「すべて」に戻す
      filterAndShuffle('default');    // 「すべて」のカードをフィルタリングし直してシャッフル
      alert('すべてのカードをシャッフルしました！'); // メッセージを分かりやすく変更
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
  /** 現在のカードを画面に表示する */
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

  /** 進捗表示（例: 5 / 20）を更新する */
  function updateProgress() {
    progressText.textContent = `${currentIndex + 1} / ${currentCards.length}`;
  }

  /** カテゴリーフィルターの選択肢を作成する */
  function populateCategories() {
    const categories = [...new Set(fullDataset.map(item => item.category))];
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  /** 画像ギャラリーを作成する */
  function populateGallery() {
    galleryGrid.innerHTML = '';
    const itemsWithImages = fullDataset.filter(item => item.image && item.image.trim() !== '');

    itemsWithImages.forEach(item => {
      const galleryItem = document.createElement('div');
      galleryItem.className = 'gallery-item';
      
      const img = document.createElement('img');
      img.src = `images/${item.image}`;
      img.onerror = function() { this.parentElement.style.display = 'none'; }; // 画像がないアイテムは非表示
      
      const name = document.createElement('p');
      name.textContent = item.drug;
      
      galleryItem.appendChild(img);
      galleryItem.appendChild(name);
      galleryGrid.appendChild(galleryItem);
    });
  }

  /** 単語帳とギャラリーの表示を切り替える */
  function toggleView(showGallery) {
    if (showGallery) {
      flashcardView.classList.add('hidden');
      galleryView.classList.remove('hidden');
    } else {
      flashcardView.classList.remove('hidden');
      galleryView.classList.add('hidden');
    }
  }

  // ==================================================
  // 5. データ・状態管理系関数 (Data & State Management)
  // ==================================================
  /** ユーザーの進捗（習熟度、メモ）をブラウザに保存する */
  function saveUserProgress() {
    localStorage.setItem('pharmaUserProgress', JSON.stringify(userProgress));
  }

  /** メモを保存する */
  function saveMemo() {
    if (currentCards.length === 0) return;
    const cardId = currentCards[currentIndex].id;
    if (!userProgress[cardId]) userProgress[cardId] = {};
    userProgress[cardId].memo = memoTextarea.value;
    saveUserProgress();
    memoStatus.textContent = '保存しました！';
    setTimeout(() => { memoStatus.textContent = ''; }, 2000);
  }

  /** カードの習熟度（覚えた/苦手）を記録する */
  function markCard(status) {
    if (currentCards.length === 0) return;
    const cardId = currentCards[currentIndex].id;
    if (!userProgress[cardId]) userProgress[cardId] = {};
    userProgress[cardId].status = status;
    saveUserProgress();
    nextCard();
  }

  /** 条件に応じてカードをフィルタリングし、シャッフルする */
  function filterAndShuffle(mode = 'default') {
    const selectedCategory = categoryFilter.value;
    let filteredData;

    switch (mode) {
      case 'review':
        const reviewIds = Object.keys(userProgress).filter(id => userProgress[id]?.status === 'review');
        filteredData = fullDataset.filter(item => reviewIds.includes(item.id));
        if (filteredData.length === 0) { alert('「苦手」にマークされたカードはありません。'); return; }
        break;
      case 'imageOnly':
        filteredData = fullDataset.filter(item => item.image && item.image.trim() !== '');
        if (filteredData.length === 0) { alert('画像のあるカードはありません。'); return; }
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

  /** 次のカードへ進む */
  function nextCard() {
    if (currentIndex < currentCards.length - 1) {
      currentIndex++;
      displayCard();
    } else {
      alert('このカテゴリの最後のカードです！');
    }
  }
  
  /** 前のカードへ戻る */
  function prevCard() {
    if (currentIndex > 0) {
      currentIndex--;
      displayCard();
    } else {
      alert('最初のカードです！');
    }
  }
});