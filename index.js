/* ██████╗ ██████╗ ██╗ ██████╗ ███╗   ██╗
   ██╔══██╗██╔══██╗██║██╔═══██╗████╗  ██║
   ██║  ██║██████╔╝██║██║   ██║██╔██╗ ██║
   ██║  ██║██╔══██╗██║██║   ██║██║╚██╗██║
   ██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║
   ORION MEME ENGINE V4.0 - PERFORMANCE EDITION
*/

const CONFIG = {
    API_KEY: '1FkwOfmkrdfxmUXBW7KSgsAdLIcRbmOK',
    LIMIT: 12,
    MAX_MEMES: 50, // Limite pour la performance
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
    uploadSection: document.getElementById('upload-section'),
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
    initUploadEngine();
    initDailyMeme();
    
    loadUserUploads();
    fetchMemes(true);

    const observer = new IntersectionObserver((entries) => {
        const canLoadMore = !["favoris", "random_mode"].includes(STATE.currentSearch) && 
                            STATE.uploadSection.style.display !== 'block';
        if (entries[0].isIntersecting && !STATE.isLoading && canLoadMore) {
            fetchMemes();
        }
    }, { threshold: 0.1 });
    
    if (STATE.scrollAnchor) observer.observe(STATE.scrollAnchor);
});

// --- 2. GESTION DES LIKES & STORAGE ---
function getPersistentMeta(gifId) {
    const storageKey = `meta_${gifId}`;
    let stored = JSON.parse(localStorage.getItem(storageKey));
    if (!stored) {
        stored = { likes: Math.floor(Math.random() * 800) + 50, isLiked: false };
        localStorage.setItem(storageKey, JSON.stringify(stored));
    }
    return stored;
}

function handleLike(btn) {
    const id = btn.dataset.id;
    const data = getPersistentMeta(id);
    data.isLiked = !data.isLiked;
    data.likes += data.isLiked ? 1 : -1;
    localStorage.setItem(`meta_${id}`, JSON.stringify(data));

    btn.classList.toggle('liked', data.isLiked);
    btn.querySelector('.icon').textContent = data.isLiked ? '❤️' : '♡';
    btn.querySelector('.count').textContent = data.likes;
    
    btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], 
                { duration: 300, easing: 'ease-out' });
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
        const response = await fetch(url);
        const result = await response.json();
        const memes = processMemeData(result.data);
        removeSkeletons();
        appendMemes(memes, false); // false = c'est du scroll
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

// --- 4. NAVIGATION & SURPRISE (ROTATION) ---
function initNavigation() {
    const navActions = {
        'btn-trending': () => { resetUI(); STATE.currentSearch = ""; fetchMemes(true); updateGreeting("Today Flow", "L'essentiel de la culture mème."); },
        'btn-top': () => { resetUI(); STATE.currentSearch = "viral"; fetchMemes(true); updateGreeting("Top 24h 🏆", "Les plus viraux."); },
        'btn-random': () => { resetUI(); handleSurprise(); },
        'btn-favorites': () => { 
            resetUI();
            STATE.currentSearch = "favoris"; 
            const items = JSON.parse(localStorage.getItem('myFavorites')) || [];
            STATE.container.innerHTML = items.length ? "" : "<p class='empty-msg'>Aucun favori...</p>";
            appendMemes(items, false);
            updateGreeting("Mes Favoris ⭐", "Ta galerie privée.");
        },
        'btn-upload': () => {
            const isVisible = (STATE.uploadSection.style.display === 'block');
            isVisible ? resetUI() : showUploadFocus();
        }
    };

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (navActions[btn.id]) navActions[btn.id]();
        };
    });
}

async function handleSurprise() {
    const btn = document.getElementById('btn-random');
    const icon = btn.querySelector('.nav-icon') || btn.querySelector('span');
    
    // --- ROTATION DU DÉ ---
    icon.style.transition = "transform 0.8s cubic-bezier(0.17, 0.89, 0.32, 1.49)";
    icon.style.transform = "rotate(720deg)";
    
    STATE.currentSearch = "random_mode";
    STATE.container.innerHTML = "";
    showSkeletons();

    try {
        const response = await fetch(`${CONFIG.ENDPOINTS.random}?api_key=${CONFIG.API_KEY}&rating=g`);
        const result = await response.json();
        const meme = processMemeData(result.data);
        removeSkeletons();
        appendMemes(meme, false);
        updateGreeting("Surprise ! 🎲", "Flux aléatoire activé.");
    } catch (e) { console.error(e); }
    finally { 
        setTimeout(() => { icon.style.transform = "rotate(0deg)"; }, 800);
    }
}

// --- 5. RENDU AVEC AUTO-CLEANUP (LIMITE 50) ---
function appendMemes(memesArray, isUserUpload = false) {
    const favs = JSON.parse(localStorage.getItem('myFavorites')) || [];
    
    memesArray.forEach(meme => {
        const isFav = favs.some(f => f.id === meme.id);
        const card = document.createElement("div");
        card.className = "grid";
        card.innerHTML = `
            <img src="${meme.img}" alt="${meme.title}" loading="lazy">
            <h4>${meme.title}</h4>
            <div class="card-btns">
                <button class="like-btn ${meme.isLiked ? 'liked' : ''}" data-id="${meme.id}">
                    <span class="icon">${meme.isLiked ? '❤️' : '♡'}</span> <span class="count">${meme.likes}</span>
                </button>
                <button class="fav-btn"><span style="color:${isFav ? '#FFD700':'inherit'}">${isFav ? '⭐':'☆'}</span></button>
                <button class="share-btn">⌲</button>
            </div>`;

        card.querySelector('.like-btn').onclick = (e) => handleLike(e.currentTarget);
        card.querySelector('.fav-btn').onclick = (e) => toggleFavorite(meme, e.currentTarget);
        card.querySelector('.share-btn').onclick = () => shareMeme(meme.title, meme.img);

        // Positionnement : tes uploads en haut, le reste en bas
        if (isUserUpload) {
            STATE.container.prepend(card);
        } else {
            STATE.container.appendChild(card);
        }
    });

    // --- LOGIQUE DE NETTOYAGE (LIMITATION 50) ---
    const allCards = STATE.container.querySelectorAll('.grid:not(.skeleton)');
    if (allCards.length > CONFIG.MAX_MEMES) {
        const toRemove = allCards.length - CONFIG.MAX_MEMES;
        for (let i = 0; i < toRemove; i++) {
            // On retire les plus anciens (ceux qui sont tout en haut de la liste d'API)
            allCards[i].remove();
        }
        console.log(`Orion Performance: ${toRemove} mèmes recyclés.`);
    }
}

// --- 6. FOCUS MODE & UI ---
function resetUI() {
    STATE.uploadSection.style.display = 'none';
    toggleFocusMode(false);
}

function showUploadFocus() {
    STATE.uploadSection.style.display = 'block';
    toggleFocusMode(true);
}

function toggleFocusMode(isFocus) {
    const elements = [STATE.container, document.querySelector('.filter-bar'), document.getElementById('daily-feature'), STATE.scrollAnchor];
    elements.forEach(el => { 
        if(el) el.style.display = isFocus ? 'none' : (el.id === 'meme-container' ? 'grid' : (el.classList.contains('filter-bar') ? 'flex' : 'block')); 
    });
    if (isFocus) updateGreeting("Nouvelle Création 🚀", "Publie ton contenu.");
    else updateGreeting("Today Flow", "Le meilleur d'Orion.");
}

function updateGreeting(title, sub) {
    if (STATE.title) STATE.title.textContent = title;
    if (STATE.subtext) STATE.subtext.textContent = sub;
}

// --- 7. UPLOAD ENGINE ---
function initUploadEngine() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const submitBtn = document.getElementById('submit-upload');
    const titleInput = document.getElementById('meme-title');
    const progressFill = document.getElementById('progress-fill');

    if(!dropZone) return;

    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.background = "var(--primary-glow)"; };
    dropZone.ondragleave = () => { dropZone.style.background = "var(--glass)"; };
    dropZone.ondrop = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files[0]); };
    fileInput.onchange = (e) => handleFiles(e.target.files[0]);

    function handleFiles(file) {
        if (file && file.type === "image/gif") {
            previewContainer.style.display = 'block';
            dropZone.querySelector('p').innerHTML = `✅ <strong>${file.name}</strong> prêt !`;
            window.selectedFile = file;
        }
    }

    submitBtn.onclick = () => {
        const title = titleInput.value.trim();
        if (!window.selectedFile || !title) return alert("Titre et GIF requis !");
        document.getElementById('progress-container').style.display = 'block';
        submitBtn.disabled = true;

        let p = 0;
        const inv = setInterval(() => {
            p += 10;
            progressFill.style.width = p + "%";
            if(p >= 100) {
                clearInterval(inv);
                finalizeUpload(title, window.selectedFile);
            }
        }, 100);
    };
}

function finalizeUpload(title, file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const newMeme = { id: 'u_'+Date.now(), title, img: e.target.result, likes: 0, isLiked: false };
        let uploads = JSON.parse(localStorage.getItem('orion_user_uploads')) || [];
        uploads.unshift(newMeme);
        localStorage.setItem('orion_user_uploads', JSON.stringify(uploads));
        
        appendMemes([newMeme], true); // true = va en haut
        alert("Publication réussie !");
        location.reload(); 
    };
    reader.readAsDataURL(file);
}

// --- 8. FONCTIONS COMPLÉMENTAIRES ---
async function shareMeme(title, url) {
    if (navigator.share) {
        try { await navigator.share({ title, text: "Vu sur Orion MemeHub ! 🔥", url }); } 
        catch (err) {}
    } else {
        navigator.clipboard.writeText(url);
        alert("Lien copié ! ✨");
    }
}

function toggleFavorite(meme, btn) {
    let favs = JSON.parse(localStorage.getItem('myFavorites')) || [];
    const idx = favs.findIndex(f => f.id === meme.id);
    if (idx === -1) {
        favs.push(meme);
        btn.querySelector('span').innerHTML = "⭐"; btn.querySelector('span').style.color = "#FFD700";
    } else {
        favs.splice(idx, 1);
        btn.querySelector('span').innerHTML = "☆"; btn.querySelector('span').style.color = "inherit";
    }
    localStorage.setItem('myFavorites', JSON.stringify(favs));
}

function initSearch() {
    const input = document.getElementById('search-input');
    input?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' && input.value.trim() !== "") {
            resetUI();
            STATE.currentSearch = input.value.trim();
            updateGreeting(`Résultats : ${STATE.currentSearch}`, "Recherche terminée.");
            fetchMemes(true);
            input.blur();
        }
    });
}

function initFilterBar() {
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.onclick = () => {
            resetUI();
            document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            STATE.currentSearch = tag.dataset.category;
            fetchMemes(true);
        };
    });
}

async function initDailyMeme() {
    const dailySection = document.getElementById('daily-feature');
    const today = new Date().toDateString();
    let dailyData = JSON.parse(localStorage.getItem('daily_meme'));

    if (localStorage.getItem('daily_date') !== today || !dailyData) {
        try {
            const resp = await fetch(`${CONFIG.ENDPOINTS.random}?api_key=${CONFIG.API_KEY}&rating=g`);
            const json = await resp.json();
            dailyData = { title: json.data.title || "L'exclu du jour", img: json.data.images.fixed_height.url };
            localStorage.setItem('daily_date', today);
            localStorage.setItem('daily_meme', JSON.stringify(dailyData));
        } catch (e) { return; }
    }
    if (dailyData && dailySection) {
        document.getElementById('daily-img').src = dailyData.img;
        document.getElementById('daily-title').textContent = dailyData.title;
        dailySection.style.display = 'block';
        document.getElementById('btn-share-daily').onclick = () => shareMeme(dailyData.title, dailyData.img);
    }
}

function loadUserUploads() {
    const userMemes = JSON.parse(localStorage.getItem('orion_user_uploads')) || [];
    if (userMemes.length > 0) appendMemes(userMemes, true);
}

function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    window.onscroll = () => {
        const s = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if(bar) bar.style.width = s + "%";
    };
}

function showSkeletons() { for(let i=0; i<8; i++) { const s = document.createElement('div'); s.className = "grid skeleton"; STATE.container.appendChild(s); } }
function removeSkeletons() { STATE.container.querySelectorAll('.skeleton').forEach(s => s.remove()); }

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