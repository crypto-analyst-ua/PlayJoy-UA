// Конфігурація Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDW7Jy2Ij1KPILAu24ZelhUCtviajfRP6g",
  authDomain: "playjoy-ua.firebaseapp.com",
  projectId: "playjoy-ua",
  storageBucket: "playjoy-ua.firebasestorage.app",
  messagingSenderId: "551110290374",
  appId: "1:551110290374:web:3d8626477999542a24a0c7"
};

// Константи для EmailJS
const EMAILJS_SERVICE_ID = "boltmaster-2025";
const EMAILJS_TEMPLATE_ID = "template_2csi2fp";
const EMAILJS_USER_ID = "hYmYimcQ5x5Mu_skB";

// Массив файлів з товарами
const PRODUCT_FILES = [
    'toys1.json',
    'toys2.json', 
    'toys3.json',
    'toys4.json',
    'toys5.json',
    'toys6.json'
];

// Названия поставщиков для отображения
const SUPPLIER_NAMES = {
    'toys1.json': 'Поставщик "kiddisvit"',
    'toys2.json': 'Поставщик "toytoytrade"', 
    'toys3.json': 'Поставщик "Веселые Игрушки"',
    'toys4.json': 'Поставщик "Развивайка"',
    'toys5.json': 'Поставщик "ToyLand"',
    'toys6.json': 'Поставщик "Happy Toys"',
    'firebase': 'Основной склад',
    'default': 'Без поставщика'
};

// Ініціалізація Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Константи додатка
const ADMIN_PASSWORD = "Lenok1378@";
const CART_STORAGE_KEY = "children_toys_cart";
const FAVORITES_STORAGE_KEY = "children_toys_favorites";
const FEED_URL_KEY = "children_toys_feed_url";
const FEED_UPDATE_TIME_KEY = "children_toys_feed_update";
const VIEW_MODE_KEY = "children_toys_view_mode";
const ADMINS_STORAGE_KEY = "children_toys_admins";
const GENDER_FILTER_KEY = "children_toys_gender_filter";
const AD_CONFIG = {
  MAX_AD_PRODUCTS: 8,
  SHOW_AD_EVERY: 4,
  AD_TYPES: {
    DISCOUNT: 'discount',
    POPULAR: 'popular',
    NEW: 'new',
    RELATED: 'related'
  }
};

// ===== ФУНКЦИЯ ДЛЯ ВХОДА ЧЕРЕЗ GOOGLE =====
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Добавляем дополнительные scopes при необходимости
    provider.addScope('profile');
    provider.addScope('email');
    
    auth.signInWithPopup(provider)
        .then((result) => {
            // Успешный вход
            const user = result.user;
            
            // Проверяем, новый ли это пользователь
            const isNewUser = result.additionalUserInfo?.isNewUser || false;
            
            if (isNewUser) {
                showNotification("Реєстрація через Google успішна!");
            } else {
                showNotification("Вхід через Google успішний!");
            }
            
            closeModal();
            
            // Проверяем права администратора после входа
            checkAdminStatus(user.uid);
        })
        .catch((error) => {
            console.error("Помилка входу через Google: ", error);
            
            let errorMessage = "Помилка входу через Google";
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    errorMessage = "Вікно авторизації закрито користувачем";
                    break;
                case 'auth/cancelled-popup-request':
                    errorMessage = "Запит авторизації скасовано";
                    break;
                case 'auth/popup-blocked':
                    errorMessage = "Вспливаюче вікно заблоковано браузером. Дозвольте спливаючі вікна для цього сайту";
                    break;
            }
            
            showNotification(errorMessage, "error");
        });
}

// ===== ФУНКЦИЯ ПОЛУЧЕНИЯ ИМЕНИ ПОСТАВЩИКА =====
function getSupplierName(source) {
    return SUPPLIER_NAMES[source] || `Поставщик (${source})`;
}

// ===== СЛОВНИК ПЕРЕКЛАДУ КАТЕГОРІЙ =====
const categoryTranslations = {
    "Конструкторы": "Конструктори",
    "Куклы": "Ляльки",
    "Машинки": "Машинки",
    "Настольные игры": "Настільні ігри",
    "Мягкие игрушки": "М'які іграшки",
    "Развивающие игрушки": "Розвиваючі іграшки",
    "Спортивные игрушки": "Спортивні іграшки",
    "Творчество": "Творчість",
    "Детский транспорт": "Дитячий транспорт",
    "Для малышей": "Для малюків",
    "Игровые наборы": "Ігрові набори",
    "Головоломки": "Головоломки",
    "Музыкальные игрушки": "Музичні іграшки",
    "Книги для детей": "Книги для дітей",
    "Одежда для кукол": "Одяг для ляльок",
    "Аксессуары для игрушек": "Аксесуари для іграшок",
    "Все категории": "Всі категорії",
    "Новинки": "Новинки",
    "Распродажа": "Розпродаж",
    "Популярное": "Популярне",
    "Застосувати": "Застосувати"
};

// ===== УЛУЧШЕННАЯ СИСТЕМА ПОИСКА =====

// Константи для оптимізації пошуку
const SEARCH_CONFIG = {
  MAX_RESULTS: 1000,
  DEBOUNCE_DELAY: 150,
  MAX_HISTORY: 10,
  MAX_CACHE_SIZE: 200,
  MIN_QUERY_LENGTH: 2
};

// Розширений словник синонімів для пошуку
const searchSynonyms = {
  // Російські синоніми
  'конструктор': ['лего', 'строитель', 'сборка'],
  'лего': ['конструктор', 'строитель'],
  'кукла': ['пупс', 'барби', 'лялька'],
  'машинка': ['автомобиль', 'тачка', 'машина'],
  'мягкая игрушка': ['плюшевая', 'плюш', 'мишка'],
  'пазл': ['головоломка', 'мозаика'],
  'настольная игра': ['настолка', 'board game'],
  'развивающая': ['обучающая', 'образовательная'],
  'творчество': ['рисование', 'лепка', 'рукоделие'],
  
  // Українські синоніми
  'конструктор': ['лего', 'будівельник', 'збірка'],
  'лего': ['конструктор', 'будівельник'],
  'лялька': ['пупс', 'барбі', 'кукла'],
  'машинка': ['автомобіль', 'тачка', 'машина'],
  'мяка іграшка': ['плюшева', 'плюш', 'ведмедик'],
  'пазл': ['головоломка', 'мозаїка'],
  'настільна гра': ['настолка', 'board game'],
  'розвиваюча': ['навчальна', 'освітня'],
  'творчість': ['малювання', 'ліпка', 'рукоділля']
};

// Словник опечаток
const searchTypos = {
  'конструктор': ['конструктер', 'конструктор', 'конструктора', 'конструкторов'],
  'лего': ['лего', 'лега', 'легое', 'легов'],
  'кукла': ['кукла', 'кукли', 'куклу', 'куклой'],
  'машинка': ['машинка', 'машина', 'машинку', 'машинок'],
  'пазл': ['пазл', 'пазла', 'пазлов', 'пазлы'],
  'игрушка': ['игрушка', 'игрушки', 'игрушку', 'игрушек'],
  'настольная': ['настольная', 'настолная', 'настолная', 'настольних'],
  'развивающая': ['развивающая', 'развиваюшая', 'развивающая', 'развивающих']
};

// Глобальные переменные для поиска
let searchTimeout = null;
const searchCache = new Map();
let searchLoading = false;
const SEARCH_HISTORY_KEY = "instruforge_search_history";

// Переменные для аудио-поиска
let recognition = null;
let isListening = false;

// Функція для перевода категорий
function translateCategory(category) {
    if (!category) return '';
    return categoryTranslations[category] || category;
}

// Функция исправления опечаток
function fixCommonTypos(query) {
  if (!query || query.length < 2) return query;
  
  let fixedQuery = query.toLowerCase();
  
  Object.entries(searchTypos).forEach(([correct, mistakes]) => {
    mistakes.forEach(mistake => {
      if (fixedQuery.includes(mistake)) {
        fixedQuery = fixedQuery.replace(mistake, correct);
      }
    });
  });
  
  return fixedQuery;
}

// Улучшенная нормализация текста
function normalizeSearchTerm(term) {
  if (!term) return '';
  
  let normalized = term.toLowerCase()
    .replace(/[єё]/g, 'е')
    .replace(/[ї]/g, 'и') 
    .replace(/[і]/g, 'и')
    .replace(/[ґ]/g, 'г')
    .replace(/[ы]/g, 'и')
    .replace(/[э]/g, 'е')
    .replace(/[ъь]/g, '')
    .replace(/[^а-яa-z0-9\-\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Исправляем опечатки
  normalized = fixCommonTypos(normalized);
  
  return normalized;
}

// Расширение поискового запроса синонимами
function expandSearchQuery(query) {
  const words = query.split(' ');
  const expanded = [...words];
  
  words.forEach(word => {
    const normalizedWord = normalizeSearchTerm(word);
    
    if (searchSynonyms[normalizedWord]) {
      expanded.push(...searchSynonyms[normalizedWord]);
    }
  });
  
  return [...new Set(expanded)].join(' ');
}

// Функция расчета релевантности
function calculateRelevance(product, searchTerms) {
  if (!product || !searchTerms) return 0;
  
  let score = 0;
  const searchText = searchTerms.toLowerCase();
  
  // Приоритеты совпадений
  if (product.title && product.title.toLowerCase().includes(searchText)) {
    score += 100;
    // Бонус за точное совпадение в начале названия
    if (product.title.toLowerCase().startsWith(searchText)) score += 50;
  }
  
  if (product.brand && product.brand.toLowerCase().includes(searchText)) score += 50;
  if (product.category && product.category.toLowerCase().includes(searchText)) score += 30;
  if (product.description && product.description.toLowerCase().includes(searchText)) score += 10;
  
  // Поиск по артикулам и кодам
  if (product.sku && product.sku.toLowerCase().includes(searchText)) score += 80;
  
  // Бонусы за дополнительные параметры
  if (product.isPopular) score += 20;
  if (product.isNew) score += 15;
  if (product.inStock) score += 10;
  if (product.discount) score += 5;
  
  return score;
}

// Удаление дубликатов в результатах
function removeDuplicateResults(results) {
  const seen = new Set();
  const uniqueResults = [];
  
  for (const product of results) {
    const key = `${product.title}_${product.brand}_${product.price}_${product.sku || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(product);
    }
  }
  
  return uniqueResults;
}

// Улучшенная функция поиска с ранжированием
function searchProductsEnhanced(searchTerm) {
  if (!searchTerm || searchTerm.trim().length < 1) {
    return products;
  }
  
  const normalizedSearch = normalizeSearchTerm(searchTerm);
  const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length >= 1);
  
  if (searchWords.length === 0) {
    return products;
  }
  
  const expandedQuery = expandSearchQuery(normalizedSearch);
  const expandedWords = expandedQuery.split(/\s+/).filter(word => word.length >= 1);
  
  let results = products.filter(product => {
    if (!product.searchIndex) return false;
    
    // Ищем товары, которые содержат ВСЕ слова из запроса
    const allWordsMatch = searchWords.every(word => 
      product.searchIndex.includes(word)
    );
    
    // Если не нашли по всем словам, ищем по расширенному запросу
    if (!allWordsMatch && expandedWords.length > searchWords.length) {
      return expandedWords.some(word => 
        product.searchIndex.includes(word)
      );
    }
    
    return allWordsMatch;
  });
  
  // Ограничение количества результатов
  if (results.length > SEARCH_CONFIG.MAX_RESULTS) {
    results = results.slice(0, SEARCH_CONFIG.MAX_RESULTS);
  }
  
  // Ранжирование по релевантности
  results.forEach(product => {
    product.relevanceScore = calculateRelevance(product, searchTerm);
  });
  
  // Сортировка по релевантности
  results.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    
    // Вторичная сортировка
    if (a.isPopular && !b.isPopular) return -1;
    if (!a.isPopular && b.isPopular) return 1;
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;
    
    return 0;
  });
  
  // Удаление дубликатов
  results = removeDuplicateResults(results);
  
  return results;
}

// Основная функция поиска
function searchProducts(searchTerm) {
  if (!searchTerm || searchTerm.trim().length < 1) {
    return products;
  }
  
  return searchProductsEnhanced(searchTerm);
}

// Управление истории поиска
function saveToSearchHistory(query) {
  if (!query || query.trim().length < 2) return;
  
  const cleanQuery = query.trim();
  const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
  const newHistory = [cleanQuery, ...history.filter(item => item !== cleanQuery)].slice(0, SEARCH_CONFIG.MAX_HISTORY);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
}

function getSearchHistory() {
  return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
}

function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
  showNotification('Історію пошуку очищено');
  
  // Обновляем отображение подсказок, если они открыты
  hideSearchSuggestions(false);
  hideSearchSuggestions(true);
}

function removeFromSearchHistory(term) {
  const history = getSearchHistory();
  const newHistory = history.filter(item => item !== term);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
}

// Улучшенные подсказки с историей
function getEnhancedSearchSuggestions(query) {
  try {
    if (!query || query.length < 1) {
      // Показываем историю поиска когда поле пустое
      return getSearchHistorySuggestions();
    }
    
    const normalizedQuery = normalizeSearchTerm(query);
    
    if (searchCache.has(normalizedQuery)) {
      return searchCache.get(normalizedQuery);
    }
    
    const suggestions = [];
    const seen = new Set();
    
    const maxProductsToCheck = Math.min(products.length, 200);
    
    for (let i = 0; i < maxProductsToCheck; i++) {
      const product = products[i];
      if (!product || typeof product !== 'object') continue;
      
      const fieldsToCheck = [
        { field: 'title', type: 'Назва', icon: '🔧', relevance: 10 },
        { field: 'brand', type: 'Бренд', icon: '🏷️', relevance: 8 },
        { field: 'category', type: 'Категорія', icon: '📂', relevance: 6 },
        { field: 'sku', type: 'Артикул', icon: '#️⃣', relevance: 9 }
      ];
      
      for (const { field, type, icon, relevance } of fieldsToCheck) {
        if (product[field] && !seen.has(product[field])) {
          const fieldValue = String(product[field]);
          const normalizedField = normalizeSearchTerm(fieldValue);
          
          if (normalizedField.includes(normalizedQuery)) {
            seen.add(product[field]);
            suggestions.push({ 
              value: product[field], 
              type: type, 
              icon: icon,
              productId: product.id,
              relevance: relevance + (field === 'title' ? 5 : 0)
            });
          }
        }
      }
      
      if (suggestions.length >= 8) break;
    }
    
  // Добавляем быстрые действия если мало результатов
  if (suggestions.length < 3) {
    suggestions.push({
      type: 'action',
      icon: '🔍',
      value: `Знайти "${query}"`,
      action: 'search',
      relevance: 100
    });
  }
  
  suggestions.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
  
  // Очистка кэша
  if (searchCache.size > SEARCH_CONFIG.MAX_CACHE_SIZE) {
    const keys = Array.from(searchCache.keys()).slice(0, 20);
    keys.forEach(key => searchCache.delete(key));
  }
  
  const finalSuggestions = suggestions.slice(0, 6);
  searchCache.set(normalizedQuery, finalSuggestions);
  return finalSuggestions;
} catch (error) {
  console.error("Ошибка в поиске подсказок:", error);
  return getFallbackSuggestions(query);
}
}

// Подсказки из истории поиска
function getSearchHistorySuggestions() {
const history = getSearchHistory();
return history.slice(0, 5).map(term => ({
  type: 'history',
  icon: '🕒',
  value: term,
  action: 'search',
  relevance: 100
}));
}

// Резервные подсказки при ошибке
function getFallbackSuggestions(query) {
return [
  {
    type: 'action',
    icon: '🔍',
    value: `Знайти "${query}"`,
    action: 'search',
    relevance: 100
  }
];
}

// Функция для экранирования HTML
function escapeHtml(text) {
const div = document.createElement('div');
div.textContent = text;
return div.innerHTML;
}

// Показать историю поиска
function showSearchHistorySuggestions(isMobile = false) {
const history = getSearchHistory();

const searchContainer = isMobile 
  ? document.querySelector('.search-container-mobile') 
  : document.querySelector('.search-container');

if (!searchContainer) return;

const suggestionsId = isMobile ? 'search-suggestions-mobile' : 'search-suggestions';
let suggestionsContainer = document.getElementById(suggestionsId);

if (!suggestionsContainer) {
  suggestionsContainer = document.createElement('div');
  suggestionsContainer.id = suggestionsId;
  suggestionsContainer.className = 'search-suggestions' + (isMobile ? ' mobile-suggestions' : '');
  searchContainer.appendChild(suggestionsContainer);
}

suggestionsContainer.innerHTML = '';

// Добавляем заголовок истории поиска
if (history.length > 0) {
  const historyHeader = document.createElement('div');
  historyHeader.className = 'search-suggestion-header';
  historyHeader.innerHTML = `
    <span>Історія пошуку</span>
    <button class="clear-all-history-btn" onclick="event.stopPropagation(); clearSearchHistory()">
      <i class="fas fa-trash"></i> Очистити все
    </button>
  `;
  suggestionsContainer.appendChild(historyHeader);
}

if (history.length === 0) {
  const emptyHistory = document.createElement('div');
  emptyHistory.className = 'search-suggestion';
  emptyHistory.innerHTML = `
    <i class="fas fa-history"></i>
    <span class="suggestion-text">Історія пошуку порожня</span>
  `;
  suggestionsContainer.appendChild(emptyHistory);
  suggestionsContainer.style.display = 'block';
  return;
}

history.slice(0, 5).forEach((term, index) => {
  const div = document.createElement('div');
  div.className = `search-suggestion ${index === 0 ? 'active' : ''}`;
  div.innerHTML = `
    <i class="fas fa-history"></i>
    <span class="suggestion-text">${escapeHtml(term)}</span>
    <span class="suggestion-type">Історія</span>
    <button class="clear-history-btn" onclick="event.stopPropagation(); removeFromSearchHistory('${term}')">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  div.addEventListener('click', () => {
    if (isMobile) {
      document.getElementById('search-mobile').value = term;
    } else {
      document.getElementById('search').value = term;
    }
    currentFilters.search = term;
    applyFilters();
    hideSearchSuggestions(isMobile);
  });
  
  suggestionsContainer.appendChild(div);
});

suggestionsContainer.style.display = 'block';
}

// Функция показа подсказок
function showSearchSuggestions(query, isMobile = false) {
if (!query || query.length < 1) {
  showSearchHistorySuggestions(isMobile);
  return;
}

const suggestions = getEnhancedSearchSuggestions(query);
const searchContainer = isMobile 
  ? document.querySelector('.search-container-mobile') 
  : document.querySelector('.search-container');

if (!searchContainer) return;

const suggestionsId = isMobile ? 'search-suggestions-mobile' : 'search-suggestions';
let suggestionsContainer = document.getElementById(suggestionsId);

if (!suggestionsContainer) {
  suggestionsContainer = document.createElement('div');
  suggestionsContainer.id = suggestionsId;
  suggestionsContainer.className = 'search-suggestions' + (isMobile ? ' mobile-suggestions' : '');
  searchContainer.appendChild(suggestionsContainer);
}

if (suggestions.length > 0) {
  suggestionsContainer.innerHTML = '';
  
  suggestions.forEach((suggestion, index) => {
    const div = document.createElement('div');
    div.className = `search-suggestion ${suggestion.type === 'action' ? 'suggestion-action' : ''} ${index === 0 ? 'active' : ''}`;
    
    if (suggestion.type === 'action') {
      div.innerHTML = `
        ${suggestion.icon} 
        <span class="suggestion-text">${escapeHtml(suggestion.value)}</span>
      `;
      
      div.addEventListener('click', () => {
        if (suggestion.action === 'search') {
          const searchValue = suggestion.value.replace(/^Знайти "/, '').replace(/"$/, '');
          if (isMobile) {
            document.getElementById('search-mobile').value = searchValue;
          } else {
            document.getElementById('search').value = searchValue;
          }
          currentFilters.search = searchValue;
          applyFilters();
        }
        hideSearchSuggestions(isMobile);
      });
    } else if (suggestion.type === 'history') {
      div.innerHTML = `
        ${suggestion.icon} 
        <span class="suggestion-text">${escapeHtml(suggestion.value)}</span>
        <span class="suggestion-type">Історія</span>
        <button class="clear-history-btn" onclick="event.stopPropagation(); removeFromSearchHistory('${suggestion.value}')">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      div.addEventListener('click', () => {
        if (isMobile) {
          document.getElementById('search-mobile').value = suggestion.value;
        } else {
          document.getElementById('search').value = suggestion.value;
        }
        currentFilters.search = suggestion.value;
        applyFilters();
        hideSearchSuggestions(isMobile);
      });
    } else {
      div.innerHTML = `
        ${suggestion.icon} 
        <span class="suggestion-text">${escapeHtml(suggestion.value)}</span>
        <span class="suggestion-type">${suggestion.type}</span>
      `;
      
      div.addEventListener('click', () => {
        if (isMobile) {
          document.getElementById('search-mobile').value = suggestion.value;
        } else {
          document.getElementById('search').value = suggestion.value;
        }
        currentFilters.search = suggestion.value;
        applyFilters();
        hideSearchSuggestions(isMobile);
        
        if (suggestion.productId) {
          showProductDetail(suggestion.productId);
        }
      });
    }
    
    div.addEventListener('mouseenter', () => {
      suggestionsContainer.querySelectorAll('.search-suggestion').forEach(s => 
        s.classList.remove('active')
      );
      div.classList.add('active');
    });
    
    suggestionsContainer.appendChild(div);
  });
  
  suggestionsContainer.style.display = 'block';
} else {
  suggestionsContainer.style.display = 'none';
}
}

// Функция для скрытия подсказок
function hideSearchSuggestions(isMobile = false) {
const suggestionsId = isMobile ? 'search-suggestions-mobile' : 'search-suggestions';
const suggestionsContainer = document.getElementById(suggestionsId);
if (suggestionsContainer) {
  suggestionsContainer.style.display = 'none';
  suggestionsContainer.querySelectorAll('.search-suggestion').forEach(s => 
    s.classList.remove('active')
  );
}
}

// ===== АУДИО ПОИСК =====

// Инициализация аудио поиска
function initVoiceSearch() {
// Проверяем поддержку браузером
if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
  console.log('Браузер не поддерживает распознавание речи');
  return;
}

// Создаем объект распознавания речи
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
recognition = new SpeechRecognition();

// Настройки распознавания
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = 'uk-UA'; // Украинский язык

// Обработчики событий
recognition.onstart = function() {
  isListening = true;
  updateVoiceSearchUI(true);
  showNotification('Слухаю... Говоріть now', 'info');
};

recognition.onresult = function(event) {
  const transcript = event.results[0][0].transcript;
  
  // Вставляем результат в поле поиска
  const searchInput = document.getElementById('search');
  const searchMobileInput = document.getElementById('search-mobile');
  
  if (searchInput) {
    searchInput.value = transcript;
    searchInput.dispatchEvent(new Event('input'));
  }
  
  if (searchMobileInput) {
    searchMobileInput.value = transcript;
    searchMobileInput.dispatchEvent(new Event('input'));
  }
  
  // Сохраняем в историю поиска
  saveToSearchHistory(transcript);
  
  showNotification(`Знайдено за запитом: "${transcript}"`, 'success');
};

recognition.onerror = function(event) {
  isListening = false;
  updateVoiceSearchUI(false);
  
  let errorMessage = 'Помилка розпізнавання мови';
  switch (event.error) {
    case 'no-speech':
      errorMessage = 'Мова не розпізнана. Спробуйте ще раз.';
      break;
    case 'audio-capture':
      errorMessage = 'Мікрофон не знайдено або відсутній дозвіл.';
      break;
    case 'not-allowed':
      errorMessage = 'Дозвіл на використання мікрофона не надано.';
      break;
    default:
      errorMessage = `Помилка: ${event.error}`;
  }
  
  showNotification(errorMessage, 'error');
};

recognition.onend = function() {
  isListening = false;
  updateVoiceSearchUI(false);
};
}

// Функция для запуска/остановки аудио поиска
function toggleVoiceSearch(isMobile = false) {
if (!recognition) {
  showNotification('Аудіопошук не підтримується вашим браузером', 'error');
  return;
}

if (isListening) {
  recognition.stop();
  isListening = false;
  updateVoiceSearchUI(false);
  showNotification('Аудіопошук зупинено', 'info');
} else {
  try {
    recognition.start();
  } catch (error) {
    console.error('Ошибка запуска распознавания:', error);
    showNotification('Помилка запуску аудіопошуку', 'error');
  }
}
}

// Обновление UI для аудио поиска
function updateVoiceSearchUI(listening) {
const voiceButtons = document.querySelectorAll('.voice-search-btn');

voiceButtons.forEach(btn => {
  if (listening) {
    btn.classList.add('listening');
    btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    btn.title = 'Зупинити аудіопошук';
  } else {
    btn.classList.remove('listening');
    btn.innerHTML = '<i class="fas fa-microphone"></i>';
    btn.title = 'Голосовий пошук';
  }
});
}

// Добавление кнопок аудио поиска в UI
function addVoiceSearchButtons() {
// Для десктопной версии
const searchContainer = document.querySelector('.search-container');
if (searchContainer) {
  const voiceBtn = document.createElement('button');
  voiceBtn.type = 'button';
  voiceBtn.className = 'voice-search-btn';
  voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
  voiceBtn.title = 'Голосовий пошук';
  voiceBtn.onclick = () => toggleVoiceSearch(false);
  
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.parentNode.insertBefore(voiceBtn, searchInput.nextSibling);
  }
}

// Для мобильной версии
const searchMobileContainer = document.querySelector('.search-container-mobile');
if (searchMobileContainer) {
  const voiceBtnMobile = document.createElement('button');
  voiceBtnMobile.type = 'button';
  voiceBtnMobile.className = 'voice-search-btn mobile';
  voiceBtnMobile.innerHTML = '<i class="fas fa-microphone"></i>';
  voiceBtnMobile.title = 'Голосовий пошук';
  voiceBtnMobile.onclick = () => toggleVoiceSearch(true);
  
  const searchMobileInput = document.getElementById('search-mobile');
  if (searchMobileInput) {
    searchMobileInput.parentNode.insertBefore(voiceBtnMobile, searchMobileInput.nextSibling);
  }
}
}

// ===== КОНЕЦ АУДИО ПОИСКА =====

// Настройка обработчиков поиска
function setupSearchHandler() {
const searchInput = document.getElementById('search');
const searchMobileInput = document.getElementById('search-mobile');
let lastSearchValue = '';

function handleSearch(value, isMobile = false) {
  if (value === lastSearchValue) return;
  
  clearTimeout(searchTimeout);
  
  searchTimeout = setTimeout(() => {
    lastSearchValue = value;
    currentFilters.search = value;
    
    if (value.length >= 1) {
      showSearchSuggestions(value, isMobile);
    } else {
      showSearchHistorySuggestions(isMobile);
    }
    
    applyFilters();
  }, SEARCH_CONFIG.DEBOUNCE_DELAY);
}

// Обработчик для десктопного поиска
if (searchInput) {
  searchInput.addEventListener('input', function() {
    const currentValue = this.value.trim();
    handleSearch(currentValue, false);
    if (searchMobileInput) {
      searchMobileInput.value = currentValue;
    }
  });
  
  // Обработчик фокуса - показываем историю
  searchInput.addEventListener('focus', function() {
    if (this.value === '') {
      showSearchHistorySuggestions(false);
    }
  });
  
  searchInput.addEventListener('keydown', function(e) {
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (!suggestionsContainer || suggestionsContainer.style.display === 'none') return;
    
    const suggestions = suggestionsContainer.querySelectorAll('.search-suggestion');
    let activeSuggestion = suggestionsContainer.querySelector('.search-suggestion.active');
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!activeSuggestion) {
          suggestions[0]?.classList.add('active');
        } else {
          activeSuggestion.classList.remove('active');
          const next = activeSuggestion.nextElementSibling || suggestions[0];
          next.classList.add('active');
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (!activeSuggestion) {
          suggestions[suggestions.length - 1]?.classList.add('active');
        } else {
          activeSuggestion.classList.remove('active');
          const prev = activeSuggestion.previousElementSibling || suggestions[suggestions.length - 1];
          prev.classList.add('active');
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (activeSuggestion) {
          activeSuggestion.click();
        } else {
          // Сохраняем поиск в историю при нажатии Enter
          saveToSearchHistory(this.value);
        }
        break;
        
      case 'Escape':
        hideSearchSuggestions(false);
        this.value = '';
        currentFilters.search = '';
        applyFilters();
        break;
    }
  });
}

// Обработчик для мобильного поиска
if (searchMobileInput) {
  searchMobileInput.addEventListener('input', function() {
    const currentValue = this.value.trim();
    handleSearch(currentValue, true);
    if (searchInput) {
      searchInput.value = currentValue;
    }
  });
  
  searchMobileInput.addEventListener('focus', function() {
    if (this.value === '') {
      showSearchHistorySuggestions(true);
    }
  });
  
  searchMobileInput.addEventListener('keydown', function(e) {
    const suggestionsContainer = document.getElementById('search-suggestions-mobile');
    if (!suggestionsContainer || suggestionsContainer.style.display === 'none') return;
    
    const suggestions = suggestionsContainer.querySelectorAll('.search-suggestion');
    let activeSuggestion = suggestionsContainer.querySelector('.search-suggestion.active');
    
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (activeSuggestion) {
          activeSuggestion.click();
        } else {
          // Сохраняем поиск в историю при нажатии Enter
          saveToSearchHistory(this.value);
        }
        break;
        
      case 'Escape':
        hideSearchSuggestions(true);
        this.value = '';
        currentFilters.search = '';
        applyFilters();
        break;
    }
  });
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.search-container') && !e.target.closest('.search-container-mobile')) {
    hideSearchSuggestions(false);
    hideSearchSuggestions(true);
  }
});
}

// Добавление CSS для улучшенного поиска
function addSearchStyles() {
const style = document.createElement('style');
style.textContent = `
  .search-container {
    position: relative;
    width: 100%;
  }
  
  .search-container-mobile {
    position: relative;
    width: 100%;
    margin: 10px 0;
  }
  
  .search-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;
    display: none;
  }
  
  .mobile-suggestions {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 10px;
    right: 10px;
    max-height: 50vh;
    border-radius: 8px 8px 0 0;
  }
  
  .search-suggestion {
    padding: 12px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.2s;
  }
  
  .search-suggestion:hover,
  .search-suggestion.active {
    background-color: #f8f9fa;
  }
  
  .search-suggestion:last-child {
    border-bottom: none;
  }
  
  .suggestion-text {
    flex: 1;
    font-weight: 500;
    font-size: 14px;
  }
  
  .suggestion-type {
    font-size: 0.75em;
    color: #6c757d;
    background: #e9ecef;
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  .suggestion-action {
    background-color: #f8f9fa;
    font-weight: bold;
  }
  
  .suggestion-clear-history {
    border-top: 1px solid #eee;
    color: #666;
    font-size: 0.9em;
  }
  
  .clear-history-btn {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 2px 5px;
    border-radius: 3px;
    margin-left: auto;
  }
  
  .clear-history-btn:hover {
    background: #f0f0f0;
    color: #e74c3c;
  }
  
  .search-suggestion-header {
    padding: 8px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    font-size: 0.8em;
    font-weight: 600;
    color: #6c757d;
  }
  
  .clear-all-history-btn {
    background: none;
    border: none;
    color: #e74c3c;
    cursor: pointer;
    font-size: 0.75em;
    padding: 2px 6px;
    border-radius: 3px;
  }
  
  .clear-all-history-btn:hover {
    background: #f8d7da;
  }
  
  /* Стили для аудио поиска */
  .voice-search-btn {
    position: absolute;
    right: 40px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.3s ease;
    z-index: 2;
  }
  
  .voice-search-btn:hover {
    background: #f0f0f0;
    color: #333;
  }
  
  .voice-search-btn.listening {
    background: #e74c3c;
    color: white;
    animation: pulse 1.5s infinite;
  }
  
  .voice-search-btn.mobile {
    right: 40px;
  }
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(231, 76, 60, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(231, 76, 60, 0);
    }
  }
  
  /* Адаптация полей поиска под кнопки */
  .search-container input,
  .search-container-mobile input {
    padding-right: 80px !important;
  }
  
  @media (max-width: 768px) {
    .search-container {
      display: none;
    }
    
    .voice-search-btn:not(.mobile) {
      display: none;
    }
  }
  
  @media (min-width: 769px) {
    .search-container-mobile {
      display: none;
    }
    
    .voice-search-btn.mobile {
      display: none;
    }
  }
`;
document.head.appendChild(style);
}

// Инициализация улучшенного поиска
function initEnhancedSearch() {
addSearchStyles();
setupSearchHandler();
initVoiceSearch();
addVoiceSearchButtons();
}

// ===== КОНЕЦ УЛУЧШЕННОЙ СИСТЕМЫ ПОИСКА =====

let products = [];
let cart = {};
let favorites = {};
let adminMode = false;
let showingFavorites = false;
let currentUser = null;
let currentPage = 1;
const productsPerPage = 36;
let isProductsLoading = false;
let currentFilters = {
  category: '',
  brand: '',
  minPrice: null,
  maxPrice: null,
  sort: 'default',
  search: '',
  availability: '',
  source: '',
  gender: 'all'
};

// Глобальная переменная для рейтинга
let currentRating = 0;

// Функція для налаштування лічильника переглядів
function setupPageCounter() {
  const params = new URLSearchParams({
      style: 'flat-square',
      label: 'Views',
      color: 'blue',
      logo: 'firebase'
  });

  // Беремо шлях поточної сторінки
  const currentPath = window.location.pathname;

  // Робимо лічильник для boltmaster-2025.web.app
  const counterURL = `https://hits.sh/boltmaster-2025.web.app${currentPath}.svg?${params.toString()}`;
  const pageViewsElement = document.getElementById('page-views');
  if (pageViewsElement) {
      pageViewsElement.src = counterURL;
  }
}

// Функція отправки email с данными заказа
function sendOrderEmail(orderId, order) {
  let itemsList = '';
  for (const [productId, quantity] of Object.entries(order.items)) {
    const product = products.find(p => p.id === productId);
    if (product) {
      itemsList += `
        <tr>
          <td>${product.title}</td>
          <td>${quantity}</td>
          <td>${formatPrice(product.price)} ₴</td>
          <td>${formatPrice(product.price * quantity)} ₴</td>
        </tr>
      `;
    }
  }
  
  const templateParams = {
    to_email: "korovinkonstantin0@gmail.com",
    order_id: orderId,
    customer_name: order.userName,
    customer_email: order.userEmail,
    customer_phone: order.userPhone,
    delivery_service: order.delivery.service,
    delivery_city: order.delivery.city,
    delivery_warehouse: order.delivery.warehouse,
    payment_method: order.paymentMethod === 'cash' ? 'Готівкою при отриманні' : 'Онлайн-оплата карткою',
    total_amount: formatPrice(order.total),
    items: itemsList,
    order_date: new Date().toLocaleString('uk-UA')
  };

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then(function(response) {
      console.log('Email успешно отправлен!', response.status, response.text);
    }, function(error) {
      console.error('Ошибка отправки email:', error);
    });
}

// Функція для завантаження товарів з JSON файлу
function loadProductsFromJson() {
  isProductsLoading = true;
  renderProducts(); // Показать скелетоны при начале загрузки
  
  const promises = PRODUCT_FILES.map(file => 
      fetch(file)
          .then(response => {
              if (!response.ok) {
                  console.warn(`Файл ${file} не знайдено, пропускаємо`);
                  return [];
              }
              return response.json();
          })
          .then(productsArray => {
              return productsArray.map(product => ({
                  ...product,
                  source: file,
                  isPopular: product.isPopular || false
              }));
          })
          .catch(error => {
              console.warn(`Помилка завантаження файлу ${file}:`, error);
              return [];
          })
  );

  return Promise.all(promises)
      .then(results => {
          let allProducts = [];
          results.forEach(productsArray => {
              if (Array.isArray(productsArray)) {
                  allProducts = allProducts.concat(productsArray);
              }
          });
          
          if (allProducts.length === 0) {
              const backup = localStorage.getItem('products_backup');
              if (backup) {
                  const backupProducts = JSON.parse(backup);
                  isProductsLoading = false;
                  return backupProducts;
              }
              throw new Error('Не вдалося завантажити товари з жодного файлу');
          }
          
          isProductsLoading = false;
          return shuffleArray(allProducts);
      })
      .catch(error => {
          isProductsLoading = false;
          throw error;
      });
}

// Функция проверки доступности JSON файлов
async function checkFilesAvailability() {
    const availability = {};
    
    for (const file of PRODUCT_FILES) {
        try {
            const response = await fetch(file, { method: 'HEAD' });
            availability[file] = response.ok;
        } catch (error) {
            availability[file] = false;
        }
    }
    
    document.querySelectorAll('.source-tab').forEach(tab => {
        const onclickAttr = tab.getAttribute('onclick');
        const match = onclickAttr.match(/switchSource\('([^']+)'/);
        if (match && match[1] !== 'all') {
            const file = match[1];
            if (!availability[file]) {
                tab.style.display = 'none';
            }
        }
    });
}

// Улучшенная предобработка товаров
function preprocessProducts(productsArray) {
  console.log("🔧 Предобработка товаров для умного поиска...");
  
  const processedProducts = productsArray.map((product, index) => {
    if (!product || typeof product !== 'object') return product;
    
    // Создаем уникальный ID если его нет
    if (!product.id) {
      product.id = `product_${Date.now()}_${index}`;
    }
    
    const searchFields = [
      product.title || '',
      product.title || '',
      product.title || '', // высокая важность (повторяем 3 раза)
      product.brand || '',
      product.brand || '', // средняя важность (повторяем 2 раза)
      product.category || '',
      product.description || '',
      product.specifications || '',
      product.model || '',
      product.sku || ''
    ];
    
    const normalizedFields = searchFields.map(field => 
      normalizeSearchTerm(String(field || ''))
    );
    
    const searchIndex = normalizedFields.join(' ').toLowerCase();
    
    return {
      ...product,
      searchIndex,
      title: product.title || 'Без назви',
      brand: product.brand || '',
      category: product.category || '',
      description: product.description || '',
      price: Number(product.price) || 0,
      image: product.image || '',
      inStock: product.inStock !== undefined ? product.inStock : true,
      specifications: product.specifications || '',
      model: product.model || '',
      sku: product.sku || ''
    };
  });
  
  console.log(`✅ Обработано ${processedProducts.length} товаров`);
  return processedProducts;
}

// ===== СИСТЕМА РЕКЛАМНЫХ БЛОКОВ =====

// ===== РЕКЛАМНЫЕ ФУНКЦИИ =====
function getAdProducts(type = AD_CONFIG.AD_TYPES.POPULAR, count = 4, excludeId = null) {
  let adProducts = [...products];
  
  if (excludeId) {
    adProducts = adProducts.filter(p => p.id !== excludeId);
  }
  
  switch(type) {
    case AD_CONFIG.AD_TYPES.DISCOUNT:
      adProducts = adProducts.filter(p => p.discount && p.discount > 0);
      break;
    case AD_CONFIG.AD_TYPES.POPULAR:
      adProducts = adProducts.filter(p => p.isPopular);
      break;
    case AD_CONFIG.AD_TYPES.NEW:
      adProducts = adProducts.filter(p => p.isNew);
      break;
    case AD_CONFIG.AD_TYPES.RELATED:
      if (excludeId) {
        const currentProduct = products.find(p => p.id === excludeId);
        if (currentProduct && currentProduct.category) {
          adProducts = adProducts.filter(p => 
            p.category === currentProduct.category && p.id !== excludeId
          );
        }
      }
      break;
  }
  
  if (adProducts.length < count) {
    const randomProducts = [...products]
      .filter(p => !adProducts.some(ap => ap.id === p.id))
      .filter(p => !excludeId || p.id !== excludeId)
      .slice(0, count - adProducts.length);
    adProducts = [...adProducts, ...randomProducts];
  }
  
  return shuffleArray(adProducts).slice(0, count);
}

function renderAdBlock(type, title, containerId, excludeId = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const adProducts = getAdProducts(type, 4, excludeId);
  
  if (adProducts.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  container.innerHTML = `
    <div class="ad-block">
      <div class="ad-header">
        <h3>${title}</h3>
        <div class="ad-badge">
          <i class="fas fa-ad"></i> Реклама
        </div>
      </div>
      <div class="ad-products">
        ${adProducts.map(product => `
          <div class="ad-product-card" onclick="showProductDetail('${product.id}')">
            ${product.discount ? `<div class="ad-discount">-${product.discount}%</div>` : ''}
            ${product.isNew ? '<div class="ad-new">Новинка</div>' : ''}
            <img src="${product.image || 'https://via.placeholder.com/150x150?text=No+Image'}" 
                 alt="${product.title}" 
                 loading="lazy">
            <div class="ad-product-info">
              <h4>${product.title}</h4>
              <div class="ad-price">
                <span>${formatPrice(product.price)} ₴</span>
                ${product.oldPrice ? `<span class="ad-old-price">${formatPrice(product.oldPrice)} ₴</span>` : ''}
              </div>
              <button class="btn btn-buy" onclick="event.stopPropagation(); addToCart('${product.id}')">
                <i class="fas fa-shopping-cart"></i> Купити
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  container.style.display = 'block';
}

function renderCatalogAds() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  
  const currentProducts = getFilteredProducts();
  const adContainerId = "catalog-ad-container";
  
  const oldAd = document.getElementById(adContainerId);
  if (oldAd) oldAd.remove();
  
  const adContainer = document.createElement('div');
  adContainer.id = adContainerId;
  adContainer.className = 'catalog-ad-container';
  
  let adType = AD_CONFIG.AD_TYPES.POPULAR;
  let adTitle = 'Популярні товари';
  
  if (currentFilters.category) {
    adType = AD_CONFIG.AD_TYPES.RELATED;
    adTitle = `Можливо, вас зацікавить "${currentFilters.category}"`;
  } else if (currentFilters.search) {
    adType = AD_CONFIG.AD_TYPES.POPULAR;
    adTitle = `Рекомендуємо подивитися`;
  }
  
  adContainer.innerHTML = `
    <div class="ad-block">
      <div class="ad-header">
        <h3>${adTitle}</h3>
        <div class="ad-badge">
          <i class="fas fa-ad"></i> Реклама
        </div>
      </div>
      <div class="ad-products" id="catalog-ad-products"></div>
    </div>
  `;
  
  if (grid.children.length > 2) {
    grid.insertBefore(adContainer, grid.children[2]);
  } else {
    grid.appendChild(adContainer);
  }
  
  const adProductsContainer = document.getElementById("catalog-ad-products");
  const adProducts = getAdProducts(adType, 4);
  
  adProductsContainer.innerHTML = adProducts.map(product => `
    <div class="ad-product-card" onclick="showProductDetail('${product.id}')">
      ${product.discount ? `<div class="ad-discount">-${product.discount}%</div>` : ''}
      ${product.isNew ? '<div class="ad-new">Новинка</div>' : ''}
      <img src="${product.image || 'https://via.placeholder.com/150x150?text=No+Image'}" 
           alt="${product.title}" 
           loading="lazy">
      <div class="ad-product-info">
        <h4>${product.title}</h4>
        <div class="ad-price">
          <span>${formatPrice(product.price)} ₴</span>
          ${product.oldPrice ? `<span class="ad-old-price">${formatPrice(product.oldPrice)} ₴</span>` : ''}
        </div>
        <button class="btn btn-buy" onclick="event.stopPropagation(); addToCart('${product.id}')">
          <i class="fas fa-shopping-cart"></i> Купити
        </button>
      </div>
    </div>
  `).join('');
}

function renderHomePageAds() {
  renderAdBlock(
    AD_CONFIG.AD_TYPES.POPULAR,
    'Популярні товари',
    'home-ad-popular'
  );
  
  renderAdBlock(
    AD_CONFIG.AD_TYPES.DISCOUNT,
    'Акційні пропозиції',
    'home-ad-discount'
  );
  
  renderAdBlock(
    AD_CONFIG.AD_TYPES.NEW,
    'Новинки',
    'home-ad-new'
  );
}

function renderProductAd(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  renderAdBlock(
    AD_CONFIG.AD_TYPES.RELATED,
    `Можливо, вас зацікавить "${product.category}"`,
    'product-ad-related',
    productId
  );
}

function renderCartAd() {
  const cartProductIds = Object.keys(cart);
  if (cartProductIds.length === 0) return;
  
  const firstProductId = cartProductIds[0];
  const firstProduct = products.find(p => p.id === firstProductId);
  
  if (!firstProduct) return;
  
  renderAdBlock(
    AD_CONFIG.AD_TYPES.RELATED,
    `Доповніть ваше замовлення`,
    'cart-ad-related',
    firstProductId
  );
}

function addAdsToRenderProducts() {
  const originalRenderProducts = renderProducts;
  
  renderProducts = function() {
    originalRenderProducts();
    
    if (!showingFavorites && !currentFilters.search && products.length > 10) {
      setTimeout(renderCatalogAds, 100);
    }
  };
}

function initAds() {
  addAdsToRenderProducts();
  
  const adStyles = document.createElement('style');
  adStyles.textContent = `
    .ad-block {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 20px;
      margin: 30px 0;
      color: white;
      position: relative;
      overflow: hidden;
    }
    
    .ad-block::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
      background-size: 20px 20px;
      opacity: 0.3;
      z-index: 0;
    }
    
    .ad-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      position: relative;
      z-index: 1;
    }
    
    .ad-header h3 {
      margin: 0;
      color: white;
      font-size: 1.5rem;
    }
    
    .ad-badge {
      background: rgba(255, 255, 255, 0.2);
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      backdrop-filter: blur(10px);
    }
    
    .ad-products {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      position: relative;
      z-index: 1;
    }
    
    .ad-product-card {
      background: white;
      border-radius: 10px;
      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      cursor: pointer;
      position: relative;
    }
    
    .ad-product-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    
    .ad-product-card img {
      width: 100%;
      height: 150px;
      object-fit: cover;
    }
    
    .ad-product-info {
      padding: 15px;
    }
    
    .ad-product-info h4 {
      margin: 0 0 10px 0;
      font-size: 0.95rem;
      color: #333;
      height: 40px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    
    .ad-price {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    
    .ad-price span {
      font-weight: bold;
      font-size: 1.1rem;
      color: #2c3e50;
    }
    
    .ad-old-price {
      font-size: 0.9rem;
      color: #95a5a6;
      text-decoration: line-through;
    }
    
    .ad-discount {
      position: absolute;
      top: 10px;
      left: 10px;
      background: #e74c3c;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
      z-index: 2;
    }
    
    .ad-new {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #2ecc71;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
      z-index: 2;
    }
    
    .ad-product-card .btn-buy {
      width: 100%;
      padding: 8px;
      font-size: 0.9rem;
    }
    
    .catalog-ad-container {
      grid-column: 1 / -1;
      margin: 30px 0;
    }
    
    @media (max-width: 768px) {
      .ad-products {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
      }
      
      .ad-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      
      .ad-header h3 {
        font-size: 1.2rem;
      }
    }
    
    @keyframes adAppear {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .ad-block {
      animation: adAppear 0.5s ease-out;
    }
    
    .main-banner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 15px;
      padding: 30px;
      margin: 20px 0;
      color: white;
      position: relative;
      overflow: hidden;
    }
    
    .banner-content {
      position: relative;
      z-index: 2;
    }
    
    .banner-content h2 {
      font-size: 2rem;
      margin-bottom: 10px;
    }
    
    .banner-products {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 25px 0;
    }
    
    .banner-product {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 10px;
      padding: 15px;
      display: flex;
      align-items: center;
      gap: 15px;
      cursor: pointer;
      transition: transform 0.3s ease;
      min-width: 0;
      overflow: hidden;
    }
    
    .banner-product:hover {
      transform: translateY(-5px);
      background: rgba(255, 255, 255, 0.2);
    }
    
    .banner-product img {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 8px;
      flex-shrink: 0;
    }
    
    .banner-product-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }
    
    .banner-product-title {
      font-weight: 500;
      margin-bottom: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .banner-product-price {
      font-weight: bold;
      font-size: 1.1rem;
      color: #ffd700;
    }
    
    @media (max-width: 1024px) {
      .banner-products {
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
      }
    }
    
    @media (max-width: 768px) {
      .main-banner {
        padding: 20px;
        margin: 15px 0;
      }
      
      .banner-content h2 {
        font-size: 1.5rem;
      }
      
      .banner-products {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .banner-product {
        padding: 12px;
        gap: 12px;
      }
      
      .banner-product img {
        width: 50px;
        height: 50px;
      }
      
      .banner-product-title {
        font-size: 0.9rem;
      }
      
      .banner-product-price {
        font-size: 1rem;
      }
    }
    
    @media (max-width: 480px) {
      .main-banner {
        padding: 15px;
        border-radius: 10px;
      }
      
      .banner-content h2 {
        font-size: 1.3rem;
      }
      
      .banner-products {
        gap: 10px;
      }
      
      .banner-product {
        padding: 10px;
        gap: 10px;
      }
    }
  `;
  document.head.appendChild(adStyles);
}

function getSmartAdProducts() {
  const userBehavior = {
    viewedProducts: JSON.parse(localStorage.getItem('user_viewed_products') || '[]'),
    addedToCart: JSON.parse(localStorage.getItem('user_cart_history') || '[]'),
    purchasedProducts: JSON.parse(localStorage.getItem('user_purchased_products') || '[]')
  };
  
  const allViewedIds = [...userBehavior.viewedProducts, ...userBehavior.addedToCart];
  const categoryCounts = {};
  
  allViewedIds.forEach(productId => {
    const product = products.find(p => p.id === productId);
    if (product && product.category) {
      categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
    }
  });
  
  const favoriteCategory = Object.keys(categoryCounts).reduce((a, b) => 
    categoryCounts[a] > categoryCounts[b] ? a : b, ''
  );
  
  if (favoriteCategory) {
    return products
      .filter(p => p.category === favoriteCategory)
      .slice(0, 4);
  }
  
  return getAdProducts(AD_CONFIG.AD_TYPES.POPULAR, 4);
}

function trackUserBehavior(action, productId) {
  let storageKey = '';
  
  switch(action) {
    case 'view':
      storageKey = 'user_viewed_products';
      break;
    case 'add_to_cart':
      storageKey = 'user_cart_history';
      break;
    case 'purchase':
      storageKey = 'user_purchased_products';
      break;
  }
  
  if (storageKey) {
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const newHistory = [productId, ...history.filter(id => id !== productId)].slice(0, 20);
    localStorage.setItem(storageKey, JSON.stringify(newHistory));
  }
}

function renderMainAdBanner() {
  const bannerContainer = document.getElementById('main-ad-banner');
  if (!bannerContainer) return;
  
  const adProducts = getAdProducts(AD_CONFIG.AD_TYPES.POPULAR, 3);
  
  bannerContainer.innerHTML = `
    <div class="main-banner">
      <div class="banner-content">
        <h2>🔥 Гарячі пропозиції!</h2>
        <p>Обирайте краще за найкращою ціною</p>
        <div class="banner-products">
          ${adProducts.map(product => `
            <div class="banner-product" onclick="showProductDetail('${product.id}')">
              <img src="${product.image || 'https://via.placeholder.com/60x60?text=No+Image'}" alt="${product.title}">
              <div class="banner-product-info">
                <span class="banner-product-title">${product.title.substring(0, 30)}...</span>
                <span class="banner-product-price">${formatPrice(product.price)} ₴</span>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-buy" onclick="applyFilters()" style="background: white; color: #667eea; font-weight: bold;">
          <i class="fas fa-bolt"></i> Перейти до покупок
        </button>
      </div>
    </div>
  `;
}
// ===== КОНЕЦ СИСТЕМЫ РЕКЛАМНЫХ БЛОКОВ =====

// ===== СТИЛИ ДЛЯ ОТОБРАЖЕНИЯ РАЗНЫХ ПОСТАВЩИКОВ =====
function addSupplierStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Стили для много-поставщиковой системы */
    .supplier-section {
      border: 2px dashed #e0e0e0;
      border-radius: 10px;
      padding: 15px;
      margin-bottom: 20px;
      background: #f9f9f9;
    }
    
    .supplier-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ddd;
    }
    
    .supplier-badge {
      background: #ff9800;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    
    .multi-supplier-warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .multi-supplier-warning i {
      color: #f39c12;
      font-size: 24px;
    }
    
    .supplier-total {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 5px;
      margin-top: 10px;
      font-weight: bold;
      border-top: 1px solid #dee2e6;
    }
    
    .supplier-order-section {
      background: white;
      border: 2px solid #3498db;
      border-radius: 8px;
      padding: 15px;
      margin: 15px 0;
    }
    
    .supplier-label {
      background: #3498db;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .supplier-total-line {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 5px;
      margin-top: 10px;
      font-weight: bold;
      border-top: 1px solid #dee2e6;
    }
    
    .multi-supplier-notice {
      background: #e8f4fd;
      border-left: 4px solid #3498db;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    /* Иконки для разных поставщиков */
    .supplier-icon-1 { color: #e74c3c; }
    .supplier-icon-2 { color: #3498db; }
    .supplier-icon-3 { color: #2ecc71; }
    .supplier-icon-4 { color: #f39c12; }
    .supplier-icon-5 { color: #9b59b6; }
    .supplier-icon-6 { color: #1abc9c; }
    
    .cart-info-banner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      color: white;
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }
    
    .info-icon {
      font-size: 24px;
      margin-top: 5px;
    }
    
    .info-content h4 {
      margin: 0 0 10px 0;
      color: white;
    }
    
    .info-content ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    
    .info-content li {
      margin: 5px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .parcels-info {
      margin: 20px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .parcel-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 15px 0;
    }
    
    .parcel-card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .parcel-number {
      font-weight: bold;
      font-size: 1.1em;
      margin-bottom: 5px;
    }
    
    .parcel-status {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 5px;
    }
    
    .parcel-supplier {
      font-weight: 500;
      margin-bottom: 10px;
    }
    
    .parcel-notice {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 5px;
      padding: 10px;
      margin-top: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    @media (max-width: 768px) {
      .supplier-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      
      .parcel-cards {
        grid-template-columns: 1fr;
      }
      
      .cart-info-banner {
        flex-direction: column;
      }
    }
  `;
  document.head.appendChild(style);
}

// ===== ФУНКЦИЯ ДЛЯ ГРУППИРОВКИ ТОВАРОВ ПО ПОСТАВЩИКАМ =====
function groupCartItemsBySupplier() {
  const groupedBySource = {};
  
  for (const [productId, quantity] of Object.entries(cart)) {
    const product = products.find(p => p.id === productId);
    if (product) {
      const source = product.source || 'default';
      if (!groupedBySource[source]) {
        groupedBySource[source] = {
          sourceName: getSupplierName(source),
          items: [],
          total: 0
        };
      }
      
      const itemTotal = product.price * quantity;
      groupedBySource[source].items.push({
        product, 
        quantity, 
        itemTotal,
        productId
      });
      groupedBySource[source].total += itemTotal;
    }
  }
  
  return groupedBySource;
}

// Ініціалізація додатка
function initApp() {
  emailjs.init(EMAILJS_USER_ID);
  
  initEnhancedSearch();
  initAds();
  addSupplierStyles(); // Добавляем стили для поставщиков

  // Показать скелетоны сразу при инициализации
  showEnhancedLoadingSkeleton();
  
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      document.getElementById('login-btn').style.display = 'none';
      document.getElementById('user-menu').style.display = 'inline-block';
      document.getElementById('admin-access-btn').style.display = 'inline-block';
      document.getElementById('user-name').textContent = user.displayName || user.email;
      
      checkAdminStatus(user.uid);
    } else {
      currentUser = null;
      document.getElementById('login-btn').style.display = 'inline-block';
      document.getElementById('user-menu').style.display = 'none';
      document.getElementById('admin-access-btn').style.display = 'none';
      document.getElementById("admin-panel").style.display = "none";
      adminMode = false;
    }
  });
  
  // Загрузка товаров
  loadProducts().catch(error => {
    console.error("Помилка завантаження з Firestore, пробуємо завантажити з JSON:", error);
    
    loadProductsFromJson()
      .then(jsonProducts => {
        products = preprocessProducts(jsonProducts);
        window.currentProducts = products;
        updateCartCount();
        renderProducts();
        renderFeaturedProducts();
        renderCategories();
        renderBrands();
        showNotification(`Товари завантажено з ${PRODUCT_FILES.length} файлів`);
        
        localStorage.setItem('products_backup', JSON.stringify(products));
      })
      .catch(jsonError => {
        console.error("");
        showNotification("");
        isProductsLoading = false;
        renderProducts(); // Показать сообщение об ошибке
      });
  }).finally(() => {
      checkFilesAvailability();
  });
  
  const cartData = localStorage.getItem(CART_STORAGE_KEY);
  if(cartData) cart = JSON.parse(cartData);
  
  const favoritesData = localStorage.getItem(FAVORITES_STORAGE_KEY);
  if(favoritesData) favorites = JSON.parse(favoritesData);
  
  const viewMode = localStorage.getItem(VIEW_MODE_KEY) || 'grid';
  setViewMode(viewMode);
  
  updateCartCount();
  
  const feedUrl = localStorage.getItem(FEED_URL_KEY);
  if (feedUrl) {
    document.getElementById("feed-url").value = feedUrl;
  }
  
  // Восстановление фильтра по полу
  const savedGenderFilter = localStorage.getItem(GENDER_FILTER_KEY);
  if (savedGenderFilter) {
    currentFilters.gender = savedGenderFilter;
    updateGenderButtons(savedGenderFilter);
  }
  
  document.getElementById("year").innerText = new Date().getFullYear();
  
  document.getElementById('category').addEventListener('change', function() {
    currentFilters.category = this.value;
    applyFilters();
  });
  
  document.getElementById('brand').addEventListener('change', function() {
    currentFilters.brand = this.value;
    applyFilters();
  });
  
  document.getElementById('sort').addEventListener('change', function() {
    currentFilters.sort = this.value;
    applyFilters();
  });
  
  document.getElementById('availability').addEventListener('change', function() {
    currentFilters.availability = this.value;
    applyFilters();
  });
  
  document.getElementById('price-min').addEventListener('change', function() {
    currentFilters.minPrice = this.value ? parseInt(this.value) : null;
    applyFilters();
  });
  
  document.getElementById('price-max').addEventListener('change', function() {
    currentFilters.maxPrice = this.value ? parseInt(this.value) : null;
    applyFilters();
  });
  
  window.addEventListener('resize', adjustHeaderTitle);
  adjustHeaderTitle();
  
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-container') && !e.target.closest('.search-container-mobile')) {
      hideSearchSuggestions(false);
      hideSearchSuggestions(true);
    }
  });

  // Синхронизация фильтров при загрузке
  setTimeout(() => {
    document.getElementById('mobile-price-min').value = document.getElementById('price-min').value;
    document.getElementById('mobile-price-max').value = document.getElementById('price-max').value;
    document.getElementById('mobile-brand').value = document.getElementById('brand').value;
    document.getElementById('mobile-availability').value = document.getElementById('availability').value;
    document.getElementById('mobile-sort').value = document.getElementById('sort').value;
  }, 1000);
}

// Функции для мобильных фильтров
function toggleMobileFilters() {
    const mobileFilters = document.getElementById('mobile-filters');
    mobileFilters.classList.toggle('active');
    
    // Блокируем прокрутку body при открытых фильтрах
    if (mobileFilters.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function closeMobileFilters() {
    const mobileFilters = document.getElementById('mobile-filters');
    mobileFilters.classList.remove('active');
    document.body.style.overflow = '';
}

function applyMobileFilters() {
    // Синхронизируем значения из мобильных фильтров в основные
    document.getElementById('price-min').value = document.getElementById('mobile-price-min').value;
    document.getElementById('price-max').value = document.getElementById('mobile-price-max').value;
    document.getElementById('brand').value = document.getElementById('mobile-brand').value;
    document.getElementById('availability').value = document.getElementById('mobile-availability').value;
    document.getElementById('sort').value = document.getElementById('mobile-sort').value;
    
    // Применяем фильтры
    applyFilters();
    
    // Закрываем мобильные фильтры
    closeMobileFilters();
}

function resetMobileFilters() {
    // Сбрасываем мобильные фильтры
    document.getElementById('mobile-price-min').value = '';
    document.getElementById('mobile-price-max').value = '';
    document.getElementById('mobile-brand').value = '';
    document.getElementById('mobile-availability').value = '';
    document.getElementById('mobile-sort').value = 'default';
    
    // Сбрасываем основные фильтры
    resetFilters();
    
    // Закрываем мобильные фильтры
    closeMobileFilters();
}

function loadProducts() {
  isProductsLoading = true;
  renderProducts(); // Показать скелетоны сразу при начале загрузки
  
  const cachedProducts = localStorage.getItem('products_cache');
  const cacheTime = localStorage.getItem('products_cache_time');
  
  if (cachedProducts && cacheTime && Date.now() - cacheTime < 300000) {
    products = preprocessProducts(JSON.parse(cachedProducts));
    products = shuffleArray(products);
    window.currentProducts = products;
    isProductsLoading = false;
    updateCartCount();
    renderProducts();
    renderFeaturedProducts();
    renderCategories();
    renderBrands();
    return Promise.resolve();
  }
  
  return db.collection("products")
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
        const data = localStorage.getItem('products_backup');
        if (data) {
          products = preprocessProducts(JSON.parse(data));
          products = shuffleArray(products);
          window.currentProducts = products;
          isProductsLoading = false;
          updateCartCount();
          renderProducts();
          renderFeaturedProducts();
          renderCategories();
          renderBrands();
          return Promise.resolve();
        } else {
          return loadProductsFromJson()
            .then(jsonProducts => {
              products = preprocessProducts(jsonProducts);
              products = shuffleArray(products);
              window.currentProducts = products;
              isProductsLoading = false;
              updateCartCount();
              renderProducts();
              renderFeaturedProducts();
              renderCategories();
              renderBrands();
              showNotification("Товари завантажено з локального файлу");
              
              localStorage.setItem('products_backup', JSON.stringify(products));
            });
        }
      } else {
                products = [];
                querySnapshot.forEach((doc) => {
                    products.push({ id: doc.id, ...doc.data() });
                });
                
                products = preprocessProducts(products);
                products = shuffleArray(products);
                window.currentProducts = products;
        
        localStorage.setItem('products_cache', JSON.stringify(products));
        localStorage.setItem('products_cache_time', Date.now());
        
        isProductsLoading = false;
        updateCartCount();
        renderProducts();
        renderFeaturedProducts();
        renderCategories();
        renderBrands();
        return Promise.resolve();
      }
    })
    .catch((error) => {
      console.error("");
      showNotification("");
      isProductsLoading = false;
      
      const data = localStorage.getItem('products_backup');
      if (data) {
        products = preprocessProducts(JSON.parse(data));
        products = shuffleArray(products);
        window.currentProducts = products;
        updateCartCount();
        renderProducts();
        renderFeaturedProducts();
        renderCategories();
        renderBrands();
        return Promise.resolve();
      } else {
        return Promise.reject(error);
      }
    });
}

// ===== ФУНКЦІЇ ПАГІНАЦІЇ =====

function changePage(page) {
  currentPage = page;
  showLoadingSkeleton();
  
  setTimeout(() => {
    renderProducts();
    updatePagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 100);
}

function updatePagination() {
  const paginationContainer = document.getElementById("pagination");
  if (!paginationContainer) return;
  
  let filteredProducts = getFilteredProducts();
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  paginationContainer.innerHTML = '';
  
  const prevButton = document.createElement('button');
  prevButton.innerHTML = '&laquo;';
  prevButton.disabled = currentPage === 1;
  prevButton.onclick = () => changePage(currentPage - 1);
  paginationContainer.appendChild(prevButton);
  
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const button = document.createElement('button');
    button.textContent = i;
    button.classList.toggle('active', i === currentPage);
    button.onclick = () => changePage(i);
    paginationContainer.appendChild(button);
  }
  
  const nextButton = document.createElement('button');
    nextButton.innerHTML = '&raquo;';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => changePage(currentPage + 1);
    paginationContainer.appendChild(nextButton);
}

// ===== ФУНКЦИЯ ОПРЕДЕЛЕНИЯ ПОЛА ТОВАРА =====
function determineProductGender(product) {
  if (!product) return 'unisex';
  
  // Если у товара есть явное поле gender
  if (product.gender) {
    return product.gender;
  }
  
  const productTitle = product.title ? product.title.toLowerCase() : '';
  const productCategory = product.category ? product.category.toLowerCase() : '';
  const productDescription = product.description ? product.description.toLowerCase() : '';
  const productBrand = product.brand ? product.brand.toLowerCase() : '';
  
  // Объединяем весь текст для анализа
  const allText = `${productTitle} ${productCategory} ${productDescription} ${productBrand}`;
  
  // Нормализуем текст (убираем украинские буквы для лучшего сопоставления)
  const normalizedText = allText
    .replace(/[єё]/g, 'е')
    .replace(/[ї]/g, 'и')
    .replace(/[і]/g, 'и')
    .replace(/[ґ]/g, 'г');
  
  // Ключевые слова для девочек (расширенный список)
  const girlKeywords = [
    'лялька', 'лялк', 'барби', 'барбі', 'принцесса', 'принцеса',
    'кукла', 'кукл', 'пони', 'фея', 'фея', 'русалка', 'русалочка',
    'сердце', 'серце', 'цветок', 'квітка', 'розовый', 'рожевий',
    'розов', 'рожев', 'фиолетовый', 'фіолетовий', 'бирюзовый', 'бірюзовий',
    'платье', 'сукня', 'юбка', 'спідниця', 'блузка', 'блузк',
    'туфли', 'туфлі', 'балетки', 'балетк', 'макияж', 'макіяж',
    'косметика', 'космет', 'украшение', 'прикраса', 'серьги', 'сережка',
    'браслет', 'браслет', 'ожерелье', 'намисто', 'венок', 'віночок',
    'диадема', 'тиара', 'перчатки', 'рукавички', 'сумочка', 'сумочк',
    'медведик', 'ведмедик', 'зайчик', 'зайч', 'котенок', 'кошеня',
    'щенок', 'цуденя', 'мягкая', 'м\'яка', 'игрушка', 'іграшка',
    'для девоч', 'для дівч', 'девочк', 'дівч', 'girl', 'для girls'
  ];
  
  // Ключевые слова для мальчиков (расширенный список)
  const boyKeywords = [
    'конструктор', 'конструкт', 'лего', 'lego', 'машинка', 'машинк',
    'автомобиль', 'автомобіль', 'трактор', 'трактор', 'экскаватор', 'екскаватор',
    'бульдозер', 'бульдозер', 'робот', 'робот', 'трансформер', 'трансформер',
    'супергерой', 'супергеро', 'бетмен', 'batman', 'спайдермен', 'spiderman',
    'танк', 'танк', 'самолет', 'літак', 'вертолет', 'вертоліт',
    'космос', 'космос', 'спорт', 'спорт', 'футбол', 'футбол',
    'баскетбол', 'баскетбол', 'мяч', 'м\'яч', 'ракетка', 'ракетк',
    'пистолет', 'пістолет', 'меч', 'меч', 'рыцарь', 'лицар',
    'динозавр', 'динозавр', 'динозаври', 'динозавр', 'робототехника', 'робототехніка',
    'техника', 'техніка', 'инструмент', 'інструмент', 'пила', 'пил',
    'молоток', 'молоток', 'отвертка', 'викрутка', 'гаечный', 'гайковий',
    'ключ', 'ключ', 'паяльник', 'паяльник', 'дрель', 'дриль',
    'для мальчик', 'для хлопч', 'мальчик', 'хлопч', 'boy', 'для boys'
  ];
  
  // Считаем совпадения
  let girlScore = 0;
  let boyScore = 0;
  
  girlKeywords.forEach(keyword => {
    if (normalizedText.includes(keyword)) {
      girlScore++;
    }
  });
  
  boyKeywords.forEach(keyword => {
    if (normalizedText.includes(keyword)) {
      boyScore++;
    }
  });
  
  // Определяем пол на основе счетчиков с пороговым значением
  if (girlScore > boyScore && girlScore > 0) {
    return 'girl';
  } else if (boyScore > girlScore && boyScore > 0) {
    return 'boy';
  } else if (girlScore === boyScore && girlScore > 0) {
    return 'unisex';
  }
  
  // Если не найдено ключевых слов, проверяем категории
  const girlCategories = ['куклы', 'ляльки', 'для девочек', 'для дівчаток'];
  const boyCategories = ['конструкторы', 'конструктори', 'машинки', 'для мальчиков', 'для хлопчиків'];
  
  if (girlCategories.some(cat => productCategory.includes(cat))) {
    return 'girl';
  } else if (boyCategories.some(cat => productCategory.includes(cat))) {
    return 'boy';
  }
  
  return 'unisex';
}

// ===== ФУНКЦИЯ ФИЛЬТРАЦИИ ПО ПОЛУ =====
function filterByGender(gender) {
  currentFilters.gender = gender;
  localStorage.setItem(GENDER_FILTER_KEY, gender);
  
  // Обновляем активные кнопки
  updateGenderButtons(gender);
  
  // Сбрасываем страницу и применяем фильтры
  currentPage = 1;
  applyFilters();
}

function updateGenderButtons(activeGender) {
  const genderButtons = document.querySelectorAll('.gender-btn');
  genderButtons.forEach(btn => {
    const gender = btn.getAttribute('onclick').match(/filterByGender\('(\w+)'\)/)[1];
    if (gender === activeGender) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function getFilteredProducts() {
  let filteredProducts = [...products];
  
  if (showingFavorites) {
    filteredProducts = filteredProducts.filter(product => favorites[product.id]);
  }
  
  if (currentFilters.search) {
    filteredProducts = searchProducts(currentFilters.search);
  }
  
  if (currentFilters.category) {
    filteredProducts = filteredProducts.filter(product => 
      product.category === currentFilters.category
    );
  }
  
  if (currentFilters.brand) {
    filteredProducts = filteredProducts.filter(product => 
      product.brand === currentFilters.brand
    );
  }
  
  if (currentFilters.minPrice) {
    filteredProducts = filteredProducts.filter(product => 
      product.price >= currentFilters.minPrice
    );
  }
  
  if (currentFilters.maxPrice) {
    filteredProducts = filteredProducts.filter(product => 
      product.price <= currentFilters.maxPrice
    );
  }
  
  if (currentFilters.availability) {
    filteredProducts = filteredProducts.filter(product => 
      currentFilters.availability === 'in-stock' ? product.inStock : !product.inStock
    );
  }
  
  if (currentFilters.source) {
    filteredProducts = filteredProducts.filter(product => 
      product.source === currentFilters.source
    );
  }
  
  // Фільтр по полу (додано) - УЛУЧШЕННАЯ ВЕРСИЯ
  if (currentFilters.gender && currentFilters.gender !== 'all') {
    filteredProducts = filteredProducts.filter(product => {
      const productGender = determineProductGender(product);
      
      if (currentFilters.gender === 'girl') {
        return productGender === 'girl' || productGender === 'unisex';
      } else if (currentFilters.gender === 'boy') {
        return productGender === 'boy' || productGender === 'unisex';
      }
      
      return true;
    });
  }
  
  switch (currentFilters.sort) {
    case 'price-asc':
      filteredProducts.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      filteredProducts.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'name-desc':
      filteredProducts.sort((a, b) => b.title.localeCompare(a.title));
      break;
    default:
      filteredProducts.sort((a, b) => {
        if (a.isPopular && !b.isPopular) return -1;
        if (!a.isPopular && b.isPopular) return 1;
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        
        return 0;
      });
      break;
  }
  
  return filteredProducts;
}

// ===== КІНЕЦЬ ФУНКЦІЙ ФІЛЬТРАЦІЇ ПО ПОЛУ =====

// Функція для завантаження XML-фіду
async function loadFromFeed() {
  const messageElement = document.getElementById("feed-message");
  messageElement.textContent = "Завантаження даних...";
  
  const feedUrl = localStorage.getItem(FEED_URL_KEY) || document.getElementById("feed-url").value;
  
  if (!feedUrl) {
    messageElement.textContent = "Введіть URL фіду";
    showNotification("Введіть URL фіду для завантаження");
    return;
  }
  
  if (document.getElementById("feed-url").value) {
    localStorage.setItem(FEED_URL_KEY, document.getElementById("feed-url").value);
  }
  
  try {
    const proxyUrl = 'https://corsproxy.io/?';
    const response = await fetch(proxyUrl + encodeURIComponent(feedUrl));
    
    if (!response.ok) {
      throw new Error(`Помилка HTTP: ${response.status}`);
    }
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Помилка парсингу XML");
    }
    
    let items = [];
    const offers = xmlDoc.getElementsByTagName("offer");
    
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      const id = offer.getAttribute("id") || `feed-${i}`;
      const getValue = (tagName) => {
        const element = offer.getElementsByTagName(tagName)[0];
        return element ? element.textContent.trim() : "";
      };
      
      const title = getValue("name") || getValue("title") || getValue("model");
      const priceText = getValue("price");
      const price = priceText ? parseFloat(priceText.replace(/[^0-9.,]/g, "").replace(",", ".")) : 0;
      const description = getValue("description") || "";
      const brand = getValue("vendor") || getValue("brand") || "Невідомо";
      
      let image = "";
      const pictureElement = offer.getElementsByTagName("picture")[0];
      if (pictureElement) {
        image = pictureElement.textContent.trim();
      }
      
      const category = getValue("category") || "Без категорії";
      
      items.push({
        id,
        title,
        price,
        description,
        image: image,
        category,
        brand,
        fromFeed: true,
        inStock: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    if (items.length === 0) {
      throw new Error("Не знайдено товарів у фіді");
    }
    
    const batch = db.batch();
    const productsRef = db.collection("products");
    
    for (const item of items) {
      const productRef = productsRef.doc(item.id);
      batch.set(productRef, item, { merge: true });
    }
    
    await batch.commit();
    
    localStorage.setItem(FEED_UPDATE_TIME_KEY, new Date().getTime());
    
    messageElement.textContent = `Завантажено ${items.length} товарів`;
    showNotification("Дані успішно завантажені з фіду");
    
  } catch (error) {
    console.error("Помилка завантаження фіду:", error);
    messageElement.textContent = `Помилка: ${error.message}`;
    showNotification("Помилка завантаження даних з фіду", "error");
  }
}

// Збереження продуктів в Firestore
function saveProduct(product) {
  const productData = {
    ...product,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  if (!product.id) {
    productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    productData.id = generateId();
  }
  
  const productRef = db.collection("products").doc(productData.id);
  
  return productRef.set(productData, { merge: true })
    .then(() => {
      showNotification("Товар успішно збережено");
      loadProducts();
      return productData.id;
    })
    .catch((error) => {
      console.error("Помилка збереження товару: ", error);
      showNotification("Помилка збереження товару", "error");
      
      if (!product.id) {
        product.id = generateId();
        products.push(product);
      } else {
        const index = products.findIndex(p => p.id === product.id);
        if (index !== -1) {
          products[index] = product;
        } else {
          products.push(product);
        }
      }
      
      localStorage.setItem('products_backup', JSON.stringify(products));
      renderProducts();
      
      return product.id;
    });
}

// Генерація ID для нового товару
function generateId() {
  return 'product-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Показати скелетон завантаження
function showLoadingSkeleton() {
  const grid = document.getElementById("product-grid");
  grid.innerHTML = '';
  
  for (let i = 0; i < 8; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "card";
    skeleton.innerHTML = `
      <div class="skeleton-img"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text" style="width: 80%;"></div>
      <div class="skeleton-price"></div>
      <div class="skeleton-text" style="height: 36px; margin-top: 15px;"></div>
    `;
    grid.appendChild(skeleton);
  }
}

// Добавьте эту функцию для улучшенного отображения скелетонов
function showEnhancedLoadingSkeleton() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  
  grid.innerHTML = '';
  
  // Показать больше скелетонов для лучшего UX
  const skeletonCount = window.innerWidth <= 768 ? 4 : 8;
  
  for (let i = 0; i < skeletonCount; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "card skeleton-item";
    skeleton.innerHTML = `
      <div class="skeleton-img"></div>
      <div class="skeleton-title"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text" style="width: 80%;"></div>
      <div class="skeleton-price"></div>
      <div class="skeleton-text" style="height: 36px; margin-top: 15px;"></div>
    `;
    grid.appendChild(skeleton);
  }
  
  document.getElementById('products-count').textContent = 'Завантаження товарів...';
}

// Рендеринг продуктів
function renderProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  
  grid.innerHTML = '';
  
  // Показать скелетоны если товары еще загружаются
  if (isProductsLoading) {
    showLoadingSkeleton();
    document.getElementById('products-count').textContent = 'Завантаження товарів...';
    return;
  }
  
  let filteredProducts = getFilteredProducts();
  
  document.getElementById('products-title').textContent = showingFavorites ? 'Обрані товари' : '';
  document.getElementById('products-count').textContent = `Знайдено: ${filteredProducts.length}`;
  
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);
  
  if (paginatedProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-search"></i>
        <h3>Товари не знайдено</h3>
        <p>Спробуйте змінити параметри фільтрации</p>
      </div>
    `;
    updatePagination();
    return;
  }
  
  const viewMode = localStorage.getItem(VIEW_MODE_KEY) || 'grid';
  const isListView = viewMode === 'list';
  
  if (isListView) {
    grid.classList.add('list-view');
  } else {
    grid.classList.remove('list-view');
  }
  
  paginatedProducts.forEach(product => {
    const card = document.createElement("div");
    card.className = "card";
    
    const isFavorite = favorites[product.id];
    
    card.innerHTML = `
  ${product.discount ? `<div class="card-discount">-${product.discount}%</div>` : ''}
  ${product.isNew ? '<div class="card-badge">Новинка</div>' : ''}
  <img src="${product.image || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${product.title}" loading="lazy">
  <h3>${product.title}</h3>
  <div class="price-container">
    <span class="price">${formatPrice(product.price)} ₴</span>
    ${product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)} ₴</span>` : ''}
  </div>
  
  <div class="card-actions">
    <button class="btn btn-buy" onclick="addToCart('${product.id}')">
      <i class="fas fa-shopping-cart"></i> Купити
    </button>
    <button class="btn btn-detail" onclick="showProductDetail('${product.id}')">
      <i class="fas fa-info"></i> Детальніше
    </button>
    <button class="btn-favorite ${isFavorite ? 'active' : ''}" onclick="toggleFavorite('${product.id}')">
      <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
    </button>
  </div>
`;
    
    grid.appendChild(card);
  });
  
  updatePagination();
}

// Рендеринг популярных товаров
function renderFeaturedProducts() {
  const featuredContainer = document.getElementById("featured-products");
  featuredContainer.innerHTML = '';
  
  let featuredProducts = [];
  
  const popularProducts = products.filter(product => product.isPopular);
  
  if (popularProducts.length >= 3) {
    featuredProducts = shuffleArray(popularProducts).slice(0, 5);
  } else {
    featuredProducts = shuffleArray([...products]).slice(0, 5);
  }
  
  featuredProducts.forEach(product => {
    const item = document.createElement("div");
    item.className = "featured-item";
    item.innerHTML = `
      <img src="${product.image || 'https://via.placeholder.com/60x60?text=No+Image'}" alt="${product.title}">
      <div class="featured-item-info">
        <h4 class="featured-item-title">${product.title}</h4>
        <div class="featured-item-price">${formatPrice(product.price)} ₴</div>
      </div>
    `;
    
    item.addEventListener('click', () => showProductDetail(product.id));
    featuredContainer.appendChild(item);
  });
}

// Рендеринг категорії
function renderCategories() {
  const categorySelect = document.getElementById("category");
  
  while (categorySelect.options.length > 1) {
    categorySelect.remove(1);
  }
  
  const categories = [...new Set(products.map(product => product.category))].filter(Boolean);
  
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = translateCategory(category);
    categorySelect.appendChild(option);
  });
  
  renderCategoriesList();
}

// Функция для рендеринга списка категорий
function renderCategoriesList() {
    const categoriesList = document.getElementById('categories-list');
    const mobileCategoriesList = document.getElementById('mobile-categories-list');
    
    if (!categoriesList || !mobileCategoriesList) return;

    const categoryCounts = {};
    products.forEach(product => {
        if (product.category) {
            categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
        }
    });

    const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

    let categoriesHTML = '';
    let mobileCategoriesHTML = '';

    // Для десктопной версии
    categoriesHTML += `
        <div class="category-item active" onclick="selectCategory('')">
            Всі категорії
            <span class="category-count">${products.length}</span>
        </div>
    `;

    // Для мобильной версии
    mobileCategoriesHTML += `
        <div class="category-item active" onclick="selectMobileCategory('')">
            Всі категорії
            <span class="category-count">${products.length}</span>
        </div>
    `;

    sortedCategories.forEach(category => {
        categoriesHTML += `
            <div class="category-item" onclick="selectCategory('${category}')">
                ${translateCategory(category)}
                <span class="category-count">${categoryCounts[category]}</span>
            </div>
        `;
        
        mobileCategoriesHTML += `
            <div class="category-item" onclick="selectMobileCategory('${category}')">
                ${translateCategory(category)}
                <span class="category-count">${categoryCounts[category]}</span>
            </div>
        `;
    });

    categoriesList.innerHTML = categoriesHTML;
    mobileCategoriesList.innerHTML = mobileCategoriesHTML;
}

// Функция выбора категории
function selectCategory(category) {
    document.getElementById('category').value = category;
    
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (category === '') {
        document.querySelectorAll('.category-item')[0].classList.add('active');
    } else {
        const categoryItems = document.querySelectorAll('.category-item');
        for (let item of categoryItems) {
            if (item.textContent.includes(translateCategory(category))) {
                item.classList.add('active');
                break;
            }
        }
    }
    
    currentFilters.category = category;
    applyFilters();
}

// Функция выбора категории для мобильной версии
function selectMobileCategory(category) {
    document.getElementById('category').value = category;
    
    document.querySelectorAll('#mobile-categories-list .category-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (category === '') {
        document.querySelectorAll('#mobile-categories-list .category-item')[0].classList.add('active');
    } else {
        const categoryItems = document.querySelectorAll('#mobile-categories-list .category-item');
        for (let item of categoryItems) {
            if (item.textContent.includes(translateCategory(category))) {
                item.classList.add('active');
                break;
            }
        }
    }
    
    currentFilters.category = category;
}

// Рендеринг брендів
function renderBrands() {
  const brandSelect = document.getElementById("brand");
  
  while (brandSelect.options.length > 1) {
    brandSelect.remove(1);
  }
  
  const brands = [...new Set(products.map(product => product.brand))].filter(Boolean);
  
  brands.forEach(brand => {
    const option = document.createElement("option");
    option.value = brand;
    option.textContent = brand;
    brandSelect.appendChild(option);
  });
}

// Форматування ціни
function formatPrice(price) {
  return new Intl.NumberFormat('uk-UA').format(price);
}

// Показати сповіщення
function showNotification(message, type = "success") {
  const notification = document.getElementById("notification");
  const text = document.getElementById("notification-text");
  text.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.add("show");
  
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

// Додавання товару в кошик
function addToCart(productId) {
  if (!cart[productId]) {
    cart[productId] = 0;
  }
  cart[productId]++;
  
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  
  updateCartCount();
  
  // Добавляем отслеживание добавления в корзину
  trackUserBehavior('add_to_cart', productId);
  
  showNotification("Товар додано до кошика");
}

// Оновлення лічильника кошика
function updateCartCount() {
  const count = Object.values(cart).reduce((total, qty) => total + qty, 0);
  document.getElementById("cart-count").textContent = count;
}

// Додавання/видалення з обраного
function toggleFavorite(productId) {
  if (favorites[productId]) {
    delete favorites[productId];
  } else {
    favorites[productId] = true;
  }
  
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  
  if (showingFavorites) {
    renderProducts();
  } else {
    const heartIcon = document.querySelector(`button[onclick="toggleFavorite('${productId}')"] i`);
    if (heartIcon) {
      heartIcon.className = favorites[productId] ? 'fas fa-heart' : 'far fa-heart';
      heartIcon.parentElement.className = `btn-favorite ${favorites[productId] ? 'active' : ''}`;
    }
  }
  
  showNotification(favorites[productId] ? "Додано в обране" : "Видалено з обраного");
}

// Переключення режиму відображення обраного
function toggleFavorites() {
  showingFavorites = !showingFavorites;
  
  const favButton = document.getElementById("favorites-btn");
  if (showingFavorites) {
    favButton.innerHTML = '<i class="fas fa-heart"></i>';
    favButton.style.color = '#e74c3c';
  } else {
    favButton.innerHTML = '<i class="far fa-heart"></i>';
    favButton.style.color = '';
  }
  
  applyFilters();
}

// Застосування фільтрів
function applyFilters() {
  const minPrice = document.getElementById("price-min").value ? parseInt(document.getElementById("price-min").value) : null;
  const maxPrice = document.getElementById("price-max").value ? parseInt(document.getElementById("price-max").value) : null;
  
  currentFilters.minPrice = minPrice;
  currentFilters.maxPrice = maxPrice;
  currentFilters.category = document.getElementById("category").value;
  currentFilters.brand = document.getElementById("brand").value;
  currentFilters.availability = document.getElementById("availability").value;
  currentFilters.sort = document.getElementById("sort").value;
  
  const currentCategory = currentFilters.category;
  document.querySelectorAll('.category-item').forEach(item => {
    item.classList.remove('active');
  });
  
  if (currentCategory === '') {
    document.querySelectorAll('.category-item')[0].classList.add('active');
  } else {
    const categoryItems = document.querySelectorAll('.category-item');
    for (let item of categoryItems) {
      if (item.textContent.includes(translateCategory(currentCategory))) {
        item.classList.add('active');
        break;
      }
    }
  }
  
  currentPage = 1;
  
  // Показать скелетоны при применении фильтров (если товары загружаются)
  if (isProductsLoading) {
    showEnhancedLoadingSkeleton();
  } else {
    renderProducts();
  }
  
  const filteredProducts = getFilteredProducts();
  if (!isProductsLoading) {
    document.getElementById('products-count').textContent = `Знайдено: ${filteredProducts.length}`;
  }
  
  // Закрываем мобильные фильтры после применения (если они открыты)
  closeMobileFilters();
}

// Скидання фільтрів
function resetFilters() {
  document.getElementById("price-min").value = '';
  document.getElementById("price-max").value = '';
  document.getElementById("category").value = '';
  document.getElementById("brand").value = '';
  document.getElementById("availability").value = '';
  document.getElementById("sort").value = 'default';
  document.getElementById("search").value = '';
  
  selectCategory('');
  
  currentFilters = {
    category: '',
    brand: '',
    minPrice: null,
    maxPrice: null,
    sort: 'default',
    search: '',
    availability: '',
    source: '',
    gender: 'all'
  };
  
  // Сбрасываем кнопки фильтра по полу
  updateGenderButtons('all');
  localStorage.removeItem(GENDER_FILTER_KEY);
  
  applyFilters();
}

// Встановлення режиму перегляду
function setViewMode(mode) {
  localStorage.setItem(VIEW_MODE_KEY, mode);
  
  const gridBtn = document.getElementById("grid-view");
  const listBtn = document.getElementById("list-view");
  
  if (mode === 'grid') {
    gridBtn.classList.add('active');
    listBtn.classList.remove('active');
  } else {
    gridBtn.classList.remove('active');
    listBtn.classList.add('active');
  }
  
  renderProducts();
}

// Показати деталі товару
function showProductDetail(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
    <h3>${product.title}</h3>
    <div class="product-detail">
      <div class="product-image">
        <img src="${product.image || 'https://via.placeholder.com/400x300?text=No+Image'}" alt="${product.title}">
      </div>
      <div class="product-info">
        <div class="price-container">
          <span class="detail-price">${formatPrice(product.price)} ₴</span>
          ${product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)} ₴</span>` : ''}
        </div>
        <div class="product-description">
          <h4>Опис</h4>
          <p>${product.description || 'Опис відсутній'}</p>
        </div>
        <div class="quantity-control">
          <button class="quantity-btn" onclick="changeQuantity(-1)">-</button>
          <input type="number" class="quantity-input" id="product-quantity" value="1" min="1">
          <button class="quantity-btn" onclick="changeQuantity(1)">+</button>
        </div>
        <div class="detail-actions">
          <button class="btn btn-buy" onclick="addToCartWithQuantity('${product.id}')">
            <i class="fas fa-shopping-cart"></i> Додати до кошика
          </button>
          <button class="btn-favorite ${favorites[product.id] ? 'active' : ''}" onclick="toggleFavorite('${product.id}')">
            <i class="${favorites[product.id] ? 'fas' : 'far'} fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
    <div id="product-ad-related"></div>
    <div class="product-reviews">
      <h4>Відгуки про товар</h4>
      <div id="reviews-container-${product.id}"></div>
      
      ${currentUser ? `
        <div class="add-review-section">
          <h4>Залишити відгук</h4>
          <form onsubmit="addReview(event, '${product.id}')">
            <div class="form-group">
              <label>Ваша оцінка</label>
              <div class="rating-stars">
                <span onclick="setRating(1)">★</span>
                <span onclick="setRating(2)">★</span>
                <span onclick="setRating(3)">★</span>
                <span onclick="setRating(4)">★</span>
                <span onclick="setRating(5)">★</span>
              </div>
            </div>
            <div class="form-group">
              <label>Ваш відгук</label>
              <textarea id="review-text" required></textarea>
            </div>
            <button type="submit" class="btn">Залишити відгук</button>
          </form>
        </div>
      ` : `
        <p>Увійдіть, щоб залишити відгук</p>
      `}
    </div>
  `;
  
  loadReviews(product.id);
  
  currentRating = 0;
  updateRatingStars();
  
  // Добавляем отслеживание просмотра товара
  trackUserBehavior('view', productId);
  
  // Добавляем рекламный блок для этого товара
  setTimeout(() => {
    renderProductAd(productId);
  }, 100);
  
  openModal();
  
  setTimeout(optimizeModalForMobile, 100);
}

// Функция для установки рейтинга
function setRating(rating) {
  currentRating = rating;
  updateRatingStars();
}

// Функция для обновления отображения звезд рейтинга
function updateRatingStars() {
  const stars = document.querySelectorAll('.rating-stars span');
  stars.forEach((star, index) => {
    if (index < currentRating) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
}

// Функция загрузки отзывов для товара
function loadReviews(productId) {
  const reviewsContainer = document.getElementById(`reviews-container-${productId}`);
  if (!reviewsContainer) return;
  
  reviewsContainer.innerHTML = '<p>Завантаження відгуків...</p>';
  
  db.collection("reviews")
    .where("productId", "==", productId)
    .where("approved", "==", true)
    .orderBy("createdAt", "desc")
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        reviewsContainer.innerHTML = "<p>Ще немає відгуків про цей товар</p>";
        return;
      }
      
      let reviewsHTML = "";
      querySnapshot.forEach((doc) => {
        const review = doc.data();
        const reviewDate = review.createdAt ? review.createdAt.toDate().toLocaleDateString('uk-UA') : '';
        
        reviewsHTML += `
          <div class="review-item">
            <div class="review-header">
              <strong>${review.userName}</strong>
              <div class="review-rating">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</div>
              <span class="review-date">${reviewDate}</span>
            </div>
            <p>${review.text}</p>
          </div>
        `;
      });
      
      reviewsContainer.innerHTML = reviewsHTML;
    })
    .catch((error) => {
      console.error("Помилка завантаження відгуків: ", error);
      reviewsContainer.innerHTML = "<p>Помилка завантаження відгуків</p>";
    });
}

// Функция добавления отзыва
function addReview(event, productId) {
  event.preventDefault();
  
  if (!currentUser) {
    showNotification("Увійдіть, щоб залишити відгук", "warning");
    return;
  }
  
  if (currentRating === 0) {
    showNotification("Будь ласка, оберіть рейтинг", "warning");
    return;
  }
  
  const text = document.getElementById('review-text').value;
  
  const newReview = {
    productId,
    userId: currentUser.uid,
    userName: currentUser.displayName || currentUser.email,
    rating: currentRating,
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    approved: false
  };
  
  db.collection("reviews").add(newReview)
    .then(() => {
      showNotification("Відгук додано і відправиться на модерацію");
      document.getElementById('review-text').value = "";
      currentRating = 0;
      updateRatingStars();
      loadReviews(productId);
    })
    .catch((error) => {
      console.error("Помилка додавання відгуку: ", error);
      showNotification("Помилка додавання відгуку", "error");
    });
}

// Додавання товару в кошик із зазначеною кількістю
function addToCartWithQuantity(productId) {
  const quantity = parseInt(document.getElementById("product-quantity").value) || 1;
  
  if (!cart[productId]) {
    cart[productId] = 0;
  }
  cart[productId] += quantity;
  
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  
  updateCartCount();
  showNotification("Товар додано до кошика");
  closeModal();
}

// Зміна кількості товару
function changeQuantity(delta) {
  const input = document.getElementById("product-quantity");
  let value = parseInt(input.value) || 1;
  value += delta;
  
  if (value < 1) value = 1;
  
  input.value = value;
}

// Відкриття кошика (ПЕРЕПИСАНА ВЕРСІЯ З ГРУПУВАННЯМ ЗА ПОСТАЧАЛЬНИКАМИ)
function openCart() {
  const modalContent = document.getElementById("modal-content");
  
  if (Object.keys(cart).length === 0) {
    modalContent.innerHTML = `
      <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
      <h3>Кошик</h3>
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <h3>Кошик порожній</h3>
        <p>Додайте товари з каталогу</p>
      </div>
    `;
  } else {
    const groupedBySource = groupCartItemsBySupplier();
    const suppliersCount = Object.keys(groupedBySource).length;
    
    let cartItemsHTML = '';
    
    // Інформаційний банер, якщо декілька постачальників
    if (suppliersCount > 1) {
      cartItemsHTML += `
        <div class="cart-info-banner">
          <div class="info-icon">
            <i class="fas fa-boxes"></i>
          </div>
          <div class="info-content">
            <h4>Декілька постачальників</h4>
            <p>Ваше замовлення містить товари від <strong>${suppliersCount} різних постачальників</strong>.
            Це означає, що:</p>
            <ul>
              <li><i class="fas fa-box"></i> Товари будуть відправлені <strong>окремими посилками</strong></li>
              <li><i class="fas fa-clock"></i> Терміни доставки можуть відрізнятися</li>
              <li><i class="fas fa-truck"></i> Ви отримаєте декілька трек-номерів</li>
            </ul>
          </div>
        </div>
      `;
    }
    
    // Відображаємо товари за постачальниками
    Object.entries(groupedBySource).forEach(([source, sourceData]) => {
      cartItemsHTML += `
        <div class="supplier-section">
          <div class="supplier-header">
            <h4>${sourceData.sourceName}</h4>
            <div class="supplier-badge">Відправляється окремою посилкою</div>
          </div>
          
          ${sourceData.items.map(item => `
            <div class="cart-item">
              <img src="${item.product.image || 'https://via.placeholder.com/80x80?text=No+Image'}" 
                   alt="${item.product.title}" class="cart-item-image">
              <div class="cart-item-details">
                <h4 class="cart-item-title">${item.product.title}</h4>
                <div class="cart-item-price">
                  ${formatPrice(item.product.price)} ₴ x ${item.quantity} = ${formatPrice(item.itemTotal)} ₴
                </div>
                <div class="cart-item-actions">
                  <button class="btn" onclick="changeCartQuantity('${item.productId}', -1)">-</button>
                  <span>${item.quantity}</span>
                  <button class="btn" onclick="changeCartQuantity('${item.productId}', 1)">+</button>
                  <button class="btn" onclick="removeFromCart('${item.productId}')"><i class="fas fa-trash"></i></button>
                </div>
              </div>
            </div>
          `).join('')}
          
          <div class="supplier-total">
            Сума за товари від ${sourceData.sourceName}: <strong>${formatPrice(sourceData.total)} ₴</strong>
          </div>
        </div>
      `;
    });
    
    // Розрахунок загальної суми
    let total = 0;
    for (const [productId, quantity] of Object.entries(cart)) {
      const product = products.find(p => p.id === productId);
      if (product) {
        total += product.price * quantity;
      }
    }
    
    modalContent.innerHTML = `
      <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
      <h3>Кошик</h3>
      <div class="cart-items">
        ${cartItemsHTML}
      </div>
      <div id="cart-ad-related"></div>
      <div class="cart-footer">
        <div class="cart-total">Загальна сума: ${formatPrice(total)} ₴</div>
        <button class="btn btn-buy" onclick="checkout()">Оформити замовлення</button>
      </div>
    `;
    
    // Додаємо рекламний блок у кошик
    setTimeout(() => {
      renderCartAd();
    }, 100);
  }
  
  openModal();
  
  setTimeout(optimizeModalForMobile, 100);
}

// Зміна кількості товару в кошику
function changeCartQuantity(productId, delta) {
  if (!cart[productId] && delta < 1) return;
  
  cart[productId] += delta;
  
  if (cart[productId] < 1) {
    delete cart[productId];
  }
  
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  
  updateCartCount();
  openCart();
}

// Видалення товару з кошика
function removeFromCart(productId) {
  delete cart[productId];
  
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  
  updateCartCount();
  openCart();
}

// ===== УЛУЧШЕННАЯ ФУНКЦИЯ ОФОРМЛЕНИЯ ЗАКАЗА =====
function checkout() {
  if (!currentUser) {
    closeModal();
    openAuthModal();
    showNotification("Для оформлення замовлення необхідно авторизуватися", "warning");
    return;
  }

  const modalContent = document.getElementById("modal-content");
  
  // Группируем товары по поставщику для отображения
  const groupedBySource = groupCartItemsBySupplier();
  const suppliersCount = Object.keys(groupedBySource).length;
  
  let summaryHTML = '';
  
  // Генерация сводки с разбивкой по поставщикам
  Object.entries(groupedBySource).forEach(([source, sourceData], index) => {
    summaryHTML += `
      <div class="supplier-order-section">
        <div class="supplier-header">
          <h5>Посылка ${index + 1}: ${sourceData.sourceName}</h5>
          <span class="supplier-label">Отдельная посылка</span>
        </div>
        ${sourceData.items.map(item => `
          <div class="order-item">
            <span>${item.product.title} x${item.quantity}</span>
            <span>${formatPrice(item.itemTotal)} ₴</span>
          </div>
        `).join('')}
        <div class="supplier-total-line">
          <span>Итого от ${sourceData.sourceName}:</span>
          <span>${formatPrice(sourceData.total)} ₴</span>
        </div>
      </div>
    `;
  });
  
// Додаємо загальну інформацію про кількох постачальників
if (suppliersCount > 1) {
  summaryHTML += `
    <div class="multi-supplier-notice">
      <i class="fas fa-info-circle"></i>
      <p><strong>Важливо!</strong> Ваше замовлення містить товари від ${suppliersCount} різних постачальників. 
      Кожен постачальник надішле свою частину замовлення окремою посилкою. 
      Ви отримаєте кілька трек-номерів для відстеження.</p>
    </div>
  `;
}
  
  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
    <h3>Оформлення замовлення</h3>
    <form class="checkout-form" onsubmit="placeOrder(event)">
      <div class="form-row">
        <div class="form-group">
          <label>Ім'я та прізвище*</label>
          <input type="text" id="order-name" required value="${currentUser.displayName || ''}">
        </div>
        <div class="form-group">
          <label>Телефон*</label>
          <input type="tel" id="order-phone" required placeholder="+380XXXXXXXXX">
        </div>
      </div>
      <div class="form-group">
        <label>Email*</label>
        <input type="email" id="order-email" required value="${currentUser.email || ''}">
      </div>
      
      <div class="delivery-section">
        <h4>Доставка Новою Поштою</h4>
        <div class="delivery-notice">
          <i class="fas fa-info-circle"></i>
          <p>Доставка здійснюється за тарифами перевізника. Вартість доставки розраховується окремо та оплачується при отриманні замовлення.</p>
        </div>
        <div class="form-group">
          <label>Місто*</label>
          <input type="text" id="np-city" required placeholder="Введіть ваше місто">
        </div>
        <div class="form-group">
          <label>Відділення Нової Пошти*</label>
          <input type="text" id="np-warehouse" required placeholder="Номер відділення">
        </div>
      </div>
      
      <div class="payment-section">
        <h4>Спосіб оплати</h4>
        <div class="payment-options">
          <label class="payment-option">
            <input type="radio" name="payment" value="cash" checked>
            <span>Готівкою при отриманні</span>
          </label>
          <label class="payment-option">
            <input type="radio" name="payment" value="card">
            <span>Онлайн-оплата карткою</span>
          </label>
        </div>
      </div>
      
      <div class="form-group">
        <label>Коментар до замовлення (необов'язково)</label>
        <textarea id="order-comment" placeholder="Ваші побажання щодо замовлення..." rows="3"></textarea>
      </div>
      
      <div class="order-summary">
        <h4>Ваше замовлення</h4>
        <div class="order-items">
          ${summaryHTML}
        </div>
        <div class="order-total">
          <div class="total-line">
            <span>Сума замовлення:</span>
            <span>${formatPrice(calculateCartTotal())} ₴</span>
          </div>
          <div class="total-line">
            <span>Доставка:</span>
            <span>Згідно тарифів перевізника</span>
          </div>
          <div class="total-line final-total">
            <span>Разом:</span>
            <span>${formatPrice(calculateCartTotal())} ₴</span>
          </div>
        </div>
      </div>
      
      <button type="submit" class="btn btn-buy">Підтвердити замовлення</button>
    </form>
  `;
  
  openModal();
  
  setTimeout(optimizeModalForMobile, 100);
}

// В функции placeOrder() сохраняем информацию о поставщиках в заказе
function placeOrder(event) {
  event.preventDefault();
  
  if (!currentUser || !currentUser.uid) {
    closeModal();
    openAuthModal();
    showNotification("Для оформлення замовлення необхідно авторизуватися", "warning");
    return;
  }
  
  const name = document.getElementById('order-name').value.trim();
  const phone = document.getElementById('order-phone').value.trim();
  const email = document.getElementById('order-email').value.trim();
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
  const comment = document.getElementById('order-comment') ? document.getElementById('order-comment').value.trim() : '';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showNotification("Введіть коректну email адресу", "error");
    return;
  }
  
  const phoneRegex = /^[\+]?[0-9]{10,15}$/;
  const cleanPhone = phone.replace(/\D/g, '');
  if (!phoneRegex.test(cleanPhone)) {
    showNotification("Введіть коректний номер телефону", "error");
    return;
  }
  
  const city = document.getElementById('np-city').value.trim();
  const warehouse = document.getElementById('np-warehouse').value.trim();
  
  if (!city || !warehouse) {
    showNotification('Заповніть всі поля для доставки Новою Поштою', 'error');
    return;
  }
  
  const deliveryDetails = { 
    service: 'Нова Пошта', 
    city, 
    warehouse 
  };
  
  if (!name || !phone || !email) {
    showNotification('Заповніть всі обов\'язкові поля', 'error');
    return;
  }
  
  if (Object.keys(cart).length === 0) {
    showNotification('Кошик порожній', 'error');
    return;
  }
  
  // Группируем товары по поставщику для сохранения в заказе
  const groupedBySource = groupCartItemsBySupplier();
  const suppliers = {};
  
  Object.entries(groupedBySource).forEach(([source, sourceData]) => {
    suppliers[source] = {
      name: sourceData.sourceName,
      total: sourceData.total,
      itemsCount: sourceData.items.length
    };
  });
  
  const order = {
    userId: currentUser.uid,
    userName: name,
    userPhone: cleanPhone,
    userEmail: email,
    items: {...cart},
    suppliers, // Сохраняем информацию о поставщиках
    total: calculateCartTotal(),
    delivery: deliveryDetails,
    paymentMethod,
    comment: comment,
    status: 'new',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  db.collection("orders").add(order)
    .then((docRef) => {
      cart = {};
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      updateCartCount();
      
      // Добавляем отслеживание покупки
      Object.keys(order.items).forEach(productId => {
        trackUserBehavior('purchase', productId);
      });
      
      sendOrderEmail(docRef.id, order);
      
      showNotification(`Замовлення успішно оформлено. Номер вашого замовлення: ${docRef.id}`);
      closeModal();
      showOrderConfirmation(docRef.id, order);
    })
    .catch(error => {
      console.error("Помилка оформлення замовлення: ", error);
      showNotification("Помилка оформлення замовлення", "error");
    });
}

// Генерація підсумку замовлення
function generateOrderSummary() {
  let summaryHTML = '';
  
  for (const [productId, quantity] of Object.entries(cart)) {
    const product = products.find(p => p.id === productId);
    if (product) {
      summaryHTML += `
        <div class="order-item">
          <span>${product.title} x${quantity}</span>
          <span>${formatPrice(product.price * quantity)} ₴</span>
        </div>
      `;
    }
  }
  
  return summaryHTML;
}

// Розрахунок загальної вартості кошика
function calculateCartTotal() {
  return Object.entries(cart).reduce((sum, [productId, quantity]) => {
    const product = products.find(p => p.id === productId);
    return sum + (product ? product.price * quantity : 0);
  }, 0);
}

// ===== УЛУЧШЕННАЯ ФУНКЦИЯ ПОДТВЕРЖДЕНИЯ ЗАКАЗА =====
function showOrderConfirmation(orderId, order) {
  const modalContent = document.getElementById("modal-content");
  
  const commentSection = order.comment ? `
    <div class="comment-section" style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
      <h4>Ваш коментар:</h4>
      <p>"${order.comment}"</p>
    </div>
  ` : '';
  
  // Определяем количество посылок
  const suppliersCount = order.suppliers ? Object.keys(order.suppliers).length : 1;
  
  // Секция с информацией о посылках
  const parcelsSection = `
    <div class="parcels-info">
      <h4><i class="fas fa-boxes"></i> Информация о посылках</h4>
      <div class="parcel-cards">
        ${Array.from({length: suppliersCount}).map((_, i) => {
          const supplierKeys = order.suppliers ? Object.keys(order.suppliers) : ['default'];
          const supplierKey = supplierKeys[i];
          const supplierName = order.suppliers ? order.suppliers[supplierKey].name : 'Основной поставщик';
          
          return `
            <div class="parcel-card">
              <div class="parcel-number">Посылка ${i + 1}</div>
              <div class="parcel-status">Готовится к отправке</div>
              <div class="parcel-supplier">${supplierName}</div>
              <div class="parcel-actions">
                <button class="btn btn-small" onclick="trackParcel(${i})">
                  <i class="fas fa-truck"></i> Отследить
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${suppliersCount > 1 ? `
        <p class="parcel-notice">
          <i class="fas fa-info-circle"></i>
          Ваш заказ содержит ${suppliersCount} посылки от разных поставщиков. 
          Трек-номера появятся здесь после отправки каждой посылки.
        </p>
      ` : ''}
    </div>
  `;
  
  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
    <div class="order-confirmation">
      <div class="confirmation-header">
        <i class="fas fa-check-circle"></i>
        <h3>Замовлення успішно оформлено!</h3>
      </div>
      <div class="confirmation-details">
        <p><strong>Номер замовлення:</strong> ${orderId}</p>
        <p><strong>Ім'я:</strong> ${order.userName}</p>
        <p><strong>Телефон:</strong> ${order.userPhone}</p>
        <p><strong>Email:</strong> ${order.userEmail}</p>
        <p><strong>Спосіб доставки:</strong> ${order.delivery.service}</p>
        <div class="delivery-notice">
          <i class="fas fa-info-circle"></i>
          <p>Доставка здійснюється за тарифами перевізника. Вартість доставки розраховується окремо та оплачується при отриманні замовлення.</p>
        </div>
        <p><strong>Місто:</strong> ${order.delivery.city}</p>
        <p><strong>Відділення:</strong> ${order.delivery.warehouse}</p>
        <p><strong>Спосіб оплати:</strong> ${order.paymentMethod === 'cash' ? 'Готівкою при отриманні' : 'Онлайн-оплата карткою'}</p>
        <p><strong>Сума товарів:</strong> ${formatPrice(order.total)} ₴</p>
        
        ${commentSection}
        
        ${parcelsSection}
        
        <div class="manager-notice" style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
          <i class="fas fa-phone" style="color: #007bff; margin-right: 10px;"></i>
          <strong>Наш менеджер зв'яжеться з вами протягом години для підтвердження замовлення та уточнення деталей.</strong>
        </div>
      </div>
      <div class="confirmation-actions">
        <button class="btn btn-detail" onclick="closeModal()">Продовжити покупки</button>
        <button class="btn" onclick="viewOrders()">Мої замовлення</button>
      </div>
    </div>
  `;
  
  openModal();
}

// Відкриття модального вікна
function openModal() {
  document.getElementById("modal").classList.add("active");
}

// Закриття модального вікна
function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.remove("active");
  modal.classList.remove("mobile-modal");
  document.body.style.overflow = '';
  
  // Отписываемся от слушателя заказов
  if (window.currentOrdersUnsubscribe) {
    window.currentOrdersUnsubscribe();
    window.currentOrdersUnsubscribe = null;
  }
}

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ АВТОРИЗАЦИИ С GOOGLE =====
function openAuthModal() {
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
    <h3>Вхід в систему</h3>
    <div class="auth-tabs">
      <div class="auth-tab active" onclick="switchAuthTab('login')">Вхід</div>
      <div class="auth-tab" onclick="switchAuthTab('register')">Реєстрація</div>
      <div class="auth-tab" onclick="switchAuthTab('admin')">Адміністратор</div>
    </div>
    
    <div class="social-auth">
      <button class="btn btn-google" onclick="signInWithGoogle()">
        <i class="fab fa-google"></i> Увійти через Google
      </button>
      <div class="auth-divider">
        <span>або</span>
      </div>
    </div>
    
    <form id="login-form" onsubmit="login(event)">
      <div class="form-group">
        <label>Email</label>
        <input type="email" required>
      </div>
      <div class="form-group">
        <label>Пароль</label>
        <input type="password" required>
      </div>
      <button type="submit" class="btn btn-detail">Увійти</button>
    </form>
    
    <form id="register-form" style="display:none;" onsubmit="register(event)">
      <div class="form-group">
        <label>Ім'я</label>
        <input type="text" required>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" required>
      </div>
      <div class="form-group">
        <label>Пароль</label>
        <input type="password" required minlength="6">
      </div>
      <button type="submit" class="btn btn-detail">Зареєструватися</button>
    </form>
    
    <div id="admin-auth-form" style="display:none;">
      <p>Для доступу до панелі адміністратора введіть пароль:</p>
      <div class="form-group">
        <label>Пароль адміністратора</label>
        <input type="password" id="admin-password" required>
      </div>
      <button class="btn btn-admin" onclick="verifyAdminPassword()">Отримати права адміністратора</button>
    </div>
  `;
  
  openModal();
  setTimeout(optimizeModalForMobile, 100);
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const adminForm = document.getElementById("admin-auth-form");
  const tabs = document.querySelectorAll(".auth-tab");
  const socialAuth = document.querySelector(".social-auth");
  
  tabs.forEach(tab => tab.classList.remove('active'));
  
  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    adminForm.style.display = 'none';
    socialAuth.style.display = 'block';
    tabs[0].classList.add('active');
  } else if (tab === 'register') {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    adminForm.style.display = 'none';
    socialAuth.style.display = 'block';
    tabs[1].classList.add('active');
  } else if (tab === 'admin') {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    adminForm.style.display = 'block';
    socialAuth.style.display = 'none';
    tabs[2].classList.add('active');
  }
}

function login(event) {
  event.preventDefault();
  const email = event.target.querySelector('input[type="email"]').value;
  const password = event.target.querySelector('input[type="password"]').value;
  
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      showNotification("Вхід виконано успішно");
      closeModal();
    })
    .catch(error => {
      let message = "Помилка входу";
      switch (error.code) {
        case 'auth/user-not-found':
          message = "Користувач не знайдений";
          break;
        case 'auth/wrong-password':
          message = "Невірний пароль";
          break;
      }
      showNotification(message, "error");
    });
}

function register(event) {
  event.preventDefault();
  const name = event.target.querySelector('input[type="text"]').value;
  const email = event.target.querySelector('input[type="email"]').value;
  const password = event.target.querySelector('input[type="password"]').value;
  
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      return userCredential.user.updateProfile({
        displayName: name
      });
    })
    .then(() => {
      showNotification("Реєстрація виконана успішно");
      closeModal();
    })
    .catch(error => {
      console.error("Помилка реєстрації: ", error);
      showNotification("Помилка реєстрації: " + error.message, "error");
    });
}

function verifyAdminPassword() {
  const password = document.getElementById("admin-password").value;
  if (password === ADMIN_PASSWORD) {
    if (!currentUser) {
      showNotification("Спочатку увійдіть в систему", "error");
      switchAuthTab('login');
      return;
    }
    
    const adminRef = db.collection("admins").doc(currentUser.uid);
    adminRef.set({
      email: currentUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      const admins = JSON.parse(localStorage.getItem(ADMINS_STORAGE_KEY) || '{}');
      admins[currentUser.uid] = true;
      localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(admins));
      
      document.getElementById("admin-panel").style.display = "block";
      adminMode = true;
      showNotification("Права адміністратора отримані");
      closeModal();
      
      loadAdminOrders();
      
      document.getElementById("page-views-container").style.display = "block";
      setupPageCounter();
      
      addReviewsTabIfNotExists();
    })
    .catch((error) => {
      console.error("Помилка збереження прав адміністратора: ", error);
      showNotification("Помилка збереження прав адміністратора", "error");
    });
  } else {
    showNotification("Невірний пароль адміністратора", "error");
  }
}

function logout() {
  auth.signOut()
    .then(() => {
      showNotification("Вихід виконано успішно");
    })
    .catch(error => {
      console.error("Помилка виходу: ", error);
      showNotification("Помилка виходу", "error");
    });
}

function checkAdminStatus(userId) {
  db.collection("admins").doc(userId).get()
    .then((doc) => {
      if (doc.exists) {
        document.getElementById("admin-panel").style.display = "block";
        adminMode = true;
        loadAdminOrders();
        
        document.getElementById("page-views-container").style.display = "block";
        setupPageCounter();
        
        addReviewsTabIfNotExists();
      }
    })
    .catch((error) => {
      console.error("Помилка перевірки прав адміністратора: ", error);
    });
}

// Функция открытия профиля пользователя
function openProfile() {
    if (!currentUser) {
        openAuthModal();
        showNotification("Увійдіть в систему для перегляду профілю", "warning");
        return;
    }

    const modalContent = document.getElementById("modal-content");
    modalContent.innerHTML = `
        <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
        <h3>Профіль користувача</h3>
        <div class="profile-container">
            <div class="profile-info">
                <div class="profile-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="profile-details">
                    <p><strong>Ім'я:</strong> <span id="profile-display-name">${currentUser.displayName || 'Не вказано'}</span></p>
                    <p><strong>Email:</strong> <span id="profile-email">${currentUser.email || 'Не вказано'}</span></p>
                    <p><strong>ID:</strong> <span id="profile-uid">${currentUser.uid}</span></p>
                    <p><strong>Дата реєстрації:</strong> <span id="profile-created">${currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString('uk-UA') : 'Невідомо'}</span></p>
                </div>
            </div>
            
            <div class="profile-actions">
                <h4>Налаштування профілю</h4>
                <form onsubmit="updateProfile(event)">
                    <div class="form-group">
                        <label>Ім'я та прізвище</label>
                        <input type="text" id="profile-name-input" value="${currentUser.displayName || ''}" placeholder="Введіть ваше ім'я">
                    </div>
                    <div class="form-group">
                        <label>Новий пароль</label>
                        <input type="password" id="profile-password-input" placeholder="Залиште порожнім, щоб не змінювати">
                    </div>
                    <button type="submit" class="btn btn-detail">Оновити профіль</button>
                </form>
            </div>
            
            <div class="profile-stats">
                <h4>Статистика</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <i class="fas fa-shopping-cart"></i>
                        <span class="stat-value" id="profile-orders-count">0</span>
                        <span class="stat-label">Замовлень</span>
                    </div>
                    <div class="stat-item">
                        <i class="far fa-heart"></i>
                        <span class="stat-value" id="profile-favorites-count">${Object.keys(favorites).length}</span>
                        <span class="stat-label">Обраних товарів</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadUserOrderStats();
    
    openModal();
    setTimeout(optimizeModalForMobile, 100);
}

function updateProfile(event) {
  event.preventDefault();
  
  const newName = document.getElementById('profile-name-input').value.trim();
  const newPassword = document.getElementById('profile-password-input').value.trim();
  
  const promises = [];
  
  if (newName && newName !== currentUser.displayName) {
      promises.push(
          currentUser.updateProfile({
              displayName: newName
          })
      );
  }
  
  if (newPassword) {
      promises.push(
          currentUser.updatePassword(newPassword)
      );
  }
  
  if (promises.length === 0) {
      showNotification("Немає змін для оновлення", "info");
      return;
  }
  
  Promise.all(promises)
      .then(() => {
          showNotification("Профіль успішно оновлено");
          document.getElementById('user-name').textContent = newName || currentUser.email;
          document.getElementById('profile-display-name').textContent = newName || 'Не вказано';
          closeModal();
      })
      .catch(error => {
          console.error("Помилка оновлення профілю: ", error);
          let errorMessage = "Помилка оновлення профілю";
          
          switch (error.code) {
              case 'auth/requires-recent-login':
                  errorMessage = "Для зміни пароля потрібно повторно увійти в систему";
                  break;
              case 'auth/weak-password':
                  errorMessage = "Пароль занадто слабкий";
                  break;
          }
          
          showNotification(errorMessage, "error");
      });
}

// ===== УЛУЧШЕННАЯ ФУНКЦИЯ ВВОДА ПАРОЛЯ АДМИНИСТРАТОРА =====
function promptAdminPassword() {
  const password = prompt("Введіть пароль адміністратора:");
  if (password === ADMIN_PASSWORD) {
    if (!currentUser) {
      showNotification("Спочатку увійдіть в систему", "error");
      openAuthModal();
      return;
    }
    
    // Зберігаємо користувача як адміністратора в Firestore
    const adminRef = db.collection("admins").doc(currentUser.uid);
    adminRef.set({
      email: currentUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      // Также сохраняем в localStorage для быстрого доступа в UI
      const admins = JSON.parse(localStorage.getItem(ADMINS_STORAGE_KEY) || '{}');
      admins[currentUser.uid] = true;
      localStorage.setItem(ADMINS_STORAGE_KEY, JSON.stringify(admins));
      
      document.getElementById("admin-panel").style.display = "block";
      adminMode = true;
      showNotification("Права адміністратора отримані");
      
      // Завантажуємо замовлення для адмін-панелі
      loadAdminOrders();
      
      // Показуємо лічильник переглядів
      document.getElementById("page-views-container").style.display = "block";
      setupPageCounter();
      
      // Добавляем вкладку для модерации отзывов
      addReviewsTabIfNotExists();
    })
    .catch((error) => {
      console.error("Помилка збереження прав адміністратора: ", error);
      showNotification("Помилка збереження прав адміністратора", "error");
    });
  } else if (password) {
    showNotification("Невірний пароль адміністратора", "error");
  }
}

// Перевірка статусу адміністратора
function checkAdminStatus(userId) {
  db.collection("admins").doc(userId).get()
    .then((doc) => {
      if (doc.exists) {
        document.getElementById("admin-panel").style.display = "block";
        adminMode = true;
        loadAdminOrders();
        
        // Показуємо лічильник переглядів
        document.getElementById("page-views-container").style.display = "block";
        setupPageCounter();
        
        // Добавляем вкладку для модерации отзывов
        addReviewsTabIfNotExists();
      }
    })
    .catch((error) => {
      console.error("Помилка перевірки прав адміністратора: ", error);
    });
}

// Вихід з системи
function logout() {
  // Не видаляємо права адміністратора при виході, щоб не вводити пароль кожного разу
  auth.signOut()
    .then(() => {
      showNotification("Вихід виконано успішно");
    })
    .catch(error => {
      console.error("Помилка виходу: ", error);
      showNotification("Помилка виходу", "error");
    });
}

// Переключення вкладок в адмін-панелі
function switchTab(tabId) {
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");
  
  tabs.forEach(tab => tab.classList.remove("active"));
  tabContents.forEach(content => content.classList.remove("active"));
  
  document.querySelector(`.tab[onclick="switchTab('${tabId}')"]`).classList.add("active");
  document.getElementById(tabId).classList.add("active");
  
  // Якщо переключилися на вкладку товарів, завантажуємо їх
  if (tabId === 'products-tab') {
    loadAdminProducts();
  }
  
  // Якщо переключилися на вкладку замовлень, завантажуємо їх
  if (tabId === 'orders-tab') {
    loadAdminOrders();
  }
  
  // Если переключились на вкладку отзывов, загружаем их
  if (tabId === 'reviews-tab-content') {
    loadReviewsForModeration();
  }
}

// ===== ЗАВАНТАЖЕННЯ ЗАМОВЛЕНЬ В АДМІН-ПАНЕЛІ =====
function loadAdminOrders() {
  const ordersList = document.getElementById("admin-orders-list");
  ordersList.innerHTML = '<p>Завантаження замовлень...</p>';
  
  // Слухаємо оновлення в реальному часі
  db.collection("orders")
    .orderBy("createdAt", "desc")
    .onSnapshot((querySnapshot) => {
      if (querySnapshot.empty) {
        ordersList.innerHTML = '<p>Замовлень немає</p>';
        return;
      }
      
      ordersList.innerHTML = '';
      
      querySnapshot.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() };
        const orderDate = order.createdAt ? order.createdAt.toDate().toLocaleString('uk-UA') : 'Дата не вказана';
        
        // Визначаємо статус замовлення
        let statusClass = 'status-new';
        let statusText = 'Новий';
        
        if (order.status === 'processing') {
          statusClass = 'status-processing';
          statusText = 'В обробці';
        } else if (order.status === 'shipped') {
          statusClass = 'status-shipped';
          statusText = 'Відправлено';
        } else if (order.status === 'delivered') {
          statusClass = 'status-delivered';
          statusText = 'Доставлено';
        } else if (order.status === 'cancelled') {
          statusClass = 'status-cancelled';
          statusText = 'Скасовано';
        }
        
        const orderElement = document.createElement('div');
        orderElement.className = 'admin-order-item';
        orderElement.innerHTML = `
          <div class="order-header">
            <h4>Замовлення #${order.id}</h4>
            <span class="order-date">${orderDate}</span>
          </div>
          <div class="order-info">
            <p><strong>Клієнт:</strong> ${order.userName} (${order.userEmail}, ${order.userPhone})</p>
            ${order.comment ? `<p><strong>Коментар:</strong> ${order.comment}</p>` : ''}
            <p><strong>Сума:</strong> ${formatPrice(order.total)} ₴</p>
            <p><strong>Доставка:</strong> ${order.delivery.service}</p>
            <p><strong>Статус:</strong> <span class="order-status ${statusClass}">${statusText}</span></p>
            ${order.ttn ? `<p><strong>ТТН:</strong> ${order.ttn}</p>` : ''}
          </div>
          <div class="admin-order-actions">
            <button class="btn btn-detail" onclick="viewOrderDetails('${order.id}')">Деталі</button>
            <select onchange="changeOrderStatus('${order.id}', this.value)">
              <option value="new" ${order.status === 'new' ? 'selected' : ''}>Новий</option>
              <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обробці</option>
              <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Відправлено</option>
              <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Доставлено</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Скасовано</option>
            </select>
            <button class="btn" onclick="addTTNToOrder('${order.id}')">ТТН</button>
            <button class="btn btn-danger" onclick="deleteOrder('${order.id}')">Видалити</button>
          </div>
        `;
        
        ordersList.appendChild(orderElement);
      });
    }, (error) => {
      console.error("Помилка завантаження замовлень: ", error);
      ordersList.innerHTML = '<p>Помилка завантаження замовлень</p>';
    });
}

// ===== ФУНКЦІЯ ДОДАВАННЯ ТТН ДО ЗАМОВЛЕННЯ =====
function addTTNToOrder(orderId) {
  const ttn = prompt('Введіть ТТН (трек-номер) для цього замовлення:');
  
  if (ttn && ttn.trim() !== '') {
    db.collection("orders").doc(orderId).update({
      ttn: ttn.trim(),
      ttnAddedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      showNotification("ТТН успішно додано до замовлення");
      
      // Отправляем email с уведомлением о ТТН
      db.collection("orders").doc(orderId).get()
        .then((doc) => {
          if (doc.exists) {
            const order = { id: doc.id, ...doc.data() };
            sendTTNEmail(orderId, order);
          }
        });
      
      // Обновляем список заказов
      loadAdminOrders();
    })
    .catch((error) => {
      console.error("Помилка додавання ТТН: ", error);
      showNotification("Помилка додавання ТТН", "error");
    });
  }
}

// ===== ФУНКЦІЯ ВІДПРАВКИ EMAIL ПРО ТТН =====
function sendTTNEmail(orderId, order) {
  if (!order.ttn) return;
  
  const templateParams = {
    to_email: order.userEmail,
    order_id: orderId,
    customer_name: order.userName,
    ttn_number: order.ttn,
    delivery_service: order.delivery.service,
    delivery_city: order.delivery.city,
    delivery_warehouse: order.delivery.warehouse,
    tracking_url: `https://tracking.novaposhta.ua/#/uk/search/${order.ttn}`
  };

  // Используем другой шаблон для уведомления о ТТН
  emailjs.send(EMAILJS_SERVICE_ID, "template_ttn_notification", templateParams)
    .then(function(response) {
      console.log('Email с ТТН успешно отправлен!', response.status, response.text);
    }, function(error) {
      console.error('Ошибка отправки email с ТТН:', error);
    });
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ СТАТУСОВ =====
function getStatusClass(status) {
  const statusClasses = {
    'new': 'status-new',
    'processing': 'status-processing',
    'shipped': 'status-shipped',
    'delivered': 'status-delivered',
    'cancelled': 'status-cancelled'
  };
  return statusClasses[status] || 'status-new';
}

function getStatusText(status) {
  const statusTexts = {
    'new': 'Новий',
    'processing': 'В обробці',
    'shipped': 'Відправлено',
    'delivered': 'Доставлено',
    'cancelled': 'Скасовано'
  };
  return statusTexts[status] || 'Новий';
}

// ===== ЗМІНА СТАТУСУ ЗАМОВЛЕННЯ =====
function changeOrderStatus(orderId, status) {
  db.collection("orders").doc(orderId).update({
    status,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    showNotification("Статус замовлення оновлено");
  })
  .catch((error) => {
    console.error("Помилка оновлення статусу замовлення: ", error);
    showNotification("Помилка оновлення статусу замовлення", "error");
  });
}

// ===== ВИДАЛЕННЯ ЗАМОВЛЕННЯ =====
function deleteOrder(orderId) {
  if (confirm("Ви впевнені, що хочете видалити це замовлення? Цю дію не можна скасувати.")) {
    db.collection("orders").doc(orderId).delete()
      .then(() => {
        showNotification("Замовлення успішно видалено");
      })
      .catch((error) => {
        console.error("Помилка видалення замовлення: ", error);
        showNotification("Помилка видалення замовлення", "error");
      });
  }
}

// ===== ПЕРЕГЛЯД ДЕТАЛЕЙ ЗАМОВЛЕННЯ =====
function viewOrderDetails(orderId) {
  db.collection("orders").doc(orderId).get()
    .then((doc) => {
      if (!doc.exists) {
        showNotification("Замовлення не знайдено", "error");
        return;
      }
      
      const order = { id: doc.id, ...doc.data() };
      const modalContent = document.getElementById("modal-content");
      
      let itemsHTML = '';
      for (const [productId, quantity] of Object.entries(order.items)) {
        const product = products.find(p => p.id === productId);
        if (product) {
          itemsHTML += `
            <div class="cart-item">
              <img src="${product.image || 'https://via.placeholder.com/80x80?text=No+Image'}" alt="${product.title}" class="cart-item-image">
              <div class="cart-item-details">
                <h4 class="cart-item-title">${product.title}</h4>
                <div class="cart-item-price">${formatPrice(product.price)} ₴ x ${quantity} = ${formatPrice(product.price * quantity)} ₴</div>
              </div>
            </div>
          `;
        }
      }
      
      const orderDate = order.createdAt ? order.createdAt.toDate().toLocaleString('uk-UA') : 'Дата не вказана';
      const updatedDate = order.updatedAt ? order.updatedAt.toDate().toLocaleString('uk-UA') : 'Дата не вказана';
      const ttnDate = order.ttnAddedAt ? order.ttnAddedAt.toDate().toLocaleString('uk-UA') : '';
      
      // Секция комментария
      const commentSection = order.comment ? `
        <div class="comment-section" style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
          <h4>Коментар клієнта:</h4>
          <p>"${order.comment}"</p>
        </div>
      ` : '';
      
      const ttnSection = order.ttn ? `
        <div class="ttn-section" style="margin: 1rem 0; padding: 1rem; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #007bff;">
          <h4>Інформація про відправлення</h4>
          <p><strong>ТТН (трек-номер):</strong> ${order.ttn}</p>
          <p><strong>Дата додавання ТТН:</strong> ${ttnDate}</p>
          <p><strong>Служба доставки:</strong> Нова Пошта</p>
          <p><a href="https://tracking.novaposhta.ua/#/uk/search/${order.ttn}" target="_blank" style="color: #007bff; text-decoration: none;">
            <i class="fas fa-external-link-alt"></i> Відстежити посилку
          </a></p>
        </div>
      ` : `
        <div class="ttn-section" style="margin: 1rem 0; padding: 1rem; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
          <p><i class="fas fa-info-circle"></i> ТТН ще не додано до цього замовлення</p>
        </div>
      `;
      
      const ttnButton = adminMode ? `
        <div style="margin: 1rem 0;">
          <button class="btn btn-detail" onclick="addTTNToOrder('${order.id}')">
            <i class="fas fa-truck"></i> ${order.ttn ? 'Змінити ТТН' : 'Додати ТТН'}
          </button>
        </div>
      ` : '';
      
      // Улучшенная кнопка отмены заказа
      const cancelButton = !adminMode && order.status === 'new' ? `
        <div style="margin: 1rem 0;">
          <button class="btn btn-danger" onclick="cancelOrder('${order.id}')" style="background: #e74c3c; color: white; padding: 10px 20px;">
            <i class="fas fa-times"></i> Скасувати замовлення
          </button>
          <p style="font-size: 0.9em; color: #666; margin-top: 5px;">
            Ви можете скасувати замовлення, доки воно не передане в обробку
          </p>
        </div>
      ` : '';
      
      // Информация о поставщиках, если есть
      const suppliersSection = order.suppliers ? `
        <div class="suppliers-info" style="margin: 1rem 0; padding: 1rem; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #3498db;">
          <h4>Информация о поставщиках</h4>
          <p>Заказ содержит товары от ${Object.keys(order.suppliers).length} поставщиков:</p>
          <ul>
            ${Object.entries(order.suppliers).map(([source, supplierData]) => `
              <li><strong>${supplierData.name}</strong>: ${supplierData.itemsCount} товар(ов) на сумму ${formatPrice(supplierData.total)} ₴</li>
            `).join('')}
          </ul>
          <p><i class="fas fa-info-circle"></i> Каждый поставщик отправит свою часть заказа отдельной посылкой.</p>
        </div>
      ` : '';
      
      modalContent.innerHTML = `
        <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
        <h3>Деталі замовлення #${order.id}</h3>
        <div class="order-details">
          ${ttnSection}
          ${ttnButton}
          ${cancelButton}
          ${commentSection}
          ${suppliersSection}
          
          <div class="customer-info">
            <h4>Інформація про клієнта</h4>
            <p><strong>Ім'я:</strong> ${order.userName}</p>
            <p><strong>Email:</strong> ${order.userEmail}</p>
            <p><strong>Телефон:</strong> ${order.userPhone}</p>
          </div>
          
          <div class="order-meta">
            <h4>Інформація про замовлення</h4>
            <p><strong>Дата створення:</strong> ${orderDate}</p>
            <p><strong>Дата оновлення:</strong> ${updatedDate}</p>
            <p><strong>Спосіб оплати:</strong> ${order.paymentMethod === 'cash' ? 'Готівкою при отриманні' : 'Онлайн-оплата карткою'}</p>
            <p><strong>Статус:</strong> <span class="order-status ${getStatusClass(order.status)}">${getStatusText(order.status)}</span></p>
          </div>
          
          <div class="delivery-info">
            <h4>Доставка</h4>
            <p><strong>Служба:</strong> ${order.delivery.service}</p>
            ${order.delivery.city ? `<p><strong>Місто:</strong> ${order.delivery.city}</p>` : ''}
            ${order.delivery.warehouse ? `<p><strong>Відділення:</strong> ${order.delivery.warehouse}</p>` : ''}
            ${order.delivery.address ? `<p><strong>Адреса:</strong> ${order.delivery.address}</p>` : ''}
          </div>
          
          <div class="order-items">
            <h4>Товари</h4>
            ${itemsHTML}
          </div>
          
          <div class="order-total">
            <h4>Разом: ${formatPrice(order.total)} ₴</h4>
          </div>
        </div>
      `;
      
      openModal();
      optimizeModalForMobile();
    })
    .catch((error) => {
      console.error("Помилка завантаження деталей замовлення: ", error);
      showNotification("Помилка завантаження деталей замовлення", "error");
    });
}

// ===== ЗАГРУЗКА ОТЗЫВОВ ДЛЯ МОДЕРАЦИИ =====
function loadReviewsForModeration() {
  const reviewsContainer = document.getElementById("reviews-moderation-container");
  if (!reviewsContainer) return;
  
  reviewsContainer.innerHTML = "<p>Завантаження відгуків для модерації...</p>";
  
  db.collection("reviews")
    .where("approved", "==", false)
    .orderBy("createdAt", "desc")
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        reviewsContainer.innerHTML = "<p>Немає відгуків для модерації</p>";
        return;
      }
      
      let reviewsHTML = "";
      querySnapshot.forEach((doc) => {
        const review = { id: doc.id, ...doc.data() };
        const reviewDate = review.createdAt ? review.createdAt.toDate().toLocaleDateString('uk-UA') : '';
        
        const product = products.find(p => p.id === review.productId);
        const productName = product ? product.title : review.productId;
        
        reviewsHTML += `
          <div class="moderation-review-item">
            <h4>Відгук на товар: ${productName}</h4>
            <p><strong>Від:</strong> ${review.userName}</p>
            <div class="review-rating">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</div>
            <p><strong>Дата:</strong> ${reviewDate}</p>
            <p>${review.text}</p>
            <div class="moderation-actions">
              <button class="btn btn-success" onclick="approveReview('${doc.id}')">Затвердити</button>
              <button class="btn btn-danger" onclick="deleteReview('${doc.id}')">Видалити</button>
            </div>
          </div>
        `;
      });
      
      reviewsContainer.innerHTML = reviewsHTML;
    })
    .catch((error) => {
      console.error("Помилка завантаження відгуків для модерації: ", error);
      reviewsContainer.innerHTML = "<p>Помилка завантаження відгуків</p>";
    });
}

// ===== ОДОБРЕНИЕ ОТЗЫВА =====
function approveReview(reviewId) {
  db.collection("reviews").doc(reviewId).update({
    approved: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    showNotification("Відгук затверджено");
    loadReviewsForModeration();
  })
  .catch((error) => {
    console.error("Помилка затвердження відгуку: ", error);
    showNotification("Помилка затвердження відгуку", "error");
  });
}

// ===== УДАЛЕНИЕ ОТЗЫВА =====
function deleteReview(reviewId) {
  if (confirm("Ви впевнені, що хочете видалити цей відгук? Цю дію не можна скасувати.")) {
    db.collection("reviews").doc(reviewId).delete()
      .then(() => {
        showNotification("Відгук успішно видалено");
        loadReviewsForModeration();
      })
      .catch((error) => {
        console.error("Помилка видалення відгуку: ", error);
        showNotification("Помилка видалення відгуку", "error");
      });
  }
}

// ===== УЛУЧШЕННАЯ ФУНКЦИЯ ОТМЕНЫ ЗАКАЗА =====
function cancelOrder(orderId) {
    if (!currentUser) {
        showNotification("Увійдіть в систему для скасування замовлення", "warning");
        return;
    }
    
    if (!confirm("Ви впевнені, що хочете скасувати це замовлення?")) {
        return;
    }

    showNotification("Скасування замовлення...", "info");

    // Сначала получаем данные заказа
    db.collection("orders").doc(orderId).get()
        .then((doc) => {
            if (!doc.exists) {
                showNotification("Замовлення не знайдено", "error");
                return;
            }
            
            const order = doc.data();
            
            // Проверяем права доступа
            if (!adminMode && order.userId !== currentUser.uid) {
                showNotification("Ви не можете скасувати це замовлення", "error");
                return;
            }
            
            // Проверяем, можно ли отменить заказ
            if (order.status !== 'new') {
                showNotification("Неможливо скасувати замовлення з поточним статусом: " + getStatusText(order.status), "error");
                return;
            }
            
            // Выполняем отмену
            return performOrderCancellation(orderId, order);
        })
        .then(() => {
            // Успешная отмена
            showNotification("Замовлення успішно скасовано");
            
            // Обновляем интерфейс в зависимости от контекста
            setTimeout(() => {
                if (adminMode) {
                    loadAdminOrders();
                } else {
                    // Закрываем модальное окно и обновляем список заказов
                    closeModal();
                    viewOrders();
                }
            }, 1000);
        })
        .catch((error) => {
            console.error("Помилка скасування замовлення: ", error);
            showNotification("Помилка скасування замовлення", "error");
        });
}

// ===== УЛУЧШЕННАЯ ФУНКЦИЯ ВЫПОЛНЕНИЯ ОТМЕНЫ =====
function performOrderCancellation(orderId, order) {
    const updateData = {
        status: 'cancelled',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
        cancelledBy: adminMode ? 'admin' : 'user',
        cancelledById: currentUser.uid
    };
    
    return db.collection("orders").doc(orderId).update(updateData);
}

// Збереження URL фіду
function saveFeedUrl() {
  const feedUrl = document.getElementById("feed-url").value;
  localStorage.setItem(FEED_URL_KEY, feedUrl);
  showNotification("URL фіду збережено");
}

// Очищення каталогу
function clearCatalog() {
  if (confirm("Ви впевнені, що хочете очистити каталог? Цю дію не можна скасувати.")) {
    showLoadingSkeleton();
    
    db.collection("products").get()
      .then((querySnapshot) => {
        const batch = db.batch();
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        return batch.commit();
      })
      .then(() => {
        products = [];
        localStorage.removeItem('products_backup');
        renderProducts();
        renderFeaturedProducts();
        renderCategories();
        renderBrands();
        showNotification("Каталог очищено");
      })
      .catch((error) => {
        console.error("Помилка при очищенні каталогу: ", error);
        showNotification("Помилка при очищенні каталогу", "error");
      });
  }
}

// Експорт в JSON
function exportJSON() {
  const dataStr = JSON.stringify(products, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = 'products.json';
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  
  showNotification("Дані експортовано в JSON");
}

// Функція відкриття модального вікна додавання товару
function openAddProductModal() {
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
    <h3>Додати новий товар</h3>
    <form onsubmit="saveNewProduct(event)">
      <div class="form-group">
        <label>Назва товару</label>
        <input type="text" id="product-title" required>
      </div>
      <div class="form-group">
        <label>Опис</label>
        <textarea id="product-description" rows="3"></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Ціна, ₴</label>
          <input type="number" id="product-price" min="0" step="0.01" required>
        </div>
        <div class="form-group">
          <label>Стара ціна, ₴</label>
          <input type="number" id="product-old-price" min="0" step="0.01">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Категорія</label>
          <input type="text" id="product-category" required>
        </div>
        <div class="form-group">
          <label>Бренд</label>
          <input type="text" id="product-brand" required>
        </div>
      </div>
      <div class="form-group">
        <label>URL зображення</label>
        <input type="url" id="product-image">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>
            <input type="checkbox" id="product-in-stock"> В наявності
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="product-is-new"> Новинка
          </label>
        </div>
      </div>
      <div class="form-group">
        <label>Знижка, %</label>
        <input type="number" id="product-discount" min="0" max="100">
      </div>
      <button type="submit" class="btn btn-detail">Зберегти товар</button>
    </form>
  `;
  
  openModal();
  
  setTimeout(optimizeModalForMobile, 100);
}

// Функція збереження нового товару
function saveNewProduct(event) {
  event.preventDefault();
  
  const newProduct = {
    title: document.getElementById('product-title').value,
    description: document.getElementById('product-description').value,
    price: parseFloat(document.getElementById('product-price').value),
    oldPrice: document.getElementById('product-old-price').value ? parseFloat(document.getElementById('product-old-price').value) : null,
    category: document.getElementById('product-category').value,
    brand: document.getElementById('product-brand').value,
    image: document.getElementById('product-image').value || '',
    inStock: document.getElementById('product-in-stock').checked,
    isNew: document.getElementById('product-is-new').checked,
    discount: document.getElementById('product-discount').value ? parseInt(document.getElementById('product-discount').value) : null
  };
  
  saveProduct(newProduct)
    .then(() => {
      closeModal();
      switchTab('products-tab');
    });
}

// Функція завантаження товарів в адмін-панелі
function loadAdminProducts() {
  const productsList = document.getElementById("admin-products-list");
  productsList.innerHTML = '<p>Завантаження товарів...</p>';
  
  db.collection("products")
    .orderBy("createdAt", "desc")
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        productsList.innerHTML = '<p>Товарів немає</p>';
        return;
      }
      
      productsList.innerHTML = `
        <div style="margin-bottom: 15px;">
          <input type="text" id="admin-products-search" placeholder="Пошук товарів..." oninput="searchAdminProducts(this.value)" style="padding: 8px; width: 100%; border: 1px solid #ddd; border-radius: var(--border-radius);">
        </div>
        <div class="admin-products-container"></div>
      `;
      
      const productsContainer = productsList.querySelector('.admin-products-container');
      
      querySnapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        const productElement = document.createElement('div');
        productElement.className = 'admin-product-item';
        productElement.style.border = '1px solid #eee';
        productElement.style.padding = '15px';
        productElement.style.marginBottom = '15px';
        productElement.style.borderRadius = '8px';
        
        productElement.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1;">
              <h4>${product.title}</h4>
              <p>${product.description || 'Опис відсутній'}</p>
              <p><strong>Ціна:</strong> ${formatPrice(product.price)} ₴</p>
              <p><strong>Категорія:</strong> ${translateCategory(product.category)}</p>
              <p><strong>Бренд:</strong> ${product.brand}</p>
              <p><strong>Статус:</strong> ${product.inStock ? 'В наявності' : 'Немає в наявності'}</p>
            </div>
            <div>
              <img src="${product.image || 'https://via.placeholder.com/100x100?text=No+Image'}" alt="${product.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: var(--border-radius);">
            </div>
          </div>
          <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button class="btn btn-detail" onclick="editProduct('${product.id}')">Редагувати</button>
            <button class="btn" style="background: var(--danger); color: white;" onclick="deleteProduct('${product.id}')">Видалити</button>
          </div>
        `;
        
        productsContainer.appendChild(productElement);
      });
    })
    .catch((error) => {
      console.error("Помилка завантаження товарів: ", error);
      productsList.innerHTML = '<p>Помилка завантаження товарів</p>';
    });
}

// Функція пошуку товарів в адмін-панелі
function searchAdminProducts(query) {
  const productItems = document.querySelectorAll('.admin-product-item');
  
  productItems.forEach(item => {
    const title = item.querySelector('h4').textContent.toLowerCase();
    const description = item.querySelector('p').textContent.toLowerCase();
    const searchText = query.toLowerCase();
    
    if (title.includes(searchText) || description.includes(searchText)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

// Функція редагування товару
function editProduct(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
    <h3>Редагувати товар</h3>
    <form onsubmit="updateProduct(event, '${productId}')">
      <div class="form-group">
        <label>Назва товару</label>
        <input type="text" id="edit-product-title" value="${product.title}" required>
      </div>
      <div class="form-group">
        <label>Опис</label>
        <textarea id="edit-product-description" rows="3">${product.description || ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Ціна, ₴</label>
          <input type="number" id="edit-product-price" min="0" step="0.01" value="${product.price}" required>
        </div>
        <div class="form-group">
          <label>Стара ціна, ₴</label>
          <input type="number" id="edit-product-old-price" min="0" step="0.01" value="${product.oldPrice || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Категорія</label>
          <input type="text" id="edit-product-category" value="${product.category}" required>
        </div>
        <div class="form-group">
          <label>Бренд</label>
          <input type="text" id="edit-product-brand" value="${product.brand}" required>
        </div>
      </div>
      <div class="form-group">
        <label>URL зображення</label>
        <input type="url" id="edit-product-image" value="${product.image || ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>
            <input type="checkbox" id="edit-product-in-stock" ${product.inStock ? 'checked' : ''}> В наявності
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="edit-product-is-new" ${product.isNew ? 'checked' : ''}> Новинка
          </label>
        </div>
      </div>
      <div class="form-group">
        <label>Знижка, %</label>
        <input type="number" id="edit-product-discount" min="0" max="100" value="${product.discount || ''}">
      </div>
      <button type="submit" class="btn btn-detail">Оновити товар</button>
    </form>
  `;
  
  openModal();
  
  setTimeout(optimizeModalForMobile, 100);
}

// Функція оновлення товару
function updateProduct(event, productId) {
  event.preventDefault();
  
  const updatedProduct = {
    id: productId,
    title: document.getElementById('edit-product-title').value,
    description: document.getElementById('edit-product-description').value,
    price: parseFloat(document.getElementById('edit-product-price').value),
    oldPrice: document.getElementById('edit-product-old-price').value ? parseFloat(document.getElementById('edit-product-old-price').value) : null,
    category: document.getElementById('edit-product-category').value,
    brand: document.getElementById('edit-product-brand').value,
    image: document.getElementById('edit-product-image').value || '',
    inStock: document.getElementById('edit-product-in-stock').checked,
    isNew: document.getElementById('edit-product-is-new').checked,
    discount: document.getElementById('edit-product-discount').value ? parseInt(document.getElementById('edit-product-discount').value) : null
  };
  
  saveProduct(updatedProduct)
    .then(() => {
      closeModal();
      switchTab('products-tab');
    });
}

// Функція видалення товару
function deleteProduct(productId) {
  if (confirm("Ви впевнені, що хочете видалити цей товар? Цю дію не можна скасувати.")) {
    db.collection("products").doc(productId).delete()
      .then(() => {
        showNotification("Товар успішно видалено");
        loadAdminProducts();
      })
      .catch((error) => {
        console.error("Помилка видалення товару: ", error);
        showNotification("Помилка видалення товару", "error");
      });
  }
}

// Функция загрузки статистики заказов пользователя
function loadUserOrderStats() {
    if (!currentUser) return;
    
    db.collection("orders")
        .where("userId", "==", currentUser.uid)
        .get()
        .then((querySnapshot) => {
            const ordersCount = querySnapshot.size;
            document.getElementById('profile-orders-count').textContent = ordersCount;
        })
        .catch((error) => {
            console.error("Помилка завантаження статистики замовлень: ", error);
        });
}

// Функция для получения информации о статусе заказа
function getOrderStatusInfo(status) {
    const statusMap = {
        'new': { class: 'status-new', text: 'Новий', icon: 'fas fa-clock' },
        'processing': { class: 'status-processing', text: 'В обробці', icon: 'fas fa-cog' },
        'shipped': { class: 'status-shipped', text: 'Відправлено', icon: 'fas fa-shipping-fast' },
        'delivered': { class: 'status-delivered', text: 'Доставлено', icon: 'fas fa-check-circle' },
        'cancelled': { class: 'status-cancelled', text: 'Скасовано', icon: 'fas fa-times-circle' }
    };
    
    return statusMap[status] || statusMap['new'];
}

// Улучшенная функция просмотра заказов
function viewOrders() {
    if (!currentUser) {
        openAuthModal();
        showNotification("Увійдіть в систему для перегляду замовлень", "warning");
        return;
    }
    
    const modalContent = document.getElementById("modal-content");
    modalContent.innerHTML = `
        <button class="modal-close" onclick="closeModal()" aria-label="Закрити"><i class="fas fa-times" aria-hidden="true"></i></button>
        <h3>Мої замовлення</h3>
        <div class="user-orders-container">
            <div id="user-orders-list" style="max-height: 60vh; overflow-y: auto;"></div>
        </div>
    `;
    
    const ordersList = document.getElementById("user-orders-list");
    ordersList.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Завантаження замовлень...</div>';
    
    // Используем реальное слушание для обновлений в реальном времени
    const unsubscribe = db.collection("orders")
        .where("userId", "==", currentUser.uid)
        .orderBy("createdAt", "desc")
        .onSnapshot((querySnapshot) => {
            if (querySnapshot.empty) {
                ordersList.innerHTML = `
                    <div class="empty-orders">
                        <i class="fas fa-box-open"></i>
                        <h4>У вас немає замовлень</h4>
                        <p>Після оформлення замовлення воно з'явиться тут</p>
                        <button class="btn btn-detail" onclick="closeModal(); applyFilters();">Перейти до товарів</button>
                    </div>
                `;
                return;
            }
            
            let ordersHTML = '';
            querySnapshot.forEach((doc) => {
                const order = { id: doc.id, ...doc.data() };
                const orderDate = order.createdAt ? order.createdAt.toDate().toLocaleString('uk-UA') : 'Дата не вказана';
                const statusInfo = getOrderStatusInfo(order.status);
                
                const ttnSection = order.ttn ? `
                    <div class="order-ttn-info">
                        <p><strong>ТТН:</strong> ${order.ttn}</p>
                        <a href="https://tracking.novaposhta.ua/#/uk/search/${order.ttn}" target="_blank" class="track-link">
                            <i class="fas fa-external-link-alt"></i> Відстежити посилку
                        </a>
                    </div>
                ` : '';
                
                // Комментарий к заказу
                const commentSection = order.comment ? `
                    <div class="order-comment">
                        <p><strong>Ваш коментар:</strong> "${order.comment}"</p>
                    </div>
                ` : '';
                
                // Кнопка отмены только для заказов со статусом "new"
                const cancelButton = order.status === 'new' ? `
                    <button class="btn btn-danger" onclick="cancelOrder('${order.id}')">
                        <i class="fas fa-times"></i> Скасувати
                    </button>
                ` : '';
                
                // Информация о поставщиках, если есть
                const suppliersInfo = order.suppliers ? `
                    <div class="suppliers-badge">
                        <i class="fas fa-boxes"></i> ${Object.keys(order.suppliers).length} поставщик(ов)
                    </div>
                ` : '';
                
                ordersHTML += `
                    <div class="user-order-item">
                        <div class="order-header">
                            <div class="order-main-info">
                                <h4>Замовлення #${order.id}</h4>
                                <span class="order-date">${orderDate}</span>
                            </div>
                            <div class="order-status-badge ${statusInfo.class}">
                                <i class="${statusInfo.icon}"></i>
                                ${statusInfo.text}
                            </div>
                        </div>
                        
                        <div class="order-summary">
                            <p><strong>Сума:</strong> ${formatPrice(order.total)} ₴</p>
                            <p><strong>Доставка:</strong> ${order.delivery.service}</p>
                            <p><strong>Оплата:</strong> ${order.paymentMethod === 'cash' ? 'Готівкою при отриманні' : 'Онлайн-оплата карткою'}</p>
                        </div>
                        
                        ${commentSection}
                        ${suppliersInfo}
                        ${ttnSection}
                        
                        <div class="order-actions">
                            <button class="btn btn-detail" onclick="viewOrderDetails('${order.id}')">
                                <i class="fas fa-eye"></i> Деталі
                            </button>
                            ${cancelButton}
                        </div>
                    </div>
                `;
            });
            
            ordersList.innerHTML = ordersHTML;
        }, (error) => {
            console.error("Помилка завантаження замовлень: ", error);
            ordersList.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Помилка завантаження замовлень</div>';
        });
    
    // Сохраняем функцию отписки для использования при закрытии модального окна
    window.currentOrdersUnsubscribe = unsubscribe;
    
    openModal();
    setTimeout(optimizeModalForMobile, 100);
}

// Добавляем вкладку для модерации отзывов в админ-панель, если её нет
function addReviewsTabIfNotExists() {
    const adminTabs = document.querySelector('.admin-tabs');
    if (!adminTabs) return;
    
    // Проверяем, есть ли уже вкладка отзывов
    const existingReviewsTab = adminTabs.querySelector('[onclick*="reviews-tab-content"]');
    if (existingReviewsTab) return;
    
    // Добавляем вкладку отзывов
    const reviewsTab = document.createElement('div');
    reviewsTab.className = 'tab';
    reviewsTab.setAttribute('onclick', "switchTab('reviews-tab-content')");
    reviewsTab.innerHTML = '<i class="fas fa-comments"></i> Модерація відгуків';
    adminTabs.appendChild(reviewsTab);
    
    // Добавляем контент для вкладки отзывов
    const tabContents = document.querySelector('.tab-contents');
    if (tabContents) {
        const reviewsContent = document.createElement('div');
        reviewsContent.id = 'reviews-tab-content';
        reviewsContent.className = 'tab-content';
        reviewsContent.innerHTML = `
            <h3>Модерація відгуків</h3>
            <div id="reviews-moderation-container"></div>
        `;
        tabContents.appendChild(reviewsContent);
    }
}

// Вспомогательная функция для перемешивания массива
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Функция для адаптации заголовка
function adjustHeaderTitle() {
  const headerTitle = document.querySelector('.header-title');
  if (window.innerWidth <= 768) {
    headerTitle.textContent = 'InstruForge';
  } else {
    headerTitle.textContent = 'InstruForge - Інструменти та обладнання';
  }
}

// Переключение источника данных
function switchSource(source) {
  currentFilters.source = source;
  applyFilters();
}

// Функция переключения источника товаров
function switchSource(source, element) {
    document.querySelectorAll('.source-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    if (element) {
        element.classList.add('active');
    } else {
        const tabButton = document.querySelector(`.source-tab[onclick*="${source}"]`);
        if (tabButton) {
            tabButton.classList.add('active');
        }
    }
    
    currentFilters.source = source === 'all' ? '' : source;
    currentPage = 1;
    
    const titles = {
        'all': 'Всі товари',
        'products1.json': 'Інструменти',
        'products2.json': 'Насоси та сантехніка',
        'products3.json': 'Кріплення та витратні матеріали',
        'products4.json': 'Електроінструменти',
        'products5.json': 'Колекційні сувеніри та моделі',
        'products6.json': 'Швидкий ремонт'
    };
    
    document.getElementById('products-title').textContent = titles[source] || 'Товари';
    
    applyFilters();
}

// Функция для оптимизации модальных окон на мобильных устройствах
function optimizeModalForMobile() {
  const modal = document.getElementById('modal');
  const modalContent = document.querySelector('.modal-content');
  
  if (window.innerWidth <= 768) {
    modal.classList.add('mobile-modal');
    document.body.style.overflow = 'hidden';
    
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
}

// Вспомогательная функция для отслеживания посылок (заглушка)
function trackParcel(parcelNumber) {
  showNotification(`Функція відстеження посилки ${parcelNumber + 1} знаходиться в розробці`, "info");
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  initApp();
  
  // Инициализация EmailJS
  emailjs.init(EMAILJS_USER_ID);
  
  // Добавляем обработчики событий для мобильного меню
  document.getElementById('mobile-menu-btn').addEventListener('click', function() {
    document.getElementById('mobile-menu').classList.toggle('active');
  });
  
  document.getElementById('mobile-menu-close').addEventListener('click', function() {
    document.getElementById('mobile-menu').classList.remove('active');
  });
  
  // Добавляем обработчики для мобильных фильтров
  document.getElementById('mobile-filters-close').addEventListener('click', closeMobileFilters);
  document.getElementById('mobile-filters-apply').addEventListener('click', applyMobileFilters);
  document.getElementById('mobile-filters-reset').addEventListener('click', resetMobileFilters);
  
  // Закрытие мобильного меню при клике на ссылку
  document.querySelectorAll('#mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
      document.getElementById('mobile-menu').classList.remove('active');
    });
  });
  
  // Добавляем стили для мобильных фильтров, если их еще нет
  if (!document.getElementById('mobile-filters-styles')) {
    const style = document.createElement('style');
    style.id = 'mobile-filters-styles';
    style.textContent = `
      .mobile-filters {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        z-index: 1000;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        overflow-y: auto;
        padding: 20px;
      }
      
      .mobile-filters.active {
        transform: translateX(0);
      }
      
      .mobile-filters-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid #eee;
      }
      
      .mobile-filters-body {
        margin-bottom: 20px;
      }
      
      .mobile-filters-footer {
        position: sticky;
        bottom: 0;
        background: white;
        padding: 15px 0;
        border-top: 1px solid #eee;
        display: flex;
        gap: 10px;
      }
      
      .mobile-filters-footer .btn {
        flex: 1;
      }
    `;
    document.head.appendChild(style);
  }
});

// Добавляем функцию для обновления заголовка страницы при загрузке
function updatePageTitle() {
  const category = currentFilters.category;
  const search = currentFilters.search;
  
  let title = 'InstruForge - Інструменти та обладнання';
  
  if (search) {
    title = `Пошук: "${search}" - InstruForge`;
  } else if (category) {
    title = `${translateCategory(category)} - InstruForge`;
  } else if (showingFavorites) {
    title = 'Обрані товари - InstruForge';
  }
  
  document.title = title;
}

// Обновляем заголовок при применении фильтров
const originalApplyFilters = applyFilters;
applyFilters = function() {
  originalApplyFilters();
  updatePageTitle();
};

// Обновляем заголовок при переключении в избранное
const originalToggleFavorites = toggleFavorites;
toggleFavorites = function() {
  originalToggleFavorites();
  updatePageTitle();
};

// Функция открытия модального окна с правилами магазина
function openRules() {
    const modal = document.getElementById("rules-modal");
    modal.classList.add("active");
    document.body.style.overflow = 'hidden';
}

// Функция закрытия модального окна с правилами
function closeRulesModal() {
    const modal = document.getElementById("rules-modal");
    modal.classList.remove("active");
    document.body.style.overflow = '';
}

// Закрытие модального окна правил при клике вне контента
document.addEventListener('click', function(e) {
    const rulesModal = document.getElementById("rules-modal");
    if (e.target === rulesModal) {
        closeRulesModal();
    }
});

// Закрытие модального окна правил по ESC
document.addEventListener('keydown', function(e) {
    const rulesModal = document.getElementById("rules-modal");
    if (e.key === 'Escape' && rulesModal.classList.contains('active')) {
        closeRulesModal();
    }
});