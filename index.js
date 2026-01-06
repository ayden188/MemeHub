/* ██████╗ ██████╗ ██╗ ██████╗ ███╗   ██╗
   ██╔══██╗██╔══██╗██║██╔═══██╗████╗  ██║
   ██║  ██║██████╔╝██║██║   ██║██╔██╗ ██║
   ██║  ██║██╔══██╗██║██║   ██║██║╚██╗██║
   ██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║
   ORION MEME ENGINE - FULL VERSION WITH WEB SHARE
*/

const CONFIG = {
    API_KEY: '1FkwOfmkrdfxmUXBW7KSgsAdLIcRbmOK',
    LIMIT: 12,
    ENDPOINTS: {
        trending: 'https://api.giphy.com/v1/gifs/trending',
        search: 'https://api.giphy.com/v1/gifs/search',
        random: 'https://api.giphy.com/v1/gifs/random'
    }
};

const STATE = {
    container: document.getElementById('meme-container'),
    scrollAnchor: document.getElementById('scroll-anchor'),
    title: document.getElementById('dynamic-greeting'),
    subtext: document.getElementById('dynamic-subtext'),
    currentOffset: 0,
    isLoading: false,
    currentSearch: ""
};

// --- 1. INITIALISATION ---
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initNavigation();
    initSearch();
    initFilterBar();
    initScrollProgress();
    fetchMemes(true);

    const observer = new IntersectionObserver((entries) => {
        const canLoadMore = !["favoris", "random_mode"].includes(STATE.currentSearch);
        if (entries[0].isIntersecting && !STATE.isLoading && canLoadMore) {
            fetchMemes();
        }
    }, { threshold: 0.1 });
    
    if (STATE.scrollAnchor) observer.observe(STATE.scrollAnchor);
});

// --- 2. LOGIQUE DES LIKES PERSISTANTS ---
function getPersistentMeta(gifId) {
    const storageKey = `meta_${gifId}`;
    let stored = JSON.parse(localStorage.getItem(storageKey));

    if (!stored) {
        stored = { 
            likes: Math.floor(Math.random() * 800) + 50,
            isLiked: false 
        };
        localStorage.setItem(storageKey, JSON.stringify(stored));
    }
    return stored;
}

function handleLike(btn) {
    const id = btn.dataset.id;
    const storageKey = `meta_${id}`;
    let data = getPersistentMeta(id);

    data.isLiked = !data.isLiked;
    data.likes += data.isLiked ? 1 : -1;

    localStorage.setItem(storageKey, JSON.stringify(data));

    btn.classList.toggle('liked', data.isLiked);
    btn.querySelector('.icon').textContent = data.isLiked ? '❤️' : '♡';
    btn.querySelector('.count').textContent = data.likes;
    
    btn.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.3)' },
        { transform: 'scale(1)' }
    ], { duration: 300, easing: 'ease-out' });
}

// --- 3. MOTEUR API ---
async function fetchMemes(isNewSearch = false) {
    if (STATE.isLoading) return;
    STATE.isLoading = true;

    if (isNewSearch) {
        STATE.currentOffset = 0;
        STATE.container.innerHTML = "";
        showSkeletons();
    }

    const isTrending = STATE.currentSearch === "";
    const url = new URL(isTrending ? CONFIG.ENDPOINTS.trending : CONFIG.ENDPOINTS.search);
    
    url.searchParams.append('api_key', CONFIG.API_KEY);
    url.searchParams.append('limit', CONFIG.LIMIT);
    url.searchParams.append('offset', STATE.currentOffset);
    url.searchParams.append('rating', 'g');
    if (!isTrending) url.searchParams.append('q', STATE.currentSearch);

    try {
        const response = await fetch(url, { credentials: 'omit' });
        const result = await response.json();
        const memes = processMemeData(result.data);
        
        removeSkeletons();
        appendMemes(memes);
        STATE.currentOffset += CONFIG.LIMIT;
    } catch (error) {
        console.error("Erreur API:", error);
    } finally {
        STATE.isLoading = false;
    }
}

function processMemeData(giphyData) {
    const rawData = Array.isArray(giphyData) ? giphyData : [giphyData];
    return rawData.filter(gif => gif && gif.id).map(gif => {
        const meta = getPersistentMeta(gif.id);
        return {
            id: gif.id,
            title: gif.title?.trim() || "Orion Content",
            img: gif.images?.fixed_height?.webp || gif.images?.fixed_height?.url,
            likes: meta.likes,
            isLiked: meta.isLiked
        };
    });
}

// --- 4. NAVIGATION & RANDOM ACTION ---
async function handleSurprise() {
    const btn = document.getElementById('btn-random');
    const icon = btn.querySelector('.nav-icon') || btn.querySelector('span');
    
    icon.style.transition = "transform 0.6s cubic-bezier(0.17, 0.89, 0.32, 1.49)";
    icon.style.transform = "rotate(360deg)";
    
    STATE.currentSearch = "random_mode";
    STATE.container.innerHTML = "";
    showSkeletons();

    try {
        const response = await fetch(`${CONFIG.ENDPOINTS.random}?api_key=${CONFIG.API_KEY}&rating=g`);
        const result = await response.json();
        const meme = processMemeData(result.data);
        
        removeSkeletons();
        appendMemes(meme);
        if (STATE.title) STATE.title.textContent = "Surprise ! 🎲";
    } catch (e) {
        console.error(e);
    } finally {
        setTimeout(() => { icon.style.transform = "rotate(0deg)"; }, 600);
    }
}

function initNavigation() {
    const navMap = {
        'btn-trending': () => { STATE.currentSearch = ""; fetchMemes(true); if (STATE.title) STATE.title.textContent = "Today Flow"; },
        'btn-top': () => { STATE.currentSearch = "viral"; fetchMemes(true); if (STATE.title) STATE.title.textContent = "Top 24h 🏆"; },
        'btn-random': () => handleSurprise(),
        'btn-favorites': () => { 
            STATE.currentSearch = "favoris"; 
            const items = JSON.parse(localStorage.getItem('myFavorites')) || [];
            STATE.container.innerHTML = items.length ? "" : "<p class='empty-msg'>Aucun favori...</p>";
            appendMemes(items);
            if (STATE.title) STATE.title.textContent = "Mes Favoris ⭐";
        }
    };

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (navMap[btn.id]) navMap[btn.id]();
        };
    });
}

// --- 5. NOUVELLE FONCTION PARTAGE (STYLE TIKTOK) ---
async function shareMeme(title, url) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: title,
                text: "Regarde ce mème sur Orion MemeHub ! 🔥",
                url: url
            });
        } catch (err) {
            console.log("Partage annulé");
        }
    } else {
        navigator.clipboard.writeText(url);
        alert("Lien copié ! ✨");
    }
}

// --- 6. UI RENDERING (CORRIGÉ) ---
function appendMemes(memesArray) {
    const fragment = document.createDocumentFragment();
    const favs = JSON.parse(localStorage.getItem('myFavorites')) || [];

    memesArray.forEach(meme => {
        const isFav = favs.some(f => f.id === meme.id);
        const card = document.createElement("div");
        card.className = "grid";
        card.innerHTML = `
            <img src="${meme.img}" alt="${meme.title}" loading="lazy" crossorigin="anonymous">
            <h4>${meme.title}</h4>
            <div class="card-btns">
                <button class="like-btn ${meme.isLiked ? 'liked' : ''}" data-id="${meme.id}">
                    <span class="icon">${meme.isLiked ? '❤️' : '♡'}</span> 
                    <span class="count">${meme.likes}</span>
                </button>
                <button class="fav-btn" data-tooltip="Favoris">
                    <span class="fav-icon" style="color:${isFav ? '#FFD700' : 'inherit'}">${isFav ? '⭐' : '☆'}</span>
                </button>
                <button class="share-btn" data-tooltip="Partager">⌲</button>
            </div>
        `;

        // Événements
        card.querySelector('.like-btn').onclick = (e) => handleLike(e.currentTarget);
        card.querySelector('.fav-btn').onclick = (e) => toggleFavorite(meme, e.currentTarget);
        card.querySelector('.share-btn').onclick = () => shareMeme(meme.title, meme.img);

        fragment.appendChild(card);
    });
    STATE.container.appendChild(fragment);
}

// --- 7. UTILS ---
function toggleFavorite(meme, btn) {
    let favs = JSON.parse(localStorage.getItem('myFavorites')) || [];
    const idx = favs.findIndex(f => f.id === meme.id);
    const icon = btn.querySelector('.fav-icon');

    if (idx === -1) {
        favs.push(meme);
        icon.textContent = "⭐"; icon.style.color = "#FFD700";
    } else {
        favs.splice(idx, 1);
        icon.textContent = "☆"; icon.style.color = "inherit";
    }
    localStorage.setItem('myFavorites', JSON.stringify(favs));
}

function initSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    input.addEventListener('keyup', function(event) {
        event.preventDefault();
        if (event.key === 'Enter') {
            const query = input.value.trim();
            if (query !== "") {
                STATE.currentSearch = query;
                if (STATE.title) STATE.title.textContent = `Résultats : ${query}`;
                fetchMemes(true);
                input.blur(); 
            }
        }
    });
}

function initFilterBar() {
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.onclick = () => {
            document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            STATE.currentSearch = tag.dataset.category;
            fetchMemes(true);
        };
    });
}

function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    window.onscroll = () => {
        const winScroll = document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        bar.style.width = scrolled + "%";
    };
}

function showSkeletons() {
    for(let i=0; i<8; i++) {
        const s = document.createElement('div');
        s.className = "grid skeleton";
        STATE.container.appendChild(s);
    }
}

function removeSkeletons() {
    STATE.container.querySelectorAll('.skeleton').forEach(s => s.remove());
}

function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const toggle = document.getElementById('checkbox');
    if (toggle) {
        toggle.checked = (saved === 'dark');
        toggle.onchange = (e) => {
            const t = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', t);
            localStorage.setItem('theme', t);
        };
    }
}