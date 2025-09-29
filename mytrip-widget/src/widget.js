import {createApp} from 'vue';
import App from './App.vue';
import './styles/widget.css?inline';
import Signaling from './signaling';

createApp(App).mount('#app');

if (document.getElementById("CallButtonWidget")) {
    console.warn("CallButton widget already injected");
} else {

    // Retrieve the number from the data attribute
    const configElement = document.getElementById("callWidgetConfig");
    const TargetToCall = configElement.dataset.target;

    if (!TargetToCall) {
        console.error("Target to call not found in data attribute.");
        TargetToCall = "ClickToTalkDefault"; // Exit if the number is not found
    }

    let funcStatusCallBack = function (status) {
        let element = document.getElementById('widget_iframe_element');
        if (element) {
            element.contentWindow.postMessage({
                type: "status_update",
                data: status
            }, "*");
        }
    };

    window.webTritSignaling = new Signaling(TargetToCall, funcStatusCallBack);

    const divElement = document.createElement("div");
    divElement.id = "CallbuttonWidget";
    divElement.className = "callbutton-widget";

    const audioElement = document.createElement("audio");
    audioElement.autoplay = true;
    audioElement.id = "remoteStream";
    audioElement.style.display = "none";
    divElement.appendChild(audioElement)

    const buttonElement = document.createElement("button");
    buttonElement.className = "callbutton";
    buttonElement.addEventListener("click", function () {
        const elem = document.getElementById('widget_iframe_element');
        if (!elem) {
            const iframeElement = document.createElement("iframe");
            iframeElement.src = import.meta.env.VITE_WIDGET_URL + "/widgetcontent.html";
            iframeElement.id = 'widget_iframe_element';
            iframeElement.allow = 'microphone';
            iframeElement.style.display = 'block';

            divElement.appendChild(iframeElement);
        } else {
            divElement.removeChild(elem);
        }
    });
    
    const webcallIcon = import.meta.env.VITE_WIDGET_URL + "/src/assets/webcall.svg";
    buttonElement.innerHTML = '<img src=' + webcallIcon + '>';

    divElement.appendChild(buttonElement);
    document.body.appendChild(divElement);

    const connectionError = document.createElement("div");
    connectionError.id = "connectionerror";
    connectionError.className = "connection-error";
    connectionError.style.display = 'none';

    const iconContainer = document.createElement("div");
    iconContainer.className = "icon-container";
    const errorIcon = document.createElement("img");
    errorIcon.src = import.meta.env.VITE_WIDGET_URL + "/src/assets/vf-uc-logo.png";
    iconContainer.appendChild(errorIcon);

    const closeButton = document.createElement("div");
    closeButton.className = "close-button";

    const closeIcon = document.createElement("img");
    closeIcon.src = import.meta.env.VITE_WIDGET_URL + "/src/assets/close.svg";
    closeButton.appendChild(closeIcon);

    closeButton.onclick = function () {
        connectionError.style.display = 'none';
    }

    const errorTextContainer = document.createElement("div");
    errorTextContainer.className = "error-text-container";
    errorTextContainer.innerText = "Sorry, but we can't connect you right now. Please try again later";

    connectionError.appendChild(iconContainer);
    connectionError.appendChild(errorTextContainer);
    connectionError.appendChild(closeButton);
    document.body.appendChild(connectionError);

    const receiveMessage = function (event) {
        const element = document.getElementById('widget_iframe_element');
        if (event.data === "removetheiframe_success") {
            element?.parentNode?.removeChild(element);
        } else if (event.data === "removetheiframe_failure") {
            element?.parentNode?.removeChild(element);
            const connectionError = document.getElementById('connectionerror');
            connectionError.style.display = 'block';
        } else if (event.data === "start_call") {
            window.webTritSignaling.connect();
        } else if (event.data === "end_call") {
            window.webTritSignaling.hangup();
        } else if (event.data === 'mute_audio') {
            window.webTritSignaling.muteAudio(true);
        } else if (event.data === 'unmute_audio') {
            window.webTritSignaling.muteAudio(false);
        } else {
            window.webTritSignaling.sendDtmf(event.data);
        }
    }
    window.addEventListener("message", receiveMessage, false);

    console.log("CallButton widget injected successfully");
}
