import React, { useState, useImperativeHandle, forwardRef } from 'react';
import ContextMenu from './ContextMenu';

// Handle interface for imperative context menu control
export interface ContextMenuHandle {
  show: (x: number, y: number) => void;
  close: () => void;
}

// Props for the imperative context menu component
interface ContextMenuImperativeProps {
  onToggleControls: () => void;
  showControls: boolean;
}

// Imperative wrapper around ContextMenu to avoid re-rendering parent
const ContextMenuImperative = forwardRef<ContextMenuHandle, ContextMenuImperativeProps>(
  ({ onToggleControls, showControls }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    useImperativeHandle(ref, () => ({
      show: (x: number, y: number) => {
        setPosition({ x, y });
        setIsVisible(true);
      },
      close: () => {
        setIsVisible(false);
      },
    }), []);

    const handleClose = () => {
      setIsVisible(false);
    };

    return (
      <ContextMenu
        isVisible={isVisible}
        position={position}
        showControls={showControls}
        onToggleControls={onToggleControls}
        onClose={handleClose}
      />
    );
  }
);

export default ContextMenuImperative;
