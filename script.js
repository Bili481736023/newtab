(function() {
    'use strict';

    // ===== DOM 引用 =====
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

    const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

    // ===== 时钟 =====
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

    // ===== 搜索引擎配置 =====
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
        }
    };

    let currentEngine = 'bing';

    // ===== 切换搜索引擎 =====
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
        setTimeout(() => {
            searchInput.style.boxShadow = 'none';
        }, 400);

        try {
            localStorage.setItem('preferredEngine', engineKey);
        } catch (_) {}
    }

    // ===== 引擎弹出控制 =====
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
    overlay.addEventListener('click', function() { closePopup(); });
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
        }
    });
    document.addEventListener('click', function(e) {
        if (popup.classList.contains('show')) {
            const isTrigger = engineTrigger.contains(e.target);
            const isPopup = popup.contains(e.target);
            if (!isTrigger && !isPopup) closePopup();
        }
    });

    // ===== 历史记录管理 =====
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

    // 转义显示（仅用于展示，防止 XSS）
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function renderHistory() {
        const history = getHistory();
        if (history.length === 0) {
            historyDropdown.innerHTML = `
                <div class="history-empty">暂无搜索历史</div>
            `;
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

        // 绑定事件：点击历史项
        historyDropdown.querySelectorAll('.history-item').forEach(itemEl => {
            const textSpan = itemEl.querySelector('.history-text');
            // 点击整个条目（除删除按钮）触发搜索
            itemEl.addEventListener('click', function(e) {
                if (e.target.classList.contains('history-delete')) return;
                const query = textSpan.textContent; // 原始文本
                if (query) {
                    searchInput.value = query;
                    searchForm.submit();
                    hideHistory();
                }
            });
            // 删除按钮
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

    // ===== 显示/隐藏历史下拉 =====
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

    // 表单提交：保存历史 + 正常提交
    searchForm.addEventListener('submit', function(e) {
        const val = searchInput.value.trim();
        if (val === '') {
            e.preventDefault();
            searchInput.style.transition = 'box-shadow 0.2s ease';
            searchInput.style.boxShadow = '0 0 0 3px rgba(255, 100, 100, 0.2)';
            setTimeout(() => {
                searchInput.style.boxShadow = 'none';
            }, 600);
            return;
        }
        addHistoryItem(val);
        hideHistory();
        // 正常提交
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            searchInput.blur();
            hideHistory();
        }
    });

    // ===== 恢复上次使用的搜索引擎 =====
    try {
        const saved = localStorage.getItem('preferredEngine');
        if (saved && ENGINES[saved]) {
            setEngine(saved);
        }
    } catch (_) {}

    // ===== 初始化历史渲染 =====
    renderHistory();

    console.log('✦ 起始页已加载 · 历史记录修复完成 ✦');
})();