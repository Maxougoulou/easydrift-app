// Global toast singleton — importable from anywhere (hooks, utils, etc.)
// Wired to the showToast from useNotifications via App.jsx

let _handler = null;

export const toast = {
  success: (title, message) => _handler?.({ type: 'success', title, message }),
  error:   (title, message) => _handler?.({ type: 'error',   title, message }),
  info:    (title, message) => _handler?.({ type: 'info',    title, message }),
  _init:   (fn) => { _handler = fn; },
};
