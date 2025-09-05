document.addEventListener('DOMContentLoaded', () => {
  // --- DOM ELEMENTS (変更なし) ---
  const card = document.getElementById('card');
  const cardFront = document.getElementById('card-front');
  const cardBack = document.getElementById('card-back');
  const categoryFilter = document.getElementById('category-filter');
  const progressText = document.getElementById('progress');
  
  // --- STATE (変更なし) ---
  let fullDataset = [];
  let currentCards = [];
  let currentIndex = 0;
  let proficiency = JSON.parse(localStorage.getItem('pharmaProficiency')) || {};

  // --- CSV DATA LOADING (変更なし) ---
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
  // saveProficiency, populateCategories, filterAndShuffleの各関数は変更なし
  function saveProficiency() {
    localStorage.setItem('pharmaProficiency', JSON.stringify(proficiency));
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

  function filterAndShuffle(isReviewMode = false) {
    const selectedCategory = categoryFilter.value;
    let filteredData;

    if (isReviewMode) {
      const reviewIds = Object.keys(proficiency).filter(id => proficiency[id] === 'review');
      filteredData = fullDataset.filter(item => reviewIds.includes(item.id));
      if (filteredData.length === 0) {
        alert('「苦手」にマークされたカードはありません。');
        return;
      }
    } else {
      if (selectedCategory !== 'all') {
        filteredData = fullDataset.filter(item => item.category === selectedCategory);
      } else {
        filteredData = [...fullDataset];
      }
    }
    
    currentCards = filteredData.sort(() => Math.random() - 0.5);
    currentIndex = 0;
    displayCard();
  }

  // ▼▼▼ この関数を修正 ▼▼▼
  // カードが表示される際に、必ず表面に戻す処理を徹底
  function displayCard() {
    // この一行が重要：カードを必ず表面（薬品名）に戻します
    card.classList.remove('is-flipped');
    
    if (currentCards.length === 0) {
      cardFront.textContent = '対象のカードがありません';
      cardBack.textContent = 'フィルターを変更してください';
      progressText.textContent = '0 / 0';
      return;
    }
    
    const cardData = currentCards[currentIndex];
    cardFront.textContent = cardData.drug;
    cardBack.textContent = cardData.mechanism;
    updateProgress();
  }
  
  function updateProgress() {
      progressText.textContent = `${currentIndex + 1} / ${currentCards.length}`;
  }

  // markCard関数は変更なし
  function markCard(status) {
    if (currentCards.length === 0) return;
    const cardId = currentCards[currentIndex].id;
    proficiency[cardId] = status;
    saveProficiency();
    nextCard();
  }

  // ▼▼▼ この関数を修正 ▼▼▼
  function nextCard() {
    if (currentIndex < currentCards.length - 1) {
      currentIndex++;
      displayCard(); // displayCardを呼ぶことで、次のカードが表面で表示される
    } else {
      alert('このカテゴリの最後のカードです！');
    }
  }
  
  // ▼▼▼ 新しい関数を追加 ▼▼▼
  function prevCard() {
    if (currentIndex > 0) {
      currentIndex--;
      displayCard(); // displayCardを呼ぶことで、前のカードが表面で表示される
    } else {
      alert('最初のカードです！');
    }
  }

  // ▼▼▼ この関数を修正 ▼▼▼
  function addEventListeners() {
    card.addEventListener('click', () => card.classList.toggle('is-flipped'));
    
    // 「前へ」ボタンのイベントリスナーを追加
    document.getElementById('prev-btn').addEventListener('click', prevCard);
    
    document.getElementById('next-btn').addEventListener('click', nextCard);
    document.getElementById('mark-learned-btn').addEventListener('click', () => markCard('learned'));
    document.getElementById('mark-review-btn').addEventListener('click', () => markCard('review'));
    
    categoryFilter.addEventListener('change', () => filterAndShuffle(false));
    
    document.getElementById('review-mode-btn').addEventListener('click', () => filterAndShuffle(true));
    
    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('本当にすべての進捗をリセットしますか？')) {
        proficiency = {};
        saveProfrophy();
        alert('進捗をリセットしました。');
        filterAndShuffle();
      }
    });
  }
});