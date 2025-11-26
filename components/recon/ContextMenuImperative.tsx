import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
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
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

// Imperative wrapper around ContextMenu to avoid re-rendering parent
const ContextMenuImperative = forwardRef<ContextMenuHandle, ContextMenuImperativeProps>(
  ({ onToggleControls, showControls, containerRef }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const handleShow = (x: number, y: number) => {
      // Assume context menu dimensions
      const contextMenuWidth = 150; // approximate width based on min-w-32 + padding
      const contextMenuHeight = 50; // approximate height for single item
      
      let adjustedX = x;
      let adjustedY = y;
      
      if (containerRef?.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        
        // Adjust X position if menu would overflow right edge
        if (x + contextMenuWidth > containerRect.right) {
          adjustedX = containerRect.right - contextMenuWidth;
        }
        
        // Ensure menu doesn't go past left edge of container
        if (adjustedX < containerRect.left) {
          adjustedX = containerRect.left;
        }
        
        // Adjust Y position if menu would overflow bottom edge
        if (y + contextMenuHeight > containerRect.bottom) {
          adjustedY = containerRect.bottom - contextMenuHeight;
        }
        
        // Ensure menu doesn't go past top edge of container
        if (adjustedY < containerRect.top) {
          adjustedY = containerRect.top;
        }
      }

      setPosition({ x: adjustedX, y: adjustedY });
      setIsVisible(true);
    };

    useImperativeHandle(ref, () => ({
      show: (x: number, y: number) => {
        handleShow(x, y);
      },
      close: () => {
        setIsVisible(false);
      },
    }), []);

    const handleClose = () => {
      setIsVisible(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };

    useEffect(() => {
      if (isVisible) {
        document.addEventListener('keydown', handleEscape);
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isVisible]);

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
ContextMenuImperative.displayName = 'ContextMenuImperative';
