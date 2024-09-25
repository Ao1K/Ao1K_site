import { useEffect, useRef } from 'react';

export default function TPSInfo({ moveCount, solveTime }: { moveCount: number; solveTime: number | string }) {
  const tpsDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let tpsString = "";
    if (solveTime && typeof solveTime === 'number' && solveTime > 0) {
      tpsString = `(${Math.round((moveCount / solveTime) * 100) / 100} tps)`;
    } else {
      tpsString = "(-- tps)";
    }

    if (tpsDivRef.current) {
      tpsDivRef.current.textContent = tpsString;
    }
  }, [moveCount, solveTime]);

  return <div ref={tpsDivRef} className="text-light mx-2 text-xl" />;
};