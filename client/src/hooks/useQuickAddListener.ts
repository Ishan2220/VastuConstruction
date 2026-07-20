import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';

export function useQuickAddListener(targetDetail: string, openModal: () => void) {
  const location = useLocation();
  const navigate = useNavigate();
  const openModalRef = useRef(openModal);

  // Keep the ref up-to-date
  useEffect(() => {
    openModalRef.current = openModal;
  }, [openModal]);

  // Handle location state
  useEffect(() => {
    if (location.state && (location.state as any).action === 'create') {
      setTimeout(() => {
        openModalRef.current();
      }, 50);
      
      // Clear the state without a full reload
      const nextState = { ...location.state };
      delete nextState.action;
      navigate(location.pathname, { replace: true, state: nextState });
    }
  }, [location, navigate]);

  // Handle custom events (primary mechanism)
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail === targetDetail) {
        openModalRef.current();
      }
    };

    window.addEventListener('quick-add-create', handleEvent);
    return () => window.removeEventListener('quick-add-create', handleEvent);
  }, [targetDetail]);
}
