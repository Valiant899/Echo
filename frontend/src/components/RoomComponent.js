import React from 'react';
import { useLiveKit } from '../hooks/useLiveKit';

const RoomComponent = ({ roomId, userId }) => {
  const {
    participants,
    isConnected,
    toggleAudio,
    toggleVideo
  } = useLiveKit(roomId, userId);

  return (
    <div className="room-container">
      <h2>Room: {roomId}</h2>
      <div className="controls">
        <button onClick={() => toggleAudio(true)}>Unmute</button>
        <button onClick={() => toggleAudio(false)}>Mute</button>
        <button onClick={() => toggleVideo(true)}>Start Video</button>
        <button onClick={() => toggleVideo(false)}>Stop Video</button>
      </div>

      <div className="participants-grid">
        {participants.map((participant) => (
          <ParticipantView key={participant.sid} participant={participant} />
        ))}
      </div>

      {!isConnected && <div className="connecting">Connecting...</div>}
    </div>
  );
};

const ParticipantView = ({ participant }) => {
  const videoRef = React.useRef(null);
  const audioRef = React.useRef(null);

  React.useEffect(() => {
    if (!participant) return;

    participant.on('trackSubscribed', (track) => {
      if (track.kind === 'video') {
        track.attach(videoRef.current);
      } else if (track.kind === 'audio') {
        track.attach(audioRef.current);
      }
    });

    return () => {
      participant.removeAllListeners();
    };
  }, [participant]);

  return (
    <div className="participant">
      <h3>{participant.identity}</h3>
      <video ref={videoRef} autoPlay playsInline />
      <audio ref={audioRef} autoPlay />
    </div>
  );
};

export default RoomComponent;