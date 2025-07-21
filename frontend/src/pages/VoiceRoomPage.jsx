import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLiveKit } from '../contexts/LiveKitContext';
import { VoiceRoomControls } from '../components/VoiceRoomControls';
import { ParticipantView } from '../components/ParticipantView';
import styled from 'styled-components';

const RoomContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #121212;
  color: white;
`;

const ParticipantsGrid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  padding: 1rem;
  overflow-y: auto;
`;

const ControlsContainer = styled.div`
  padding: 1rem;
  background-color: #1e1e1e;
  display: flex;
  justify-content: center;
  gap: 1rem;
`;

export const VoiceRoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    room,
    participants,
    activeSpeakers,
    isConnected,
    connectToRoom,
    disconnectFromRoom,
    sendMessage
  } = useLiveKit();
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!roomId || !currentUser) return;

    const joinRoom = async () => {
      try {
        // In a real app, you would get the token from your backend
        const token = await getTokenFromBackend(roomId, currentUser.uid);
        
        await connectToRoom({
          roomId,
          token,
          displayName: currentUser.displayName || 'Anonymous',
          isSpeaker: false // Default to listener
        });
      } catch (error) {
        console.error('Failed to join room:', error);
        navigate('/rooms');
      }
    };

    joinRoom();

    return () => {
      disconnectFromRoom();
    };
  }, [roomId, currentUser, connectToRoom, disconnectFromRoom, navigate]);

  const handleSendMessage = () => {
    if (message.trim() && sendMessage(message)) {
      setMessage('');
    }
  };

  if (!isConnected) {
    return <div>Connecting to room...</div>;
  }

  return (
    <RoomContainer>
      <h2>Room: {roomId}</h2>
      
      <ParticipantsGrid>
        {participants.map(participant => (
          <ParticipantView 
            key={participant.sid}
            participant={participant}
            isSpeaking={activeSpeakers.includes(participant)}
          />
        ))}
      </ParticipantsGrid>

      <ControlsContainer>
        <VoiceRoomControls onSendMessage={handleSendMessage} />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
        />
      </ControlsContainer>
    </RoomContainer>
  );
};

// Mock function - replace with actual token fetch
async function getTokenFromBackend(roomId, userId) {
  // Implement your token fetching logic here
  return 'your_livekit_token';
}