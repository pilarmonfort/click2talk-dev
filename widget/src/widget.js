import { createApp } from "vue";
import App from "./App.vue";
import "./styles/widget.css?inline";
import Signaling from "./signaling";

// Create Vue App
createApp(App).mount("#app");

// Retrieve the number from the data attribute for both Sales and Service targets
const configSalesElement = document.getElementById("callWidgetConfigSales");
const TargetToCallSales = configSalesElement?.dataset?.target;

const configServiceElement = document.getElementById("callWidgetConfigService");
const TargetToCallService = configServiceElement?.dataset?.target;

let currentTarget = TargetToCallSales;

if (!currentTarget) {
  console.error("Target to call not found in data attribute.");
  currentTarget = TargetToCallSales; // fallback
}

async function handleTargetChange(newTargetSelected) {
  let newTarget = currentTarget;

  // Update new target based on the selected option
  if (newTargetSelected === "Sales") {
    newTarget = TargetToCallSales;
  } else if (newTargetSelected === "Service") {
    newTarget = TargetToCallService;
  }

  // No need to change if the target is already the same
  if (currentTarget === newTarget) return;

  console.log("Target changed to:", newTarget);
  window.webTritSignaling.updateTarget(newTarget);
  currentTarget = newTarget;
}

// Expose `handleTargetChange` and `TargetToCall*` immediately to `window` (ensure availability to iframe)
window.TargetToCallSales = TargetToCallSales;
window.TargetToCallService = TargetToCallService;
window.handleTargetChange = handleTargetChange;

// Function to send the call status to iframe
const funcStatusCallBack = function (status) {
  let element = document.getElementById("widget_iframe_element");
  if (element) {
    element.contentWindow.postMessage(
      {
        type: "status_update",
        data: status,
      },
      "*"
    );
  }
};

// Prevent duplicate widget injection
if (document.getElementById("CallButtonWidget")) {
  console.warn("CallButton widget already injected");
} else {
  // Initialize signaling
  window.webTritSignaling = new Signaling(currentTarget, funcStatusCallBack);

  // Create CallButton Widget
  const divElement = document.createElement("div");
  divElement.id = "CallButtonWidget";
  divElement.className = "callbutton-widget";

  const audioElement = document.createElement("audio");
  audioElement.autoplay = true;
  audioElement.id = "remoteStream";
  audioElement.style.display = "none";
  divElement.appendChild(audioElement);

  const buttonElement = document.createElement("button");
  buttonElement.className = "callbutton";
  buttonElement.addEventListener("click", function () {
    const elem = document.getElementById("widget_iframe_element");
    if (!elem) {
      const iframeElement = document.createElement("iframe");
      iframeElement.src =
        import.meta.env.VITE_WIDGET_URL + "/widgetcontent.html";
      iframeElement.id = "widget_iframe_element";
      iframeElement.allow = "microphone";
      iframeElement.style.display = "block";

      divElement.appendChild(iframeElement);
    } else {
      divElement.removeChild(elem);
    }
  });

  const webcallIcon =
    import.meta.env.VITE_WIDGET_URL + "/src/assets/webcall.svg";
  buttonElement.innerHTML = "<img src=" + webcallIcon + ">";
  divElement.appendChild(buttonElement);
  document.body.appendChild(divElement);

  // Create connection error UI
  const connectionError = document.createElement("div");
  connectionError.id = "connectionerror";
  connectionError.className = "connection-error";
  connectionError.style.display = "none";

  const iconContainer = document.createElement("div");
  iconContainer.className = "icon-container";
  const errorIcon = document.createElement("img");
  errorIcon.src =
    import.meta.env.VITE_WIDGET_URL + "/src/assets/vf-uc-logo.png";
  iconContainer.appendChild(errorIcon);

  const closeButton = document.createElement("div");
  closeButton.className = "close-button";
  const closeIcon = document.createElement("img");
  closeIcon.src = import.meta.env.VITE_WIDGET_URL + "/src/assets/close.svg";
  closeButton.appendChild(closeIcon);
  closeButton.onclick = function () {
    connectionError.style.display = "none";
  };

  const errorTextContainer = document.createElement("div");
  errorTextContainer.className = "error-text-container";
  errorTextContainer.innerText =
    "Sorry, but we can't connect you right now. Please try again later";

  connectionError.appendChild(iconContainer);
  connectionError.appendChild(errorTextContainer);
  connectionError.appendChild(closeButton);
  document.body.appendChild(connectionError);
}

// Message listener for iframe communication
const receiveMessage = function (event) {
  const element = document.getElementById("widget_iframe_element");
  if (event.data === "removetheiframe_success") {
    element?.parentNode?.removeChild(element);
  } else if (event.data === "removetheiframe_failure") {
    element?.parentNode?.removeChild(element);
    const connectionError = document.getElementById("connectionerror");
    connectionError.style.display = "block";
  } else if (event.data === "start_call") {
    window.webTritSignaling.connect();
  } else if (event.data === "end_call") {
    window.webTritSignaling.hangup();
  } else if (event.data === "mute_audio") {
    window.webTritSignaling.muteAudio(true);
  } else if (event.data === "unmute_audio") {
    window.webTritSignaling.muteAudio(false);
  } else if (event.data && event.data.type === "targetChange") {
    console.log("Target change event received:", event.data.target);
    const newTarget = event.data.target;
    window.handleTargetChange(newTarget);
  } else {
    window.webTritSignaling.sendDtmf(event.data);
  }
};
window.addEventListener("message", receiveMessage, false);

console.log("CallButton widget setup complete ✅");
