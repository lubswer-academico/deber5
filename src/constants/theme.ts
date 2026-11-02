
export const EPMAPS_COLORS = {
  primaryDark: '#153268', // Azul Marino Oscuro (hero, encabezados, texto corporativo)
  primary: '#2D72C0',     // Azul Medio Corporativo (botones principales, acentos)
  accent: '#63C5B5',      // Turquesa (resalte sobre fondos oscuros)
  accentDark: '#3B766C',  // Variante turquesa oscurecida accesible sobre fondos claros (5.26:1)

  surface: '#FFFFFF',
  bgLight: '#F8FAFC',
  bgSecondary: '#F1F5F9',
  bgBlue: '#E1F2FB',      // Celeste claro institucional para contenedores informativos
  bgBlueBorder: '#BAE6FD',
  primaryDisabled: '#93C5FD',

  success: '#2E7D32',
  successDark: '#1B5E20',
  successBg: '#E8F5E9',
  successBorder: '#A5D6A7',

  warning: '#D97706',
  warningDark: '#B45309',
  warningBg: '#FEF3C7',
  warningBorder: '#FCD34D',

  danger: '#C62828',
  dangerDark: '#B71C1C',
  dangerBg: '#FFEBEE',
  dangerBorder: '#FFCDD2',
  dangerSoftBg: '#FEF2F2',
  dangerSoftBorder: '#FCA5A5',

  verification: '#4527A0',       // Pendiente de verificar (contingencia sin señal, 8.62:1)
  verificationBg: '#EDE7F6',
  verificationBorder: '#D1C4E9',

  pendingSync: '#B45309',        // Pendiente de enviar (validada localmente, 5.02:1)
  pendingSyncBg: '#FEF3C7',
  pendingSyncBorder: '#FCD34D',

  attention: '#C2410C',          // Requiere atención en campo (anomalía diferida, 5.18:1)
  attentionDark: '#9A3412',      // Texto secundario de alta legibilidad sobre fondo cálido (6.88:1)
  attentionBg: '#FFEDD5',
  attentionBorder: '#FB923C',
  attentionSurface: '#FFFBEB',

  borderLight: '#E2E8F0',
  borderMedium: '#CBD5E1',
  textMain: '#153268',
  textDark: '#1E293B',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  textInverse: '#FFFFFF',
} as const;

export const EPMAPS_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 32,
} as const;

export const EPMAPS_RADII = {
  sm: 6,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

export const EPMAPS_TOUCH = {
  minHeight: 48,
  buttonHeight: 52,
  minWidth: 48,
} as const;

export const EPMAPS_TYPOGRAPHY = {
  tabularNums: ['tabular-nums'] as ('tabular-nums')[],
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    hero: 26,
  },
  weights: {
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
} as const;

