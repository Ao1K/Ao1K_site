'use client';
import { useState, useEffect, useCallback, RefObject, useMemo } from 'react';
import manualAlgs from '../../utils/manualAlgs';
import { reverseMove } from '../../composables/recon/transformHTML';
import type { ImperativeRef } from './MovesTextEditor';

interface ManualAlgVerifierProps {
  scrambleRef: RefObject<ImperativeRef | null>;
  solutionRef: RefObject<ImperativeRef | null>;
}

type Decision = 'accept_y' | 'accept_U' | 'accept_both' | 'accept_none' | 'rejected' | null;

const ACCEPT_TYPES: { key: Decision; label: string; shortcut: string }[] = [
  { key: 'accept_y', label: 'Accept for y', shortcut: '1' },
  { key: 'accept_U', label: 'Accept for U', shortcut: '2' },
  { key: 'accept_both', label: 'Accept for both', shortcut: '3' },
  { key: 'accept_none', label: 'Accept (no mods)', shortcut: '4' },
];

const getAlgInverse = (alg: string): string => {
  let reversedAlg = '';
  const moves = alg.split(' ').reverse();
  moves.forEach((move) => {
    const reversedMove = reverseMove(move);
    if (reversedMove) {
      reversedAlg += reversedMove + ' ';
    }
  });
  return reversedAlg.trim();
};

export default function ManualAlgVerifier({ scrambleRef, solutionRef }: ManualAlgVerifierProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});

  const currentAlg = manualAlgs[currentIndex];
  const currentDecision = decisions[currentIndex] ?? null;

  // compute categorized arrays from decisions
  const results = useMemo(() => {
    const accept_y: string[] = [];
    const accept_U: string[] = [];
    const accept_both: string[] = [];
    const accept_none: string[] = [];
    const rejected: string[] = [];

    for (let i = 0; i < manualAlgs.length; i++) {
      const decision = decisions[i];
      const alg = manualAlgs[i];
      switch (decision) {
        case 'accept_y': accept_y.push(alg); break;
        case 'accept_U': accept_U.push(alg); break;
        case 'accept_both': accept_both.push(alg); break;
        case 'accept_none': accept_none.push(alg); break;
        case 'rejected': rejected.push(alg); break;
      }
    }
    return { accept_y, accept_U, accept_both, accept_none, rejected };
  }, [decisions]);

  const totalAccepted = results.accept_y.length + results.accept_U.length + results.accept_both.length + results.accept_none.length;
  const totalDecided = totalAccepted + results.rejected.length;
  const isComplete = totalDecided === manualAlgs.length;

  // set scramble to inverse of current alg (sets up the case)
  // set solution to original alg
  // apply multiple times to override daily scramble fetch
  useEffect(() => {
    if (!currentAlg) return;

    const inverse = getAlgInverse(currentAlg);
    const applyAlgs = () => {
      if (scrambleRef.current) {
        scrambleRef.current.transform(inverse);
      }
      if (solutionRef.current) {
        solutionRef.current.transform(currentAlg);
      }
    };

    applyAlgs();
    const timeout1 = setTimeout(applyAlgs, 100);
    const timeout2 = setTimeout(applyAlgs, 500);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [currentIndex, currentAlg, scrambleRef, solutionRef]);

  const downloadResults = useCallback(() => {
    const jsonData = {
      timestamp: new Date().toISOString(),
      totalAlgorithms: manualAlgs.length,
      summary: {
        accept_y: results.accept_y.length,
        accept_U: results.accept_U.length,
        accept_both: results.accept_both.length,
        accept_none: results.accept_none.length,
        rejected: results.rejected.length,
      },
      accept_y: results.accept_y,
      accept_U: results.accept_U,
      accept_both: results.accept_both,
      accept_none: results.accept_none,
      rejected: results.rejected,
    };

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').split('.')[0];
    link.download = `manual-algs-verified-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Downloaded verification results`);
  }, [results]);

  const makeDecision = useCallback((decision: Decision) => {
    setDecisions(prev => ({ ...prev, [currentIndex]: decision }));
    if (currentIndex < manualAlgs.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleForward = useCallback(() => {
    if (currentIndex < manualAlgs.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex]);

  // keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        makeDecision('accept_y');
      } else if (e.key === '2') {
        e.preventDefault();
        makeDecision('accept_U');
      } else if (e.key === '3') {
        e.preventDefault();
        makeDecision('accept_both');
      } else if (e.key === '4') {
        e.preventDefault();
        makeDecision('accept_none');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        makeDecision('rejected');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleForward();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [makeDecision, handleBack, handleForward]);

  // auto-download when complete
  useEffect(() => {
    if (isComplete) {
      downloadResults();
    }
  }, [isComplete, downloadResults]);

  const isAccepted = currentDecision && currentDecision !== 'rejected';

  const getDecisionLabel = (decision: Decision): string => {
    switch (decision) {
      case 'accept_y': return 'Accepted (y)';
      case 'accept_U': return 'Accepted (U)';
      case 'accept_both': return 'Accepted (both)';
      case 'accept_none': return 'Accepted (no mods)';
      case 'rejected': return 'Rejected';
      default: return '';
    }
  };

  return (
    <div className="fixed bottom-4 left-4 bg-primary-800 border border-primary-600 rounded-lg p-4 shadow-lg z-50 min-w-[320px]">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-primary-100 font-semibold">Manual Alg Verifier</h3>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handleBack}
          disabled={currentIndex === 0}
          className="px-2 py-1 bg-primary-700 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-primary-200"
        >
          ← Back
        </button>
        <div className="text-primary-300 text-sm">
          {currentIndex + 1} / {manualAlgs.length}
        </div>
        <button
          onClick={handleForward}
          disabled={currentIndex >= manualAlgs.length - 1}
          className="px-2 py-1 bg-primary-700 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-primary-200"
        >
          Forward →
        </button>
      </div>

      {/* Current alg */}
      <div className="text-primary-100 font-mono mb-3 p-2 bg-primary-900 rounded">
        {currentAlg}
      </div>


      {/* Accept buttons */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {ACCEPT_TYPES.map(({ key, label, shortcut }) => (
          <button
            key={key}
            onClick={() => makeDecision(key)}
            className={`px-2 py-2 rounded text-white text-xs transition-all ${
              currentDecision === key
                ? 'bg-green-500 ring-2 ring-green-300'
                : 'bg-green-700 hover:bg-green-600'
            }`}
          >
            {label} ({shortcut})
          </button>
        ))}
      </div>

      {/* Reject button */}
      <button
        onClick={() => makeDecision('rejected')}
        className={`w-full px-3 py-2 rounded text-white text-sm transition-all ${
          currentDecision === 'rejected'
            ? 'bg-red-500 ring-2 ring-red-300'
            : 'bg-red-700 hover:bg-red-600'
        }`}
      >
        Reject (⌫)
      </button>

      {/* Stats */}
      <div className="mt-2 text-primary-400 text-xs">
        <div>Accepted: {totalAccepted} (y:{results.accept_y.length} U:{results.accept_U.length} both:{results.accept_both.length} none:{results.accept_none.length})</div>
        <div>Rejected: {results.rejected.length} | Remaining: {manualAlgs.length - totalDecided}</div>
      </div>

      {/* Download button */}
      {isComplete && (
        <button
          onClick={downloadResults}
          className="mt-3 w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
        >
          Download Results
        </button>
      )}
    </div>
  );
}
