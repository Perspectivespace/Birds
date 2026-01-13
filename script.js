'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. КОНСТАНТЫ ---
    const birdsData = [
        { id: 'baby', name: 'Baby', eggs: 42, price: 1000, sound: 'sounds/baby.mp3' },
        { id: 'green', name: 'Green', eggs: 221, price: 5000, sound: 'sounds/green.mp3' },
        { id: 'yellow', name: 'Yellow', eggs: 1160, price: 25000, sound: 'sounds/yellow.mp3' },
        { id: 'blue', name: 'Blue', eggs: 6091, price: 125000, sound: 'sounds/blue.mp3' },
        { id: 'red', name: 'Red', eggs: 31979, price: 625000, sound: 'sounds/red.mp3' }
    ].map(b => ({...b, img: `images/${b.id}.png`}));

    const GOLD_PER_100_EGGS = 1;
    const SILVER_PER_100_EGGS = 1;
    const REINVEST_BONUS = 1.1;
    const GOLD_FOR_1_TON = 17615;
    const PAGE_SIZE = 10;
    const sortedBirdsByPrice = [...birdsData].sort((a, b) => b.price - a.price);

    // --- 2. ГЛОБАЛЬНОЕ СОСТОЯНИЕ ---
    let currentPage = 0;
    let strategyEvents = [];

    // --- 3. DOM ЭЛЕМЕНТЫ ---
    const elements = {
        userInputs: document.getElementById('user-inputs-container'),
        birdCards: document.getElementById('bird-cards-container'),
        timeline: document.getElementById('timeline'),
        timelineRange: document.getElementById('timeline-range'),
        goalMessage: document.getElementById('goal-message'),
        prevBtn: document.getElementById('prev-days'),
        nextBtn: document.getElementById('next-days'),
        goalTonInput: document.getElementById('goal-ton'),
        reinvestSlider: document.getElementById('reinvest-slider'),
        reinvestValue: document.getElementById('reinvest-value'),
        maxWaitDaysInput: document.getElementById('max-wait-days'),
        pasteData: document.getElementById('paste-data'),
        parseButton: document.getElementById('parse-button'),
        stats: {
            ton: document.getElementById('stat-ton'),
            gold: document.getElementById('stat-gold'),
            silver: document.getElementById('stat-silver'),
            reinvestSilver: document.getElementById('stat-reinvest-silver'),
        }
    };
    
    // --- 4. ФУНКЦИИ ---

    function renderInitialUI() {
        birdsData.forEach(bird => {
            elements.userInputs.innerHTML += `
                <div class="input-group">
                    <label for="input-${bird.id}">${bird.name}</label>
                    <div class="counter">
                        <button class="btn-control" data-id="${bird.id}" data-action="minus">-</button>
                        <input type="number" id="input-${bird.id}" data-id="${bird.id}" value="0" min="0">
                        <button class="btn-control" data-id="${bird.id}" data-action="plus">+</button>
                    </div>
                </div>`;
            elements.birdCards.innerHTML += `
                <div class="bird-card" data-id="${bird.id}">
                    <div class="card-content">
                         <img src="${bird.img}" alt="${bird.name}">
                         <h3>${bird.name}</h3>
                         <p>Яиц/час: ${bird.eggs}</p>
                         <p>Цена: ${bird.price.toLocaleString()}</p>
                    </div>
                </div>`;
        });
    }
    
    function parsePastedData() {
        const text = elements.pasteData.value.toLowerCase();
        birdsData.forEach(bird => {
            const regex = new RegExp(`${bird.id.toLowerCase()}[^\\d]*(\\d+)`, 'i');
            const match = text.match(regex);
            if (match && match[1]) {
                document.getElementById(`input-${bird.id}`).value = parseInt(match[1]);
            }
        });
        updateDashboard();
        calculateStrategy();
        elements.pasteData.value = '';
    }

    function getUserSettings() {
        const settings = {};
        birdsData.forEach(bird => {
            settings[bird.id] = parseInt(document.getElementById(`input-${bird.id}`).value) || 0;
        });
        const totalEggsPerHour = birdsData.reduce((sum, bird) => sum + (settings[bird.id] * bird.eggs), 0);
        
        return {
            birds: settings,
            totalEggsPerHour,
            goalTON: parseFloat(elements.goalTonInput.value) || 1,
            reinvestPercent: parseInt(elements.reinvestSlider.value),
            maxWaitDays: parseInt(elements.maxWaitDaysInput.value) || 7
        };
    }

    function updateDashboard() {
        const { totalEggsPerHour, reinvestPercent } = getUserSettings();
        const eggsPerDay = totalEggsPerHour * 24;
        const goldPerDay = eggsPerDay * (GOLD_PER_100_EGGS / 100);
        const silverPerDay = eggsPerDay * (SILVER_PER_100_EGGS / 100);
        const tonPerDay = goldPerDay / GOLD_FOR_1_TON;
        const silverFromReinvest = (goldPerDay * (reinvestPercent / 100)) * REINVEST_BONUS;
        const totalSilverForPurchase = silverPerDay + silverFromReinvest;

        elements.stats.ton.textContent = tonPerDay.toFixed(5);
        elements.stats.gold.textContent = Math.floor(goldPerDay).toLocaleString();
        elements.stats.silver.textContent = Math.floor(silverPerDay).toLocaleString();
        elements.stats.reinvestSilver.textContent = Math.floor(totalSilverForPurchase).toLocaleString();
    }

    function calculateStrategy() {
        const settings = getUserSettings();
        const goalEggsPerHour = (settings.goalTON * GOLD_FOR_1_TON) * 100 / 24;

        if (settings.totalEggsPerHour >= goalEggsPerHour) {
            strategyEvents = [];
            displayGoalReached(settings.totalEggsPerHour, settings.goalTON);
            return;
        }

        let totalEggsPerHour = settings.totalEggsPerHour;
        let silverBalance = 0;
        let days = 0;
        let events = [];

        while (totalEggsPerHour < goalEggsPerHour && days < 1825) {
            days++;
            const eggsPerDay = totalEggsPerHour * 24;
            const silverFromReinvest = (eggsPerDay / 100 * (settings.reinvestPercent / 100)) * REINVEST_BONUS;
            const dailySilverIncome = (eggsPerDay / 100) + silverFromReinvest;
            silverBalance += dailySilverIncome;

            for (const birdToBuy of sortedBirdsByPrice) {
                if (silverBalance >= birdToBuy.price) {
                    const daysToWait = (birdToBuy.price - silverBalance) / dailySilverIncome;
                    if (daysToWait <= settings.maxWaitDays) {
                         const numToBuy = Math.floor(silverBalance / birdToBuy.price);
                         silverBalance -= numToBuy * birdToBuy.price;
                         totalEggsPerHour += numToBuy * birdToBuy.eggs;
                         events.push({ day: days, text: `Покупка <strong>${numToBuy}x ${birdToBuy.name}</strong>. Производительность: ~${Math.round(totalEggsPerHour).toLocaleString()} яиц/час.` });
                         break;
                    }
                }
            }
        }
        strategyEvents = events;
        if(totalEggsPerHour >= goalEggsPerHour) {
            events.push({ day: days, text: `<strong>Цель ${settings.goalTON.toLocaleString()} TON/день достигнута!</strong> Производительность: ~${Math.round(totalEggsPerHour).toLocaleString()} яиц/час.` });
        }
        currentPage = 0;
        displayStrategyPage();
    }
    
    function displayStrategyPage() {
        elements.timeline.innerHTML = '';
        elements.goalMessage.style.display = 'none';
        const start = currentPage * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageEvents = strategyEvents.slice(start, end);
        if (strategyEvents.length === 0 && !elements.goalMessage.style.display) {
            elements.timeline.innerHTML = '<p style="text-align: center;">Для расчета стратегии измените параметры.</p>';
        }
        pageEvents.forEach(event => {
            elements.timeline.innerHTML += `<div class="timeline-event"><span class="day">День ${event.day}:</span><span class="action">${event.text}</span></div>`;
        });
        updateNavigation();
    }

    function updateNavigation() {
        const totalPages = Math.ceil(strategyEvents.length / PAGE_SIZE);
        const startItem = strategyEvents.length > 0 ? currentPage * PAGE_SIZE + 1 : 0;
        const endItem = Math.min((currentPage + 1) * PAGE_SIZE, strategyEvents.length);
        elements.timelineRange.textContent = `События ${startItem}-${endItem} из ${strategyEvents.length}`;
        elements.prevBtn.disabled = currentPage === 0;
        elements.nextBtn.disabled = currentPage >= totalPages - 1 || strategyEvents.length === 0;
    }
    
    function displayGoalReached(currentEggs, goalTON) {
        elements.timeline.innerHTML = '';
        elements.goalMessage.innerHTML = `Поздравляем! Ваша ферма уже производит ~${Math.round(currentEggs).toLocaleString()} яиц/час, что выполняет или превышает цель в ${goalTON.toLocaleString()} TON/день.`;
        elements.goalMessage.style.display = 'block';
        updateNavigation();
    }
    
    function handleControls(event) {
        const target = event.target;
        if (target.matches('.btn-control')) {
            const id = target.dataset.id;
            const input = document.getElementById(`input-${id}`);
            let value = parseInt(input.value);
            if (target.dataset.action === 'plus') value++;
            else if (value > 0) value--;
            input.value = value;
        }
        if (target.id === 'reinvest-slider') {
            elements.reinvestValue.textContent = `${target.value}%`;
        }
        updateDashboard();
        calculateStrategy();
    }

    function setupSoundEffects() {
        const birdSounds = {};
        birdsData.forEach(bird => {
            const audio = new Audio(bird.sound);
            audio.volume = 0.3;
            birdSounds[bird.id] = audio;
        });
        const birdCards = document.querySelectorAll('.bird-card');
        birdCards.forEach(card => {
            card.addEventListener('mouseover', () => {
                const birdId = card.dataset.id;
                const soundToPlay = birdSounds[birdId];
                if (soundToPlay) {
                    soundToPlay.currentTime = 0;
                    soundToPlay.play().catch(error => console.log("Аудио будет доступно после первого клика."));
                }
            });
        });
    }

    // --- 5. ИНИЦИАЛИЗАЦИЯ ---
    renderInitialUI();
    setupSoundEffects();
    updateDashboard();
    calculateStrategy();

    // --- НАЗНАЧЕНИЕ СОБЫТИЙ ---
    document.getElementById('user-controls').addEventListener('input', handleControls);
    document.getElementById('user-controls').addEventListener('click', e => e.target.matches('.btn-control') && handleControls(e));
    elements.parseButton.addEventListener('click', parsePastedData);
    elements.prevBtn.addEventListener('click', () => { if (currentPage > 0) { currentPage--; displayStrategyPage(); } });
    elements.nextBtn.addEventListener('click', () => { const totalPages = Math.ceil(strategyEvents.length / PAGE_SIZE); if (currentPage < totalPages - 1) { currentPage++; displayStrategyPage(); } });

    // --- ФОНОВАЯ МУЗЫКА И ВИЗУАЛИЗАТОР ---
    const toggleMusicBtn = document.getElementById('toggle-music-btn');
    const musicIcon = toggleMusicBtn.querySelector('i');
    const backgroundMusic = new Audio('sounds/background-music.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.2;

    let isMusicPlaying = false;
    let audioContext, analyser, source, bufferLength, dataArray;
    let isAudioContextInitialized = false;

    const canvas = document.getElementById('music-visualizer');
    const canvasCtx = canvas.getContext('2d');

    function initAudioContext() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        source = audioContext.createMediaElementSource(backgroundMusic);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        analyser.fftSize = 256;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        isAudioContextInitialized = true;
    }

    function drawVisualizer() {
        if (!isMusicPlaying) {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        requestAnimationFrame(drawVisualizer);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2.5;
            const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
            gradient.addColorStop(0, 'var(--accent-color)');
            gradient.addColorStop(1, 'var(--primary-gold)');
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    function toggleMusic() {
        if (!isAudioContextInitialized) initAudioContext();
        isMusicPlaying = !isMusicPlaying;
        if (isMusicPlaying) {
            backgroundMusic.play().catch(e => console.error("Ошибка воспроизведения:", e));
            musicIcon.classList.replace('fa-play', 'fa-pause');
            toggleMusicBtn.setAttribute('title', 'Остановить музыку');
            drawVisualizer();
        } else {
            backgroundMusic.pause();
            musicIcon.classList.replace('fa-pause', 'fa-play');
            toggleMusicBtn.setAttribute('title', 'Включить музыку');
        }
    }
    toggleMusicBtn.addEventListener('click', toggleMusic);
});
