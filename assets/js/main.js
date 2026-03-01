// ============================================
// EMAILJS CONFIGURATION
// ============================================

const EMAILJS_CONFIG = {
    PUBLIC_KEY: 'eAEp_L6b942i6vj-T',
    SERVICE_ID: 'service_sgwz70s',
    TEMPLATE_ID: 'template_ist98rn'
};

(function() {
    emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
})();

// ============================================
// GAME DATA & CATEGORIES
// ============================================

const ALL_CATEGORIES = {
    action: { name: "Action", icon: "⚔️", description: "Fast-paced combat and adventure games" },
    puzzle: { name: "Puzzle", icon: "🧩", description: "Brain teasers and logic challenges" },
    arcade: { name: "Arcade", icon: "👾", description: "Classic arcade style games" },
    racing: { name: "Racing", icon: "🏎️", description: "High-speed racing games" },
    sports: { name: "Sports", icon: "⚽", description: "Sports and athletic games" },
    strategy: { name: "Strategy", icon: "♟️", description: "Tactical and strategy games" },
    adventure: { name: "Adventure", icon: "🗺️", description: "Exploration and story games" },
    shooting: { name: "Shooting", icon: "🎯", description: "FPS and shooting games" },
    multiplayer: { name: "Multiplayer", icon: "👥", description: "Play with friends online" },
    simulation: { name: "Simulation", icon: "🎮", description: "Real-life simulation games" },
    horror: { name: "Horror", icon: "👻", description: "Spooky and scary games" },
    casual: { name: "Casual", icon: "☕", description: "Relaxing casual games" }
};

let games = [];
let categories = [];
let detectedCategories = new Set();
let timeInterval = null;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getCurrentTime() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        timeZoneName: 'short'
    };
    return now.toLocaleDateString('en-US', options);
}

// ============================================
// MOBILE MENU FUNCTIONS
// ============================================

function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const body = document.body;
    
    const isOpen = mobileMenu.classList.contains('active');
    
    if (isOpen) {
        mobileMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        body.style.overflow = 'auto';
    } else {
        mobileMenu.classList.add('active');
        menuOverlay.classList.add('active');
        hamburgerBtn.classList.add('active');
        body.style.overflow = 'hidden';
    }
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    
    if (mobileMenu) mobileMenu.classList.remove('active');
    if (menuOverlay) menuOverlay.classList.remove('active');
    if (hamburgerBtn) hamburgerBtn.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ============================================
// GAME DETECTION & INITIALIZATION
// ============================================

function detectGamesFromHTML() {
    const slots = document.querySelectorAll('#game-slots .game-card');
    const detectedGames = [];
    detectedCategories.clear();
    
    slots.forEach((slot, index) => {
        const title = slot.getAttribute('data-title') || slot.querySelector('.game-title')?.textContent || 'Game ' + (index + 1);
        const category = slot.getAttribute('data-category') || 'arcade';
        const rating = slot.getAttribute('data-rating') || '4.0';
        const href = slot.getAttribute('href') || '#';
        const image = slot.querySelector('img')?.getAttribute('src') || '';
        const isNew = slot.classList.contains('new-game');
        const isPopular = slot.classList.contains('popular-game');
        
        detectedCategories.add(category);
        
        detectedGames.push({
            id: index + 1,
            title: title,
            category: category,
            image: image,
            href: href,
            isNew: isNew,
            isPopular: isPopular,
            rating: rating,
            html: slot.outerHTML,
            dateAdded: new Date().getTime() - (index * 86400000)
        });
    });
    
    return detectedGames;
}

function calculateCategoryCounts(gamesList) {
    const counts = {};
    gamesList.forEach(game => {
        counts[game.category] = (counts[game.category] || 0) + 1;
    });
    return counts;
}

function buildCategories(counts) {
    return Object.keys(ALL_CATEGORIES).map(key => ({
        id: key,
        name: ALL_CATEGORIES[key].name,
        icon: ALL_CATEGORIES[key].icon,
        description: ALL_CATEGORIES[key].description,
        count: counts[key] || 0,
        hasGames: (counts[key] || 0) > 0
    }));
}

// ============================================
// SECTION RENDERING
// ============================================

function showSection(section) {
    closeMobileMenu();
    document.querySelectorAll('.nav-links a, .mobile-nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    
    const desktopNav = document.getElementById('nav-' + section);
    const mobileNav = document.getElementById('mobile-nav-' + section);
    if (desktopNav) desktopNav.classList.add('active');
    if (mobileNav) mobileNav.classList.add('active');
    
    const container = document.getElementById('main-container');
    const hero = document.getElementById('home-hero');
    
    switch(section) {
        case 'home':
            hero.style.display = 'block';
            renderHome(container);
            break;
        case 'new':
            hero.style.display = 'none';
            const newGames = games.filter(g => g.isNew).sort((a, b) => b.dateAdded - a.dateAdded);
            renderGames(newGames, `New Games (${newGames.length})`, container);
            break;
        case 'popular':
            hero.style.display = 'none';
            const popularGames = games.filter(g => g.isPopular).sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
            renderGames(popularGames, `Popular Games (${popularGames.length})`, container);
            break;
        case 'categories':
            hero.style.display = 'none';
            renderCategories(container);
            break;
    }
    
    window.scrollTo(0, 0);
}

function renderHome(container) {
    const activeCategories = categories.filter(c => c.hasGames);
    const categoryButtons = activeCategories.map(cat => 
        `<button class="category-btn" onclick="filterCategory('${cat.id}')">${cat.name} (${cat.count})</button>`
    ).join('');
    
    const newCount = games.filter(g => g.isNew).length;
    const popularCount = games.filter(g => g.isPopular).length;
    
    const categoriesHtml = `
        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center;">
            <span style="color: var(--primary); font-weight: bold;">📊 Stats:</span>
            <span style="color: var(--text-muted);">${games.length} Total Games</span>
            <span style="color: var(--accent);">${newCount} New</span>
            <span style="color: #ff006e;">${popularCount} Popular</span>
            <span style="color: var(--text-muted);">${categories.filter(c => c.hasGames).length} Active Categories</span>
        </div>
        <div class="categories">
            <button class="category-btn active" onclick="filterCategory('all')">All Games</button>
            ${categoryButtons}
        </div>
        <h2 class="section-title">Featured Games</h2>
        <div class="games-grid" id="gamesGrid">
            ${games.map(g => g.html).join('')}
        </div>
    `;
    container.innerHTML = categoriesHtml;
}

function renderGames(gamesToRender, title, container = document.getElementById('main-container')) {
    const html = `
        <div class="categories">
            <button class="category-btn active" onclick="showSection('home')">← Back to Home</button>
        </div>
        <h2 class="section-title">${title}</h2>
        <div class="games-grid">
            ${gamesToRender.length > 0 ? gamesToRender.map(g => g.html).join('') : '<div class="no-games">No games found in this section.</div>'}
        </div>
    `;
    container.innerHTML = html;
}

function renderCategories(container) {
    const html = `
        <div class="categories">
            <button class="category-btn active" onclick="showSection('home')">← Back to Home</button>
        </div>
        <h2 class="section-title">All Categories (${categories.length})</h2>
        <p style="color: var(--text-muted); margin-bottom: 1rem;">Click any category to view games. Empty categories show as dashed.</p>
        <div class="category-grid">
            ${categories.map(cat => `
                <div class="category-card ${!cat.hasGames ? 'empty' : ''}" onclick="${cat.hasGames ? `filterCategory('${cat.id}')` : ''}">
                    <div class="category-icon">${cat.icon}</div>
                    <div class="category-name">${cat.name}</div>
                    <div class="category-count">${cat.count} games</div>
                    ${!cat.hasGames ? '<span class="empty-badge">EMPTY</span>' : ''}
                </div>
            `).join('')}
        </div>
        
        <div style="margin-top: 3rem; padding: 2rem; background: var(--card); border-radius: 15px;">
            <h3 style="color: var(--primary); margin-bottom: 1rem;">📋 Category Legend</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
                ${categories.map(cat => `
                    <div style="padding: 1rem; background: var(--dark); border-radius: 10px; ${cat.hasGames ? 'border-left: 4px solid var(--primary);' : 'border-left: 4px solid var(--text-muted); opacity: 0.7;'}">
                        <strong style="color: ${cat.hasGames ? 'var(--text)' : 'var(--text-muted)'};">${cat.icon} ${cat.name}</strong>
                        <p style="font-size: 0.9rem; margin-top: 0.5rem;">${cat.description}</p>
                        <small style="color: ${cat.hasGames ? 'var(--accent)' : 'var(--text-muted)'};">${cat.hasGames ? '✅ Active' : '⏳ Waiting for games'}</small>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function filterCategory(category) {
    document.getElementById('home-hero').style.display = 'none';
    const container = document.getElementById('main-container');
    
    if (category === 'all') {
        renderHome(container);
        return;
    }
    
    const filtered = games.filter(g => g.category === category);
    const catInfo = ALL_CATEGORIES[category];
    renderGames(filtered, `${catInfo?.icon || '🎮'} ${catInfo?.name || category} Games (${filtered.length})`, container);
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openModal(type) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    const content = {
        about: {
            title: 'About Us',
            body: `
                <p>Welcome to <strong>TGames</strong>, your ultimate destination for free online gaming!</p>
                
                <div class="owners-section">
                    <h4>👑 Founders & Owners</h4>
                    <div class="owner">
                        <div class="owner-avatar">SS</div>
                        <div class="owner-info">
                            <h5>Stephen Semense</h5>
                            <p>Co-Founder & Lead Developer</p>
                        </div>
                    </div>
                    <div class="owner">
                        <div class="owner-avatar">YB</div>
                        <div class="owner-info">
                            <h5>Yojan Christ Barnes</h5>
                            <p>Co-Founder & Creative Director</p>
                        </div>
                    </div>
                </div>

                <p>Founded in <strong>2026</strong>, TGames was established by Stephen Semense and Yojan Christ Barnes with a vision to create the premier online gaming destination.</p>
                
                <div style="background: var(--dark); padding: 1.5rem; border-radius: 10px; margin: 1.5rem 0;">
                    <h4 style="color: var(--accent); margin-bottom: 1rem;">📊 Current Platform Stats</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div>🎮 <strong>${games.length}</strong> Total Games</div>
                        <div>📁 <strong>${categories.filter(c => c.hasGames).length}</strong> Active Categories</div>
                        <div>🆕 <strong>${games.filter(g => g.isNew).length}</strong> New Games</div>
                        <div>🔥 <strong>${games.filter(g => g.isPopular).length}</strong> Popular Games</div>
                    </div>
                </div>

                <h3>Our Mission</h3>
                <p>To provide high-quality, free gaming experiences to players worldwide without the need for downloads, installations, or subscriptions.</p>
                
                <h3>Why Choose Us?</h3>
                <ul>
                    <li>100% Free to Play - No hidden fees, ever</li>
                    <li>No Downloads Required - Play instantly in your browser</li>
                    <li>Curated by Experts - Every game hand-picked by Stephen & Yojan</li>
                    <li>New Games Added Weekly - Fresh content regularly</li>
                    <li>12 Categories - Something for everyone</li>
                    <li>Mobile Friendly - Play on any device</li>
                </ul>

                <p style="margin-top: 2rem; text-align: center; color: var(--primary);"><em>"Gaming is not just a hobby, it's a way of life." - Stephen & Yojan</em></p>
            `
        },
        privacy: {
            title: 'Privacy Policy',
            body: `
                <p>At TGames, we take your privacy seriously. This policy outlines how we collect, use, and protect your information.</p>
                
                <div class="owners-section">
                    <h4>📧 Data Protection Officers</h4>
                    <p><strong>Stephen Semense & Yojan Christ Barnes</strong><br>
                    Contact: stephensemense@gmail.com</p>
                </div>

                <h3>Information We Collect</h3>
                <ul>
                    <li>Browser type and version</li>
                    <li>IP address (anonymized)</li>
                    <li>Game preferences (stored locally)</li>
                    <li>Cookies for site functionality</li>
                </ul>
                
                <h3>How We Use Information</h3>
                <p>We use collected data to improve user experience and analyze site traffic. We never sell your personal information.</p>
                
                <h3>Cookies</h3>
                <p>We use cookies to remember your preferences. You can disable cookies in your browser settings.</p>
            `
        },
        terms: {
            title: 'Terms of Service',
            body: `
                <p>By accessing TGames, you agree to comply with these terms established by owners Stephen Semense and Yojan Christ Barnes.</p>
                
                <div class="owners-section">
                    <h4>⚖️ Legal Notice</h4>
                    <p>These terms are legally binding. Violations may result in permanent ban.</p>
                </div>

                <h3>Usage Rules</h3>
                <ul>
                    <li>Users must be 13 years or older</li>
                    <li>No cheating, hacking, or exploiting</li>
                    <li>No abusive behavior</li>
                    <li>Respect intellectual property</li>
                </ul>
                
                <h3>Content Ownership</h3>
                <p>Platform and design © 2026 Stephen Semense & Yojan Christ Barnes. Games are property of their respective developers.</p>
            `
        },
        contact: {
            title: 'Contact Us',
            body: `
                <p>Have questions? Stephen Semense and Yojan Christ Barnes would love to hear from you!</p>
                
                <div class="owners-section">
                    <h4>👥 Direct Contact</h4>
                    <div class="owner">
                        <div class="owner-avatar">SS</div>
                        <div class="owner-info">
                            <h5>Stephen Semense</h5>
                            <p>stephensemense@gmail.com</p>
                        </div>
                    </div>
                    <div class="owner">
                        <div class="owner-avatar">YB</div>
                        <div class="owner-info">
                            <h5>Yojan Christ Barnes</h5>
                            <p>Co-Founder</p>
                        </div>
                    </div>
                </div>

                <h3>Send us a Message</h3>
                <div class="time-display" id="current-time">
                    Current Time: ${getCurrentTime()}
                </div>
                <form class="contact-form" id="contact-form">
                    <input type="text" name="name" placeholder="Your Name" required>
                    <input type="email" name="email" placeholder="Your Email" required>
                    <input type="text" name="title" placeholder="Subject" required>
                    <textarea name="message" rows="5" placeholder="Your Message" required></textarea>
                    <input type="hidden" name="time" id="form-time" value="${getCurrentTime()}">
                    <button type="submit" id="submit-btn">Send Message</button>
                </form>
                <div class="success-message" id="success-msg">
                    ✅ Message sent successfully! We'll get back to you soon.
                </div>
                <div class="error-message" id="error-msg">
                    ❌ Failed to send message. Please try again.
                </div>
                
                <p style="margin-top: 2rem; padding: 1rem; background: var(--dark); border-radius: 10px;">
                    <strong>📧 Email:</strong> stephensemense@gmail.com<br>
                    <strong>📋 Subject:</strong> TGames Players
                </p>
            `
        }
    };
    
    title.textContent = content[type].title;
    body.innerHTML = content[type].body;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (type === 'contact') {
        setupEmailJSForm();
        startTimeUpdate();
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    stopTimeUpdate();
}

function startTimeUpdate() {
    timeInterval = setInterval(() => {
        const timeDisplay = document.getElementById('current-time');
        const timeInput = document.getElementById('form-time');
        const currentTime = getCurrentTime();
        
        if (timeDisplay) {
            timeDisplay.textContent = 'Current Time: ' + currentTime;
        }
        if (timeInput) {
            timeInput.value = currentTime;
        }
    }, 1000);
}

function stopTimeUpdate() {
    if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
    }
}

// ============================================
// EMAILJS FORM SETUP
// ============================================

function setupEmailJSForm() {
    const form = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const successMsg = document.getElementById('success-msg');
    const errorMsg = document.getElementById('error-msg');
    
    if (!form) return;
    
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const timeInput = document.getElementById('form-time');
        if (timeInput) {
            timeInput.value = getCurrentTime();
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        
        emailjs.sendForm(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            this
        )
        .then(function() {
            successMsg.style.display = 'block';
            errorMsg.style.display = 'none';
            form.reset();
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
            
            setTimeout(() => {
                closeModal();
            }, 3000);
        })
        .catch(function(error) {
            console.error('EmailJS Error:', error);
            errorMsg.style.display = 'block';
            successMsg.style.display = 'none';
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
            
            const name = form.querySelector('[name="name"]').value;
            const email = form.querySelector('[name="email"]').value;
            const subject = form.querySelector('[name="title"]').value;
            const message = form.querySelector('[name="message"]').value;
            const time = getCurrentTime();
            
            const mailtoLink = `mailto:stephensemense@gmail.com?subject=${encodeURIComponent('TGames Players - ' + subject)}&body=${encodeURIComponent('From: ' + name + ' (' + email + ')\nTime: ' + time + '\n\n' + message)}`;
            window.open(mailtoLink, '_blank');
        });
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    games = detectGamesFromHTML();
    const counts = calculateCategoryCounts(games);
    categories = buildCategories(counts);
    
    showSection('home');
    
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm === '') {
            showSection('home');
            return;
        }
        const filtered = games.filter(game => 
            game.title.toLowerCase().includes(searchTerm) ||
            game.category.toLowerCase().includes(searchTerm)
        );
        renderGames(filtered, 'Search Results');
    });
});

document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeMobileMenu();
    }
});

window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        closeMobileMenu();
    }
});