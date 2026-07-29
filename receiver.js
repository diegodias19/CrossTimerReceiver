const context = cast.framework.CastReceiverContext.getInstance();
const CUSTOM_NAMESPACE = 'urn:x-cast:br.com.diego.crosstimer';

// Elementos da Tela
const elType = document.getElementById('workout-type');
const elTimer = document.getElementById('timer-display');
const elRound = document.getElementById('round-value');
const elStatus = document.getElementById('status-value');

// Estado Global do Treino
let timerInterval = null;
let seconds = 0;
let currentRound = 1;
let totalRounds = 1;
let workoutType = 'NONE';
let state = 'STOPPED'; // PREP, WORK, REST, PAUSED, STOPPED
let config = {};

// SINTETIZADOR DE SOM (Sem precisar de arquivo MP3 external)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep(freq = 440, duration = 0.15) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.log("Erro ao tocar som", e);
    }
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function setVisualState(bodyClass, statusText) {
    document.body.className = bodyClass;
    elStatus.textContent = statusText;
}

function updateDisplay() {
    elTimer.textContent = formatTime(seconds);
    elRound.textContent = totalRounds > 1 ? `${currentRound}/${totalRounds}` : `${currentRound}`;
}

// LÓGICA PRINCIPAL DO MOTOR DE TEMPO
function startEngine() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (state === 'WORK') {
            handleWorkTick();
        } else if (state === 'REST') {
            handleRestTick();
        } else if (state === 'PREP') {
            handlePrepTick();
        }
        updateDisplay();
    }, 1000);
}

function handlePrepTick() {
    seconds--;
    if (seconds <= 3 && seconds > 0) playBeep(440);
    if (seconds <= 0) {
        playBeep(880, 0.4);
        state = 'WORK';
        setVisualState('status-work', 'WORK');
        
        if (workoutType === 'AMRAP') {
            seconds = config.totalTime || 60;
        } else if (workoutType === 'EMOM' || workoutType === 'TABATA') {
            seconds = config.workTime || 60;
        } else {
            seconds = 0; // FOR TIME
        }
    }
}

function handleWorkTick() {
    if (workoutType === 'AMRAP' || workoutType === 'FOR_TIME') {
        if (workoutType === 'AMRAP') {
            seconds--;
            if (seconds <= 3 && seconds > 0) playBeep(440);
            if (seconds <= 0) finishWorkout();
        } else { // FOR TIME
            seconds++;
            if (config.timeCap && seconds >= config.timeCap) finishWorkout();
        }
    } else if (workoutType === 'EMOM' || workoutType === 'TABATA') {
        seconds--;
        if (seconds <= 3 && seconds > 0) playBeep(440);
        
        if (seconds <= 0) {
            if (config.restTime && config.restTime > 0) {
                state = 'REST';
                setVisualState('status-rest', 'REST');
                seconds = config.restTime;
                playBeep(600, 0.2);
            } else {
                nextRoundOrFinish();
            }
        }
    }
}

function handleRestTick() {
    seconds--;
    if (seconds <= 3 && seconds > 0) playBeep(440);
    if (seconds <= 0) {
        nextRoundOrFinish();
    }
}

function nextRoundOrFinish() {
    if (currentRound < totalRounds) {
        currentRound++;
        state = 'WORK';
        setVisualState('status-work', 'WORK');
        seconds = config.workTime;
        playBeep(880, 0.4);
    } else {
        finishWorkout();
    }
}

function finishWorkout() {
    clearInterval(timerInterval);
    state = 'STOPPED';
    setVisualState('status-ready', 'FINALIZADO!');
    playBeep(880, 0.8);
}

// OUVINTE DE COMANDOS DA TV
context.addCustomMessageListener(CUSTOM_NAMESPACE, (event) => {
    try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const action = data.action;

        if (action === 'START') {
            workoutType = data.type || 'AMRAP';
            config = data.config || {};
            
            elType.textContent = workoutType.replace('_', ' ');
            totalRounds = config.totalRounds || 1;
            currentRound = 1;

            // Inicia em modo PREP (5 segundos de preparação)
            state = 'PREP';
            seconds = 5;
            setVisualState('status-prep', 'PREPARE-SE');
            updateDisplay();
            startEngine();

        } else if (action === 'PAUSE') {
            if (timerInterval) clearInterval(timerInterval);
            state = 'PAUSED';
            setVisualState('status-prep', 'PAUSADO');

        } else if (action === 'RESET') {
            if (timerInterval) clearInterval(timerInterval);
            state = 'STOPPED';
            seconds = 0;
            currentRound = 1;
            setVisualState('status-ready', 'PRONTO');
            elType.textContent = 'CROSSTIMER';
            updateDisplay();
            
        } else if (action === 'ADD_ROUND') {
            currentRound++;
            updateDisplay();
        }
    } catch (e) {
        console.error("Erro ao ler JSON no Receiver:", e);
    }
});

const options = new cast.framework.CastReceiverOptions();
context.start(options);
