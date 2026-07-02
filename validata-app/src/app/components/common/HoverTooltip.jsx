"use client";

import { useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_WIDTH = 224; // matches the old w-56
const VIEWPORT_MARGIN = 8;
const VERTICAL_GAP = 8;

// Dark styled tooltip that mirrors the old CSS-only group-hover tooltip, but
// is rendered in a portal and positioned from the trigger's actual bounding
// box. This lets it flip above/below and clamp horizontally to the viewport,
// so it's never clipped by an ancestor's overflow (e.g. a horizontally
// scrollable table) the way an absolutely-positioned child would be.
const HoverTooltip = ({ text, children, className = '' }) => {
  const triggerRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState(null);

  // Portal target (document.body) only exists client-side; SSR must render
  // `mounted=false` to match the server output, then flip true post-hydrate.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useLayoutEffect(() => setMounted(true), []);

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(centerX - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN)
    );

    const placement = rect.top > 90 ? 'top' : 'bottom';
    const top = placement === 'top' ? rect.top - VERTICAL_GAP : rect.bottom + VERTICAL_GAP;
    const arrowLeft = Math.max(12, Math.min(centerX - left, TOOLTIP_WIDTH - 12));

    setCoords({ top, left, placement, arrowLeft });
  };

  const hide = () => setCoords(null);

  return (
    <span
      ref={triggerRef}
      className={`inline-block ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {mounted && coords && createPortal(
        <div
          className="fixed z-50 w-56 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg pointer-events-none"
          style={{
            top: coords.top,
            left: coords.left,
            transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none'
          }}
        >
          {text}
          <span
            className={`absolute border-4 border-transparent ${
              coords.placement === 'top' ? 'top-full border-t-slate-800' : 'bottom-full border-b-slate-800'
            }`}
            style={{ left: coords.arrowLeft, transform: 'translateX(-50%)' }}
          />
        </div>,
        document.body
      )}
    </span>
  );
};

export default HoverTooltip;
