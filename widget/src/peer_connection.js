const DTMF_DURATION = 500;
const DTMF_TONE_GAP = 50;

export default class PeerConnection {
    _peerConnection = null;
    iceCandidateCallback = null;
    negotiationNeededCallback = null;
    addStreamCallback = null;
    errorCallback = null;
    localStream = null;
    remoteStream = null;
    statsInterval = null;
    isNoErrors = true;
    _dtmfSender = null;

    constructor({iceCandidateCallback, negotiationNeededCallback, addStreamCallback, errorCallback}) {
        this._peerConnection = null;
        this.iceCandidateCallback = iceCandidateCallback;
        this.negotiationNeededCallback = negotiationNeededCallback;
        this.addStreamCallback = addStreamCallback;
        this.errorCallback = errorCallback;
        this.isNoErrors = true;
        this.localStream = null;
        this.remoteStream = null;
        this.statsInterval = null;
    }

    async create() {
        const pc = new RTCPeerConnection({
            /**
            * iceServers: [{
            * urls: 'stun:stun.l.google.com:19302',
            * }]
            */
        iceServers: [
        /**
        This are free STUN/TURN servers to overcome firewall issues with VF corporate laptops.
        Only to be used for dev & test purposes !!
        */
            {
                urls: 'stun:stun.relay.metered.ca:80',
            },
            {
                urls: 'turn:a.relay.metered.ca:80',
                username: '19b0a582687630df6a644f86',
                credential: 'j8zQc1GWwCvmduuZ',
            },
            {
                urls: 'turn:a.relay.metered.ca:80?transport=tcp',
                username: '19b0a582687630df6a644f86',
                credential: 'j8zQc1GWwCvmduuZ',
            },
            {
                urls: 'turn:a.relay.metered.ca:443',
                username: '19b0a582687630df6a644f86',
                credential: 'j8zQc1GWwCvmduuZ',
            },
            {
                urls: 'turn:a.relay.metered.ca:443?transport=tcp',
                username: '19b0a582687630df6a644f86',
                credential: 'j8zQc1GWwCvmduuZ',
            },
            ],
        })
        pc.onicecandidate = (event) => this.handleIceCandidate(event);
        pc.onnegotiationneeded = (event) => this.handleNegotiationNeeded(event);
        pc.ontrack = (event) => this.handleTrack(event)
        this._peerConnection = pc;
        this.isNoErrors = true;
    }

    close() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        if (this._peerConnection) {
            this._peerConnection.close();
            this._peerConnection.onconnectionstatechange = null;
            this._peerConnection.ondatachannel = null;
            this._peerConnection.onicecandidate = null;
            this._peerConnection = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => track.stop());
            this.localStream = null;
        }
        if (this.remoteStream) {
            this.remoteStream.getTracks().forEach((track) => track.stop());
            this.remoteStream = null;
        }
    }

    addTracks(stream) {
        for (let i = 0; i < stream.getTracks().length; i += 1) {
            const track = stream.getTracks()[i];
            this._peerConnection?.addTrack(track, stream);
        }
    }

    async createOffer() {
        const offer = await this._peerConnection?.createOffer();
        await this._peerConnection?.setLocalDescription(offer);
    }

    async createAnswer() {
        const answer = await this._peerConnection?.createAnswer();
        await this._peerConnection?.setLocalDescription(answer);
    }

    getLocalDescription() {
        return this._peerConnection?.localDescription;
    }

    async setRemoteDescription(jsep) {
        const remoteDescription = new RTCSessionDescription(jsep);
        await this._peerConnection?.setRemoteDescription(remoteDescription);
    }

    async setLocalStreams(media) {
        try {
            media.video = false;
            const stream = await navigator.mediaDevices.getUserMedia(media);
            this.localStream = stream;//a new
            this.addTracks(stream);
            this.addStreamCallback(stream, false);
        } catch (e) {
            this.isNoErrors = false;
            this.errorCallback(new Error(e.message));
        }
    }

    handleIceCandidate(event) {
        console.log('[PC] handle IceCandidate event:', event);
        this.iceCandidateCallback(event.candidate);
    }

    handleTrack(event) {
        console.log('[PC] handle Track event:', event);
        if (event.streams !== null && event.streams.length > 0) {
            this.remoteStream = event.streams[0];
            this.addStreamCallback(event.streams[0], true);
        }
    }

    handleNegotiationNeeded(event) {
        console.log('[PC] handle NegotiationNeeded event:', event);
        this.negotiationNeededCallback(event);
    }

    initGetStats(id, interval) {
        this.statsInterval = setInterval(() => {
            this._peerConnection?.getStats(null).then((stats) => {
                const rec = this.defStatRecord;
                rec.id = id;
                this.defStatRecord.index++;
                let video = this.defStatVideoRecord;
                let video_exist = false;
                let rtt = null;
                stats.forEach((report) => {
                    switch (report.type) {
                        case 'inbound-rtp':
                            switch (report.kind) {
                                case 'audio':
                                    rec.audio.timestamp = report.timestamp;
                                    rec.audio.jitter = report.jitter * 1000;
                                    rec.audio.bytesReceived = report.bytesReceived;
                                    rec.audio.packetsReceived = report.packetsReceived;
                                    rec.audio.packetsLost = report.packetsLost;
                                    break;
                                case 'video':
                                    video_exist = true;
                                    video.timestamp = report.timestamp;
                                    video.jitter = report.jitter * 1000;
                                    video.bytesReceived = report.bytesReceived;
                                    video.packetsReceived = report.packetsReceived;
                                    video.packetsLost = report.packetsLost;
                                    video.frameWidth = report.frameWidth;
                                    video.frameHeight = report.frameHeight;
                                    video.framesPerSecond = report.framesPerSecond;
                                    break;
                            }
                            break
                        case 'remote-inbound-rtp':
                            switch (report.kind) {
                                case 'audio':
                                    rec.audio.rtt = report.roundTripTime;
                                    break;
                                case 'video':
                                    rtt = report.roundTripTime;
                                    break;
                            }
                            break;
                    }
                })
                if (video_exist) {
                    video.rtt = rtt;
                    rec.video = video;
                } else {
                    rec.video = null;
                }
                // Put hi priority message to log
                console.error(`StatRecord##${JSON.stringify(rec)}`);
            })
        }, interval);
    }

    sendDtmf(tones) {
        if (!this._dtmfSender) {
            this._dtmfSender = this._peerConnection?.getSenders()[0].dtmf;
        }
        this._dtmfSender?.insertDTMF(tones, DTMF_DURATION, DTMF_TONE_GAP);
    }

    muteAudio(mute) {
        if (this.localStream) {
            this.localStream.getAudioTracks()[0].enabled = mute;
        }
        if (this.remoteStream) {
            this.remoteStream.getAudioTracks()[0].enabled = mute;
        }
    }
}
  