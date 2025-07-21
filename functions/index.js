const functions = require('firebase-functions');
require('dotenv').config(); // Load .env file
const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onRequest, onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const cors = require('cors')({ 
  origin: ['https://your-app-domain.com', 'http://localhost:3000'] 
});
const { logger } = require("firebase-functions/logger");

admin.initializeApp();
const db = admin.firestore();

// Get Firebase config values
const livekitHost = process.env.LIVEKIT_HOST;
const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

// Validate required configuration
if (!livekitHost || !livekitApiKey || !livekitApiSecret) {
  console.error('Missing LiveKit configuration in environment variables');
  throw new Error('Missing LiveKit configuration');
}

if (!livekitHost.startsWith('https://')) {
  console.error('LIVEKIT_HOST must use https:// protocol');
  throw new Error('LIVEKIT_HOST must use https:// protocol');
}

// Initialize LiveKit RoomServiceClient
const roomService = new RoomServiceClient(
  livekitHost,
  livekitApiKey,
  livekitApiSecret
);

// Global configuration
setGlobalOptions({ 
  maxInstances: 10,
  region: 'us-central1'
});

// Consistent error response format
const sendError = (res, status, code, message) => {
  logger.error(`[${code}] ${message}`);
  return res.status(status).json({
    success: false,
    error: { code, message }
  });
};

// Add error handling wrapper
const withErrorHandling = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    logger.error('Handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

// ========================
// ROOM LIFECYCLE HANDLERS
// ========================
exports.onRoomCreated = onDocumentCreated('rooms/{roomId}', async (event) => {
  try {
    const roomId = event.params.roomId;
    const roomData = event.data.data();

    logger.info(`Creating LiveKit room for roomId: ${roomId}`);

    await roomService.createRoom({
      name: roomId,
      emptyTimeout: 60 * 60,
      maxParticipants: roomData.maxListeners + roomData.maxSpeakers
    });

    await event.data.ref.update({
      livekitRoom: roomId,
      livekitUrl: livekitHost || 'https://your-default-host.livekit.cloud',
      currentListeners: 0,
      currentSpeakers: 0,
      currentParticipants: 0
    });

    logger.info(`LiveKit room created for roomId: ${roomId}`);
    return null;
  } catch (err) {
    logger.error(`onRoomCreated error for roomId: ${event.params.roomId}`, err);
    await event.data.ref.delete();
    throw err;
  }
});

exports.onRoomDeleted = onDocumentDeleted('rooms/{roomId}', async (event) => {
  try {
    const roomId = event.params.roomId;
    logger.info(`Deleting LiveKit room for roomId: ${roomId}`);
    await roomService.deleteRoom(roomId);
    logger.info(`LiveKit room deleted for roomId: ${roomId}`);
    return null;
  } catch (err) {
    logger.error(`onRoomDeleted error for roomId: ${event.params.roomId}`, err);
    throw err;
  }
});

// ========================
// LIVEKIT TOKEN GENERATION
// ========================
exports.generateMediaToken = onRequest({ maxInstances: 5 }, withErrorHandling(async (req, res) => {
  return cors(req, res, async () => {
    // 1. Verify Firebase Auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'unauthenticated', 'Missing or invalid token');
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userId = decoded.uid;

    // 2. Parse and validate request
    const { roomName } = req.body;
    if (!roomName || typeof roomName !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(roomName)) {
      return sendError(res, 400, 'invalid-argument', 'Valid room name required');
    }

    // 3. Verify room exists and get participant status
    const roomRef = db.doc(`rooms/${roomName}`);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) {
      return sendError(res, 404, 'not-found', 'Room not found');
    }

    const roomData = roomSnap.data();
    const isHost = roomData.authorId === userId;
    const isSpeaker = roomData.speakers?.includes(userId) || false;

    // 4. Check private room access
    if (!roomData.isPublic && !isHost) {
      const inviteRef = db.doc(`rooms/${roomName}/invites/${userId}`);
      const inviteSnap = await inviteRef.get();
      if (!inviteSnap.exists) {
        return sendError(res, 403, 'permission-denied', 'This room is private and you are not invited');
      }
    }

    // 5. Check room capacity
    if (roomData.currentParticipants >= (roomData.maxListeners + roomData.maxSpeakers)) {
      return sendError(res, 403, 'resource-exhausted', 'Room has reached maximum capacity');
    }

    if (isSpeaker && roomData.currentSpeakers >= roomData.maxSpeakers) {
      return sendError(res, 403, 'resource-exhausted', 'No available speaker slots');
    }

    // 6. Check participant status
    const participantRef = roomRef.collection('participants').doc(userId);
    const participantSnap = await participantRef.get();
    if (participantSnap.exists && participantSnap.data().leftAt) {
      return sendError(res, 403, 'permission-denied', 'Participant has left the room');
    }

    // 7. Generate LiveKit token
    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: userId,
      name: decoded.name || 'Participant',
      ttl: '1h',
      metadata: JSON.stringify({
        isHost,
        isSpeaker,
        firebaseUid: userId
      })
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: isHost || isSpeaker,
      canSubscribe: true,
      canPublishData: true,
      canPublishSources: isHost
        ? ['microphone', 'camera', 'screen_share']
        : isSpeaker
        ? ['microphone']
        : [],
      canUpdateMetadata: isHost,
      roomAdmin: isHost
    });

    // 8. Update participant data if new
    if (!participantSnap.exists) {
      await roomRef.update({
        currentParticipants: admin.firestore.FieldValue.increment(1),
        currentListeners: isSpeaker ? roomData.currentListeners : admin.firestore.FieldValue.increment(1),
        currentSpeakers: isSpeaker ? admin.firestore.FieldValue.increment(1) : roomData.currentSpeakers,
        lastActive: admin.firestore.FieldValue.serverTimestamp(),
        participants: admin.firestore.FieldValue.arrayUnion(userId)
      });
      await participantRef.set({
        userId,
        name: decoded.name || 'Participant',
        isHost,
        isSpeaker,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        leftAt: null
      });
    }

    const tokenJwt = token.toJwt();
    logger.info(`Token generated for userId: ${userId}, roomName: ${roomName}`);
    return res.status(200).json({
      success: true,
      token: tokenJwt,
      participant: { id: userId, isHost, isSpeaker },
      room: {
        currentParticipants: roomData.currentParticipants + 1,
        currentListeners: isSpeaker ? roomData.currentListeners : roomData.currentListeners + 1,
        currentSpeakers: isSpeaker ? roomData.currentSpeakers + 1 : roomData.currentSpeakers,
        livekitUrl: roomData.livekitUrl
      }
    });
  });
}));

// ========================
// ROOM PARTICIPANT MANAGEMENT
// ========================
exports.joinRoom = onRequest({ maxInstances: 5 }, async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendError(res, 401, 'unauthenticated', 'Missing or invalid token');
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decoded = await admin.auth().verifyIdToken(idToken);
      const userId = decoded.uid;

      const { roomId } = req.body;

      const roomRef = admin.firestore().doc(`rooms/${roomId}`);
      const roomSnap = await roomRef.get();
      if (!roomSnap.exists) {
        return sendError(res, 404, 'not-found', 'Room not found');
      }

      const roomData = roomSnap.data();
      const isHost = roomData.authorId === decoded.uid;
      const isSpeaker = roomData.speakers?.includes(decoded.uid) || false;

      // Check private room access
      if (!roomData.isPublic && !isHost) {
        const inviteRef = db.doc(`rooms/${roomId}/invites/${decoded.uid}`);
        const inviteSnap = await inviteRef.get();
        if (!inviteSnap.exists) {
          return sendError(res, 403, 'permission-denied', 'This room is private and you are not invited');
        }
      }

      // Check room capacity
      if (roomData.currentParticipants >= (roomData.maxListeners + roomData.maxSpeakers)) {
        return sendError(res, 403, 'resource-exhausted', 'Room has reached maximum capacity');
      }

      if (isSpeaker && roomData.currentSpeakers >= roomData.maxSpeakers) {
        return sendError(res, 403, 'resource-exhausted', 'No available speaker slots');
      }

      // Check participant status
      const participantRef = roomRef.collection('participants').doc(decoded.uid);
      const participantSnap = await participantRef.get();
      if (participantSnap.exists && participantSnap.data().leftAt) {
        return sendError(res, 403, 'permission-denied', 'Participant has left the room');
      }

      // Update participant data if new
      if (!participantSnap.exists) {
        await roomRef.update({
          currentParticipants: admin.firestore.FieldValue.increment(1),
          currentListeners: isSpeaker ? roomData.currentListeners : admin.firestore.FieldValue.increment(1),
          currentSpeakers: isSpeaker ? admin.firestore.FieldValue.increment(1) : roomData.currentSpeakers,
          lastActive: admin.firestore.FieldValue.serverTimestamp(),
          participants: admin.firestore.FieldValue.arrayUnion(userId)
        });
        await participantRef.set({
          userId,
          name: decoded.name || 'Participant',
          isHost,
          isSpeaker,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          leftAt: null
        });
      }

      logger.info(`User ${decoded.uid} joined room ${roomId}`);
      return res.status(200).json({ 
        success: true,
        roomId,
        participant: decoded.uid 
      });
    } catch (error) {
      logger.error('JOIN ROOM ERROR', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });
      
      if (error.code === 7) { // PERMISSION_DENIED
        return sendError(res, 403, 'permission-denied', 'Firestore rules blocked the operation');
      }
      return sendError(res, 500, 'internal-error', 'Internal server error');
    }
  });
});

// ========================
// ROOM PARTICIPANT MANAGEMENT (CALLABLE)
// ========================
exports.leaveRoom = onCall({ maxInstances: 5 }, async (data, context) => {
  if (!context.auth) {
    throw new admin.functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const { roomName, wasSpeaker } = data;
  const userId = context.auth.uid;

  if (!roomName || typeof roomName !== 'string') {
    throw new admin.functions.https.HttpsError('invalid-argument', 'Valid room name required');
  }

  logger.info(`User ${userId} leaving room ${roomName}, wasSpeaker: ${wasSpeaker}`);

  try {
    const roomRef = db.collection('rooms').doc(roomName);

    return await db.runTransaction(async (tx) => {
      const room = await tx.get(roomRef);
      if (!room.exists) {
        throw new admin.functions.https.HttpsError('not-found', 'Room not found');
      }

      const roomData = room.data();
      const participantRef = roomRef.collection('participants').doc(userId);
      const participant = await tx.get(participantRef);
      if (!participant.exists) {
        logger.info(`User ${userId} not in room ${roomName}`);
        return { status: 'not_in_room' };
      }

      const updates = {
        lastActive: admin.firestore.FieldValue.serverTimestamp(),
        participants: admin.firestore.FieldValue.arrayRemove(userId),
        currentParticipants: admin.firestore.FieldValue.increment(-1)
      };

      if (wasSpeaker) {
        updates.currentSpeakers = Math.max(0, roomData.currentSpeakers - 1);
      } else {
        updates.currentListeners = Math.max(0, roomData.currentListeners - 1);
      }

      await tx.update(participantRef, {
        leftAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await tx.update(roomRef, updates);

      logger.info(`User ${userId} left room ${roomName}`);
      return { status: 'left' };
    });
  } catch (error) {
    logger.error(`leaveRoom error for userId: ${userId}, roomName: ${roomName}`, error);
    throw new admin.functions.https.HttpsError(
      error.code || 'internal',
      error.message || 'Failed to leave room'
    );
  }
});

// ========================
// BASIC FIREBASE AUTH HANDLER
// ========================
exports.handleLogin = onCall({ maxInstances: 5 }, async (data, context) => {
  const { email } = data;

  if (!email || typeof email !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Valid email required');
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    const token = await admin.auth().createCustomToken(user.uid);
    logger.info(`Generated custom token for user: ${user.uid}`);
    return { success: true, token };
  } catch (error) {
    logger.error(`handleLogin error for email: ${email}`, error);
    throw new functions.https.HttpsError('unauthenticated', `Login failed: ${error.message}`);
  }
});

// ========================
// ADMIN API ENDPOINTS
// ========================
exports.manualCleanup = onRequest({ maxInstances: 5 }, withErrorHandling(async (req, res) => {
  const adminKey = process.env.ADMIN_KEY || functions.config().admin.key;
  if (!adminKey || req.headers.authorization !== `Bearer ${adminKey}`) {
    return sendError(res, 401, 'permission-denied', 'Invalid admin credentials');
  }

  const userId = req.query.uid;
  if (!userId || typeof userId !== 'string') {
    return sendError(res, 400, 'invalid-argument', 'Valid user ID required');
  }

  const userRecord = await admin.auth().getUser(userId);
  await exports.cleanupUserData(userRecord);

  logger.info(`manualCleanup completed for userId: ${userId}`);
  return res.status(200).json({
    success: true,
    data: { userId, timestamp: new Date().toISOString() }
  });
}));

// Placeholder for cleanupUserData
exports.cleanupUserData = async (userRecord) => {
  try {
    const userId = userRecord.uid;
    await db.collection('users').doc(userId).delete();
    logger.info(`Successfully cleaned up data for user ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error(`cleanupUserData error for userId: ${userRecord.uid}`, error);
    throw new admin.functions.https.HttpsError('internal', `Failed to clean up user data: ${error.message}`);
  }
};

// ========================
// MASS HIGHLIGHT SYNC
// ========================
exports.synchronizeAllHighlights = onCall({ maxInstances: 5 }, async (data, context) => {
  if (!context.auth) {
    throw new admin.functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  try {
    logger.info('Starting highlight synchronization');
    const results = [];
    let lastDoc = null;
    const batchSize = 100;

    do {
      let query = db.collection('users').limit(batchSize);
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const usersSnapshot = await query.get();
      lastDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const highlightsQuery = db
          .collection('highlights')
          .where('userId', '==', userId)
          .limit(500);

        const highlightsSnapshot = await highlightsQuery.get();
        if (highlightsSnapshot.empty) continue;

        const batch = db.batch();
        highlightsSnapshot.forEach(doc => {
          batch.update(doc.ref, {
            authorName: userDoc.data().authorname || 'Unknown',
            authorPicture: userDoc.data().profilePicture || '',
            _lastSync: admin.firestore.FieldValue.serverTimestamp()
          });
        });

        await batch.commit();
        results.push({ userId, updated: highlightsSnapshot.size });
        logger.info(`Synchronized ${highlightsSnapshot.size} highlights for userId: ${userId}`);
      }
    } while (lastDoc);

    logger.info('Highlight synchronization completed');
    return { success: true, results };
  } catch (error) {
    logger.error('synchronizeAllHighlights error', error);
    throw new admin.functions.https.HttpsError('internal', `Failed to sync highlights: ${error.message}`);
  }
});