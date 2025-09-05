document.addEventListener('DOMContentLoaded', () => {
  // --- DOM ELEMENTS ---
  const card = document.getElementById('card');
  const cardFront = document.getElementById('card-front');
  const cardBackText = document.getElementById('card-back-text'); // 裏面のテキスト部分
  const cardImage = document.getElementById('card-image');     // 裏面の画像部分
  const categoryFilter = document.getElementById('category-filter');
  const progressText = document.getElementById('progress');
  const memoTextarea = document.getElementById('memo-textarea'); // メモエリア
  const memoStatus = document.getElementById('memo-status');   // メモの保存状態表示

  // --- STATE ---
  let fullDataset = [];
  let currentCards = [];
  let currentIndex = 0;
  // メモと習熟度を一つのオブジェクトで管理
  let userProgress = JSON.parse(localStorage.getItem('pharmaUserProgress')) || {};

  // --- CSV DATA LOADING ---
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

  function initializeApp() {
    populateCategories();
    filterAndShuffle();
    addEventListeners();
  }

  // --- FUNCTIONS ---
  function saveUserProgress() {
    localStorage.setItem('pharmaUserProgress', JSON.stringify(userProgress));
  }
  
  // ▼▼▼ シャッフル機能のロジック ▼▼▼
  function filterAndShuffle(mode = 'default') {
    const selectedCategory = categoryFilter.value;
    let filteredData;

    switch (mode) {
      case 'review':
        const reviewIds = Object.keys(userProgress).filter(id => userProgress[id]?.status === 'review');
        filteredData = fullDataset.filter(item => reviewIds.includes(item.id));
        if (filteredData.length === 0) {
          alert('「苦手」にマークされたカードはありません。');
          return;
        }
        break;
      case 'imageOnly':
        filteredData = fullDataset.filter(item => item.image && item.image.trim() !== '');
        if (filteredData.length === 0) {
          alert('画像のあるカードはありません。');
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

  function displayCard() {
    card.classList.remove('is-flipped');
    
    if (currentCards.length === 0) {
      cardFront.textContent = '対象のカードがありません';
      cardBackText.textContent = '';
      cardImage.style.display = 'none'; // 画像を隠す
      memoTextarea.disabled = true;
      progressText.textContent = '0 / 0';
      return;
    }
    
    memoTextarea.disabled = false;
    const cardData = currentCards[currentIndex];
    cardFront.textContent = cardData.drug;
    cardBackText.textContent = cardData.mechanism; // テキスト部分に機序を設定

    // ▼▼▼ 画像の表示処理 ▼▼▼
    if (cardData.image && cardData.image.trim() !== '') {
      cardImage.src = `images/${cardData.image}`;
      cardImage.style.display = 'block';
    } else {
      cardImage.src = '';
      cardImage.style.display = 'none';
    }

    // メモ表示と進捗表示は変更なし
    const cardId = cardData.id;
    memoTextarea.value = userProgress[cardId]?.memo || '';
    updateProgress();
  }
  
  function updateProgress() {
      progressText.textContent = `${currentIndex + 1} / ${currentCards.length}`;
  }

  function markCard(status) {
    if (currentCards.length === 0) return;
    const cardId = currentCards[currentIndex].id;
    // userProgressオブジェクトにIDがなければ作成
    if (!userProgress[cardId]) userProgress[cardId] = {};
    // ステータスを保存
    userProgress[cardId].status = status;
    saveUserProgress();
    nextCard();
  }

  function nextCard() {
    if (currentIndex < currentCards.length - 1) {
      currentIndex++;
      displayCard();
    } else {
      alert('このカテゴリの最後のカードです！');
    }
  }
  
  function prevCard() {
    if (currentIndex > 0) {
      currentIndex--;
      displayCard();
    } else {
      alert('最初のカードです！');
    }
  }
  
  // ▼▼▼ メモを保存する関数 ▼▼▼
  function saveMemo() {
      if (currentCards.length === 0) return;
      const cardId = currentCards[currentIndex].id;
      // userProgressオブジェクトにIDがなければ作成
      if (!userProgress[cardId]) userProgress[cardId] = {};
      // メモ内容を保存
      userProgress[cardId].memo = memoTextarea.value;
      saveUserProgress();
      // 保存したことをユーザーにフィードバック
      memoStatus.textContent = '保存しました！';
      setTimeout(() => { memoStatus.textContent = ''; }, 2000); // 2秒後にメッセージを消す
  }


  function addEventListeners() {
    card.addEventListener('click', () => card.classList.toggle('is-flipped'));
    
    document.getElementById('prev-btn').addEventListener('click', prevCard);
    document.getElementById('next-btn').addEventListener('click', nextCard);
    document.getElementById('mark-learned-btn').addEventListener('click', () => markCard('learned'));
    document.getElementById('mark-review-btn').addEventListener('click', () => markCard('review'));
    
    categoryFilter.addEventListener('change', () => filterAndShuffle(false));
    document.getElementById('review-mode-btn').addEventListener('click', () => filterAndShuffle(true));
    

    // ▼▼▼ シャッフルボタンのイベントリスナーを追加 ▼▼▼
    document.getElementById('shuffle-btn').addEventListener('click', shuffleCurrentCards);
    
    // ▼▼▼ 「画像ありのみ」ボタンのイベントリスナーを追加 ▼▼▼
    document.getElementById('image-only-btn').addEventListener('click', () => filterAndShuffle('imageOnly'));
    
    categoryFilter.addEventListener('change', () => filterAndShuffle('default'));
    document.getElementById('review-mode-btn').addEventListener('click', () => filterAndShuffle('review'));
    
    // ▼▼▼ メモ入力のイベントリスナーを追加 ▼▼▼
    // ユーザーが入力を終えたタイミングで自動保存
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
});