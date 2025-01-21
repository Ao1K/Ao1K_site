interface TPSInfoProps {
  moveCount: number;
  solveTime: number | string;
  tpsRef: React.MutableRefObject<string>;
}



export default function TPSInfo({ moveCount, solveTime }: TPSInfoProps) {

  let tpsString = "";
  if (solveTime && typeof solveTime === 'number' && solveTime > 0) {
    tpsString = `(${Math.round((moveCount / solveTime) * 100) / 100} tps)`;

  } else {
    tpsString = "(-- tps)";
  }

  return <div className="text-primary-100 mx-2 text-xl">{tpsString}</div>;
};