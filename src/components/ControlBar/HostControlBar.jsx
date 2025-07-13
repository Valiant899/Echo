import React, { useState, useRef, useEffect } from "react";
import { 
  FiMic, FiMicOff, FiVideo, FiVideoOff, 
  FiUserPlus, FiLogOut, FiMessageSquare, 
  FiShield, FiX, FiUser, FiVolume2, 
  FiVolumeX, FiRadio, FiHeadphones
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const HostControlBar = ({
  muted,
  setMuted,
  cameraOff,
  setCameraOff,
  chatOpen,
  setChatOpen,
  leaveRoom,
  colors,
  setShowInviteModal,
  localVideoRef,
  participants = [],
  updateParticipant = () => {},
  isProcessing = false
}) => {
  const [showHostCommands, setShowHostCommands] = useState(false);
  const panelRef = useRef(null);
  
  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Check if the click was not on the shield button
        const shieldButton = document.querySelector('[aria-label="Host controls"]');
        if (!shieldButton.contains(event.target)) {
          setShowHostCommands(false);
        }
      }
    };

    if (showHostCommands) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showHostCommands]);

  // Button style generator
  const getButtonStyle = (isActive, activeColor) => ({
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    backgroundColor: isActive ? activeColor : "rgba(255,255,255,0.1)",
    border: "none",
    color: colors.textLight,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease-out",
    '&:hover': {
      backgroundColor: isActive ? `${activeColor}90` : "rgba(255,255,255,0.2)"
    }
  });

  // Toggle participant mute
  const toggleParticipantMute = (participantId, currentStatus) => {
    updateParticipant(participantId, { isMuted: !currentStatus });
  };

  // Toggle participant camera
  const toggleParticipantCamera = (participantId, currentStatus) => {
    updateParticipant(participantId, { cameraOff: !currentStatus });
  };

  // Toggle participant role
  const toggleParticipantRole = (participantId, currentRole) => {
    updateParticipant(participantId, { isSpeaker: !currentRole });
  };

  // Filter out host and ensure participants is an array
  const filteredParticipants = Array.isArray(participants) 
    ? participants.filter(p => !p?.isHost)
    : [];

  // Animation variants
  const panelVariants = {
    hidden: { 
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: {
      opacity: 0,
      y: 10,
      transition: { duration: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        type: "spring",
        stiffness: 200
      }
    })
  };

  return (
    <div style={{
      backgroundColor: colors.panelBg,
      padding: "1rem 2rem",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: "28px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 100,
      border: `1px solid ${colors.darkBg}`,
      minWidth: "600px",
      gap: "1.5rem"
    }}>
      {/* Local Video Preview */}
      <motion.div 
        style={{
          width: "80px",
          height: "45px",
          borderRadius: "10px",
          overflow: "hidden",
          border: `1px solid ${colors.darkBg}`,
          backgroundColor: "rgba(0,0,0,0.3)",
          flexShrink: 0,
          position: "relative"
        }}
        whileHover={{ scale: 1.03 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        {!cameraOff ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "rotateY(180deg)"
            }}
          />
        ) : (
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <FiVideoOff size={20} color={colors.textMuted} />
          </div>
        )}
        {/* Status indicator */}
        <motion.div 
          style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: muted ? colors.danger : colors.success,
            border: `1px solid ${colors.darkBg}`
          }}
          animate={{ 
            scale: muted ? [1, 1.2, 1] : 1 
          }}
          transition={{ 
            duration: 0.3,
            repeat: muted ? Infinity : 0,
            repeatType: "reverse"
          }}
        />
      </motion.div>

      {/* Main Controls */}
      <div style={{
        display: "flex",
        gap: "1.25rem",
        alignItems: "center"
      }}>
        {/* Mute Button */}
        <motion.button
          onClick={() => setMuted(!muted)}
          style={getButtonStyle(muted, colors.danger)}
          aria-label={muted ? "Unmute" : "Mute"}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.1 }}
        >
          {muted ? <FiMicOff size={24} /> : <FiMic size={24} />}
        </motion.button>

        {/* Camera Button */}
        <motion.button
          onClick={() => setCameraOff(!cameraOff)}
          style={getButtonStyle(cameraOff, colors.danger)}
          aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.1 }}
        >
          {cameraOff ? <FiVideoOff size={24} /> : <FiVideo size={24} />}
        </motion.button>

        {/* Invite Button */}
        <motion.button
          onClick={() => setShowInviteModal(true)}
          style={getButtonStyle(false)}
          aria-label="Invite participants"
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.1 }}
        >
          <FiUserPlus size={24} />
        </motion.button>

        {/* Chat Button */}
        <motion.button
          onClick={() => setChatOpen(!chatOpen)}
          style={getButtonStyle(chatOpen, colors.accent)}
          aria-label={chatOpen ? "Close chat" : "Open chat"}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.1 }}
        >
          <FiMessageSquare size={22} />
        </motion.button>

        {/* Divider */}
        <motion.div 
          style={{
            width: "1px",
            height: "28px",
            backgroundColor: "rgba(255,255,255,0.2)",
            margin: "0 0.25rem"
          }}
          animate={{ 
            opacity: showHostCommands ? 1 : 0.5,
            scaleY: showHostCommands ? 1.2 : 1 
          }}
          transition={{ duration: 0.2 }}
        />

        {/* Host Controls Button */}
        <motion.button
          onClick={() => setShowHostCommands(!showHostCommands)}
          disabled={isProcessing}
          style={{
            ...getButtonStyle(showHostCommands, colors.accent),
            cursor: isProcessing ? "default" : "pointer"
          }}
          aria-label="Host controls"
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.1 }}
          animate={{
            rotate: showHostCommands ? [0, -15, 15, 0] : 0
          }}
          transition={{
            rotate: { duration: 0.5, type: "spring" }
          }}
        >
          <FiShield size={20} />
        </motion.button>

        {/* Leave Button */}
        <motion.button
          onClick={leaveRoom}
          style={{
            ...getButtonStyle(true, colors.danger),
            backgroundColor: colors.danger,
            '&:hover': {
              backgroundColor: colors.dangerHover
            }
          }}
          aria-label="Leave call"
          whileTap={{ scale: 0.9 }}
          whileHover={{ 
            scale: 1.1,
            backgroundColor: colors.dangerHover
          }}
        >
          <FiLogOut size={20} />
        </motion.button>
      </div>

      {/* Host Commands Panel */}
      <AnimatePresence>
        {showHostCommands && (
          <motion.div
            ref={panelRef}
            style={{
              position: "fixed",
              bottom: "100px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "400px",
              backgroundColor: colors.panelBg,
              borderRadius: "16px",
              padding: "1.5rem",
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
              zIndex: 101,
              border: `1px solid ${colors.darkBg}`
            }}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem"
            }}>
              <motion.h3 
                style={{ margin: 0, color: colors.textLight }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                Participant Controls
              </motion.h3>
              <motion.button 
                onClick={() => setShowHostCommands(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.textMuted,
                  cursor: "pointer"
                }}
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX size={20} />
              </motion.button>
            </div>

            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {filteredParticipants.length > 0 ? (
                filteredParticipants.map((participant, i) => (
                  <motion.div 
                    key={participant.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem 0",
                      borderBottom: `1px solid ${colors.darkBg}`
                    }}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <motion.div
                        animate={{ 
                          x: participant.isMuted ? [0, -2, 2, 0] : 0,
                          transition: { 
                            repeat: participant.isMuted ? Infinity : 0,
                            duration: 0.5
                          }
                        }}
                      >
                        <FiUser size={18} color={colors.textMuted} />
                      </motion.div>
                      <span style={{ color: colors.textLight }}>
                        {participant.name || `User ${participant.id.slice(0, 4)}`}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {/* Mute Toggle */}
                      <motion.button
                        onClick={() => toggleParticipantMute(participant.id, participant.isMuted)}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: participant.isMuted ? colors.danger : "rgba(255,255,255,0.1)",
                          border: "none",
                          color: colors.textLight,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}
                        title={participant.isMuted ? "Unmute user" : "Mute user"}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        animate={{
                          scale: participant.isMuted ? [1, 1.05, 1] : 1,
                          transition: { 
                            repeat: participant.isMuted ? Infinity : 0,
                            duration: 1.5
                          }
                        }}
                      >
                        {participant.isMuted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
                      </motion.button>

                      {/* Camera Toggle */}
                      <motion.button
                        onClick={() => toggleParticipantCamera(participant.id, participant.cameraOff)}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: participant.cameraOff ? colors.danger : "rgba(255,255,255,0.1)",
                          border: "none",
                          color: colors.textLight,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}
                        title={participant.cameraOff ? "Enable camera" : "Disable camera"}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {participant.cameraOff ? <FiVideoOff size={16} /> : <FiVideo size={16} />}
                      </motion.button>

                      {/* Role Toggle */}
                      <motion.button
                        onClick={() => toggleParticipantRole(participant.id, participant.isSpeaker)}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: participant.isSpeaker ? colors.accent : "rgba(255,255,255,0.1)",
                          border: "none",
                          color: colors.textLight,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}
                        title={participant.isSpeaker ? "Make listener" : "Make speaker"}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {participant.isSpeaker ? <FiRadio size={16} /> : <FiHeadphones size={16} />}
                      </motion.button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  style={{ 
                    padding: "1rem",
                    textAlign: "center",
                    color: colors.textMuted
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  No other participants in the room
                </motion.div>
              )}
            </div>

            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              marginTop: "1rem",
              gap: "0.5rem"
            }}>
              <motion.button
                onClick={() => {
                  setShowInviteModal(true);
                  setShowHostCommands(false);
                }}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "8px",
                  backgroundColor: colors.accent,
                  border: "none",
                  color: colors.textLight,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiUserPlus size={18} /> Invite
              </motion.button>

              <motion.button
                onClick={() => {
                  setChatOpen(true);
                  setShowHostCommands(false);
                }}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "8px",
                  backgroundColor: colors.accent,
                  border: "none",
                  color: colors.textLight,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiMessageSquare size={18} /> Chat
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HostControlBar;