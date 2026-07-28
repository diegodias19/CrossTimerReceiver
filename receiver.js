const context = cast.framework.CastReceiverContext.getInstance();

// Definimos o mesmo namespace que usaremos no Android
const CUSTOM_NAMESPACE = 'urn:x-cast:br.com.diego.crosstimer';

// Escuta mensagens recebidas no nosso namespace
context.addCustomMessageListener(CUSTOM_NAMESPACE, (event) => {
    // event.data conterá a mensagem enviada pelo Android (ex: "10" ou JSON)
    const contadorDiv = document.getElementById('contador');
    if (contadorDiv) {
        contadorDiv.textContent = event.data;
    }
});

const options = new cast.framework.CastReceiverOptions();
context.start(options);
