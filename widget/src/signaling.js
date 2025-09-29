import WebtritSignaling from "@webtrit/webtrit-signaling";
import PeerConnection from "./peer_connection";

const sessionUrl = import.meta.env.VITE_SESSION_URL;
const url = import.meta.env.VITE_SIGNALING_URL;

const callInfinity = -1;
const callDisable = -2;
const delayBeforePcGetStat = 2000;

const constraints = {
  audio: {
    autoGainControl: false,
    echoCancellation: false,
    latency: 0,
    noiseSuppression: false,
    volume: 1.0,
  },
  video: null,
};

export default class Signaling {
  client = null;
  callId = null;
  callTimer = null;
  callEnable = false;
  callOutgoing = null;
  outgoingDuration = null;
  outgoingDeviation = null;
  statsInterval = null;
  statusSpan = "init";
  statusCallback = null;
  line = 0;
  pc = null;
  volume = 1.0;
  numberToCall = null;

  constructor(_numberToCall, _statusCallback) {
    if (_numberToCall && !this.numberToCall) {
      this.numberToCall = _numberToCall;
    }
    if (_statusCallback && !this.statusCallback) {
      this.statusCallback = _statusCallback;
    }

    this.updateStatus("Start");
    this.client = new WebtritSignaling({
      eventCallback: async (event) => {
        switch (event.type) {
          case "in":
            break;
          case "out":
            console.log("OutgoingCall event", event);
            break;
          case "ans":
            console.log("AcceptedCall event", event);
            if (this.callOutgoing && event.call_id === this.callId) {
              this.accepted(event.jsep).then(() => {
                this.updateStatus("Accepted");
                console.info(`[${this.callId}] Accepted`);
                if (this.outgoingDuration > callInfinity) {
                  const timeout = this.getRandomMillisecond(
                    this.outgoingDuration,
                    this.outgoingDeviation
                  );
                  console.info(
                    `[${this.callId}] Set outgoing call timeout to: ${timeout}`
                  );
                  this.callTimer = setTimeout(this.hangup, timeout);
                }
                let interval = 0;
                if (delayBeforePcGetStat > this.statsInterval * 1000) {
                  interval = delayBeforePcGetStat - this.statsInterval * 1000;
                }

                setTimeout(() => {
                  if (this.pc !== null && this.id !== undefined) {
                    this.pc.initGetStats(this.id, interval);
                  }
                }, interval);
              });
            }
            break;
          case "hangup":
            console.log("HangupCall event", event);
            if (event.call_id === this.callId) {
              this.callHangup();
              this.updateStatus("Disconnected");
            }
            break;
          case "session":
            console.log("Session event", event);
            this.callEnable = event.event === "registered";
            this.updateStatus("Registered");
            await this.startOutgoingCall();
            break;
          case "line":
            console.log("Line event", event);
            this.callOutgoing = null;
            break;
          case "notify":
            console.log("Notify event", event);
            break;
          case "change":
            console.log("ChangeCall event", event);
            this.updateStatus("Changed");
            break;
          default:
            console.warn("Unhandled signaling event:", event);
            break;
        }
      },
      errorCallback: (error) => {
        console.log(`>> errorCallback: ${error}`);
        this.updateStatus("Error");
      },
      disconnectedCallback: (reason, code) => {
        console.log(
          `>> disconnectedCallback: with code: ${code} and reason: ${reason}`
        );
        this.client?.disconnect();
        this.updateStatus("Disconnected");
      },
      connectedCallback: (event) => {
        console.log(`>> connectedCallback: ${event}`);
      },
      handshakeCallback: (event) => {
        console.log("Handshake callback", event);
        if (event.registration !== undefined) {
          console.log("Registration Status: ", event.registration.status);
          if (event.registration.code) {
            const msg = event.registration.reason || "Unknown";
            console.log(
              "Registration With Error: ",
              `${event.registration.code} - ${msg}`
            );
          }
        }
      },
    });
  }

  generateRamdomString(length) {
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  getToken(onSuccess, onError) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", sessionUrl);
    xhr.setRequestHeader("Accept", "application/json"); //Keep accept header.

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            let jsonObject = JSON.parse(xhr.responseText);
            if (jsonObject && jsonObject.token && jsonObject.token.length) {
              onSuccess(jsonObject.token);
            } else {
              onError(); // Handle cases where token is missing
            }
          } catch (error) {
            console.error("Error parsing JSON:", error);
            onError(); // Handle JSON parsing errors
          }
        } else {
          onError();
        }
      }
    };

    xhr.onerror = function () {
      onError(); //Handle network errors.
    };

    xhr.send(); // Send the GET request
  }

  async connect() {
    this.updateStatus("Start");
    console.log(`CallButtonController: connect`);
    this.muteAudio(false);
    this.getToken(
      (token) => {
        console.log(this.client);
        this.client.connect({ url, token });
      },
      () => {
        this.updateStatus("Disconnected");
      }
    );
  }

  disconnect() {
    console.log("CallButtonController: disconnect");
  }

  setStream(stream, isRemote) {
    if (isRemote) {
      console.log("Try set Remote stream", stream);
      const remoteView = document.getElementById("remoteStream");
      if (remoteView) {
        remoteView.srcObject = stream;
      }
      console.log("Set Remote stream", stream);
    } else {
      console.log("Try set Local stream", stream);
      const localView = document.getElementById("localStream");
      if (localView) {
        localView.srcObject = stream;
      }
      console.log("Set Local stream", stream);
    }
  }

  async initPeerConnection() {
    return new PeerConnection({
      iceCandidateCallback: (candidate) => {
        this.client
          ?.execute("ice_trickle", {
            line: this.line,
            candidate,
          })
          .then(() => {
            console.info("Sent candidate:", candidate);
          })
          .catch((e) => console.error("Send candidate:", e));
      },
      negotiationNeededCallback: (event) => {
        console.log("NegotiationNeededCallback:", event);
      },
      addStreamCallback: (stream, isRemote) => {
        this.setStream(stream, isRemote || false);
      },
      errorCallback: (error) => {
        console.log("Error callback:", error);
        this.client?.disconnect();
      },
    });
  }

  async call() {
    try {
      this.callOutgoing = true;
      this.callId = this.client?.generateCallId();
      this.pc = await this.initPeerConnection();
      await this.pc.create();
      await this.pc.setLocalStreams({ ...constraints, volume: this.volume });
      await this.pc.createOffer();
      const sdp = this.pc.getLocalDescription();
      if (this.pc.isNoErrors) {
        await this.client?.execute("outgoing_call", {
          line: this.line,
          call_id: this.callId,
          number: this.numberToCall,
          jsep: sdp,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async startOutgoingCall() {
    if (this.callEnable && this.outgoingDuration > callDisable) {
      if (this.callId === null) {
        console.info("Start a call");
        await this.call();
      }
    }
  }

  wtClearTimeout() {
    if (this.callTimer) {
      clearTimeout(this.callTimer);
      this.callTimer = null;
    }
  }

  async callHangup() {
    this.wtClearTimeout();
    this.callId = null;
    this.pc?.close();
    this.pc = null;
    this.client?.disconnect();
  }

  async accepted(sdp) {
    try {
      if (sdp) {
        await this.pc.setRemoteDescription(sdp);
      }
    } catch (e) {
      console.error(e);
    }
  }

  hangup() {
    this.client
      ?.execute("hangup", {
        line: this.line,
        call_id: this.callId,
      })
      .then(() => {
        this.callHangup();
        this.updateStatus("Disconnected");
      });
  }

  updateTarget(newTarget) {
    console.log("Updating target number to:", newTarget);
    this.numberToCall = newTarget;
  }

  updateStatus(status) {
    this.statusSpan = status;
    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }
  isCallActive() {
    return this.callId !== null;
  }

  getRandomMillisecond(duration, deviation) {
    const min = Math.ceil(duration - deviation);
    const max = Math.floor(duration + deviation);
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
  }

  sendDtmf(tones) {
    this.pc?.sendDtmf(tones);
  }

  muteAudio(mute) {
    this.pc?.muteAudio(mute);
  }
}
