'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SimpleCubeInterpreter, type Suggestion } from '../../composables/recon/SimpleCubeInterpreter';
import type { Doc } from '../../composables/recon/ExactAlgSuggester';
import { buildF2lCubeState } from '../../composables/algs/f2lCubeState';
import { type FaceKey } from '../../composables/algs/cubePaint';
import AlgsetSelector, { type AlgsetId } from './AlgsetSelector';
import YourAlgsList from './YourAlgsList';
import { isFullEOValid, type F2lCaseConfig } from '../../composables/algs/f2lCaseId';
import Footer from '../Footer';

const faceColorInitials: Record<FaceKey, string> = {
  up: 'W', down: 'Y', front: 'G', back: 'B', left: 'O', right: 'R',
};
const faceColorNames: Record<FaceKey, string> = {
  up: 'white', down: 'yellow', front: 'green', back: 'blue', right: 'red', left: 'orange',
};

interface AlgsContentProps {
  initialCross: FaceKey;
  initialPair: [FaceKey, FaceKey];
  initialConfig: F2lCaseConfig;
  initialAlgset: AlgsetId | null;
}

const AlgsContent = ({ initialCross, initialPair, initialConfig, initialAlgset }: AlgsContentProps) => {
  const [cross, setCross] = useState<FaceKey>(initialCross);
  const [pair, setPair] = useState<[FaceKey, FaceKey]>(initialPair);
  const [config, setConfig] = useState<F2lCaseConfig>(initialConfig);

  const interpreterRef = useRef<SimpleCubeInterpreter | null>(null);
  const [ready, setReady] = useState(false);

  // load the f2l and zbls databases once, then build the interpreter
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('../../public/recon/compiled-f2l-algs.json'),
      import('../../public/recon/compiled-zbls-algs.json'),
    ]).then(([f2lDoc, zblsDoc]) => {
      if (cancelled) return;
      const interpreter = new SimpleCubeInterpreter();
      interpreter.addAlgset('f2l', f2lDoc.default.algorithms as Doc[]);
      interpreter.addAlgset('zbls', zblsDoc.default.algorithms as Doc[]);
      interpreterRef.current = interpreter;
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const hasPair = config.corner != null && config.edge != null;

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!ready || !interpreterRef.current || !hasPair) return [];
    // an odd number of flipped edges is an illegal cube; the UI warns instead of suggesting
    if (!isFullEOValid(config)) return [];
    const cubeState = buildF2lCubeState(config, cross, pair);
    const steps = interpreterRef.current.getStepsCompleted(cubeState);

    // restrict suggestions to the pair being built, so its algs aren't cut by the interpreter's
    // global top-N limit when other unsolved pairs have many faster algs.
    const f2lPair = pair.map((f) => faceColorNames[f]) as [string, string];
    const allSuggestions = interpreterRef.current.getAlgSuggestions(steps, { f2lPair, enabledAlgsets: 'all' });
    console.log('all suggs', allSuggestions)

    // the interpreter labels the pair by its own slotColors order (e.g. "RG pair"), which can
    // be reversed from this component's pair order ("GR pair"), so match by color set.
    const wantColors = pair.map((f) => faceColorInitials[f]);
    const isTargetPair = (step: string) => {
      const m = /^([WYGBRO])([WYGBRO]) pair$/.exec(step);
      return m != null && wantColors.includes(m[1]) && wantColors.includes(m[2]);
    };
    return allSuggestions.filter((s) => s.steps.some(isTargetPair));
  }, [ready, hasPair, config, cross, pair]);

  return (
    <>
      <AlgsetSelector
        cross={cross}
        setCross={setCross}
        pair={pair}
        setPair={setPair}
        config={config}
        setConfig={setConfig}
        suggestions={suggestions}
        ready={ready}
        initialAlgset={initialAlgset}
      />
      {/* aligned to F2lSearch's left edge by sharing its max width */}
      <div className="w-full max-w-220">
        <YourAlgsList hasSolutions={suggestions.length > 0} />
      </div>
      <Footer/>
    </>
  );
};

export default AlgsContent;
