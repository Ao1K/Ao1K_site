'use client';

interface AlgDraftActionsProps {
  actionLabel: string;
  confirming: boolean;
  disabled: boolean;
  onSubmit: () => void;
  onCommit: () => void;
  onDismissConfirm: () => void;
  onCancel: () => void;
}

const AlgDraftActions = ({
  actionLabel,
  confirming,
  disabled,
  onSubmit,
  onCommit,
  onDismissConfirm,
  onCancel,
}: AlgDraftActionsProps) => (
  <span className="flex min-w-0 flex-wrap items-center justify-end gap-2">
    {confirming && (
      <span className="min-w-0 text-sm text-neutral-400">Alg solves unknown step. {actionLabel} anyway?</span>
    )}
    <span className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={confirming ? onCommit : onSubmit}
        disabled={!confirming && disabled}
        className="rounded-sm border border-primary-300 px-2 py-0.5 text-xs font-medium text-primary-200 hover:bg-primary-900 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {actionLabel}
      </button>
      <button
        type="button"
        onClick={confirming ? onDismissConfirm : onCancel}
        className="rounded-sm border border-neutral-400 px-2 py-0.5 text-xs font-medium text-neutral-400 hover:bg-neutral-600 transition-colors duration-100"
      >
        Cancel
      </button>
    </span>
  </span>
);

export default AlgDraftActions;
