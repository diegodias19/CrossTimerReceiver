const context = cast.framework.CastReceiverContext.getInstance();
const CUSTOM_NAMESPACE = 'urn:x-cast:br.com.diego.crosstimer';

function formatarTempo(sec) {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function atualizarTela(valor) {
    const contadorDiv = document.getElementById('contador');
    if (contadorDiv) {
        // Se for um número, formata em 00:00. Se não, exibe o texto puro
        const num = parseInt(valor, 10);
        if (!isNaN(num)) {
            contadorDiv.textContent = formatarTempo(num);
        } else {
            contadorDiv.textContent = valor;
        }
    }
}

// Ouve as mensagens enviadas do celular (igualzinho à versão do +1)
context.addCustomMessageListener(CUSTOM_NAMESPACE, (event) => {
    const conteudo = event.data;
    atualizarTela(conteudo);
});

const options = new cast.framework.CastReceiverOptions();
context.start(options);

atualizarTela("00:00");
