import { useEffect, useState } from 'react';
import { liveKitService } from '../services/livekitService';

export const useLiveKit = (roomId, userId) => {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connect = async () => {
      try {
        const { room } = await liveKitService.joinRoom(
          roomId, 
          userId,
          'User Display Name' // Replace with actual display name
        );
        setRoom(room);
        setIsConnected(true);
        
        // Initial participants
        setParticipants(Array.from(room.participants.values()));
      } catch (error) {
        console.error('Connection error:', error);
      }
    };

    if (roomId && userId) {
      connect();
    }

    return () => {
      liveKitService.leaveRoom();
    };
  }, [roomId, userId]);

  useEffect(() => {
    if (!room) return;

    const handleParticipantsChanged = () => {
      setParticipants(Array.from(room.participants.values()));
    };

    room
      .on('participantConnected', handleParticipantsChanged)
      .on('participantDisconnected', handleParticipantsChanged);

    return () => {
      room
        .off('participantConnected', handleParticipantsChanged)
        .off('participantDisconnected', handleParticipantsChanged);
    };
  }, [room]);

  return {
    room,
    participants,
    isConnected,
    toggleAudio: liveKitService.toggleAudio,
    toggleVideo: liveKitService.toggleVideo
  };
};