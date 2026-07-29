const context = cast.framework.CastReceiverContext.getInstance();
const CUSTOM_NAMESPACE = 'urn:x-cast:br.com.diego.crosstimer';

// Elementos da Tela
const elType = document.getElementById('workout-type');
const elTimer = document.getElementById('timer-display');
const elRound = document.getElementById('round-value');
const elStatus = document.getElementById('status-value');

// Estado Global do Treino
let animationFrameId = null;
let targetEndTime = 0;      // Timestamp exato em ms de quando o bloco atual deve terminar
let lastDisplayedSecond = -1; // Para evitar repetição de bips no mesmo segundo

let currentRound = 1;
let totalRounds = 1;
let workoutType = 'NONE';
let state = 'STOPPED'; // PREP, WORK, REST, PAUSED, STOPPED
let config = {};

// Sintetizador de Áudio (Bip)
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
        console.log("Erro ao tocar áudio:", e);
    }
}

function formatTime(sec) {
    const totalSec = Math.max(0, sec);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function setVisualState(bodyClass, statusText) {
    document.body.className = bodyClass;
    elStatus.textContent = statusText;
}

function updateDisplay(secondsToShow) {
    elTimer.textContent = formatTime(secondsToShow);
    elRound.textContent = totalRounds > 1 ? `${currentRound}/${totalRounds}` : `${currentRound}`;
}

// INICIA UM BLOCO COM BASE NO RELÓGIO ABSOLUTO
function startBlock(durationSeconds) {
    targetEndTime = Date.now() + (durationSeconds * 1000);
    lastDisplayedSecond = -1;
    runLoop();
}

// LOOP ULTRA RÁPIDO (Garante fluidez sem engasgar)
function runLoop() {
    if (state === 'PAUSED' || state === 'STOPPED') return;

    const now = Date.now();
    const remainingMs = targetEndTime - now;
    const remainingSec = Math.ceil(remainingMs / 1000);

    // Toca bips de contagem regressiva (3, 2, 1...) sem repetir no mesmo segundo
    if (remainingSec !== lastDisplayedSecond) {
        lastDisplayedSecond = remainingSec;
        if (remainingSec <= 3 && remainingSec > 0) {
            playBeep(440, 0.15); // Bip curto
        }
    }

    if (remainingMs <= 0) {
        // Transição de Fase
        handlePhaseCompletion();
    } else {
        updateDisplay(remainingSec);
        animationFrameId = requestAnimationFrame(runLoop);
    }
}

function handlePhaseCompletion() {
    if (state === 'PREP') {
        playBeep(880, 0.4); // GO!
        state = 'WORK';
        setVisualState('status-work', 'WORK');

        const duration = (workoutType === 'AMRAP') 
            ? (config.totalTime || 60) 
            : (config.workTime || 60);

        startBlock(duration);

    } else if (state === 'WORK') {
        if (workoutType === 'AMRAP' || workoutType === 'FOR_TIME') {
            finishWorkout();
        } else if (workoutType === 'EMOM' || workoutType === 'TABATA') {
            if (config.restTime && config.restTime > 0) {
                state = 'REST';
                setVisualState('status-rest', 'REST');
                playBeep(600, 0.2);
                startBlock(config.restTime);
            } else {
                nextRoundOrFinish();
            }
        }
    } else if (state === 'REST') {
        nextRoundOrFinish();
    }
}

function nextRoundOrFinish() {
    if (currentRound < totalRounds) {
        currentRound++;
        state = 'WORK';
        setVisualState('status-work', 'WORK');
        playBeep(880, 0.4); // GO!
        startBlock(config.workTime || 60);
    } else {
        finishWorkout();
    }
}

function finishWorkout() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    state = 'STOPPED';
    setVisualState('status-ready', 'FINALIZADO!');
    updateDisplay(0);
    playBeep(880, 0.8);
}

// OUVINTE DE COMANDOS DA TV
context.addCustomMessageListener(CUSTOM_NAMESPACE, (event) => {
    try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const action = data.action;

        if (action === 'START') {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            workoutType = data.type || 'AMRAP';
            config = data.config || {};
            
            elType.textContent = workoutType.replace('_', ' ');
            totalRounds = config.totalRounds || 1;
            currentRound = 1;

            // Inicia em modo PREP (5s de preparação)
            state = 'PREP';
            setVisualState('status-prep', 'PREPARE-SE');
            startBlock(5);

        } else if (action === 'PAUSE') {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            state = 'PAUSED';
            setVisualState('status-prep', 'PAUSADO');

        } else if (action === 'RESET') {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            state = 'STOPPED';
            currentRound = 1;
            setVisualState('status-ready', 'PRONTO');
            elType.textContent = 'CROSSTIMER';
            updateDisplay(0);
            
        } else if (action === 'ADD_ROUND') {
            currentRound++;
            updateDisplay(0);
        }
    } catch (e) {
        console.error("Erro ao processar JSON:", e);
    }
});

const options = new cast.framework.CastReceiverOptions();
context.start(options);

setVisualState('status-ready', 'PRONTO');
updateDisplay(0);
