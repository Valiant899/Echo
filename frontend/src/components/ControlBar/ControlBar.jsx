 import React from "react";
import { 
  FiMic, FiMicOff, FiVideo, FiVideoOff, 
  FiUserPlus, FiLogOut, FiMessageSquare 
} from "react-icons/fi";

const ControlBar = ({
  muted,
  setMuted,
  cameraOff,
  setCameraOff,
  chatOpen,
  setChatOpen,
  leaveRoom,
  colors,
  setShowInviteModal
}) => {
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
      minWidth: "550px",
      gap: "1.5rem"
    }}>
      {/* Local Video Preview */}
      <div style={{
        width: "80px",
        height: "45px",
        borderRadius: "10px",
        overflow: "hidden",
        border: `1px solid ${colors.darkBg}`,
        backgroundColor: "rgba(0,0,0,0.3)",
        flexShrink: 0
      }}>
        {!cameraOff ? (
          <video
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
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
      </div>

      {/* Status Indicator */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        minWidth: "80px"
      }}>
        <div style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          backgroundColor: muted ? colors.danger : colors.success
        }} />
        <span style={{
          fontSize: "0.8rem",
          color: colors.textMuted,
          fontWeight: 500,
          whiteSpace: "nowrap"
        }}>
          {muted ? "Muted" : "Active"}
        </span>
      </div>

      {/* Main Controls */}
      <div style={{
        display: "flex",
        gap: "1.25rem",
        alignItems: "center"
      }}>
        {/* Mute Button */}
        <button
          onClick={() => setMuted(!muted)}
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            backgroundColor: muted ? colors.danger : "rgba(255,255,255,0.1)",
            border: "none",
            color: colors.textLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            ":hover": {
              backgroundColor: muted ? colors.dangerHover : "rgba(255,255,255,0.2)"
            }
          }}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <FiMicOff size={24} /> : <FiMic size={24} />}
        </button>

        {/* Camera Button */}
        <button
          onClick={() => setCameraOff(!cameraOff)}
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            backgroundColor: cameraOff ? colors.danger : "rgba(255,255,255,0.1)",
            border: "none",
            color: colors.textLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            ":hover": {
              backgroundColor: cameraOff ? colors.dangerHover : "rgba(255,255,255,0.2)"
            }
          }}
          aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
        >
          {cameraOff ? <FiVideoOff size={24} /> : <FiVideo size={24} />}
        </button>

        {/* Invite Button */}
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.1)",
            border: "none",
            color: colors.textLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            ":hover": {
              backgroundColor: "rgba(255,255,255,0.2)"
            }
          }}
          aria-label="Invite participants"
        >
          <FiUserPlus size={24} />
        </button>

        {/* Divider */}
        <div style={{
          width: "1px",
          height: "28px",
          backgroundColor: "rgba(255,255,255,0.2)",
          margin: "0 0.25rem"
        }} />

        {/* Chat Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            backgroundColor: chatOpen ? colors.accent : "rgba(255,255,255,0.1)",
            border: "none",
            color: colors.textLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            ":hover": {
              backgroundColor: chatOpen ? colors.accentHover : "rgba(255,255,255,0.2)"
            }
          }}
          aria-label={chatOpen ? "Close chat" : "Open chat"}
        >
          <FiMessageSquare size={20} />
        </button>

        {/* Leave Button */}
        <button
          onClick={leaveRoom}
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            backgroundColor: colors.danger,
            border: "none",
            color: colors.textLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            ":hover": {
              backgroundColor: colors.dangerHover
            }
          }}
          aria-label="Leave call"
        >
          <FiLogOut size={20} />
        </button>
      </div>
    </div>
  );
};

export default ControlBar;