import React, { useState } from "react";
import { useSessionTimeout } from "../contexts/SessionTimeoutContext";
import { useAuth } from "../contexts/AuthContext";
import SessionTimeoutModal from "./SessionTimeoutModal";

const SessionTimeoutManager: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { showWarning, warningLevel, isSessionExpired } = useSessionTimeout();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Always show the session indicator, but only show expanded modal when there's a warning
  React.useEffect(() => {
    if (showWarning || warningLevel !== "none" || isSessionExpired) {
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
    }
  }, [showWarning, warningLevel, isSessionExpired]);

  // Don't render anything if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const handleCloseModal = () => {
    // Only allow closing if session is not expired
    if (warningLevel !== "expired") {
      setIsModalOpen(false);
    }
  };

  return (
    <SessionTimeoutModal isOpen={isModalOpen} onClose={handleCloseModal} />
  );
};

export default SessionTimeoutManager;
