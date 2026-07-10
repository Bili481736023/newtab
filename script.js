(function() {
    'use strict';

    // ============================================================
    // DOM 引用
    // ============================================================
    const timeEl = document.getElementById('time');
    const dateEl = document.getElementById('date');
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const engineTrigger = document.getElementById('engineTrigger');
    const currentEngineLabel = document.getElementById('currentEngineLabel');
    const popup = document.getElementById('enginePopup');
    const overlay = document.getElementById('popupOverlay');
    const engineItems = popup.querySelectorAll('.engine-item');
    const historyDropdown = document.getElementById('historyDropdown');
    const shortcutsGrid = document.getElementById('shortcutsGrid');

    const modal = document.getElementById('shortcutModal');
    const nameInput = document.getElementById('shortcutNameInput');
    const urlInput = document.getElementById('shortcutUrlInput');
    const cancelBtn = document.getElementById('shortcutCancelBtn');
    const saveBtn = document.getElementById('shortcutSaveBtn');

    const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

    // ============================================================
    // 时钟
    // ============================================================
    function pad(n) { return String(n).padStart(2, '0'); }

    function updateClock() {
        const now = new Date();
        const h = now.getHours(),
            m = now.getMinutes(),
            s = now.getSeconds();
        timeEl.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
        const year = now.getFullYear(),
            month = now.getMonth() + 1,
            day = now.getDate(),
            wd = WEEKDAYS[now.getDay()];
        dateEl.textContent = year + '年' + month + '月' + day + '日 星期' + wd;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ============================================================
    // 搜索引擎
    // ============================================================
    const ENGINES = {
        bing: {
            url: 'https://www.bing.com/search',
            param: 'q',
            placeholder: '在 Bing 中搜索…',
            label: '✦ &nbsp;Bing'
        },
        baidu: {
            url: 'https://www.baidu.com/s',
            param: 'wd',
            placeholder: '在 百度 中搜索…',
            label: '✦ &nbsp;百度'
        },
        yandex: {
            url: 'https://yandex.com/search/',
            param: 'text',
            placeholder: '在 Yandex 中搜索…',
            label: '✦ &nbsp;Yandex'
        },
        google: {
            url: 'https://www.google.com/search',
            param: 'q',
            placeholder: '在 Google 中搜索…',
            label: '✦ &nbsp;Google'
        }
    };

    let currentEngine = 'bing';

    function setEngine(engineKey) {
        if (!ENGINES[engineKey]) return;
        const config = ENGINES[engineKey];
        currentEngine = engineKey;
        searchForm.action = config.url;
        searchInput.name = config.param;
        searchInput.placeholder = config.placeholder;
        currentEngineLabel.innerHTML = config.label;
        engineItems.forEach(item => {
            const key = item.dataset.engine;
            if (key === engineKey) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        closePopup();
        searchInput.style.transition = 'box-shadow 0.25s ease';
        searchInput.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.25)';
        setTimeout(() => { searchInput.style.boxShadow = 'none'; }, 400);
        try {
            localStorage.setItem('preferredEngine', engineKey);
        } catch (_) {}
    }

    function openPopup() {
        popup.classList.add('show');
        overlay.classList.add('show');
        engineTrigger.classList.add('active');
    }

    function closePopup() {
        popup.classList.remove('show');
        overlay.classList.remove('show');
        engineTrigger.classList.remove('active');
    }

    function togglePopup() {
        if (popup.classList.contains('show')) {
            closePopup();
        } else {
            openPopup();
        }
    }

    engineTrigger.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePopup();
    });
    overlay.addEventListener('click', closePopup);
    engineItems.forEach(item => {
        item.addEventListener('click', function() {
            const key = this.dataset.engine;
            if (key) setEngine(key);
        });
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (popup.classList.contains('show')) closePopup();
            if (historyDropdown.classList.contains('show')) hideHistory();
            if (modal.classList.contains('show')) closeModal();
        }
    });

    // ============================================================
    // 搜索历史
    // ============================================================
    const STORAGE_KEY = 'searchHistory';
    const MAX_HISTORY = 30;

    function getHistory() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (_) { return []; }
    }

    function saveHistory(history) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        } catch (_) {}
    }

    function addHistoryItem(query) {
        query = query.trim();
        if (!query) return;
        let history = getHistory();
        history = history.filter(item => item !== query);
        history.unshift(query);
        if (history.length > MAX_HISTORY) {
            history = history.slice(0, MAX_HISTORY);
        }
        saveHistory(history);
        renderHistory();
    }

    function deleteHistoryItem(query) {
        let history = getHistory();
        history = history.filter(item => item !== query);
        saveHistory(history);
        renderHistory();
    }

    function clearAllHistory() {
        saveHistory([]);
        renderHistory();
        hideHistory();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function renderHistory() {
        const history = getHistory();
        if (history.length === 0) {
            historyDropdown.innerHTML = `<div class="history-empty">暂无搜索历史</div>`;
            return;
        }
        let html = '';
        history.forEach(item => {
            html += `
                <div class="history-item">
                    <span class="history-text">${escapeHtml(item)}</span>
                    <button class="history-delete" aria-label="删除">✕</button>
                </div>
            `;
        });
        html += `
            <div class="history-actions">
                <button class="history-clear-btn" id="clearHistoryBtn">清空全部</button>
            </div>
        `;
        historyDropdown.innerHTML = html;

        historyDropdown.querySelectorAll('.history-item').forEach(itemEl => {
            const textSpan = itemEl.querySelector('.history-text');
            itemEl.addEventListener('click', function(e) {
                if (e.target.classList.contains('history-delete')) return;
                const query = textSpan.textContent;
                if (query) {
                    searchInput.value = query;
                    searchForm.submit();
                    hideHistory();
                }
            });
            const delBtn = itemEl.querySelector('.history-delete');
            if (delBtn) {
                delBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const query = textSpan.textContent;
                    if (query) deleteHistoryItem(query);
                });
            }
        });

        const clearBtn = document.getElementById('clearHistoryBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                clearAllHistory();
            });
        }
    }

    let hideTimeout = null;

    function showHistory() {
        renderHistory();
        historyDropdown.classList.add('show');
    }

    function hideHistory() {
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            historyDropdown.classList.remove('show');
        }, 150);
    }

    searchInput.addEventListener('focus', function() {
        if (hideTimeout) clearTimeout(hideTimeout);
        showHistory();
    });

    document.addEventListener('click', function(e) {
        const isSearchSection = searchInput.closest('.search-section')?.contains(e.target);
        const isDropdown = historyDropdown.contains(e.target);
        if (!isSearchSection && !isDropdown) {
            hideHistory();
        }
    });

    searchForm.addEventListener('submit', function(e) {
        const val = searchInput.value.trim();
        if (val === '') {
            e.preventDefault();
            searchInput.style.transition = 'box-shadow 0.2s ease';
            searchInput.style.boxShadow = '0 0 0 3px rgba(255, 100, 100, 0.2)';
            setTimeout(() => { searchInput.style.boxShadow = 'none'; }, 600);
            return;
        }
        addHistoryItem(val);
        hideHistory();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            searchInput.blur();
            hideHistory();
        }
    });

    // ============================================================
    // 快捷链接
    // ============================================================
    const SHORTCUTS_KEY = 'shortcuts';

    function getShortcuts() {
        try {
            const data = localStorage.getItem(SHORTCUTS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (_) { return []; }
    }

    function saveShortcuts(list) {
        try {
            localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(list));
        } catch (_) {}
    }

    function getFavicon(url) {
        try {
            const u = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
        } catch (_) {
            return '';
        }
    }

    function renderShortcuts() {
        const list = getShortcuts();
        let html = '';

        list.forEach((item, index) => {
            const icon = item.icon || getFavicon(item.url);
            html += `
                <a href="${item.url}" target="_blank" class="shortcut-item" data-index="${index}">
                    <img class="shortcut-icon" src="${icon}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.style.display='none'" />
                    <span class="shortcut-name">${escapeHtml(item.name)}</span>
                    <span class="shortcut-delete" data-index="${index}">✕</span>
                </a>
            `;
        });

        html += `
            <div class="shortcuts-add-btn" id="addShortcutBtn">
                <span class="add-icon">+</span>
                <span>添加</span>
            </div>
        `;

        shortcutsGrid.innerHTML = html;

        shortcutsGrid.querySelectorAll('.shortcut-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const idx = parseInt(this.dataset.index);
                if (!isNaN(idx)) {
                    deleteShortcut(idx);
                }
            });
        });

        const addBtn = document.getElementById('addShortcutBtn');
        if (addBtn) {
            addBtn.addEventListener('click', openModal);
        }
    }

    function deleteShortcut(index) {
        let list = getShortcuts();
        if (index >= 0 && index < list.length) {
            list.splice(index, 1);
            saveShortcuts(list);
            renderShortcuts();
        }
    }

    function addShortcut(name, url) {
        name = name.trim();
        url = url.trim();
        if (!name || !url) return false;
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }
        try {
            new URL(url);
        } catch (_) {
            return false;
        }
        let list = getShortcuts();
        const existing = list.findIndex(item => item.url === url);
        if (existing !== -1) {
            list[existing].name = name;
        } else {
            list.push({ name, url, icon: getFavicon(url) });
        }
        saveShortcuts(list);
        renderShortcuts();
        return true;
    }

    // ============================================================
    // 弹窗控制
    // ============================================================
    function openModal() {
        nameInput.value = '';
        urlInput.value = '';
        modal.classList.add('show');
        setTimeout(() => nameInput.focus(), 100);
    }

    function closeModal() {
        modal.classList.remove('show');
    }

    function handleSave() {
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();
        if (!name) {
            nameInput.focus();
            nameInput.style.boxShadow = '0 0 0 3px rgba(255,100,100,0.2)';
            setTimeout(() => { nameInput.style.boxShadow = 'none'; }, 600);
            return;
        }
        if (!url) {
            urlInput.focus();
            urlInput.style.boxShadow = '0 0 0 3px rgba(255,100,100,0.2)';
            setTimeout(() => { urlInput.style.boxShadow = 'none'; }, 600);
            return;
        }
        const success = addShortcut(name, url);
        if (success) {
            closeModal();
        } else {
            urlInput.focus();
            urlInput.style.boxShadow = '0 0 0 3px rgba(255,100,100,0.2)';
            setTimeout(() => { urlInput.style.boxShadow = 'none'; }, 600);
        }
    }

    cancelBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', handleSave);

    urlInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    });
    nameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            urlInput.focus();
        }
    });

    modal.addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });

    // ============================================================
    // 恢复搜索引擎
    // ============================================================
    try {
        const saved = localStorage.getItem('preferredEngine');
        if (saved && ENGINES[saved]) {
            setEngine(saved);
        }
    } catch (_) {}

    // ============================================================
    // 初始化
    // ============================================================
    renderHistory();
    renderShortcuts();

    console.log('✦ 极光起始页已加载 · v1.1.0 ✦');
})();