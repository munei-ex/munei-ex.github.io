document.addEventListener('DOMContentLoaded', () => {
  // ==================================================
  // 1. 定数・変数宣言 (Constants & Variables)
  // ==================================================
  // DOM要素
  const card = document.getElementById('card');
  const cardFront = document.getElementById('card-front');
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
  const themeSwitch = document.getElementById('theme-switch-checkbox');
  const searchBox = document.getElementById('search-box');
  const subFilterGroup = document.getElementById('sub-filter-group');
  const tagFilter = document.getElementById('tag-filter');

  // 間隔反復のための設定
  const srsIntervals = [1, 3, 7, 14, 30, 60]; // 復習間隔（日）

  // アプリの状態を管理する変数
  let fullDataset = [];
  let currentCards = [];
  let currentIndex = 0;
  let userProgress = JSON.parse(localStorage.getItem('pharmaUserProgress')) || {};
  let lastAction = null;

  // ==================================================
  // 2. メイン処理 (Main Execution)
  // ==================================================  // CSVファイルを読み込み、成功したらアプリを初期化
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
    
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-mode');
      themeSwitch.checked = true;
    }
  }

  function addEventListeners() {
    card.addEventListener('click', () => {
      card.classList.toggle('is-flipped');
      if (currentCards.length === 0) return;
      const cardData = currentCards[currentIndex];
      if (card.classList.contains('is-flipped') && cardData.plusAlfa && cardData.plusAlfa.trim() !== '') {
        plusAlfaText.innerHTML = cardData.plusAlfa;
        plusAlfaContainer.classList.remove('hidden');
      } else {
        plusAlfaContainer.classList.add('hidden');
      }
    });

    cardImage.onerror = () => { cardImage.style.display = 'none'; };
    
    document.getElementById('prev-btn').addEventListener('click', () => { undoBtn.classList.add('hidden'); lastAction = null; prevCard(); });
    document.getElementById('next-btn').addEventListener('click', () => { undoBtn.classList.add('hidden'); lastAction = null; nextCard(); });
    
    document.getElementById('mark-learned-btn').addEventListener('click', () => markCard('learned'));
    document.getElementById('mark-review-btn').addEventListener('click', () => markCard('review'));
    document.getElementById('undo-btn').addEventListener('click', undoLastAction);
    
    searchBox.addEventListener('input', () => filterAndShuffle('default'));
    categoryFilter.addEventListener('change', () => { updateTagFilter(); filterAndShuffle('default'); });
    tagFilter.addEventListener('change', () => filterAndShuffle('default'));
    
    document.getElementById('review-due-btn').addEventListener('click', () => { categoryFilter.value = 'all'; updateTagFilter(); filterAndShuffle('reviewDue'); });
    document.getElementById('review-mode-btn').addEventListener('click', () => { categoryFilter.value = 'all'; updateTagFilter(); filterAndShuffle('review'); });
    document.getElementById('image-only-btn').addEventListener('click', () => { categoryFilter.value = 'all'; updateTagFilter(); filterAndShuffle('imageOnly'); });
    
    document.getElementById('shuffle-btn').addEventListener('click', () => { filterAndShuffle('default'); showNotification('カードをシャッフルしました！'); });
    
    document.getElementById('gallery-btn').addEventListener('click', () => toggleView(true));
    document.getElementById('back-to-flashcard-btn').addEventListener('click', () => toggleView(false));
    
    themeSwitch.addEventListener('change', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('theme', themeSwitch.checked ? 'dark' : 'light');
    });

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
    plusAlfaContainer.classList.add('hidden');
    
    if (currentCards.length === 0) {
      cardFront.textContent = '対象のカードがありません';
      document.getElementById('card-info-grid').innerHTML = '';
      // ...other UI reset...
      return;
    }
    
    memoTextarea.disabled = false;
    const cardData = currentCards[currentIndex];
    cardFront.textContent = cardData.drug;

    const infoGrid = document.getElementById('card-info-grid');
    infoGrid.innerHTML = ''; // Clear previous content

    const fields = [
      { label: '機序', key: 'mechanism' },
      { label: '適応', key: 'indication' },
      { label: '副作用', key: 'sideEffect' },
      { label: '禁忌', key: 'contraindication' },
      { label: '相互作用', key: 'interaction' }
    ];

    const availableFields = [];
    fields.forEach(field => {
      if (cardData[field.key] && cardData[field.key].trim() !== '') {
        availableFields.push(field);
      }
    });

    // --- New Centering Logic ---
    if (availableFields.length === 1) {
      // If only one item, center it
      infoGrid.className = 'single-item';
      infoGrid.innerHTML = `<dd>${availableFields[0].key === 'mechanism' ? cardData.mechanism : cardData[availableFields[0].key]}</dd>`;
    } else {
      // If multiple items, use the grid layout
      infoGrid.className = 'multi-item';
      availableFields.forEach(field => {
        infoGrid.innerHTML += `
          <dt>${field.label}</dt>
          <dd>${cardData[field.key]}</dd>
        `;
      });
    }
    // --- End of New Logic ---

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

  function updateTagFilter() {
    const selectedCategory = categoryFilter.value;
    const tags = new Set();
    fullDataset
      .filter(item => item.category === selectedCategory && item.tags)
      .forEach(item => {
        item.tags.split(',').forEach(tag => tags.add(tag.trim()));
      });

    if (tags.size > 0) {
      tagFilter.innerHTML = '<option value="all">すべて</option>';
      tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
      });
      subFilterGroup.classList.remove('hidden');
    } else {
      subFilterGroup.classList.add('hidden');
    }
  }
  
  // (populateCategories, populateGallery, toggleView, showNotification, updateProgress は変更なし)
  function updateProgress() { progressText.textContent = `${currentIndex + 1} / ${currentCards.length}`; }
  function populateCategories() { const categories = [...new Set(fullDataset.map(item => item.category))]; categories.forEach(category => { const option = document.createElement('option'); option.value = category; option.textContent = category; categoryFilter.appendChild(option); }); }
  function populateGallery() { galleryGrid.innerHTML = ''; const itemsWithImages = fullDataset.filter(item => item.image && item.image.trim() !== ''); itemsWithImages.forEach(item => { const galleryItem = document.createElement('div'); galleryItem.className = 'gallery-item'; const img = document.createElement('img'); img.src = `images/${item.image}`; img.onerror = function() { this.parentElement.style.display = 'none'; }; const name = document.createElement('p'); name.textContent = item.drug; galleryItem.appendChild(img); galleryItem.appendChild(name); galleryGrid.appendChild(galleryItem); }); }
  function toggleView(showGallery) { if (showGallery) { flashcardView.classList.add('hidden'); galleryView.classList.remove('hidden'); } else { flashcardView.classList.remove('hidden'); galleryView.classList.add('hidden'); } }
  function showNotification(message, duration = 2000) { memoStatus.textContent = message; setTimeout(() => { if (memoStatus.textContent === message) { memoStatus.textContent = ''; } }, duration); }

  // ==================================================
  // 5. データ・状態管理系関数 (Data & State Management)
  // ==================================================
  function saveUserProgress() { localStorage.setItem('pharmaUserProgress', JSON.stringify(userProgress)); }
  function saveMemo() { if (currentCards.length === 0) return; const cardId = currentCards[currentIndex].id; if (!userProgress[cardId]) userProgress[cardId] = {}; userProgress[cardId].memo = memoTextarea.value; saveUserProgress(); showNotification('メモを保存しました！'); }

  function markCard(status) {
    if (currentCards.length === 0) return;
    const cardId = currentCards[currentIndex].id;
    if (!userProgress[cardId]) userProgress[cardId] = {};
    const previousProgress = JSON.parse(JSON.stringify(userProgress[cardId]));
    lastAction = { cardId, previousProgress };
    undoBtn.classList.remove('hidden');
    if (status === 'learned') {
      const currentLevel = userProgress[cardId].srsLevel || 0;
      const interval = srsIntervals[Math.min(currentLevel, srsIntervals.length - 1)];
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);
      userProgress[cardId].status = 'learning';
      userProgress[cardId].srsLevel = currentLevel + 1;
      userProgress[cardId].reviewDate = nextReviewDate.toISOString();
    } else if (status === 'review') {
      userProgress[cardId].status = 'review';
      userProgress[cardId].srsLevel = 0;
      delete userProgress[cardId].reviewDate;
    }
    saveUserProgress();
    nextCard();
  }
  
  function undoLastAction() {
    if (!lastAction) return;
    const { cardId, previousProgress } = lastAction;
    userProgress[cardId] = previousProgress;
    saveUserProgress();
    showNotification('操作を取り消しました。');
    lastAction = null;
    undoBtn.classList.add('hidden');
  }

  function filterAndShuffle(mode = 'default') {
    const searchTerm = searchBox.value.toLowerCase();
    let baseData = fullDataset;
    if (searchTerm) {
      baseData = fullDataset.filter(item => item.drug.toLowerCase().includes(searchTerm) || item.mechanism.toLowerCase().includes(searchTerm));
    }
    
    const selectedCategory = categoryFilter.value;
    let filteredData;

    switch (mode) {
      case 'reviewDue':
        const today = new Date().toISOString();
        filteredData = baseData.filter(item => userProgress[item.id] && userProgress[item.id].status === 'learning' && userProgress[item.id].reviewDate <= today);
        if (filteredData.length === 0) { showNotification('今日復習するカードはありません。'); return; }
        break;
      case 'review':
        filteredData = baseData.filter(item => userProgress[item.id]?.status === 'review');
        if (filteredData.length === 0) { showNotification('「苦手」にマークされたカードはありません。'); return; }
        break;
      case 'imageOnly':
        filteredData = baseData.filter(item => item.image && item.image.trim() !== '');
        if (filteredData.length === 0) { showNotification('画像のあるカードはありません。'); return; }
        break;
      default:
        let categoryFilteredData = (selectedCategory === 'all') ? [...baseData] : baseData.filter(item => item.category === selectedCategory);
        const selectedTag = tagFilter.value;
        if (!subFilterGroup.classList.contains('hidden') && selectedTag !== 'all') {
          filteredData = categoryFilteredData.filter(item => item.tags && item.tags.split(',').map(t => t.trim()).includes(selectedTag));
        } else {
          filteredData = categoryFilteredData;
        }
        break;
    }
    
    currentCards = filteredData.sort(() => Math.random() - 0.5);
    currentIndex = 0;
    displayCard();
  }

  // ==================================================
  // 6. カード操作系関数 (Card Navigation & Actions)
  // ==================================================
  function nextCard() { if (currentIndex < currentCards.length - 1) { currentIndex++; displayCard(); } else { showNotification('このカテゴリの最後のカードです！'); } }
  function prevCard() { if (currentIndex > 0) { currentIndex--; displayCard(); } else { showNotification('最初のカードです！'); } }
});