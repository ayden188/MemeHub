/* █████╗  ██████╗ ██╗ ██████╗ ███╗   ██╗
   ██╔══██╗██╔══██╗██║██╔═══██╗████╗  ██║
   ██║  ██║██████╔╝██║██║   ██║██╔██╗ ██║
   ██║  ██║██╔══██╗██║██║   ██║██║╚██╗██║
   ██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║
   by AWOESSO Eli */

// --- CONFIGURATION ---
const API_KEY = '1FkwOfmkrdfxmUXBW7KSgsAdLIcRbmOK'; 
const container = document.getElementById('meme-container');
const uploadSection = document.getElementById('upload-section');
const scrollAnchor = document.getElementById('scroll-anchor');

let currentOffset = 0;
let isLoading = false;
let currentSearch = "";
const MAX_MEMES_IN_DOM = 20;

// --- 1. INITIALISATION ---
document.addEventListener("DOMContentLoaded", () => {
    updateGreeting();
    fetchMemes(true);
    initNavigation();
    initSearch();
    initUploadLogic();

    // Scroll Infini
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading && !["favoris", "random_mode", "upload", "user_uploads"].includes(currentSearch)) {
            fetchMemes();
        }
    }, { threshold: 0.1 });
    if (scrollAnchor) observer.observe(scrollAnchor);
});

// --- 2. FONCTIONS DE FLUX (API) ---
async function fetchMemes(isNewSearch = false) {
    if (isLoading) return;
    isLoading = true;

    if (isNewSearch) {
        currentOffset = 0;
        container.innerHTML = "";
        showSkeletons();
        window.scrollTo(0,0);
    }

    const endpoint = currentSearch ? 'search' : 'trending';
    const queryParam = currentSearch ? `&q=${encodeURIComponent(currentSearch)}` : '';
    
    try {
        const response = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?api_key=${API_KEY}&limit=10&offset=${currentOffset}${queryParam}&rating=g`);
        const result = await response.json();
        appendMemes(processMemeData(result.data));
        currentOffset += 10;
    } catch (error) {
        console.error("Erreur API:", error);
    } finally {
        isLoading = false;
    }
}

function processMemeData(giphyData) {
    const data = Array.isArray(giphyData) ? giphyData : [giphyData];
    return data.map(gif => {
        const gifId = gif.id || 'user-' + Date.now();
        let storedData = JSON.parse(localStorage.getItem(gifId)) || { 
            likes: Math.floor(Math.random() * 1000), 
            isLiked: false 
        };
        return { 
            id: gifId, 
            title: gif.title || "Meme sans titre", 
            img: gif.images ? (gif.images.fixed_height.webp || gif.images.fixed_height.url) : gif.img, 
            likes: storedData.likes, 
            isLiked: storedData.isLiked 
        };
    });
}


async function handleSurprise() {
    const btn = document.getElementById('btn-random');
    const icon = btn.querySelector('.nav-icon');

    icon.classList.add('rolling');
    container.innerHTML = ""; 
    showSkeletons(); 

    setTimeout(async () => {
        currentSearch = "random_mode";
        try {
            const response = await fetch(`https://api.giphy.com/v1/gifs/random?api_key=${API_KEY}&rating=g`);
            const res = await response.json();
            appendMemes(processMemeData(res.data));
        } finally {
            icon.classList.remove('rolling');
        }
    }, 800);
}



function appendMemes(memesArray) {
    const skeletons = container.querySelectorAll('.skeleton');
    skeletons.forEach(s => s.remove());

    const favorites = JSON.parse(localStorage.getItem('myFavorites')) || [];

    memesArray.forEach((meme) => {
        const isFav = favorites.some(fav => fav.id === meme.id);
        const card = document.createElement("div");
        card.className = "grid";
        card.innerHTML = `
            <img src="${meme.img}" alt="${meme.title}" loading="lazy">
            <h4>${meme.title}</h4>
            <div class="card-btns">
                <button class="like-btn ${meme.isLiked ? 'liked' : ''}" data-id="${meme.id}">
                    <span class="icon">${meme.isLiked ? '❤️' : '♡'}</span> 
                    <span class="count">${meme.likes}</span>
                </button>
                <button class="fav-btn" style="background:transparent; color: ${isFav ? '#FFD700' : 'inherit'}">
                    ${isFav ? '⭐' : '☆'}
                </button>
                <button class="share-btn">⌲</button>
            </div>
        `;
        container.appendChild(card);

        card.querySelector('.like-btn').addEventListener('click', (e) => handleLike(e.currentTarget));
        card.querySelector('.fav-btn').addEventListener('click', (e) => toggleFavorite(meme, e.currentTarget));
        card.querySelector('.share-btn').addEventListener('click', () => handleNativeShare(meme));
    });
}

function initSearch() {
    const searchInput = document.querySelector('.head input');
    if (!searchInput) return;

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentSearch = searchInput.value.trim();
            if (currentSearch !== "") {
                switchToView('memes');
                fetchMemes(true);
            }
        }
    });
}

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const action = this.id;

            if (action === 'btn-trending') { currentSearch = ""; switchToView('memes'); fetchMemes(true); }
            if (action === 'btn-top') { currentSearch = "viral"; switchToView('memes'); fetchMemes(true); }
            if (action === 'btn-favorites') {
                currentSearch = "favoris";
                switchToView('memes');
                container.innerHTML = "";
                appendMemes(JSON.parse(localStorage.getItem('myFavorites')) || []);
            }
            if (action === 'btn-my-posts') {
                currentSearch = "user_uploads";
                switchToView('memes');
                container.innerHTML = "";
                const uploads = JSON.parse(localStorage.getItem('myUploads')) || [];
                uploads.length > 0 ? appendMemes(processMemeData(uploads)) : container.innerHTML = "<p>Aucun mème publié.</p>";
            }
            if (action === 'btn-upload') {
                currentSearch = "upload";
                switchToView('upload');
            }
        });
    });
}

function switchToView(view) {
    if (view === 'memes') {
        container.style.display = 'grid';
        uploadSection.style.display = 'none';
        scrollAnchor.style.display = 'block';
        updateGreeting();
    } else {
        container.style.display = 'none';
        uploadSection.style.display = 'block';
        scrollAnchor.style.display = 'none';
        document.getElementById('dynamic-greeting').textContent = "Partage ton talent !";
    }
}

// --- 4. LOGIQUE D'UPLOAD ---
function initUploadLogic() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const preview = document.getElementById('preview-container');
    const imgPreview = document.getElementById('gif-preview');
    const submitBtn = document.getElementById('submit-upload');

    if(!dropZone) return;

    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type === "image/gif") {
            const reader = new FileReader();
            reader.onload = (event) => {
                imgPreview.src = event.target.result;
                dropZone.style.display = 'none';
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    submitBtn.addEventListener('click', function() {
        const title = document.getElementById('meme-title').value;
        if(!title) return alert("Mets un titre !");

        this.disabled = true;
        document.getElementById('progress-container').style.display = 'block';
        let progress = 0;

        const interval = setInterval(() => {
            progress += 10;
            document.getElementById('progress-fill').style.width = progress + "%";
            document.getElementById('progress-text').textContent = `Envoi... ${progress}%`;

            if (progress >= 100) {
                clearInterval(interval);
                saveUserMeme({
                    title: title,
                    img: imgPreview.src,
                    id: 'user-' + Date.now()
                });
                showSuccess();
            }
        }, 200);
    });
}

function saveUserMeme(newMeme) {
    let myUploads = JSON.parse(localStorage.getItem('myUploads')) || [];
    myUploads.unshift(newMeme);
    if (myUploads.length > 50) myUploads = myUploads.slice(0, 50);
    localStorage.setItem('myUploads', JSON.stringify(myUploads));
}

function showSuccess() {
    document.querySelector('.upload-card').innerHTML = `
        <div style="padding:40px; text-align:center;">
            <h2>🎉 Publié !</h2>
            <p>Retrouve ton mème dans "Mes Publications".</p>
            <button onclick="location.reload()" class="publish-btn">Continuer</button>
        </div>`;
}

// --- 5. UTILITAIRES (GREETING, LIKE, ETC.) ---
function updateGreeting() {
    const h = new Date().getHours();
    const msg = h<12 ? "Bonjour ! ☕" : h<18 ? "Bon après-midi ! " : "Bonne soirée ! ";
    document.getElementById('dynamic-greeting').textContent = msg;
}

function showSkeletons() {
    for(let i=0; i<6; i++) {
        const skel = document.createElement('div');
        skel.className = "grid skeleton";
        container.appendChild(skel);
    }
}
function handleLike(btn) {
    const gifId = btn.getAttribute('data-id');
    let data = JSON.parse(localStorage.getItem(gifId)) || { likes: 0, isLiked: false };
    
    data.isLiked = !data.isLiked;
    data.likes += data.isLiked ? 1 : -1;
    localStorage.setItem(gifId, JSON.stringify(data));

    btn.classList.toggle('liked', data.isLiked);
    btn.querySelector('.icon').textContent = data.isLiked ? '❤️' : '♡';
    btn.querySelector('.count').textContent = data.likes;

    btn.style.animation = 'none'; // Reset
    btn.offsetHeight; // Trigger reflow
    btn.style.animation = 'pop 0.4s cubic-bezier(0.17, 0.89, 0.32, 1.49)';
}






function toggleFavorite(meme, btn) {
    let favs = JSON.parse(localStorage.getItem('myFavorites')) || [];
    const idx = favs.findIndex(f => f.id === meme.id);
    if (idx === -1) {
        favs.push(meme);
        btn.textContent = "⭐"; btn.style.color = "#FFD700";
    } else {
        favs.splice(idx, 1);
        btn.textContent = "☆"; btn.style.color = "inherit";
    }
    localStorage.setItem('myFavorites', JSON.stringify(favs));
}

function handleNativeShare(meme) {
    navigator.share ? navigator.share({title: meme.title, url: meme.img}) : alert("Lien copié !");
}



/* GESTION DU THÈME - MEMEHUB
   Logique : Dark Mode par défaut, persistance via LocalStorage
*/

// 1. Sélection des éléments
const toggleSwitch = document.querySelector('.theme-switch input');
const rootElement = document.documentElement;

// 2. Fonction pour appliquer le thème
function applyTheme(theme) {
    if (theme === 'light') {
        rootElement.setAttribute('data-theme', 'light');
        if (toggleSwitch) toggleSwitch.checked = false; // Switch éteint pour Light
        localStorage.setItem('theme', 'light');
    } else {
        rootElement.setAttribute('data-theme', 'dark');
        if (toggleSwitch) toggleSwitch.checked = true; // Switch allumé pour Dark
        localStorage.setItem('theme', 'dark');
    }
}

// 3. Initialisation au chargement de la page
function initTheme() {
    // On récupère le choix précédent, s'il n'existe pas, on met 'dark'
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
}

// 4. Écouteur de changement sur le bouton Switch
if (toggleSwitch) {
    toggleSwitch.addEventListener('change', (e) => {
        // Si coché = Dark, si décoché = Light
        const themeToApply = e.target.checked ? 'dark' : 'light';
        applyTheme(themeToApply);
        
        // Optionnel : Petit feedback console pour le debug
        console.log(`Thème changé en : ${themeToApply}`);
    });
}

// Lancement immédiat
initTheme();