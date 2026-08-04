// Inicialização condicional do Cast (para não quebrar se aberto fora do Chromecast)
let context = null;
try {
    if (window.cast && cast.framework) {
        context = cast.framework.CastReceiverContext.getInstance();
    }
} catch (e) {
    console.log("Modo de teste local (fora do Chromecast)");
}

const CUSTOM_NAMESPACE = 'urn:x-cast:br.com.diego.crosstimer';

// Elementos da Tela
const elType = document.getElementById('workout-type');
const elTimer = document.getElementById('timer-display');
const elRound = document.getElementById('round-value');
const elStatus = document.getElementById('status-value');

// Estado do Timer
let timerInterval = null;
let startTime = 0;
let durationMs = 0;
let lastSecondLogged = -1;

let currentRound = 1;
let totalRounds = 1;
let workoutType = 'NONE';
let state = 'STOPPED'; // PREP, WORK, REST, PAUSED, STOPPED
let config = {};

// Sintetizador de Som
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
        console.log("Erro de áudio:", e);
    }
}

function formatTime(sec) {
    const total = Math.max(0, sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function setVisualState(bodyClass, statusText) {
    document.body.className = bodyClass;
    elStatus.textContent = statusText;
}

function updateDisplay(sec) {
    elTimer.textContent = formatTime(sec);
    elRound.textContent = totalRounds > 1 ? `${currentRound}/${totalRounds}` : `${currentRound}`;
}

function startBlock(seconds) {
    if (timerInterval) clearInterval(timerInterval);
    
    durationMs = seconds * 1000;
    startTime = performance.now();
    lastSecondLogged = -1;

    // Roda a cada 50ms para garantir transição suave e sem atraso na virada de segundo
    timerInterval = setInterval(() => {
        if (state === 'PAUSED' || state === 'STOPPED') return;

        const elapsed = performance.now() - startTime;
        const remainingMs = durationMs - elapsed;
        
        // Trunca o tempo em segundos
        const currentSecond = Math.max(0, Math.floor((remainingMs + 999) / 1000));

        if (currentSecond !== lastSecondLogged) {
            lastSecondLogged = currentSecond;
            if (currentSecond <= 3 && currentSecond > 0 && state !== 'STOPPED') {
                playBeep(440, 0.15);
            }
        }

        updateDisplay(currentSecond);

        if (remainingMs <= 0) {
            clearInterval(timerInterval);
            handlePhaseCompletion();
        }
    }, 50);
}

function handlePhaseCompletion() {
    if (state === 'PREP') {
        playBeep(880, 0.4);
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
        playBeep(880, 0.4);
        startBlock(config.workTime || 60);
    } else {
        finishWorkout();
    }
}

function finishWorkout() {
    if (timerInterval) clearInterval(timerInterval);
    state = 'STOPPED';
    setVisualState('status-ready', 'FINALIZADO!');
    updateDisplay(0);
    playBeep(880, 0.8);
}

// Lógica de Processamento de Comandos (Reutilizada pelo Cast e pelos Botões Locais)
function processarComando(data) {
    const action = data.action;

    if (action === 'START') {
        if (timerInterval) clearInterval(timerInterval);

        workoutType = data.type || 'AMRAP';
        config = data.config || {};
        
        elType.textContent = workoutType.replace('_', ' ');
        totalRounds = config.totalRounds || 1;
        currentRound = 1;

        state = 'PREP';
        setVisualState('status-prep', 'PREPARE-SE');
        startBlock(5);

    } else if (action === 'PAUSE') {
        if (timerInterval) clearInterval(timerInterval);
        state = 'PAUSED';
        setVisualState('status-prep', 'PAUSADO');

    } else if (action === 'RESET') {
        if (timerInterval) clearInterval(timerInterval);
        state = 'STOPPED';
        currentRound = 1;
        setVisualState('status-ready', 'PRONTO');
        elType.textContent = 'CROSSTIMER';
        updateDisplay(0);
    }
}

// FUNÇÕES DE TESTE LOCAL (Para uso pelo computador)
function testarLocal(tipo) {
    if (tipo === 'EMOM') {
        processarComando({
            action: 'START',
            type: 'EMOM',
            config: { workTime: 15, restTime: 5, totalRounds: 3 }
        });
    } else if (tipo === 'AMRAP') {
        processarComando({
            action: 'START',
            type: 'AMRAP',
            config: { totalTime: 30 }
        });
    }
}

function pausarLocal() {
    processarComando({ action: 'PAUSE' });
}

function zerarLocal() {
    processarComando({ action: 'RESET' });
}

// OUVINTE DO GOOGLE CAST
if (context) {
    context.addCustomMessageListener(CUSTOM_NAMESPACE, (event) => {
        try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            processarComando(data);
        } catch (e) {
            console.error("Erro no Receiver:", e);
        }
    });

    const options = new cast.framework.CastReceiverOptions();
    context.start(options);
}

setVisualState('status-ready', 'PRONTO');
updateDisplay(0);
