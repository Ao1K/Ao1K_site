'use client';

import { useState, useEffect, useRef } from 'react';
import CaretIcon from '../icons/dropdown';
import CopyIcon from '../icons/copy';
import { pairsForCross, type FaceKey } from '../../composables/algs/cubePaint';
import {
  configToRaw,
  rawToConfig,
  isValidChar,
  buildSlotContext,
  formatRaw,
  encodePrefixFromState,
  type F2lCaseConfig,
  type SlotContext,
} from '../../composables/algs/f2lCaseId';

// cursor position in the formatted string (with hyphens) → HINTS index
// hyphens appear at display positions 2, 5, 8 once the preceding raw chars exist
// pos: 0  1  2  3  4  5  6  7  8  9 10 11 12 13
//      y  0  -  cp co  -  ep eo  -  fr br bl fl (end)
const DISPLAY_TO_HINT = [0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 8, 9, 10];

const HINTS = [
  'Type "y" (angle prefix)',
  'Number of y-turns (0–3)',
  'Corner position (0–7, see diagram)',
  'Corner orientation (0–2)',
  'Edge position (0–7)',
  'Edge orientation (0–1)',
  'Front-right slot (0=empty, 1=filled)',
  'Back-right slot',
  'Back-left slot',
  'Front-left slot',
  'Full EO — optional (0=good, 1=bad)',
];

function CubeRefDiagram() {
  const FACE = '#3f3f46';
  const STROKE = '#52525b';
  const C = '#c084fc'; // corner labels
  const E = '#34d399'; // edge labels
  const BG = '#161018';
  const fs = 16.5;
  const sw = '0.5';

  return (
    <svg viewBox="-26 -5 120 105" width="79" height="79" style={{ flexShrink: 0 }}>
      <rect x="-26" y="-5" width="120" height="105" fill={BG} />

      {/* U face (+4 x offset) */}
      <polygon points="34,0 52.75,0 41.5,11.25 22.75,11.25" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="52.75,0 71.5,0 60.25,11.25 41.5,11.25" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="71.5,0 90.25,0 79,11.25 60.25,11.25" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="22.75,11.25 41.5,11.25 30.25,22.5 11.5,22.5" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="41.5,11.25 60.25,11.25 49,22.5 30.25,22.5" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="60.25,11.25 79,11.25 67.75,22.5 49,22.5" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="11.5,22.5 30.25,22.5 19,33.75 0.25,33.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="30.25,22.5 49,22.5 37.75,33.75 19,33.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="49,22.5 67.75,22.5 56.5,33.75 37.75,33.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>

      {/* F face */}
      <rect x="0" y="33.75" width="18.75" height="18.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <rect x="18.75" y="33.75" width="18.75" height="18.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <rect x="37.5" y="33.75" width="18.75" height="18.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <rect x="0" y="52.5" width="18.75" height="18.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <rect x="18.75" y="52.5" width="18.75" height="18.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <rect x="37.5" y="52.5" width="18.75" height="18.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <rect x="0" y="71.25" width="18.75" height="18.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <rect x="18.75" y="71.25" width="18.75" height="18.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <rect x="37.5" y="71.25" width="18.75" height="18.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>

      {/* R face */}
      <polygon points="56.25,33.75 67.5,22.5 67.5,41.25 56.25,52.5" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="67.5,22.5 78.75,11.25 78.75,30 67.5,41.25" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="78.75,11.25 90,0 90,18.75 78.75,30" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="56.25,52.5 67.5,41.25 67.5,60 56.25,71.25" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="67.5,41.25 78.75,30 78.75,48.75 67.5,60" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="78.75,30 90,18.75 90,37.5 78.75,48.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="56.25,71.25 67.5,60 67.5,78.75 56.25,90" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="67.5,60 78.75,48.75 78.75,67.5 67.5,78.75" fill={FACE} stroke={STROKE} strokeWidth={sw}/>
      <polygon points="78.75,48.75 90,37.5 90,56.25 78.75,67.5" fill={FACE} stroke={STROKE} strokeWidth={sw}/>

      {/* corner labels: 0=UFR 1=UBR 2=UBL 3=UFL 4=DFR 5=DBR 7=DFL */}
      <text x="51.75" y="28.125" fill={C} fontSize={fs} textAnchor="middle" dominantBaseline="middle">0</text>
      <text x="74.25" y="5.625" fill={C} fontSize={fs} textAnchor="middle" dominantBaseline="middle">1</text>
      <text x="36.75" y="5.625" fill={C} fontSize={fs} textAnchor="middle" dominantBaseline="middle">2</text>
      <text x="14.25" y="28.125" fill={C} fontSize={fs} textAnchor="middle" dominantBaseline="middle">3</text>
      <text x="46.875" y="80.625" fill={C} fontSize={fs} textAnchor="middle" dominantBaseline="middle">4</text>
      <text x="84.375" y="52.5" fill={C} fontSize={fs} textAnchor="middle" dominantBaseline="middle">5</text>
      <text x="9.375" y="80.625" fill={C} fontSize={fs} textAnchor="middle" dominantBaseline="middle">7</text>

      {/* edge labels: 0=UF 1=UR 2=UB 3=UL 4=FR 5=BR 7=FL */}
      <text x="33" y="28.125" fill={E} fontSize={fs} textAnchor="middle" dominantBaseline="middle">0</text>
      <text x="63" y="16.875" fill={E} fontSize={fs} textAnchor="middle" dominantBaseline="middle">1</text>
      <text x="55.5" y="5.625" fill={E} fontSize={fs} textAnchor="middle" dominantBaseline="middle">2</text>
      <text x="25.5" y="16.875" fill={E} fontSize={fs} textAnchor="middle" dominantBaseline="middle">3</text>
      <text x="46.875" y="61.875" fill={E} fontSize={fs} textAnchor="middle" dominantBaseline="middle">4</text>
      <text x="84.375" y="33.75" fill={E} fontSize={fs} textAnchor="middle" dominantBaseline="middle">5</text>
      <text x="9.375" y="61.875" fill={E} fontSize={fs} textAnchor="middle" dominantBaseline="middle">7</text>

      {/* hidden pieces with leader lines (6=BL) */}
      <line x1="-15" y1="55" x2="0" y2="55" stroke={C} strokeWidth={sw}/>
      <text x="-17" y="55" fill={C} fontSize={fs} textAnchor="end" dominantBaseline="middle">6</text>
      <line x1="-15" y1="38" x2="0" y2="38" stroke={E} strokeWidth={sw}/>
      <text x="-17" y="38" fill={E} fontSize={fs} textAnchor="end" dominantBaseline="middle">6</text>
    </svg>
  );
}

const DEFAULT_PAIR = pairsForCross('up')[0];

// the default cross/pair is assumed when p is absent, so omit it to keep a reset URL clean
const isDefaultSelection = (cross: FaceKey, pair: [FaceKey, FaceKey]): boolean =>
  cross === 'up' && pair[0] === DEFAULT_PAIR[0] && pair[1] === DEFAULT_PAIR[1];

function writeURLParam(key: string, value: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (value === null || value === '') {
    params.delete(key);
  } else {
    params.set(key, value);
  }
  const qs = params.toString();
  window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}

interface F2lAdvancedInputProps {
  config: F2lCaseConfig;
  setConfig: (c: F2lCaseConfig) => void;
  cross: FaceKey;
  pair: [FaceKey, FaceKey];
}

const F2lAdvancedInput = ({ config, setConfig, cross, pair }: F2lAdvancedInputProps) => {
  const [open, setOpen] = useState(false);
  const [rawInput, setRawInput] = useState(() => configToRaw(config));
  const [hintIndex, setHintIndex] = useState(0);
  const [prevConfig, setPrevConfig] = useState(config);
  const hydrated = useRef(false);

  if (prevConfig !== config) {
    setPrevConfig(config);
    setRawInput(configToRaw(config));
  }

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const raw = configToRaw(config);
    writeURLParam('c', raw.length > 2 ? raw : null);
    writeURLParam('p', isDefaultSelection(cross, pair) ? null : encodePrefixFromState(cross, pair));
  }, [config, cross, pair]);

  const handleConfigInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value.replace(/[-()]/g, '');
    let len = 0;
    let ctx: SlotContext | undefined;
    while (len < typed.length) {
      if (len === 6) ctx = buildSlotContext(typed, cross, pair);
      if (!isValidChar(len, typed[len], ctx)) break;
      len++;
    }
    const raw = typed.slice(0, len);

    setRawInput(raw);
    const parsed = rawToConfig(raw, cross, pair);
    if (parsed) {
      setConfig(parsed);
      setPrevConfig(parsed);
    }
    setHintIndex(Math.min(raw.length, 10));
  };

  const updateHintFromCursor = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const pos = (e.target as HTMLInputElement).selectionStart ?? 0;
    setHintIndex(DISPLAY_TO_HINT[Math.min(pos, 13)]);
  };

  const displayText = formatRaw(rawInput);
  const prefix = encodePrefixFromState(cross, pair);
  const [inputFocused, setInputFocused] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${prefix}-${displayText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="w-full border border-neutral-600 hover:border-neutral-500 rounded-sm overflow-hidden">
      <button
        type="button"                                                                                                                                                             
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-primary-100 transition-colors"
      >
        <span>Advanced input</span>
        <CaretIcon className={`text-base transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="flex flex-col gap-3 p-3 border-t border-neutral-600">
          <div className="flex flex-row flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-dark_accent">Case ID</label>
              <div className={`flex items-center px-2 py-1 rounded-sm border ${inputFocused ? 'border-primary-100' : 'border-neutral-600'} bg-dark text-sm font-mono`}>
                <span 
                  className="text-neutral-500 shrink-0"
                  onClick={() => { (document.querySelector('#f2l-config-input') as HTMLInputElement)?.focus(); }}
                >{prefix}-</span>
                <input
                  type="text"
                  id="f2l-config-input"
                  value={displayText}
                  onChange={handleConfigInput}
                  onSelect={updateHintFromCursor}
                  onKeyUp={updateHintFromCursor}
                  onFocus={(e) => { setInputFocused(true); updateHintFromCursor(e); }}
                  onBlur={() => { setInputFocused(false); setHintIndex(-1); }}
                  maxLength={24}
                  placeholder="y0-72-71-1101(110)"
                  spellCheck={false}
                  className="min-w-0 bg-transparent text-primary-100 outline-none placeholder:text-neutral-600"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="ml-1 shrink-0 flex items-center justify-center text-neutral-500 hover:text-primary-100 transition-colors"
                  style={{ width: '1.4em', height: '1.4em' }}
                  tabIndex={-1}
                >
                  {copied ? <span className="text-lg leading-none">✓</span> : <CopyIcon style={{ width: '1.4em', height: '1.4em' }} />}
                </button>
              </div>
              <span className="h-4 text-xs text-dark_accent">{HINTS[hintIndex]}</span>
            </div>
            <CubeRefDiagram />
          </div>

        </div>
      )}
    </div>
  );
};

export default F2lAdvancedInput;
