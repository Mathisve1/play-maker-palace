import React, { CSSProperties, ReactNode } from 'react';

type IPhoneModel = '14' | '14-pro' | '15' | '15-pro' | 'x' | 'plain';
type Orientation = 'portrait' | 'landscape';
type WallpaperFit = 'cover' | 'contain' | 'fill';

export interface IPhoneMockupProps {
  model?: IPhoneModel;
  color?: string;
  orientation?: Orientation;
  scale?: number;
  bezel?: number;
  radius?: number;
  shadow?: boolean | string;
  screenBg?: string;
  wallpaper?: string;
  wallpaperFit?: WallpaperFit;
  wallpaperPosition?: string;
  showDynamicIsland?: boolean;
  showNotch?: boolean;
  islandWidth?: number;
  islandHeight?: number;
  islandRadius?: number;
  notchWidth?: number;
  notchHeight?: number;
  notchRadius?: number;
  safeArea?: boolean;
  safeAreaOverrides?: Partial<{ top: number; bottom: number; left: number; right: number }>;
  showHomeIndicator?: boolean;
  innerShadow?: boolean;
  style?: CSSProperties;
  className?: string;
  frameStyle?: CSSProperties;
  screenStyle?: CSSProperties;
  children?: ReactNode;
}

const DEVICE_SPECS: Record<IPhoneModel, {
  w: number; h: number; radius: number; bezel: number;
  topSafe: number; bottomSafe: number;
  notch?: { w: number; h: number; r: number };
  island?: { w: number; h: number; r: number };
}> = {
  x:        { w: 375, h: 812,  radius: 50, bezel: 12, topSafe: 47, bottomSafe: 34, notch:  { w: 210, h: 35, r: 18 } },
  '14':     { w: 390, h: 844,  radius: 56, bezel: 12, topSafe: 47, bottomSafe: 34, notch:  { w: 225, h: 33, r: 18 } },
  '14-pro': { w: 393, h: 852,  radius: 56, bezel: 12, topSafe: 59, bottomSafe: 34, island: { w: 126, h: 37, r: 20 } },
  '15':     { w: 393, h: 852,  radius: 56, bezel: 12, topSafe: 59, bottomSafe: 34, island: { w: 126, h: 37, r: 20 } },
  '15-pro': { w: 393, h: 852,  radius: 56, bezel: 12, topSafe: 59, bottomSafe: 34, island: { w: 126, h: 37, r: 20 } },
  plain:    { w: 390, h: 844,  radius: 56, bezel: 12, topSafe: 16, bottomSafe: 16 },
};

const PRESET_COLORS: Record<string, string> = {
  black: '#0b0b0d', midnight: '#0b0c10', silver: '#d7d8dc',
  starlight: '#f1eee9', 'space-black': '#1c1e22', gold: '#f2dfb3',
  blue: '#2b4fa8', pink: '#ffbfd1', titanium: '#837a72',
  'natural-titanium': '#a69a8a', green: '#2b622e', red: '#c81f2f',
};

function shade(hex: string, pct: number): string {
  const h = hex.trim();
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  if (!m) return hex;
  const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  const k = (100 + pct) / 100;
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${to(r).toString(16).padStart(2, '0')}${to(g).toString(16).padStart(2, '0')}${to(b).toString(16).padStart(2, '0')}`;
}

export const IPhoneMockup: React.FC<IPhoneMockupProps> = ({
  model = '15-pro', color = 'natural-titanium', orientation = 'portrait', scale = 1,
  bezel, radius, shadow = true, screenBg = '#000', wallpaper, wallpaperFit = 'cover',
  wallpaperPosition = 'center', showDynamicIsland, showNotch, islandWidth, islandHeight,
  islandRadius, notchWidth, notchHeight, notchRadius, safeArea = true, safeAreaOverrides,
  showHomeIndicator = true, innerShadow = true, style, className, frameStyle, screenStyle, children,
}) => {
  const spec = DEVICE_SPECS[model];
  const useIsland = typeof showDynamicIsland === 'boolean' ? showDynamicIsland : Boolean(spec.island);
  const useNotch  = typeof showNotch === 'boolean' ? showNotch : Boolean(spec.notch) && !useIsland;
  const resolvedRadius = radius ?? spec.radius;
  const resolvedBezel  = bezel  ?? spec.bezel;
  const isLandscape    = orientation === 'landscape';
  const screenWidth  = isLandscape ? spec.h : spec.w;
  const screenHeight = isLandscape ? spec.w : spec.h;
  const outerWidth   = screenWidth  + resolvedBezel * 2;
  const outerHeight  = screenHeight + resolvedBezel * 2;
  const outerRadius  = resolvedRadius + resolvedBezel;
  const colorHex     = PRESET_COLORS[color] ?? color;
  const frameGradient = `linear-gradient(135deg, ${shade(colorHex, 8)} 0%, ${colorHex} 40%, ${shade(colorHex, -14)} 100%)`;
  const outerShadow   = typeof shadow === 'string' ? shadow : shadow ? `0 24px 60px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.24)` : 'none';
  const innerShadowCss = innerShadow ? 'inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 10px 20px rgba(0,0,0,0.35)' : 'none';
  const finalIslandW = islandWidth  ?? spec.island?.w ?? 0;
  const finalIslandH = islandHeight ?? spec.island?.h ?? 0;
  const finalIslandR = islandRadius ?? spec.island?.r ?? 0;
  const finalNotchW  = notchWidth   ?? spec.notch?.w ?? 0;
  const finalNotchH  = notchHeight  ?? spec.notch?.h ?? 0;
  const finalNotchR  = notchRadius  ?? spec.notch?.r ?? 0;
  const insets = {
    top:    safeAreaOverrides?.top    ?? spec.topSafe,
    bottom: safeAreaOverrides?.bottom ?? spec.bottomSafe,
    left:   safeAreaOverrides?.left   ?? 0,
    right:  safeAreaOverrides?.right  ?? 0,
  };
  return (
    <div className={className} style={{ boxSizing: 'border-box', display: 'inline-block', transform: `scale(${scale})`, transformOrigin: 'top left', ...style }}>
      <div style={{ width: outerWidth, height: outerHeight, borderRadius: outerRadius, background: frameGradient, padding: resolvedBezel, boxSizing: 'border-box', boxShadow: outerShadow, position: 'relative', overflow: 'hidden', ...frameStyle }} aria-label={`iPhone mockup (${model})`}>
        <div style={{ width: '100%', height: '100%', borderRadius: resolvedRadius, position: 'relative', overflow: 'hidden', background: screenBg, boxShadow: innerShadowCss, ...screenStyle }}>
          {wallpaper && <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `url(${wallpaper})`, backgroundSize: wallpaperFit, backgroundPosition: wallpaperPosition, backgroundRepeat: 'no-repeat', zIndex: 0 }} />}
          {useIsland && finalIslandW > 0 && (
            <div aria-hidden style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 12, width: finalIslandW, height: finalIslandH, borderRadius: finalIslandR, background: '#000', zIndex: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.7)' }} />
          )}
          {!useIsland && useNotch && finalNotchW > 0 && (
            <div aria-hidden style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 8, width: finalNotchW, height: finalNotchH, borderRadius: finalNotchR, background: '#000', zIndex: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.7)' }} />
          )}
          <div style={safeArea ? { position: 'absolute', top: insets.top, right: insets.right, bottom: insets.bottom, left: insets.left, overflow: 'hidden', zIndex: 1, display: 'flex', flexDirection: 'column' } : { position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
          {showHomeIndicator && (
            <div aria-hidden style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: Math.round(screenWidth * 0.34), maxWidth: 140, height: 5, borderRadius: 3, background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))', opacity: 0.9, zIndex: 3, pointerEvents: 'none' }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default IPhoneMockup;
