const context = cast.framework.CastReceiverContext.getInstance();
const CUSTOM_NAMESPACE = 'urn:x-cast:br.com.diego.crosstimer';

let segundos = 0;
let timer = null;

function formatarTempo(sec) {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function atualizarTela() {
    const contadorDiv = document.getElementById('contador');
    if (contadorDiv) {
        contadorDiv.textContent = formatarTempo(segundos);
    }
}

// Ouve as mensagens JSON enviadas do celular
context.addCustomMessageListener(CUSTOM_NAMESPACE, (event) => {
    try {
        // Tenta converter a string recebida em Objeto JSON
        const dados = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const comando = dados.action; // Lê o valor da chave "action"

        if (comando === 'START') {
            if (!timer) {
                timer = setInterval(() => {
                    segundos++;
                    atualizarTela();
                }, 1000);
            }
        } else if (comando === 'PAUSE') {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        } else if (comando === 'RESET') {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            segundos = 0;
            atualizarTela();
        }
    } catch (e) {
        console.error("Erro ao processar JSON no Receiver:", e);
    }
});

const options = new cast.framework.CastReceiverOptions();
context.start(options);

atualizarTela();
