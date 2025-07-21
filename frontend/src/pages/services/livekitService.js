import { Room, RemoteParticipant, RoomEvent } from 'livekit-client';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseConfig';

export class LiveKitService {
  constructor() {
    this.room = new Room();
    this.currentRoom = null;
  }

  async joinRoom(roomId, userId, displayName, isHost = false, isSpeaker = false) {
    try {
      // 1. Get LiveKit token from Cloud Function
      const generateToken = httpsCallable(functions, 'generateToken');
      const { data } = await generateToken({
        roomName: roomId,
        isHost,
        isSpeaker,
        identity: userId
      });

      // 2. Connect to LiveKit room
      await this.room.connect(data.wsUrl, data.token);
      this.currentRoom = roomId;

      // 3. Set up event listeners
      this.setupEventListeners();

      return {
        room: this.room,
        participant: data.participant
      };
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }

  setupEventListeners() {
    this.room
      .on(RoomEvent.ParticipantConnected, (participant) => {
        console.log(`${participant.identity} joined`);
      })
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log(`${participant.identity} left`);
      })
      .on(RoomEvent.Disconnected, () => {
        this.leaveRoom();
      });
  }

  async leaveRoom() {
    if (!this.currentRoom) return;
    
    try {
      const leaveRoom = httpsCallable(functions, 'leaveRoom');
      await leaveRoom({ roomName: this.currentRoom });
      this.room.disconnect();
      this.currentRoom = null;
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  }

  async toggleAudio(enabled) {
    if (!this.room) return;
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
  }

  async toggleVideo(enabled) {
    if (!this.room) return;
    await this.room.localParticipant.setCameraEnabled(enabled);
  }
}

export const liveKitService = new LiveKitService();