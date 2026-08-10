'use client';

import { useAlgDraft } from '../../composables/algs/useAlgDraft';
import MovesTextEditor from '../recon/MovesTextEditor';
import AlgDraftActions from './AlgDraftActions';

interface AlgTextEditorProps {
  alg: string;
  onCommit: (alg: string) => void;
  onChange?: (alg: string) => void;
  onCancel: () => void;
}

const AlgTextEditor = ({ alg, onCommit, onChange, onCancel }: AlgTextEditorProps) => {
  const draft = useAlgDraft(alg, onCommit, { onChange });

  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); draft.submit(); }
        if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
      }}
    >
      <div
        className="min-w-40 flex-1
          **:[[contenteditable]]:min-h-0 **:[[contenteditable]]:py-1
          **:[[contenteditable]]:text-base"
      >
        <MovesTextEditor
          name="editAlg"
          autofocus={false}
          updateHistoryBtns={() => {}}
          lineHeight={24}
          simpleInput
          {...draft.editorProps}
        />
      </div>

      <AlgDraftActions
        actionLabel="Save"
        confirming={draft.confirming}
        disabled={draft.normalized === ''}
        onSubmit={draft.submit}
        onCommit={draft.commit}
        onDismissConfirm={draft.dismissConfirm}
        onCancel={onCancel}
      />
    </div>
  );
};

export default AlgTextEditor;
