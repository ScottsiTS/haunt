export const SPRITE_SIZE = 16
export const SPRITE_SCALE = 4
export const RENDERED_SIZE = SPRITE_SIZE * SPRITE_SCALE

export const ROOM_WIDTH = 200
export const ROOM_HEIGHT = 180
export const ROOM_PADDING = 20
export const ROOMS_PER_ROW = 3

export const FRAME_RATE = 8
export const BOB_AMPLITUDE = 4
export const POLL_INTERVAL = 10_000

export const COLORS = {
  background: '#0a0a12',
  roomFloor: '#1a1a2e',
  roomWall: '#16213e',
  wallTrim: '#2a2a4a',
  candleFlame: '#ffaa33',
  candleGlow: 'rgba(255, 170, 51, 0.15)',
  ghostDefault: '#c8d6e5',
  ghostGlow: '#a8ff78',
  ghostDistressed: '#ff6b6b',
  ghostSleeping: '#636e72',
  textPrimary: '#dfe6e9',
  textSecondary: '#b2bec3',
  badgeBg: '#2d3436',
  particle: '#ffeaa7',
} as const
