export const colors = {
  canvas: '#F3F6F4',
  canvasDeep: '#EAF0EC',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAF9',
  ink: '#102825',
  inkSoft: '#425651',
  muted: '#70817C',
  mutedLight: '#97A49F',
  border: '#DFE7E2',
  borderStrong: '#CFDAD4',
  primary: '#0B7559',
  primaryDeep: '#064C3B',
  primaryBright: '#16A276',
  primarySoft: '#E3F3EC',
  primaryFaint: '#F1F9F5',
  danger: '#BE4145',
  dangerDeep: '#8E3033',
  dangerSoft: '#FCECEB',
  dangerBorder: '#F2CAC7',
  warning: '#A56811',
  warningSoft: '#FCF2E3',
  warningBorder: '#F2DFC1',
  white: '#FFFFFF',
  overlay: 'rgba(16, 40, 37, 0.08)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 28,
  full: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#173A30',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0C3027',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;
