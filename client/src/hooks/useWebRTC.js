import { useState, useEffect, useRef, useCallback } from "react";
import SimplePeer from "simple-peer";

export const useWebRTC = (lobbyId, userId, socket) => {
    const [streams, setStreams] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);

    const localStreamRef = useRef(null);
    const peersRef = useRef({});

    const cleanup = useCallback(() => {
        Object.values(peersRef.current).forEach(peer => peer?.destroy());
        peersRef.current = {};

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }

        setStreams([]);
    }, []);

    // 🎤 JOIN VOICE (MUST BE USER CLICK)
    const joinVoice = useCallback(async () => {
        if (localStreamRef.current) return true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            localStreamRef.current = stream;
            stream.getAudioTracks()[0].enabled = true;
            setIsMuted(false);

            return true;
        } catch (err) {
            console.error("Mic error:", err);
            return false;
        }
    }, []);

    // Helper function to create peer connections
    const createPeer = useCallback((targetId, initiator) => {
        if (!socket || !userId || !localStreamRef.current) {
            console.error("Cannot create peer: missing dependencies");
            return null;
        }

        const peer = new SimplePeer({
            initiator,
            trickle: false,
            stream: localStreamRef.current,
            config: { 
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:stun1.l.google.com:19302" }
                ] 
            }
        });

        peer.on("signal", signal => {
            socket.emit("signal_voice", {
                senderId: userId,
                targetId,
                signalData: signal
            });
        });

        peer.on("stream", stream => {
            console.log("Received stream from", targetId);
            setStreams(prev => {
                // Prevent duplicate streams
                if (prev.some(s => s.peerId === targetId)) {
                    return prev;
                }
                return [...prev, { peerId: targetId, stream }];
            });
        });

        peer.on("connect", () => console.log("✅ Peer connected:", targetId));
        peer.on("close", () => console.log("❌ Peer closed:", targetId));
        peer.on("error", err => console.error("Peer error with", targetId, ":", err));

        return peer;
    }, [socket, userId]);

    // 🔁 SIGNAL HANDLING
    useEffect(() => {
        if (!socket) return;

        const handleSignal = ({ senderId, signalData }) => {
            if (!localStreamRef.current) {
                console.warn("Received signal but no local stream");
                return;
            }

            let peer = peersRef.current[senderId];
            if (!peer) {
                console.log("Creating peer for incoming signal from", senderId);
                peer = createPeer(senderId, false);
                if (peer) {
                    peersRef.current[senderId] = peer;
                }
            }
            
            if (peer) {
                try {
                    peer.signal(signalData);
                } catch (err) {
                    console.error("Error signaling peer", senderId, ":", err);
                }
            }
        };

        socket.on("signal_voice", handleSignal);
        return () => socket.off("signal_voice", handleSignal);
    }, [socket, createPeer]);

    // 👥 SYNC PEERS
    const syncPeers = useCallback((participants) => {
        if (!localStreamRef.current || !socket || !userId) {
            console.warn("Cannot sync peers: not ready");
            return;
        }

        const participantIds = participants.map(p => p.userId);
        
        // Create new peer connections for new participants
        participants.forEach(p => {
            const targetId = p.userId;
            if (targetId === userId) return; // Skip self
            if (peersRef.current[targetId]) return; // Already connected

            // Determine who initiates based on user ID comparison for consistency
            const initiator = userId > targetId;
            if (initiator) {
                console.log("Initiating connection to", targetId);
                const peer = createPeer(targetId, true);
                if (peer) {
                    peersRef.current[targetId] = peer;
                }
            }
        });

        // Clean up peers that are no longer in the lobby
        Object.keys(peersRef.current).forEach(id => {
            if (!participantIds.includes(id)) {
                console.log("Removing peer", id);
                peersRef.current[id]?.destroy();
                delete peersRef.current[id];
                setStreams(prev => prev.filter(s => s.peerId !== id));
            }
        });
    }, [userId, socket, createPeer]);

    // 🔇 MUTE
    const toggleMute = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
    }, []);

    // 🎧 DEAFEN
    const toggleDeafen = useCallback(() => setIsDeafened(v => !v), []);

    return {
        joinVoice,
        cleanup,
        streams,
        isMuted,
        isDeafened,
        toggleMute,
        toggleDeafen,
        syncPeers
    };
};
