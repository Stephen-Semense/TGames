// Game Configuration and State
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const uiLayer = document.getElementById('uiLayer');
const mainMenu = document.getElementById('mainMenu');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreDisplay = document.getElementById('scoreDisplay');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const waveDisplay = document.getElementById('waveDisplay');
const bossIndicator = document.getElementById('bossIndicator');
const eliteIndicator = document.getElementById('eliteIndicator');
const waveMessage = document.getElementById('waveMessage');
const damageBoostIndicator = document.getElementById('damageBoostIndicator');
const regenIndicator = document.getElementById('regenIndicator');
const speedBoostIndicator = document.getElementById('speedBoostIndicator');
const hpBar = document.getElementById('hpBar');
const hpText = document.getElementById('hpText');
const finalScore = document.getElementById('finalScore');
const newHighScoreBadge = document.getElementById('newHighScoreBadge');

// Game State Variables
let score = 0;
let highScore = localStorage.getItem('voidRunnerHighScore') || 0;
let gameActive = false;
let difficulty = 'normal';
let currentWave = 1;
let isBossWave = false;
let hasElite = false;

// Difficulty Settings
const DIFFICULTY_SETTINGS = {
    easy: { enemySpeed: 2, spawnRate: 1500, enemyHealth: 1, scoreMult: 1, playerHp: 150, bossHp: 50, shuttleHp: 2, eliteHp: 5 },
    normal: { enemySpeed: 4, spawnRate: 1000, enemyHealth: 2, scoreMult: 2, playerHp: 100, bossHp: 100, shuttleHp: 3, eliteHp: 8 },
    hard: { enemySpeed: 7, spawnRate: 600, enemyHealth: 3, scoreMult: 3, playerHp: 80, bossHp: 200, shuttleHp: 4, eliteHp: 12 }
};

// Input State
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

let mousePos = { x: 0, y: 0 };
let isMouseDown = false;
let useMouseControl = false;

// Game Entities
let player;
let bullets = [];
let enemies = [];
let particles = [];
let stars = [];
let enemyBullets = [];
let powerups = [];
let enemySpawnTimer = null;

// Power-up Types
const POWERUP_TYPES = {
    DAMAGE: { color: '#ff0040', type: 'damage', duration: 10000, symbol: '⚔' },
    REGEN: { color: '#00ff40', type: 'regen', duration: 8000, symbol: '✚' },
    SPEED: { color: '#0080ff', type: 'speed', duration: 6000, symbol: '»' }
};

// Dynamic Wave Generation
function generateWaveConfig(waveNum) {
    const baseCount = 5 + Math.floor(waveNum * 1.5);
    const eliteChance = Math.min(0.8, 0.1 + waveNum * 0.08);
    const shuttleChance = Math.min(0.9, 0.2 + waveNum * 0.1);
    
    // Boss waves every 5 waves, starting wave 5
    if (waveNum > 0 && waveNum % 5 === 0) {
        const bossCount = Math.min(3, 1 + Math.floor((waveNum - 5) / 5));
        const escortTypes = [];
        
        for (let i = 0; i < waveNum; i++) {
            if (Math.random() < 0.6) escortTypes.push('elite');
            else if (Math.random() < 0.8) escortTypes.push('shuttle');
            else escortTypes.push('drone');
        }
        
        return {
            count: bossCount + escortTypes.length,
            types: ['boss', ...escortTypes],
            message: `⚠ WAVE ${waveNum + 1} - ${bossCount} BOSS${bossCount > 1 ? 'ES' : ''} DETECTED ⚠`,
            eliteChance: 1,
            isBossWave: true
        };
    }
    
    // Mini-boss waves every 3 waves (not 5)
    if (waveNum > 0 && waveNum % 3 === 0 && waveNum % 5 !== 0) {
        const miniBossCount = Math.min(2, 1 + Math.floor((waveNum - 3) / 6));
        return {
            count: baseCount + miniBossCount * 3,
            types: ['shuttle', 'elite', 'drone'],
            message: `WAVE ${waveNum + 1} - MINI-BOSS SQUADRON`,
            eliteChance: 0.6,
            miniBossCount: miniBossCount
        };
    }
    
    // Regular waves with increasing difficulty
    const types = [];
    const typePool = ['drone'];
    
    if (waveNum >= 1) typePool.push('shuttle');
    if (waveNum >= 2) typePool.push('elite');
    
    for (let i = 0; i < baseCount; i++) {
        const rand = Math.random();
        if (rand < eliteChance && waveNum >= 2) types.push('elite');
        else if (rand < shuttleChance && waveNum >= 1) types.push('shuttle');
        else types.push('drone');
    }
    
    let message = `WAVE ${waveNum + 1}`;
    if (waveNum >= 10) message += ' - EXTREME';
    else if (waveNum >= 7) message += ' - NIGHTMARE';
    else if (waveNum >= 5) message += ' - INTENSE';
    else if (waveNum >= 3) message += ' - HARD';
    
    return {
        count: baseCount,
        types: types,
        message: message,
        eliteChance: eliteChance,
        isBossWave: false
    };
}

let currentWaveConfig = null;
let enemiesSpawnedInWave = 0;
let waveInProgress = false;

// Classes
class Player {
    constructor() {
        this.width = 40;
        this.height = 50;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 100;
        this.baseSpeed = 8;
        this.speed = this.baseSpeed;
        this.color = '#0ff';
        this.maxHp = DIFFICULTY_SETTINGS[difficulty].playerHp;
        this.hp = this.maxHp;
        this.lastShot = 0;
        this.fireRate = 150;
        this.damageMult = 1;
        this.regenActive = false;
        this.regenTimer = null;
        this.damageBoostTimer = null;
        this.speedBoostTimer = null;
    }

    update() {
        let dx = 0;
        let dy = 0;

        if (keys.w || keys.ArrowUp) dy = -1;
        if (keys.s || keys.ArrowDown) dy = 1;
        if (keys.a || keys.ArrowLeft) dx = -1;
        if (keys.d || keys.ArrowRight) dx = 1;

        if (useMouseControl && isMouseDown) {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            const distX = mousePos.x - centerX;
            const distY = mousePos.y - centerY;
            const distance = Math.sqrt(distX * distX + distY * distY);
            
            if (distance > 5) {
                dx = distX / distance;
                dy = distY / distance;
            }
        }

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 1) {
                dx /= length;
                dy /= length;
            }
            this.x += dx * this.speed;
            this.y += dy * this.speed;
        }

        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));

        if (Date.now() - this.lastShot > this.fireRate) {
            this.shoot();
            this.lastShot = Date.now();
        }

        if (this.regenActive && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + 0.3);
            updateUI();
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        let tilt = 0;
        const centerX = this.x + this.width / 2;
        if (useMouseControl && isMouseDown) {
            tilt = (mousePos.x - centerX) * 0.001;
            tilt = Math.max(-0.3, Math.min(0.3, tilt));
        } else {
            if (keys.a || keys.ArrowLeft) tilt = -0.2;
            if (keys.d || keys.ArrowRight) tilt = 0.2;
        }
        ctx.rotate(tilt);

        let glowColor = '#0ff';
        let lineWidth = 2;
        if (this.damageMult > 1) {
            glowColor = '#ff0040';
            lineWidth = 4;
        } else if (this.speed > this.baseSpeed) {
            glowColor = '#0080ff';
            lineWidth = 3;
        }
        
        ctx.shadowBlur = this.speed > this.baseSpeed ? 40 : 20;
        ctx.shadowColor = glowColor;
        
        ctx.beginPath();
        ctx.moveTo(0, -this.height/2);
        ctx.lineTo(this.width/2, this.height/2);
        ctx.lineTo(0, this.height/2 - 10);
        ctx.lineTo(-this.width/2, this.height/2);
        ctx.closePath();
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        if (this.regenActive) {
            ctx.strokeStyle = '#00ff40';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.width/2 + 12, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.speed > this.baseSpeed) {
            ctx.strokeStyle = '#0080ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.width/2 + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(-5, this.height/2 - 5);
        ctx.lineTo(0, this.height/2 + 15 + Math.random() * 10);
        ctx.lineTo(5, this.height/2 - 5);
        ctx.fillStyle = glowColor;
        ctx.fill();

        ctx.restore();
    }

    shoot() {
        const damage = this.damageMult;
        const bulletSpeed = this.speed > this.baseSpeed ? 15 : 12;
        
        bullets.push(new Bullet(this.x + this.width/2, this.y, -Math.PI/2, bulletSpeed, this.damageMult > 1 ? '#ff0040' : '#ff0', 4, damage));
        
        if (this.damageMult > 1) {
            bullets.push(new Bullet(this.x + this.width/2 - 12, this.y, -Math.PI/2 - 0.1, bulletSpeed, '#ff0040', 3, damage));
            bullets.push(new Bullet(this.x + this.width/2 + 12, this.y, -Math.PI/2 + 0.1, bulletSpeed, '#ff0040', 3, damage));
        }
        
        if (this.speed > this.baseSpeed) {
            bullets.push(new Bullet(this.x + this.width/2 - 6, this.y - 10, -Math.PI/2, bulletSpeed, '#0080ff', 3, damage));
            bullets.push(new Bullet(this.x + this.width/2 + 6, this.y - 10, -Math.PI/2, bulletSpeed, '#0080ff', 3, damage));
        }
        
        this.y += 2;
    }

    applyPowerup(powerupType) {
        if (powerupType.type === 'damage') {
            this.damageMult = 2;
            damageBoostIndicator.classList.remove('hidden');
            if (this.damageBoostTimer) clearTimeout(this.damageBoostTimer);
            this.damageBoostTimer = setTimeout(() => {
                this.damageMult = 1;
                damageBoostIndicator.classList.add('hidden');
            }, powerupType.duration);
        } else if (powerupType.type === 'regen') {
            this.regenActive = true;
            regenIndicator.classList.remove('hidden');
            if (this.regenTimer) clearTimeout(this.regenTimer);
            this.regenTimer = setTimeout(() => {
                this.regenActive = false;
                regenIndicator.classList.add('hidden');
            }, powerupType.duration);
        } else if (powerupType.type === 'speed') {
            this.speed = this.baseSpeed * 1.5;
            this.fireRate = 100;
            speedBoostIndicator.classList.remove('hidden');
            if (this.speedBoostTimer) clearTimeout(this.speedBoostTimer);
            this.speedBoostTimer = setTimeout(() => {
                this.speed = this.baseSpeed;
                this.fireRate = 150;
                speedBoostIndicator.classList.add('hidden');
            }, powerupType.duration);
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        updateUI();
        if (this.hp <= 0) {
            endGame();
        }
    }
}

class Bullet {
    constructor(x, y, angle, speed, color, radius, damage = 1) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.radius = radius;
        this.color = color;
        this.damage = damage;
        this.markedForDeletion = false;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        if (this.x < -50 || this.x > canvas.width + 50 || this.y < -50 || this.y > canvas.height + 50) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Enemy {
    constructor(type = 'drone', isElite = false, waveScale = 1) {
        this.type = type;
        this.isElite = isElite;
        
        const waveMult = 1 + (currentWave * 0.1);
        const sizeMult = isElite ? 1.2 : 1;
        this.width = (type === 'boss' ? 90 : (type === 'shuttle' ? 50 : 40)) * sizeMult;
        this.height = (type === 'boss' ? 90 : (type === 'shuttle' ? 60 : 40)) * sizeMult;
        
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height - 50;
        
        const settings = DIFFICULTY_SETTINGS[difficulty];
        
        const speedMult = isElite ? 1.5 : 1;
        const waveSpeedMult = 1 + (currentWave * 0.05);
        this.speedY = settings.enemySpeed * speedMult * waveSpeedMult * (type === 'boss' ? 0.4 : (type === 'shuttle' ? 0.8 : 1));
        this.speedX = 0;
        
        if (type === 'boss') {
            this.hp = Math.floor(settings.bossHp * waveMult);
            this.maxHp = this.hp;
            this.scoreValue = Math.floor(500 * settings.scoreMult * waveMult);
            this.color = '#ff0040';
            this.shootInterval = Math.max(500, 1500 - currentWave * 100);
            this.trackingSpeed = 3 + currentWave * 0.2;
            this.burstFireCount = 0;
        } else if (type === 'shuttle') {
            this.hp = Math.floor((settings.shuttleHp + Math.floor(currentWave / 2)) * waveMult);
            this.maxHp = this.hp;
            this.scoreValue = Math.floor(30 * settings.scoreMult * (isElite ? 2 : 1) * waveMult);
            this.color = isElite ? '#a855f7' : '#ff8800';
            this.shootInterval = isElite ? Math.max(800, 1500 - currentWave * 50) : Math.max(1500, 2500 - currentWave * 100);
            this.trackingSpeed = isElite ? 4 + currentWave * 0.3 : 2 + currentWave * 0.1;
        } else if (type === 'elite' || isElite) {
            this.hp = Math.floor((settings.eliteHp + Math.floor(currentWave / 2)) * waveMult);
            this.maxHp = this.hp;
            this.scoreValue = Math.floor(50 * settings.scoreMult * waveMult);
            this.color = '#a855f7';
            this.shootInterval = Math.max(400, 800 - currentWave * 30);
            this.trackingSpeed = 6 + currentWave * 0.4;
            this.speedY *= 1.3;
        } else {
            this.hp = Math.floor((settings.enemyHealth + Math.floor(currentWave / 3)) * waveMult);
            this.maxHp = this.hp;
            this.scoreValue = Math.floor(10 * settings.scoreMult * waveMult);
            this.color = `hsl(${Math.random() * 60 + 300}, 100%, 50%)`;
            this.shootInterval = 0;
            this.trackingSpeed = 0;
        }
        
        this.markedForDeletion = false;
        this.angle = 0;
        this.shootTimer = Math.random() * this.shootInterval;
        this.hoverY = type === 'boss' ? canvas.height * 0.25 : (type === 'shuttle' || type === 'elite' ? canvas.height * 0.35 : canvas.height + 100);
        this.state = 'entering';
        this.lastPowerupDrop = this.maxHp;
    }

    update() {
        this.angle += 0.05;
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const myCenterX = this.x + this.width / 2;
        const myCenterY = this.y + this.height / 2;

        if (this.state === 'entering') {
            this.y += this.speedY;
            if (this.y >= this.hoverY) {
                this.state = 'combat';
                this.y = this.hoverY;
            }
        } else if (this.state === 'combat') {
            const diffX = playerCenterX - myCenterX;
            
            if (this.isElite || this.type === 'elite') {
                const predictX = playerCenterX + (Math.sin(Date.now() * 0.001) * 50);
                const targetDiffX = predictX - myCenterX;
                
                if (Math.abs(targetDiffX) > 3) {
                    this.speedX = Math.sign(targetDiffX) * this.trackingSpeed;
                    this.x += this.speedX;
                }
                
                this.x += Math.sin(Date.now() * 0.008 + currentWave) * 3;
            } else {
                if (Math.abs(diffX) > 5) {
                    this.speedX = Math.sign(diffX) * this.trackingSpeed;
                    this.x += this.speedX;
                }
            }
            
            this.y += Math.sin(Date.now() * 0.002) * 0.5;
        }

        if (this.shootInterval > 0) {
            this.shootTimer += 16;
            if (this.shootTimer >= this.shootInterval) {
                this.shootTimer = 0;
                this.shoot(playerCenterX, playerCenterY);
            }
        }

        if (this.type === 'drone' && !this.isElite) {
            this.x += Math.sin(this.y * 0.02 + Date.now() * 0.001) * 1;
            this.y += this.speedY * 0.3;
        }

        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));

        if (this.y > canvas.height + 100) {
            this.markedForDeletion = true;
        }
        
        if (this.type === 'boss') {
            const thresholds = [0.75, 0.5, 0.25];
            for (let threshold of thresholds) {
                const thresholdHp = this.maxHp * threshold;
                if (this.hp <= thresholdHp && this.lastPowerupDrop > thresholdHp) {
                    this.lastPowerupDrop = this.hp;
                    spawnBossPowerup(this.x + this.width/2, this.y + this.height/2);
                }
            }
        }
    }

    shoot(targetX, targetY) {
        const startX = this.x + this.width / 2;
        const startY = this.y + this.height;
        
        if (this.type === 'boss') {
            const baseAngle = Math.atan2(targetY - startY, targetX - startX);
            const spreadCount = Math.min(5, 3 + Math.floor(currentWave / 3));
            
            for (let i = 0; i < spreadCount; i++) {
                const angle = baseAngle + (i - Math.floor(spreadCount/2)) * 0.3;
                enemyBullets.push(new Bullet(startX, startY, angle, 7 + currentWave * 0.2, '#ff0040', 8));
            }
            
            this.burstFireCount++;
            if (this.burstFireCount % 2 === 0) {
                for (let i = 0; i < 8; i++) {
                    const spiralAngle = (Date.now() * 0.003) + (i * Math.PI / 4);
                    enemyBullets.push(new Bullet(startX, startY, spiralAngle, 5 + currentWave * 0.1, '#ff0040', 5));
                }
            }
        } else if (this.type === 'shuttle' || this.type === 'elite') {
            const angle = Math.atan2(targetY - startY, targetX - startX);
            const spread = this.isElite ? 0.25 : 0;
            
            enemyBullets.push(new Bullet(startX, startY, angle, (this.isElite ? 8 : 6) + currentWave * 0.1, this.isElite ? '#a855f7' : '#ff8800', this.isElite ? 6 : 5));
            
            if (this.isElite || currentWave > 5) {
                enemyBullets.push(new Bullet(startX, startY, angle - spread, (this.isElite ? 8 : 6), this.isElite ? '#a855f7' : '#ff8800', 5));
                enemyBullets.push(new Bullet(startX, startY, angle + spread, (this.isElite ? 8 : 6), this.isElite ? '#a855f7' : '#ff8800', 5));
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        if (this.type === 'shuttle') {
            ctx.rotate(this.speedX * 0.05);
        } else if (this.type === 'elite') {
            ctx.rotate(this.speedX * 0.08);
        } else {
            ctx.rotate(this.angle);
        }
        
        const shadowMult = this.isElite ? 2 : 1;
        ctx.shadowBlur = (this.type === 'boss' ? 40 : (this.type === 'shuttle' || this.type === 'elite' ? 20 : 15)) * shadowMult;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.type === 'boss' ? 4 : (this.isElite ? 3 : 2);
        
        if (this.type === 'boss') {
            ctx.beginPath();
            ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(-20, -15, 10, 0, Math.PI * 2);
            ctx.arc(20, -15, 10, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.rect(-15, 10, 30, 15);
            ctx.fill();
            
            ctx.rotate(-this.angle);
            ctx.fillStyle = '#300';
            ctx.fillRect(-35, -55, 70, 8);
            ctx.fillStyle = '#f00';
            ctx.fillRect(-35, -55, 70 * (this.hp / this.maxHp), 8);
            
            if (currentWave >= 10) {
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.moveTo(-20, -60);
                ctx.lineTo(-10, -75);
                ctx.lineTo(0, -65);
                ctx.lineTo(10, -75);
                ctx.lineTo(20, -60);
                ctx.closePath();
                ctx.fill();
            }
            
        } else if (this.type === 'shuttle') {
            ctx.beginPath();
            ctx.moveTo(0, this.height/2);
            ctx.lineTo(this.width/2, -this.height/2);
            ctx.lineTo(0, -this.height/2 + 10);
            ctx.lineTo(-this.width/2, -this.height/2);
            ctx.closePath();
            ctx.fillStyle = this.isElite ? '#1a0520' : '#1a0500';
            ctx.fill();
            ctx.stroke();
            
            if (this.isElite) {
                ctx.fillStyle = '#a855f7';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('★', 0, -10);
            }
            
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(-8, -this.height/2 + 5);
            ctx.lineTo(0, -this.height/2 - 20);
            ctx.lineTo(8, -this.height/2 + 5);
            ctx.fillStyle = this.color;
            ctx.fill();
            
            ctx.rotate(-this.speedX * 0.05);
            ctx.fillStyle = '#300';
            ctx.fillRect(-20, -40, 40, 4);
            ctx.fillStyle = this.color;
            ctx.fillRect(-20, -40, 40 * (this.hp / this.maxHp), 4);
            
        } else if (this.type === 'elite') {
            ctx.beginPath();
            ctx.moveTo(0, -this.height/2);
            ctx.lineTo(this.width/2, 0);
            ctx.lineTo(0, this.height/2);
            ctx.lineTo(-this.width/2, 0);
            ctx.closePath();
            ctx.fillStyle = '#1a0520';
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, -this.height/4);
            ctx.lineTo(this.width/4, 0);
            ctx.lineTo(0, this.height/4);
            ctx.lineTo(-this.width/4, 0);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, this.width/2 + 5, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.rotate(-this.speedX * 0.08);
            ctx.fillStyle = '#300';
            ctx.fillRect(-25, -50, 50, 4);
            ctx.fillStyle = this.color;
            ctx.fillRect(-25, -50, 50 * (this.hp / this.maxHp), 4);
            
        } else {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                ctx.lineTo(this.width/2 * Math.cos(i * Math.PI / 3), this.width/2 * Math.sin(i * Math.PI / 3));
            }
            ctx.closePath();
            ctx.stroke();
            
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI*2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class PowerUp {
    constructor(x, y, forcedType = null) {
        this.x = x;
        this.y = y;
        this.radius = 18;
        this.speed = 2.5;
        this.markedForDeletion = false;
        this.angle = 0;
        
        const types = Object.values(POWERUP_TYPES);
        this.powerupType = forcedType || types[Math.floor(Math.random() * types.length)];
    }

    update() {
        this.y += this.speed;
        this.angle += 0.15;
        
        if (this.y > canvas.height + 50) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.shadowBlur = 25;
        ctx.shadowColor = this.powerupType.color;
        
        ctx.fillStyle = this.powerupType.color + '60';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = this.powerupType.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        const pulse = Math.sin(Date.now() * 0.01) * 3;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 5 + pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.rotate(-this.angle);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.powerupType.symbol, 0, 0);
        
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, count = 15, size = null) {
        this.x = x;
        this.y = y;
        this.size = size || Math.random() * 3 + 1;
        this.speedX = Math.random() * 12 - 6;
        this.speedY = Math.random() * 12 - 6;
        this.color = color;
        this.life = 1;
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Star {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5;
        this.speed = Math.random() * 3 + 0.5;
        this.brightness = Math.random();
    }

    update() {
        this.y += this.speed + (currentWave * 0.3);
        if (this.y > canvas.height) {
            this.y = 0;
            this.x = Math.random() * canvas.width;
        }
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialization
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    window.addEventListener('keydown', e => keys[e.key] = true);
    window.addEventListener('keyup', e => keys[e.key] = false);
    
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
    });
    
    canvas.addEventListener('mousedown', e => {
        isMouseDown = true;
        useMouseControl = true;
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;
    });
    
    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
    
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        isMouseDown = true;
        useMouseControl = true;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        mousePos.x = touch.clientX - rect.left;
        mousePos.y = touch.clientY - rect.top;
    }, { passive: false });
    
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        mousePos.x = touch.clientX - rect.left;
        mousePos.y = touch.clientY - rect.top;
    }, { passive: false });
    
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        isMouseDown = false;
    });

    for(let i=0; i<100; i++) stars.push(new Star());
    
    highScoreDisplay.innerText = highScore;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Game Functions
function startGame(diff) {
    difficulty = diff;
    currentWave = 0;
    score = 0;
    
    player = new Player();
    bullets = [];
    enemies = [];
    particles = [];
    enemyBullets = [];
    powerups = [];
    
    gameActive = true;
    
    mainMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    uiLayer.classList.remove('hidden');
    
    canvas.style.cursor = 'none';
    
    updateUI();
    startWave();

    requestAnimationFrame(gameLoop);
}

function startWave() {
    currentWaveConfig = generateWaveConfig(currentWave);
    enemiesSpawnedInWave = 0;
    waveInProgress = true;
    isBossWave = currentWaveConfig.isBossWave;
    hasElite = currentWaveConfig.eliteChance > 0.3;
    
    waveMessage.innerText = currentWaveConfig.message;
    waveMessage.classList.remove('hidden');
    bossIndicator.classList.toggle('hidden', !isBossWave);
    eliteIndicator.classList.toggle('hidden', !hasElite);
    
    setTimeout(() => {
        waveMessage.classList.add('hidden');
    }, 3000);
    
    updateUI();
    
    clearInterval(enemySpawnTimer);
    
    if (isBossWave) {
        const bossCount = currentWaveConfig.types.filter(t => t === 'boss').length;
        const escorts = currentWaveConfig.types.filter(t => t !== 'boss');
        
        for (let i = 0; i < bossCount; i++) {
            setTimeout(() => {
                if (gameActive) enemies.push(new Enemy('boss', false, currentWave));
            }, i * 2000);
        }
        
        let escortIndex = 0;
        const escortInterval = setInterval(() => {
            if (!gameActive || escortIndex >= escorts.length) {
                clearInterval(escortInterval);
                return;
            }
            const type = escorts[escortIndex];
            const isElite = type === 'elite' || (type === 'shuttle' && Math.random() < 0.5);
            enemies.push(new Enemy(type === 'elite' ? 'drone' : type, isElite, currentWave));
            escortIndex++;
        }, 800);
        
    } else {
        const baseSpawnDelay = Math.max(200, 800 - currentWave * 40);
        const spawnDelay = isBossWave ? 1000 : baseSpawnDelay;
        
        enemySpawnTimer = setInterval(() => {
            if (!gameActive || !waveInProgress) return;
            
            if (enemiesSpawnedInWave < currentWaveConfig.count) {
                const type = currentWaveConfig.types[enemiesSpawnedInWave % currentWaveConfig.types.length];
                const isElite = type === 'elite' || 
                               (currentWaveConfig.eliteChance && Math.random() < currentWaveConfig.eliteChance) ||
                               (type === 'shuttle' && Math.random() < 0.3);
                
                const actualType = type === 'elite' ? 'drone' : type;
                enemies.push(new Enemy(actualType, isElite, currentWave));
                enemiesSpawnedInWave++;
            } else if (enemies.filter(e => !e.markedForDeletion).length === 0) {
                waveInProgress = false;
                setTimeout(() => {
                    currentWave++;
                    startWave();
                }, 2000);
            }
        }, spawnDelay);
    }
}

function updateUI() {
    scoreDisplay.innerText = Math.floor(score);
    waveDisplay.innerText = currentWave + 1;
    
    const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
    hpBar.style.width = `${hpPercent}%`;
    hpText.innerText = `${Math.ceil(hpPercent)}%`;
    
    if(hpPercent < 30) {
        hpBar.className = "h-full bg-red-600 w-full transition-all duration-200 shadow-[0_0_10px_#dc2626]";
    } else {
        hpBar.className = "h-full bg-gradient-to-r from-green-600 to-green-400 w-full transition-all duration-200 shadow-[0_0_10px_#4ade80]";
    }
}

function createExplosion(x, y, color, count = 15, maxSize = null) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color, count, maxSize ? Math.random() * maxSize + 2 : null));
    }
}

function spawnPowerup(x, y, forcedType = null) {
    if (Math.random() < 0.15) {
        powerups.push(new PowerUp(x, y, forcedType));
    }
}

function spawnBossPowerup(x, y) {
    const types = [POWERUP_TYPES.DAMAGE, POWERUP_TYPES.REGEN, POWERUP_TYPES.SPEED];
    const randomType = types[Math.floor(Math.random() * types.length)];
    powerups.push(new PowerUp(x, y, randomType));
    createExplosion(x, y, '#ffd700', 30, 6);
}

function checkCollisions() {
    bullets.forEach(bullet => {
        enemies.forEach(enemy => {
            if (!bullet.markedForDeletion && !enemy.markedForDeletion &&
                bullet.x > enemy.x && bullet.x < enemy.x + enemy.width &&
                bullet.y > enemy.y && bullet.y < enemy.y + enemy.height) {
                
                bullet.markedForDeletion = true;
                enemy.hp -= bullet.damage;
                createExplosion(bullet.x, bullet.y, '#ff0', 5, 3);
                
                if (enemy.hp <= 0) {
                    enemy.markedForDeletion = true;
                    const explosionSize = enemy.type === 'boss' ? 100 : (enemy.type === 'elite' ? 40 : (enemy.type === 'shuttle' ? 30 : 15));
                    createExplosion(
                        enemy.x + enemy.width/2, 
                        enemy.y + enemy.height/2, 
                        enemy.color, 
                        explosionSize,
                        enemy.type === 'boss' ? 12 : (enemy.type === 'elite' ? 6 : 5)
                    );
                    score += enemy.scoreValue;
                    
                    if (enemy.type !== 'boss') {
                        spawnPowerup(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    }
                    
                    if (isBossWave && enemies.filter(e => !e.markedForDeletion && e.type === 'boss').length === 0) {
                        waveInProgress = false;
                        setTimeout(() => {
                            currentWave++;
                            startWave();
                        }, 3000);
                    }
                }
            }
        });
    });

    enemyBullets.forEach(bullet => {
        if (!bullet.markedForDeletion &&
            bullet.x > player.x && bullet.x < player.x + player.width &&
            bullet.y > player.y && bullet.y < player.y + player.height) {
            
            bullet.markedForDeletion = true;
            createExplosion(bullet.x, bullet.y, '#f00', 10, 4);
            player.takeDamage(bullet.radius > 6 ? 15 : 10);
        }
    });

    enemies.forEach(enemy => {
        if (!enemy.markedForDeletion &&
            enemy.x < player.x + player.width &&
            enemy.x + enemy.width > player.x &&
            enemy.y < player.y + player.height &&
            enemy.y + enemy.height > player.y) {
            
            enemy.markedForDeletion = true;
            createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#f00', 25, 6);
            
            let damage = 20;
            if (enemy.type === 'boss') damage = 100;
            else if (enemy.type === 'elite') damage = 50;
            else if (enemy.type === 'shuttle') damage = 40;
            
            player.takeDamage(damage);
        }
    });

    powerups.forEach(powerup => {
        if (!powerup.markedForDeletion) {
            const dx = (player.x + player.width/2) - powerup.x;
            const dy = (player.y + player.height/2) - powerup.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < powerup.radius + player.width/2) {
                powerup.markedForDeletion = true;
                player.applyPowerup(powerup.powerupType);
                createExplosion(powerup.x, powerup.y, powerup.powerupType.color, 25, 5);
            }
        }
    });
}

function gameLoop() {
    if (!gameActive) return;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
        star.update();
        star.draw();
    });

    if (useMouseControl && isMouseDown) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(player.x + player.width/2, player.y + player.height/2);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    player.update();
    player.draw();

    bullets.forEach(b => b.update());
    bullets = bullets.filter(b => !b.markedForDeletion);
    bullets.forEach(b => b.draw());

    enemyBullets.forEach(b => b.update());
    enemyBullets = enemyBullets.filter(b => !b.markedForDeletion);
    enemyBullets.forEach(b => b.draw());

    enemies.forEach(e => e.update());
    enemies = enemies.filter(e => !e.markedForDeletion);
    enemies.forEach(e => e.draw());

    powerups.forEach(p => p.update());
    powerups = powerups.filter(p => !p.markedForDeletion);
    powerups.forEach(p => p.draw());

    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => p.draw());

    checkCollisions();
    updateUI();

    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameActive = false;
    clearInterval(enemySpawnTimer);
    canvas.style.cursor = 'default';
    
    let isNewHighScore = false;
    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('voidRunnerHighScore', highScore);
        isNewHighScore = true;
    }
    
    finalScore.innerText = Math.floor(score);
    newHighScoreBadge.classList.toggle('hidden', !isNewHighScore);
    uiLayer.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

function resetGame() {
    mainMenu.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    highScoreDisplay.innerText = highScore;
}

init();