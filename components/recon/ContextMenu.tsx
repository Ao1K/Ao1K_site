import React from 'react';

interface ContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  showControls: boolean;
  onToggleControls: () => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  isVisible,
  position,
  showControls,
  onToggleControls,
  onClose
}) => {
  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop to close menu when clicking outside */}
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      
      {/* Context menu */}
      <div
        className="fixed z-50 bg-white border border-gray-300 rounded-sm shadow-lg py-1 min-w-32"
        style={{
          left: position.x,
          top: position.y,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
          onClick={() => {
            onToggleControls();
            onClose();
          }}
        >
          <span>Show Controls</span>
          <input
            type="checkbox"
            checked={showControls}
            onChange={() => {}} // Handled by button click
            className="ml-2"
          />
        </button>
      </div>
    </>
  );
};

export default ContextMenu;
