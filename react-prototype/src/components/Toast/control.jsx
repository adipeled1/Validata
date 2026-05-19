import { useEffect } from 'react';
import ToastDisplay from './display';
import { TOAST_DURATION } from './service';

// Controller component manages side effects (timeout)
const ToastControl = ({ message, show, onHide }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onHide();
      }, TOAST_DURATION);
      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  return <ToastDisplay message={message} show={show} />;
};

export default ToastControl;
