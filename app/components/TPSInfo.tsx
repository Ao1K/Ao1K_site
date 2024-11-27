import { useEffect, useRef } from 'react';

interface TPSInfoProps {
  moveCount: number;
  solveTime: number | string;
  tpsRef: React.MutableRefObject<string>;
}

export default function TPSInfo({ moveCount, solveTime, tpsRef }: TPSInfoProps) {
  const tpsDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let tpsString = "";
    if (solveTime && typeof solveTime === 'number' && solveTime > 0) {
      tpsString = `(${Math.round((moveCount / solveTime) * 100) / 100} tps)`;
    } else {
      tpsString = "(-- tps)";
    }

    tpsRef.current = tpsString;

    if (tpsDivRef.current) {
      tpsDivRef.current.textContent = tpsString;
    }
  }, [moveCount, solveTime]);

  return <div ref={tpsDivRef} className="text-light mx-2 text-xl" />;
};