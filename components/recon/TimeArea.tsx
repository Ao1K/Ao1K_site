import updateURL from '../../composables/recon/updateURL';
import { PAGE_TRANSITION_NAMES } from '../../composables/recon/breakdownTransition';
import { MAX_PLUS_TWO_PENALTY, type PenaltyStatus } from '../../composables/recon/penaltyStatus';

const ACTIVE_PENALTY_CLASSES = 'border-primary-100 bg-primary-100 text-primary-900';
const INACTIVE_PENALTY_CLASSES = 'border-neutral-600 text-primary-100';
const ACTIVE_PENALTY_HOVER = 'hover:bg-primary-300';
const INACTIVE_PENALTY_HOVER = 'hover:bg-neutral-600';

interface TimeAreaProps {
  solveTime: number | string;
  onSolveTimeChange: (solveTime: number | string) => void;
  penaltyStatus: PenaltyStatus;
  onPenaltyStatusChange: (penaltyStatus: PenaltyStatus) => void;
  totalMoves: number;
  tpsString: string;
  committedSplits: string[];
  requiredSplitIndices: number[];
  showSplitsColumn: boolean;
}

export default function TimeArea({
  solveTime,
  onSolveTimeChange,
  penaltyStatus,
  onPenaltyStatusChange,
  totalMoves,
  tpsString,
  committedSplits,
  requiredSplitIndices,
  showSplitsColumn,
}: TimeAreaProps) {
  const isTimeHidden = penaltyStatus === 'DNF' || penaltyStatus === 'untimed';
  const plusTwoPenalty = typeof penaltyStatus === 'number' ? penaltyStatus : 0;

  const handleSolveTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = /^\d{0,5}(\.\d{1,3})?$/;

    if (!regex.test(value)) {
      return;
    }

    onSolveTimeChange(value === '' ? '' : parseFloat(value));
    updateURL('time', value);
  }

  const handlePenaltyStatusChange = (newStatus: PenaltyStatus) => {
    onPenaltyStatusChange(newStatus);
    updateURL('penalty', newStatus === 0 ? null : `${newStatus}`);
  }

  const handleTimeFocus = () => {
    if (isTimeHidden) {
      handlePenaltyStatusChange(0);
    }
  }

  const handlePlusTwo = () => {
    handlePenaltyStatusChange(Math.min(plusTwoPenalty + 2, MAX_PLUS_TWO_PENALTY));
  }

  const handleMinusTwo = () => {
    if (plusTwoPenalty === 0) return;
    handlePenaltyStatusChange(plusTwoPenalty - 2);
  }

  const handleToggleStatus = (status: 'DNF' | 'untimed') => {
    handlePenaltyStatusChange(penaltyStatus === status ? 0 : status);
  }

  const splitsSum = committedSplits
    .filter(s => s !== '')
    .reduce((acc, s) => acc + parseFloat(s), 0);

  const allRequiredSplitsFilled = requiredSplitIndices.length > 0 &&
    requiredSplitIndices.every(i => committedSplits[i] != null && committedSplits[i] !== '');

  const showSplitsWarning = showSplitsColumn
    && !isTimeHidden
    && typeof solveTime === 'number'
    && allRequiredSplitsFilled
    && Math.abs(splitsSum - solveTime) > 0.1;

  const penalizedTime = typeof solveTime === 'number'
    ? Math.round((solveTime + plusTwoPenalty) * 1000) / 1000
    : null;

  const timeSuffix = plusTwoPenalty > 0
    ? `+ ${plusTwoPenalty}${penalizedTime !== null ? ` = ${penalizedTime}` : ''} sec`
    : 'sec';

  const isPlusTwoActive = plusTwoPenalty > 0;
  const plusTwoHover = isPlusTwoActive ? ACTIVE_PENALTY_HOVER : INACTIVE_PENALTY_HOVER;
  const plusButtonHover = plusTwoPenalty < MAX_PLUS_TWO_PENALTY ? plusTwoHover : '';
  const minusButtonHover = plusTwoPenalty > 0 ? plusTwoHover : '';

  const statusButtonClasses = (status: 'DNF' | 'untimed') => penaltyStatus === status
    ? `${ACTIVE_PENALTY_CLASSES} ${ACTIVE_PENALTY_HOVER}`
    : `${INACTIVE_PENALTY_CLASSES} ${INACTIVE_PENALTY_HOVER}`;

  return (
    <div
      id="time-area"
      className="px-3 pt-12 flex flex-col w-full pb-16"
      style={{ viewTransitionName: PAGE_TRANSITION_NAMES.stats }}
    >
      <div className="text-xl text-dark_accent font-medium w-full">Time</div>
      <div id="time-stats" className="flex flex-row flex-wrap text-nowrap items-center w-full gap-y-2 pb-4">
        <div
          id="time-field"
          className={`border border-neutral-600 group flex flex-row items-center justify-start ${isTimeHidden ? 'opacity-50' : ''}`}
        >
          <input
            id="time-input"
            type="number"
            placeholder="00.000"
            className="pt-2 pb-2 px-2 text-xl text-primary-100 bg-primary-900 group-focus:border-primary-100 hover:bg-primary-800 rounded-sm box-content no-spinner w-17"
            value={isTimeHidden ? '' : solveTime}
            onChange={handleSolveTimeChange}
            onFocus={handleTimeFocus}
            onWheel={(e) => e.currentTarget.blur()}
            autoComplete="off"
            tabIndex={4}
          />
          <div className="text-primary-100 pr-2 text-xl">{timeSuffix}</div>
        </div>
        <div className="text-primary-100 ml-2 text-xl">{totalMoves} stm </div>
        <div className="flex-nowrap text-nowrap items-center flex flex-row">
          <div className={`text-primary-100 mx-2 text-xl ${isTimeHidden ? 'opacity-50' : ''}`}>
            {(!isTimeHidden && tpsString) || '(-- tps)'}
          </div>
        </div>
      </div>
      <div className="text-xl text-dark_accent font-medium w-full">Tags</div>
      <div id="penalty-buttons" className="flex flex-row items-center gap-1 pb-2 text-sm select-none">
        <div
          className={`flex flex-row items-center h-8 border rounded-sm ${isPlusTwoActive ? ACTIVE_PENALTY_CLASSES : INACTIVE_PENALTY_CLASSES}`}
        >
          <button
            type="button"
            className={`h-full px-2 py-1 rounded-l-sm ${plusButtonHover}`}
            onClick={handlePlusTwo}
            aria-label="Add 2 second penalty"
          >
            +
          </button>
          <span>/</span>
          <button
            type="button"
            className={`h-full px-2 py-1 ${minusButtonHover}`}
            onClick={handleMinusTwo}
            aria-label="Remove 2 second penalty"
          >
            -
          </button>
          <span className="pr-2">2</span>
        </div>
        <button
          type="button"
          className={`h-8 px-2 py-1 border rounded-sm ${statusButtonClasses('DNF')}`}
          onClick={() => handleToggleStatus('DNF')}
        >
          DNF
        </button>
        <button
          type="button"
          className={`h-8 px-2 py-1 border rounded-sm ${statusButtonClasses('untimed')}`}
          onClick={() => handleToggleStatus('untimed')}
        >
          Untimed
        </button>

        {/* TODO: In the future, this would be where the cube make & model selector would go. Would need a new child component for tags specifically. */}
      </div>
      {showSplitsWarning && (
        <div className="text-cube-orange text-sm">Time doesn&apos;t match sum of splits ({splitsSum.toFixed(3)} sec)</div>
      )}
    </div>
  );
}
