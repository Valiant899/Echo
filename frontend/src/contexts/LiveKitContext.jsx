import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

const LiveKitContext = createContext();

export const LiveKitProvider = ({ children }) => {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [localTracks, setLocalTracks] = useState([]);
  const [activeSpeakers, setActiveSpeakers] = useState([]);

  const connectToRoom = useCallback(async ({ roomId, token, displayName, isSpeaker = false }) => {
    try {
      // Disconnect if already connected
      if (room) await disconnectFromRoom();

      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          screenShareEncoding: {
            maxBitrate: 3_000_000,
          },
        }
      });

      // Event handlers
      const handleParticipantConnected = (participant) => {
        setParticipants(prev => [...prev, participant]);
      };

      const handleParticipantDisconnected = (participant) => {
        setParticipants(prev => prev.filter(p => p.sid !== participant.sid));
      };

      const handleDisconnected = () => {
        setIsConnected(false);
        setParticipants([]);
        setLocalTracks([]);
        setActiveSpeakers([]);
      };

      const handleActiveSpeakersChanged = (speakers) => {
        setActiveSpeakers(speakers);
      };

      const handleLocalTrackPublished = (publication) => {
        setLocalTracks(prev => [...prev, publication.track]);
      };

      const handleLocalTrackUnpublished = (publication) => {
        setLocalTracks(prev => prev.filter(t => t.sid !== publication.track?.sid));
      };

      // Setup event listeners
      newRoom
        .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
        .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
        .on(RoomEvent.Disconnected, handleDisconnected)
        .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
        .on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
        .on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

      // Connect to the room
      await newRoom.connect(
        process.env.REACT_APP_LIVEKIT_WS_URL, 
        token,
        {
          autoSubscribe: true,
          publishOnly: !isSpeaker ? '' : 'audio video',
          name: displayName,
        }
      );

      // Set initial state
      setRoom(newRoom);
      setIsConnected(true);
      setParticipants(Array.from(newRoom.participants.values()));
      setActiveSpeakers(newRoom.activeSpeakers);

      // Set initial local tracks
      const tracks = [];
      newRoom.localParticipant.audioTracks.forEach(pub => tracks.push(pub.track));
      newRoom.localParticipant.videoTracks.forEach(pub => tracks.push(pub.track));
      setLocalTracks(tracks);

      return newRoom;
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  }, [room]);

  const disconnectFromRoom = useCallback(async () => {
    if (room) {
      try {
        await room.disconnect();
      } catch (error) {
        console.error('Disconnection error:', error);
      } finally {
        setRoom(null);
        setParticipants([]);
        setIsConnected(false);
        setLocalTracks([]);
        setActiveSpeakers([]);
      }
    }
  }, [room]);

  const toggleMicrophone = useCallback(async (enabled) => {
    if (!room) return false;
    try {
      if (enabled) {
        await room.localParticipant.setMicrophoneEnabled(true);
      } else {
        await room.localParticipant.setMicrophoneEnabled(false);
      }
      return true;
    } catch (error) {
      console.error('Microphone toggle error:', error);
      return false;
    }
  }, [room]);

  const toggleCamera = useCallback(async (enabled) => {
    if (!room) return false;
    try {
      if (enabled) {
        await room.localParticipant.setCameraEnabled(true);
      } else {
        await room.localParticipant.setCameraEnabled(false);
      }
      return true;
    } catch (error) {
      console.error('Camera toggle error:', error);
      return false;
    }
  }, [room]);

  const toggleScreenShare = useCallback(async (enabled) => {
    if (!room) return false;
    try {
      if (enabled) {
        await room.localParticipant.setScreenShareEnabled(true);
      } else {
        await room.localParticipant.setScreenShareEnabled(false);
      }
      return true;
    } catch (error) {
      console.error('Screen share toggle error:', error);
      return false;
    }
  }, [room]);

  const sendMessage = useCallback((message) => {
    if (!room) return false;
    try {
      room.localParticipant.publishData(new TextEncoder().encode(message), 'chat');
      return true;
    } catch (error) {
      console.error('Message send error:', error);
      return false;
    }
  }, [room]);

  useEffect(() => {
    return () => {
      disconnectFromRoom();
    };
  }, [disconnectFromRoom]);

  return (
    <LiveKitContext.Provider value={{
      room,
      participants,
      activeSpeakers,
      localTracks,
      isConnected,
      connectToRoom,
      disconnectFromRoom,
      toggleMicrophone,
      toggleCamera,
      toggleScreenShare,
      sendMessage
    }}>
      {children}
    </LiveKitContext.Provider>
  );
};

export const useLiveKit = () => {
  const context = useContext(LiveKitContext);
  if (!context) {
    throw new Error('useLiveKit must be used within a LiveKitProvider');
  }
  return context;
};