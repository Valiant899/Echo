import React, { useState, useRef, useEffect, useCallback, useMemo, forwardRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiUsers, FiCopy, FiLink, FiX, FiVideoOff, FiUser, FiVolumeX, FiShield, FiMic } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { Track, RoomEvent } from 'livekit-client';
import PropTypes from 'prop-types';
import { useLiveKit } from '../contexts/LiveKitContext';
import {
  db,
  auth,
  doc,
  getDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  increment,
  getFunctions,
  httpsCallable
} from "../firebase";
import ControlBar from "../components/ControlBar/ControlBar";
import HostControlBar from "../components/ControlBar/HostControlBar";

const SpeakerQueue = ({ room, user, isHost, handleSpeakerRequest }) => {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (!room) return;

    // Listen for speaker requests in Firestore
    const requestsRef = collection(db, "rooms", room.name, "speakerRequests");
    const unsubscribe = onSnapshot(requestsRef, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQueue(requests);
    });

    // Handle LiveKit data channel for real-time notifications
    const handleQueueUpdate = (payload) => {
      if (payload.topic === 'speaker-request') {
        toast.info(`${payload.data.name} wants to speak`);
      }
    };

    room.on(RoomEvent.DataReceived, handleQueueUpdate);

    return () => {
      unsubscribe();
      room.off(RoomEvent.DataReceived, handleQueueUpdate);
    };
  }, [room]);

  const requestToSpeak = useCallback(async () => {
    try {
      const requestsRef = doc(db, "rooms", room.name, "speakerRequests", user.uid);
      await setDoc(requestsRef, {
        userId: user.uid,
        name: user.displayName || `User_${user.uid.slice(0, 4)}`,
        requestedAt: serverTimestamp()
      });
      room.localParticipant.publishData('speaker-request', {
        userId: user.uid,
        name: user.displayName
      });
      toast.success("Speaker request sent");
    } catch (error) {
      console.error("Speaker request error:", error);
      toast.error("Failed to send speaker request");
    }
  }, [room, user]);

  return (
    <div style={{
      position: "absolute",
      bottom: "100px",
      left: "20px",
      backgroundColor: "#1e1e1e",
      padding: "1rem",
      borderRadius: "8px",
      zIndex: 10,
      maxWidth: "200px"
    }}>
      {!isHost && (
        <button 
          onClick={requestToSpeak}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "#4da6ff",
            color: "#e0e0e0",
            cursor: "pointer",
            width: "100%",
            marginBottom: "0.5rem"
          }}
        >
          Request Mic
        </button>
      )}
      {queue.length > 0 && (
        <div>
          <h4 style={{ color: "#e0e0e0", margin: "0 0 0.5rem" }}>Speaker Requests</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {queue.map(request => (
              <li key={request.id} style={{ color: "#e0e0e0", margin: "0.25rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{request.name}</span>
                {isHost && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button 
                      onClick={() => handleSpeakerRequest(request.userId, true)}
                      style={{ padding: "0.25rem 0.5rem", backgroundColor: "#28a745", border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer" }}
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleSpeakerRequest(request.userId, false)}
                      style={{ padding: "0.25rem 0.5rem", backgroundColor: "#dc3545", border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer" }}
                    >
                      Deny
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

SpeakerQueue.propTypes = {
  room: PropTypes.object,
  user: PropTypes.object.isRequired,
  isHost: PropTypes.bool.isRequired,
  handleSpeakerRequest: PropTypes.func.isRequired
};

const VideoTrack = forwardRef(({ track, isLocal = false }, ref) => {
  const videoRef = useRef(null);
  ref = ref || videoRef;

  useEffect(() => {
    if (ref.current && track) {
      track.attach(ref.current);
    }

    return () => {
      if (ref.current && track) {
        track.detach(ref.current);
      }
    };
  }, [track, ref]);

  return (
    <video 
      ref={ref} 
      muted={isLocal}
      style={{
        width: isLocal ? "160px" : "100%",
        height: isLocal ? "90px" : "100%",
        objectFit: "cover",
        transform: isLocal ? "scaleX(-1)" : "none",
        borderRadius: isLocal ? "8px" : "0"
      }}
    />
  );
});

VideoTrack.propTypes = {
  track: PropTypes.object.isRequired,
  isLocal: PropTypes.bool
};

const RoomView = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { room, participants, isConnected, connect, disconnect } = useLiveKit();
  const functions = getFunctions();

  // Refs
  const cleanupRef = useRef({});

  // State
  const [muted, setMuted] = useState(true); // Start muted for safety
  const [cameraOff, setCameraOff] = useState(true); // Start with camera off
  const [isConnecting, setIsConnecting] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [dbParticipants, setDbParticipants] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteTracks, setRemoteTracks] = useState([]);
  const [activeSpeakers, setActiveSpeakers] = useState([]);

  // Colors
  const colors = useMemo(() => ({
    darkBg: "#121212",
    panelBg: "#1e1e1e",
    accent: "#4da6ff",
    accentHover: "#3a8de3",
    textLight: "#e0e0e0",
    textMuted: "#a0a0a0",
    danger: "#dc3545",
    dangerHover: "#c82333",
    success: "#28a745",
    warning: "#ffc107",
    neutralBg: "#2a2a2a",
    neutralBorder: "#3f3f3f"
  }), []);

  // Get available media devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAvailableDevices(devices);
      } catch (error) {
        console.error("Device enumeration error:", error);
        setMediaError("Failed to enumerate media devices");
      }
    };
    getDevices();
  }, []);

  // Check authentication and verification status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        toast.error("Please log in to join rooms");
        navigate("/login", { state: { from: `/room/${roomId}` } });
        return;
      }

      if (!currentUser.emailVerified) {
        toast.error("Please verify your email before joining rooms");
        navigate("/verify-email");
        return;
      }

      setUser(currentUser);
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, [navigate, roomId]);

  // Connect to room
  const connectToRoom = useCallback(async () => {
    setIsConnecting(true);
    try {
      const generateToken = httpsCallable(functions, 'generateMediaToken');
      const { data } = await generateToken({ 
        roomName: roomId,
        identity: user.uid
      });
      
      await connect(roomId, user.uid, data.token);
    } catch (error) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Connection failed');
      navigate("/");
    } finally {
      setIsConnecting(false);
    }
  }, [user, roomId, connect, navigate]);

  // Initialize room
  const initializeRoom = useCallback(async (userId) => {
    const roomRef = doc(db, "rooms", roomId);
    try {
      const roomSnapshot = await getDoc(roomRef);
      
      if (!roomSnapshot.exists()) {
        throw new Error("Room doesn't exist");
      }
      
      const roomData = roomSnapshot.data();
      setRoomData(roomData);
      setIsHost(roomData.createdBy === userId);
      return { success: true };
      
    } catch (error) {
      console.error("Room access error:", error);
      throw error;
    }
  }, [roomId]);

  // Initialize connection
  const initializeConnection = useCallback(async (userId) => {
    if (!userId) {
      toast.error("Initialization failed: Missing user");
      return;
    }

    setLoading(true);
    try {
      const { success } = await initializeRoom(userId);
      if (!success) return;
      await connectToRoom();

      const roomRef = doc(db, "rooms", roomId);
      cleanupRef.current.participantsUnsub = onSnapshot(
        collection(roomRef, "participants"),
        (snapshot) => {
          const participantsData = snapshot.docs
            .filter(doc => !doc.data().leftAt)
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
          setDbParticipants(participantsData);
        },
        (error) => {
          console.error("Participants snapshot error:", error);
          toast.error("Error fetching participants");
        }
      );

      cleanupRef.current.roomUnsub = onSnapshot(roomRef, (doc) => {
        if (doc.exists()) {
          setRoomData(doc.data());
        }
      });
    } catch (error) {
      console.error("Connection initialization error:", error);
      toast.error(error.message || "Failed to initialize connection");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [initializeRoom, connectToRoom, roomId, navigate]);

  // Handle local tracks
  useEffect(() => {
    if (!room) return;
    
    const updateTracks = () => {
      setLocalTracks([
        ...room.localParticipant.audioTracks.values(),
        ...room.localParticipant.videoTracks.values()
      ]);
    };
    
    room.on(RoomEvent.LocalTrackPublished, updateTracks);
    room.on(RoomEvent.LocalTrackUnpublished, updateTracks);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, updateTracks);
      room.off(RoomEvent.LocalTrackUnpublished, updateTracks);
    };
  }, [room]);

  // Handle remote tracks
  const remoteTracksMemo = useMemo(() => {
    const tracks = [];
    participants.forEach(participant => {
      const participantTracks = [
        ...Array.from(participant.audioTracks.values()),
        ...Array.from(participant.videoTracks.values())
      ];
      tracks.push(...participantTracks);
    });
    return tracks;
  }, [participants]);

  useEffect(() => {
    setRemoteTracks(remoteTracksMemo);
  }, [remoteTracksMemo]);

  // Handle active speakers
  useEffect(() => {
    if (!room) return;

    const handleActiveSpeakers = (speakers) => {
      setActiveSpeakers(speakers.map(s => s.sid));
    };

    room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakers);

    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakers);
    };
  }, [room]);

  // Handle media device changes
  useEffect(() => {
    if (!room) return;

    const handleDeviceChange = async () => {
      try {
        await room.localParticipant.setMicrophoneEnabled(!muted);
        await room.localParticipant.setCameraEnabled(!cameraOff);
        setMediaError(null);
        // Update Firestore participant document
        const participantRef = doc(db, "rooms", roomId, "participants", user.uid);
        await updateDoc(participantRef, {
          isMuted: muted,
          cameraOff: cameraOff,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Media error:", error);
        setMediaError(getFriendlyMediaError(error));
      }
    };

    handleDeviceChange();
  }, [room, muted, cameraOff, roomId, user]);

  // Handle speaker requests
  const handleSpeakerRequest = useCallback(async (userId, approve) => {
    if (!isHost) return;

    try {
      const participantRef = doc(db, "rooms", roomId, "participants", userId);
      const requestRef = doc(db, "rooms", roomId, "speakerRequests", userId);
      const batch = writeBatch(db);
      
      batch.update(participantRef, {
        isSpeaker: approve,
        updatedAt: serverTimestamp()
      });
      batch.delete(requestRef);

      await batch.commit();

      if (room) {
        room.localParticipant.publishData('speaker-response', {
          userId,
          approved: approve
        });
      }

      toast.success(approve ? "Speaker request approved" : "Speaker request denied");
    } catch (error) {
      console.error("Speaker request error:", error);
      toast.error("Failed to update speaker status");
    }
  }, [isHost, roomId, room]);

  // Update participant settings
  const updateParticipant = useCallback(async (participantId, updates) => {
    try {
      const participantRef = doc(db, "rooms", roomId, "participants", participantId);
      await updateDoc(participantRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      if (room && updates.isMuted !== undefined) {
        room.localParticipant.publishData('moderation:mute', {
          participantId,
          muted: updates.isMuted
        });
      }
    } catch (error) {
      console.error("Failed to update participant:", error);
      toast.error("Failed to update participant settings");
    }
  }, [roomId, room]);

  // Copy room link
  const copyRoomLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`)
      .then(() => {
        toast.success("Room link copied!");
        setShowInviteModal(false);
      })
      .catch(() => toast.error("Failed to copy link"));
  }, [roomId]);

  // Leave room handler
  const leaveRoom = useCallback(async () => {
    try {
      if (user?.uid) {
        const batch = writeBatch(db);
        const roomRef = doc(db, "rooms", roomId);
        const participantRef = doc(roomRef, "participants", user.uid);
        const requestRef = doc(roomRef, "speakerRequests", user.uid);
        
        batch.update(roomRef, {
          currentListeners: increment(-1),
          updatedAt: serverTimestamp()
        });
        
        batch.update(participantRef, { 
          leftAt: serverTimestamp(),
          isSpeaker: false
        });
        
        batch.delete(requestRef);
        
        await batch.commit();
      }
      
      await disconnect();
      navigate("/");
    } catch (error) {
      console.error("Leave error:", error);
      toast.error("Error leaving room");
    }
  }, [disconnect, navigate, roomId, user]);

  // Helper: Get user-friendly media error
  const getFriendlyMediaError = (error) => {
    if (error.name === 'NotAllowedError') {
      return "Please allow microphone/camera access";
    } else if (error.name === 'NotFoundError') {
      return "No media devices found";
    } else if (error.name === 'OverconstrainedError') {
      return "Couldn't match device requirements";
    }
    return "Media device error";
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      Object.values(cleanupRef.current).forEach(unsub => unsub?.());
      if (isConnected) {
        disconnect();
      }
    };
  }, [disconnect, isConnected]);

  // Initialize connection when auth is verified
  useEffect(() => {
    if (authChecked && user?.uid) {
      initializeConnection(user.uid);
    }
  }, [authChecked, user, initializeConnection]);

  if (!authChecked || loading || isConnecting) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: colors.darkBg,
          color: colors.textLight
        }}
      >
        <motion.div
          animate={{ 
            rotate: [0, 360],
            transition: { 
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }
          }}
          style={{
            width: "40px",
            height: "40px",
            border: `4px solid ${colors.accent}`,
            borderTopColor: "transparent",
            borderRadius: "50%"
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.darkBg,
        color: colors.textLight,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* Header */}
      <div style={{
        padding: "1rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {isHost && (
            <motion.div
              style={{
                background: colors.accent,
                padding: "0.25rem 0.5rem",
                borderRadius: "4px",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
              whileHover={{ scale: 1.05 }}
            >
              <FiShield size={14} /> Host
            </motion.div>
          )}
          <h3 style={{ margin: 0 }}>{roomData?.title || `Room ${roomId.slice(0, 5)}`}</h3>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <motion.button
            onClick={() => setShowParticipants(!showParticipants)}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              borderRadius: "4px",
              padding: "0.5rem 1rem",
              color: colors.textLight,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer"
            }}
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
          >
            <FiUsers size={16} />
            <span>{dbParticipants.length} online</span>
          </motion.button>

          <motion.button
            onClick={() => setShowInviteModal(true)}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              borderRadius: "4px",
              padding: "0.5rem 1rem",
              color: colors.textLight,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer"
            }}
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
          >
            <FiLink size={16} />
            <span>Invite</span>
          </motion.button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        position: "relative",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gridAutoRows: "minmax(200px, 1fr)",
        gap: "1rem",
        padding: "1rem",
        overflowY: "auto"
      }}>
        {/* Media Error Banner */}
        {mediaError && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "4rem",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: colors.neutralBg,
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: `1px solid ${colors.neutralBorder}`,
              color: colors.textLight,
              zIndex: 15,
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              maxWidth: "80%",
              fontSize: "0.9rem",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }}
          >
            <p style={{ margin: 0 }}>{mediaError}</p>
            <motion.button
              onClick={() => {
                setMediaError(null);
                room?.localParticipant.enableCameraAndMicrophone();
              }}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "4px",
                border: `1px solid ${colors.neutralBorder}`,
                backgroundColor: "transparent",
                color: colors.textLight,
                cursor: "pointer",
                fontSize: "0.85rem"
              }}
              whileHover={{ backgroundColor: colors.neutralBorder }}
              whileTap={{ scale: 0.95 }}
            >
              Retry
            </motion.button>
            <motion.button
              onClick={() => setMediaError(null)}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "4px",
                border: `1px solid ${colors.neutralBorder}`,
                backgroundColor: "transparent",
                color: colors.textLight,
                cursor: "pointer",
                fontSize: "0.85rem"
              }}
              whileHover={{ backgroundColor: colors.neutralBorder }}
              whileTap={{ scale: 0.95 }}
            >
              Continue
            </motion.button>
          </motion.div>
        )}

        {/* Remote Videos */}
        {remoteTracks.map(track => (
          <div key={track.sid} style={{
            position: "relative",
            border: activeSpeakers.includes(track.participant?.sid) 
              ? `2px solid ${colors.accent}` 
              : "none",
            borderRadius: "8px",
            overflow: "hidden"
          }}>
            <VideoTrack track={track} />
            <div style={{
              position: "absolute",
              bottom: "8px",
              left: "8px",
              background: "rgba(0,0,0,0.6)",
              color: colors.textLight,
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "0.8rem"
            }}>
              {track.participant?.identity}
            </div>
          </div>
        ))}

        {!remoteTracks.length && (
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            textAlign: "center",
            padding: "2rem",
            backgroundColor: colors.panelBg,
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }}>
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                transition: { 
                  duration: 2,
                  repeat: Infinity 
                }
              }}
            >
              <FiUsers size={64} color={colors.textMuted} />
            </motion.div>
            <h3 style={{ color: colors.textLight }}>
              {isHost ? "Waiting for participants..." : "Connecting to host..."}
            </h3>
            <p style={{ color: colors.textMuted, maxWidth: "400px" }}>
              {isHost 
                ? "Share the room link to invite others to join your video call" 
                : "Make sure your microphone and camera are enabled to participate"}
            </p>
          </div>
        )}

        {/* Local Video Preview */}
        <motion.div
          style={{
            position: "absolute",
            bottom: "100px",
            right: "20px",
            width: "160px",
            height: "90px",
            borderRadius: "8px",
            overflow: "hidden",
            border: `2px solid ${isConnected ? colors.accent : colors.danger}`,
            zIndex: 10,
            backgroundColor: colors.panelBg,
            boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
            transition: "all 0.3s ease"
          }}
          whileHover={{ scale: 1.03 }}
        >
          {!cameraOff && localTracks.some(t => t.kind === Track.Kind.Video) ? (
            <VideoTrack 
              track={localTracks.find(t => t.kind === Track.Kind.Video)} 
              isLocal
            />
          ) : (
            <div style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px"
            }}>
              <FiVideoOff size={24} color={colors.textMuted} />
              <span style={{ fontSize: "0.8rem", color: colors.textMuted }}>Camera off</span>
            </div>
          )}
          <div style={{
            position: "absolute",
            top: "4px",
            left: "4px",
            background: muted ? colors.danger : colors.success,
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            border: `1px solid ${colors.darkBg}`
          }} />
        </motion.div>

        {/* Speaker Queue */}
        {room && user && (
          <SpeakerQueue 
            room={room} 
            user={user} 
            isHost={isHost} 
            handleSpeakerRequest={handleSpeakerRequest}
          />
        )}
      </div>

      {/* Participants Panel */}
      <AnimatePresence>
        {showParticipants && (
          <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            transition={{ type: "spring", damping: 25 }}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "300px",
              backgroundColor: colors.panelBg,
              zIndex: 20,
              padding: "1rem",
              boxShadow: "-4px 0 10px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem"
            }}>
              <h3 style={{ margin: 0 }}>Participants</h3>
              <button 
                onClick={() => setShowParticipants(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.textMuted,
                  cursor: "pointer"
                }}
              >
                <FiX size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {dbParticipants.length > 0 ? (
                dbParticipants.map(participant => (
                  <motion.div 
                    key={participant.id} 
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "0.75rem 0",
                      borderBottom: `1px solid ${colors.darkBg}`,
                      cursor: "pointer"
                    }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: "0.75rem",
                      position: "relative"
                    }}>
                      <FiUser size={16} />
                      {participant.isHost && (
                        <div style={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: colors.accent,
                          border: `1px solid ${colors.darkBg}`
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span>{participant.name}</span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {participant.isMuted && <FiVolumeX size={14} color={colors.danger} />}
                          {participant.cameraOff && <FiVideoOff size={14} color={colors.danger} />}
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: "0.8rem",
                        color: colors.textMuted,
                        display: "flex",
                        gap: "0.5rem"
                      }}>
                        <span>{participant.isHost ? "Host" : participant.isSpeaker ? "Speaker" : "Listener"}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div style={{ 
                  padding: "1rem",
                  textAlign: "center",
                  color: colors.textMuted,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: "4px"
                }}>
                  No other participants
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Bar */}
      {isHost ? (
        <HostControlBar
          muted={muted}
          setMuted={setMuted}
          cameraOff={cameraOff}
          setCameraOff={setCameraOff}
          chatOpen={chatOpen}
          setChatOpen={setChatOpen}
          leaveRoom={leaveRoom}
          colors={colors}
          setShowInviteModal={setShowInviteModal}
          participants={dbParticipants.filter(p => !p.leftAt)}
          updateParticipant={updateParticipant}
        />
      ) : (
        <ControlBar
          muted={muted}
          setMuted={setMuted}
          cameraOff={cameraOff}
          setCameraOff={setCameraOff}
          chatOpen={chatOpen}
          setChatOpen={setChatOpen}
          leaveRoom={leaveRoom}
          colors={colors}
          setShowInviteModal={setShowInviteModal}
        />
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              zIndex: 200,
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                backgroundColor: colors.panelBg,
                borderRadius: "12px",
                padding: "2rem",
                maxWidth: "500px",
                width: "90%",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                position: "relative"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  background: "none",
                  border: "none",
                  color: colors.textMuted,
                  cursor: "pointer"
                }}
              >
                <FiX size={20} />
              </button>
              <h2 style={{ marginTop: 0 }}>Invite Participants</h2>
              <p style={{ color: colors.textMuted }}>
                Share this link with others to join your room:
              </p>
              
              <div style={{
                display: "flex",
                gap: "0.5rem",
                margin: "1.5rem 0"
              }}>
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/room/${roomId}`}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "6px",
                    border: `1px solid ${colors.darkBg}`,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: colors.textLight,
                    cursor: "text"
                  }}
                  onClick={(e) => e.target.select()}
                />
                <motion.button
                  onClick={copyRoomLink}
                  style={{
                    padding: "0 1.5rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: colors.accent,
                    color: colors.textLight,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                  whileHover={{ backgroundColor: colors.accentHover }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiCopy size={16} />
                  Copy
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer 
        position="bottom-right" 
        autoClose={3000}
        toastStyle={{
          backgroundColor: colors.panelBg,
          color: colors.textLight
        }}
      />
    </div>
  );
};

RoomView.propTypes = {};

export default RoomView;