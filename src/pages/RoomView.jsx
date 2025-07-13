import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import SimplePeer from "simple-peer";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import debounce from "lodash.debounce";
import {
  db,
  auth,
  doc,
  getDoc,
  collection,
  setDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs
} from "../firebase";

import ControlBar from "../components/ControlBar/ControlBar";
import HostControlBar from "../components/ControlBar/HostControlBar";

import {
  FiUsers,
  FiShield
} from "react-icons/fi";

const RoomView = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const isHostRef = useRef(false);

  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [showHostCommands, setShowHostCommands] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const mediaPermissionNotifiedRef = useRef(false);

  // Colors theme
  const colors = {
    darkBg: "#121212",
    panelBg: "#1e1e1e",
    accent: "#4da6ff",
    textLight: "#e0e0e0",
    textMuted: "#aaaaaa",
    danger: "#dc3545",
    success: "#28a745",
    speaker: "#ff7043",
    listener: "#66bb6a",
    accentHover: "#3a8cff",
    dangerHover: "#c82333"
  };

  const sortedParticipants = useMemo(() =>
    [...participants].sort((a, b) => a.name.localeCompare(b.name)),
    [participants]
  );

  // Debounced update to participants state
  const updateParticipants = useCallback(debounce((data) => {
    setParticipants(data);
  }, 300), []);

  const initializeConnection = useCallback(async (userId) => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = localStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.muted = true;
      }
    } catch (error) {
      setMediaError("Camera/microphone access denied");
      if (!mediaPermissionNotifiedRef.current) {
        toast.error("Media permissions required!");
        mediaPermissionNotifiedRef.current = true;
      }
      localStreamRef.current = new MediaStream();
    }

    const roomRef = doc(db, "rooms", roomId);
    const roomSnapshot = await getDoc(roomRef);

    if (!userId) {
      toast.error("User not authenticated");
      navigate("/");
      return;
    }

    // Determine if current user is the caller / creator
    const isCaller = !roomSnapshot.exists();

    if (isCaller) {
      setIsHost(true);
      isHostRef.current = true;

      await setDoc(roomRef, {
        name: `Room ${roomId.slice(0, 5)}`,
        createdAt: serverTimestamp()
      });
    } else {
      setRoomName(roomSnapshot.data().name || `Room ${roomId.slice(0, 5)}`);
    }

    const peer = new SimplePeer({
      initiator: isCaller,
      trickle: true,
      stream: localStreamRef.current
    });
    peerRef.current = peer;

    peer.on("connect", () => setIsConnected(true));
    peer.on("close", () => setIsConnected(false));
    peer.on("error", () => toast.error("Connection error occurred"));

    peer.on("signal", async (data) => {
      if (data.type === "offer" || data.type === "answer") {
        await setDoc(roomRef, { [data.type]: data }, { merge: true });
      } else if (data.candidate) {
        const target = isCaller ? collection(roomRef, "offerCandidates") : collection(roomRef, "answerCandidates");
        await addDoc(target, data);
      }
    });

    peer.on("stream", (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        setIsConnected(true);
      }
    });

    // Listen to room signals
    const roomUnsub = onSnapshot(roomRef, (snapshot) => {
      const data = snapshot.data();
      if (!peer.destroyed) {
        if (!isCaller && data?.offer) peer.signal(data.offer);
        if (isCaller && data?.answer) peer.signal(data.answer);
      }
    });

    // Listen to ICE candidates
    const candidatesCollection = isCaller ? collection(roomRef, "answerCandidates") : collection(roomRef, "offerCandidates");
    const candidatesUnsub = onSnapshot(candidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") peer.signal(change.doc.data());
      });
    });

    // Listen for participants updates
    const participantsUnsub = onSnapshot(collection(roomRef, "participants"), (snapshot) => {
      const participantsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isMuted: doc.data().isMuted || false
      }));

      updateParticipants(participantsData);

      const currentUser = participantsData.find(p => p.userId === userId);
      console.log("Current user data:", currentUser);
      console.log("All participants:", participantsData);

      if (currentUser) {
        const hostStatus = !!currentUser.isHost;
        setIsHost(hostStatus);
        isHostRef.current = hostStatus;
        console.log("Current user host status:", hostStatus);
      } else {
        console.warn("Current user not found in participants list");
        setIsHost(false);
        isHostRef.current = false;
      }
    });

    // Listen for chat messages
    const messagesUnsub = onSnapshot(collection(roomRef, "messages"), (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(messagesData);
    });

    // Check if participant exists in Firestore before adding
    const participantsRef = collection(roomRef, "participants");
    const participantQuery = query(participantsRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(participantQuery);

    if (querySnapshot.empty) {
      // Using setDoc with the userId as document ID to prevent duplicates
      await setDoc(doc(participantsRef, userId), {
        userId,
        name: auth.currentUser?.displayName || `User_${Math.random().toString(36).substring(2, 6)}`,
        joinedAt: serverTimestamp(),
        isSpeaker: isCaller,
        isHost: isCaller,
        isMuted: false
      });
    }

    return () => {
      peer.destroy();
      roomUnsub();
      candidatesUnsub();
      participantsUnsub();
      messagesUnsub();
    };
  }, [roomId, updateParticipants, navigate]);

  // Wait for auth state before initializing
  useEffect(() => {
    const unregister = auth.onAuthStateChanged(user => {
      if (user) {
        console.log("Authenticated user UID:", user.uid);
        initializeConnection(user.uid);
      } else {
        navigate("/");
      }
    });

    return () => unregister();
  }, [initializeConnection, navigate]);

  useEffect(() => {
    return () => {
      peerRef.current?.destroy();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }, [muted]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !cameraOff;
      });
    }
  }, [cameraOff]);

  return (
    <div style={{
      position: "relative",
      width: "100vw",
      height: "100vh",
      backgroundColor: colors.darkBg,
      color: colors.textLight
    }}>
      {isHost && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: colors.accent,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.8rem',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <FiShield size={14} /> Host
        </div>
      )}

      <div id="video-container" style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}>
        {remoteVideoRef.current?.srcObject ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <FiUsers size={48} color={colors.textMuted} />
            <p>Waiting for participants to join...</p>
          </div>
        )}
      </div>

      {isHost ? (
        <HostControlBar
          muted={muted}
          setMuted={setMuted}
          cameraOff={cameraOff}
          setCameraOff={setCameraOff}
          chatOpen={chatOpen}
          setChatOpen={setChatOpen}
          leaveRoom={() => navigate("/")}
          colors={colors}
          setShowInviteModal={setShowInviteModal}
        />
      ) : (
        <ControlBar
          muted={muted}
          setMuted={setMuted}
          cameraOff={cameraOff}
          setCameraOff={setCameraOff}
          chatOpen={chatOpen}
          setChatOpen={setChatOpen}
          leaveRoom={() => navigate("/")}
          colors={colors}
        />
      )}

      <ToastContainer />
    </div>
  );
};

export default RoomView;