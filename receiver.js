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

function logNaTV(mensagem) {
    const debugDiv = document.getElementById('debug-log');
    if (debugDiv) {
        debugDiv.textContent = mensagem;
    }
}

// Configura o ouvinte de mensagens customizadas
context.addCustomMessageListener(CUSTOM_NAMESPACE, (event) => {
    // Pega o conteúdo da mensagem enviada pelo Android
    const comando = event.data;
    
    logNaTV(`Recebido: "${comando}"`);

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
});

const options = new cast.framework.CastReceiverOptions();

// Define o formato da mensagem para aceitar texto simples no namespace
options.customNamespaces = {};
options.customNamespaces[CUSTOM_NAMESPACE] = cast.framework.system.MessageType.STRING;

// Inicia o contexto do Receiver com as opções configuradas
context.start(options);

atualizarTela();
logNaTV("Receiver pronto e escutando!");
