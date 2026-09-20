'use client';

export type TimingPhase = 'running' | 'stopped' | 'cancelled';

export type TimingZoom = {
  phase: TimingPhase;
  top: number;
  left: number;
  width: number;
  height: number;
};

const BACKDROP_ANIMATION: Record<TimingPhase, string> = {
  running: 'animate-timer-dim-in',
  stopped: 'animate-timer-dim-out',
  cancelled: 'animate-timer-dim-out',
};

const PANEL_CLASS: Record<TimingPhase, string> = {
  running: 'bg-primary-800 animate-timer-zoom-in',
  stopped: 'animate-timer-flash',
  cancelled: 'bg-primary-800 animate-timer-zoom-out',
};

export function zoomFrom(element: HTMLElement | null): TimingZoom | null {
  if (!element) return null;
  const box = element.getBoundingClientRect();
  return {
    phase: 'running',
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
  };
}

export default function TimingOverlay({
  zoom,
  hint,
  onExitEnd,
}: {
  zoom: TimingZoom;
  hint: React.ReactNode;
  onExitEnd: () => void;
}) {
  const zoomVariables = {
    '--zoom-top': `${zoom.top}px`,
    '--zoom-left': `${zoom.left}px`,
    '--zoom-width': `${zoom.width}px`,
    '--zoom-height': `${zoom.height}px`,
  } as React.CSSProperties;

  return (
    <div
      aria-hidden
      onContextMenu={(event) => event.preventDefault()}
      style={{ touchAction: 'none' }}
      className="fixed inset-0 z-50 cursor-pointer select-none"
    >
      <div className={`absolute inset-0 bg-black/75 ${BACKDROP_ANIMATION[zoom.phase]}`} />

      <div
        onAnimationEnd={() => {
          if (zoom.phase !== 'running') onExitEnd();
        }}
        style={zoomVariables}
        className={`absolute top-0 left-0 grid h-full w-full place-items-center border border-transparent ${PANEL_CLASS[zoom.phase]}`}
      >
        {zoom.phase === 'running' && (
          <div className="flex flex-col items-center gap-6">
            <span className="flex gap-5 text-primary-100">
              <span className="h-4 w-4 rounded-full bg-primary-100" />
              <span className="h-4 w-4 rounded-full bg-primary-100" />
              <span className="h-4 w-4 rounded-full bg-primary-100" />
            </span>
            <span className="px-4 text-center text-sm text-dark_accent">{hint}</span>
          </div>
        )}
      </div>
    </div>
  );
}
