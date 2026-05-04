export const THEME = {
  bg: {
    app: '#0D0D0F',
    sidebar: '#111114',
    card: '#18181C',
    cardHover: '#1E1E24',
    input: '#1E1E24',
    modal: '#18181C',
  },
  border: 'rgba(255,255,255,0.07)',
  borderAccent: 'rgba(240,120,20,0.4)',
  text: {
    primary: '#F0EDE8',
    secondary: '#8A8790',
    muted: '#4A4850',
    accent: '#F07814',
  },
  accent: {
    orange: '#F07814',
    orangeLight: '#FF9A3C',
    orangeDim: 'rgba(240,120,20,0.15)',
    blue: '#3B82F6',
    blueDim: 'rgba(59,130,246,0.15)',
    purple: '#A855F7',
    purpleDim: 'rgba(168,85,247,0.15)',
    green: '#22C55E',
    greenDim: 'rgba(34,197,94,0.15)',
    red: '#EF4444',
    redDim: 'rgba(239,68,68,0.15)',
    yellow: '#F59E0B',
    yellowDim: 'rgba(245,158,11,0.15)',
  },
};

export const STATUS_CONFIG = {
  'En cours': { color: '#F07814', bg: 'rgba(240,120,20,0.15)', dot: '#F07814' },
  'En attente': { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', dot: '#F59E0B' },
  'Terminé': { color: '#22C55E', bg: 'rgba(34,197,94,0.15)', dot: '#22C55E' },
  'À faire': { color: '#8A8790', bg: 'rgba(138,135,144,0.12)', dot: '#8A8790' },
  'Bloqué': { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', dot: '#EF4444' },
  'Opérationnel': { color: '#22C55E', bg: 'rgba(34,197,94,0.15)', dot: '#22C55E' },
  'En préparation': { color: '#F07814', bg: 'rgba(240,120,20,0.15)', dot: '#F07814' },
  'Attention': { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', dot: '#EF4444' },
};

export const PRIORITY_CONFIG = {
  'Haute': { color: '#EF4444', label: '▲ Haute' },
  'Moyenne': { color: '#F59E0B', label: '● Moyenne' },
  'Basse': { color: '#22C55E', label: '▼ Basse' },
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⬡' },
  { id: 'projects', label: 'Projets', icon: '◈' },
  { id: 'vehicles', label: 'Véhicules', icon: '◎' },
  { id: 'calendar', label: 'Calendrier', icon: '▦' },
  { id: 'budget', label: 'Budget', icon: '◇' },
  { id: 'messages', label: 'Messages', icon: '◻' },
  { id: 'gallery', label: 'Galerie', icon: '⬜' },
];
