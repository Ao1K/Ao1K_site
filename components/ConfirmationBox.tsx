import React, { useState } from 'react';

interface ConfirmationBoxProps {
  confirmationMsg: string;
  confirm: string;
  deny: string;
  confirmStyle: string;
  denyStyle: string;
  allowCloseForever: boolean;
  onConfirm: (allowCloseForever: boolean) => void;
  onDeny: (allowCloseForever: boolean) => void;
  messageByline?: string;
}

export default function ConfirmationBox(props: ConfirmationBoxProps) {
  const { confirmationMsg, confirm, deny, confirmStyle, denyStyle, allowCloseForever, onConfirm, onDeny, messageByline } = props;
  const messageLines = confirmationMsg.split(/\\n/g);
  const [isForever, setIsForever] = useState(false);


  const handleConfirm = () => {
    onConfirm(isForever);
  };

  const handleDeny = () => {
    onDeny(isForever);
  };

  const handleClose = () => {
    onDeny(isForever);
  };

  return (
    <div className="fixed z-50 inset-0 flex items-center justify-center bg-primary-100 bg-opacity-50">
      <div className="bg-white p-6 rounded shadow-lg relative max-w-[400px] w-full">
        <div className="absolute top-2 right-2 py-1 px-3 text-xl cursor-pointer whitespace-pre-wrap" onClick={handleClose}>&times;</div>
        
        {messageLines.map((line, index) => (
          <p key={index} className="my-4">{line}</p>
        ))}
        
        {allowCloseForever && <div className="flex items-center mb-4" onClick={() => setIsForever(!isForever)}>
          <input
            type="checkbox"
            checked={isForever}
            className="mr-2 select-none"
            readOnly
          />
          <label className='pointer-events-none select-none'>Don&apos;t show this again</label>
        </div>}
        
        {messageByline && <p className="text-sm text-gray-500 pb-6">{messageByline}</p>}

        <div className="flex justify-end space-x-2">
          <button 
            onClick={handleConfirm} 
            className={`px-4 py-2 rounded border-dark select-none ${confirmStyle}`}
          >
            {confirm}
          </button>
          
          <button 
            onClick={handleDeny} 
            className={`px-4 py-2 rounded border-dark select-none ${denyStyle}`}
          >
            {deny}
          </button>
        </div>
      </div>
    </div>
  );
};

