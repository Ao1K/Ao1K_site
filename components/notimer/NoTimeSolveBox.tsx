import React, { useRef, useState, useEffect } from 'react';
import { debounce, lte } from "lodash";
import CloseIcon from "../../components/icons/close";
import WriteIcon from "../../components/icons/write";
import ConfirmationBox from "../../components/ConfirmationBox";
import sanitizeHtml from 'sanitize-html';
import { shapesTable } from '../../utils/shapesTable';

export interface Check {
  id: number;
  checked: boolean;
  text: string;
  location: 'pre' | 'post';
}

// export interface CheckBoxProps extends Check {
//   editChecked: (id: number, state: boolean) => void; // cycles between checked, unchecked, and null
//   editText: (id: number) => void; // updates text, maintains id
//   handleToggle: (id: number) => void; // toggles checked state
// }

export interface NoTimeSolveBoxProps {
  checks: Check[];
  setChecks: (checks: Check[]) => void;
  showEditConfirmation: boolean;
  setShowEditConfirmation: (showEditConfirmation: boolean) => void;
  location: 'pre' | 'post';
}

export default function NoTimeSolveBox(props: NoTimeSolveBoxProps) {
  const { checks, setChecks, showEditConfirmation, setShowEditConfirmation, location } = props;
  const filteredChecks = checks ? checks.filter((check) => check.location === location) : [];

  const MAX_CHECK_TEXT_LENGTH = 500;
  
  const lastEditID = useRef<number>(-1);
  const newCheckAdded = useRef<boolean>();
  const isEditingCheck = useRef<boolean>();

  const sanitizeConf = {
    allowedTags: ["b", "i", "u", "br", "div"],
  };
  

  const getHighestId = (checks: Check[]) => {
    let highest = 0;
    if (!checks || checks.length === 0) {
      return highest;
    }

    checks.forEach((check) => {
      if (check.id > highest) {
        highest = check.id;
      }
    });
    return highest;
  };

  const addCheckBox = () => {
    const newId = getHighestId(checks) + 1;

    const newCheck: Check = { id: newId, checked: false, text: '', location: location };
    const oldChecks = checks ? checks : [];
    console.log('adding check', location);
    setChecks([...oldChecks, newCheck]);
    lastEditID.current = newId;
    newCheckAdded.current = true;
  };


  const updateCheckText = (id: number, newText: string, readOnly?: boolean) => {
    if (readOnly === undefined) { readOnly = true; }

    // set check back to read-only
    const textInput = document.getElementById(`check-text-${location + id}`) as HTMLDivElement;
    if (textInput) {
      textInput.contentEditable = 'false';
    }

    const clickableDiv = document.getElementById(`clickable-check-${location + id}`);
    if (clickableDiv) {
      clickableDiv.style.pointerEvents = 'auto';
      clickableDiv.style.userSelect = 'text';
    }

    const newChecks = checks.map((check) => {
      if (check.id === id) {
        return { ...check, text: newText };
      }
      return check;
    });

    console.log('new checks:', newText);
    setChecks(newChecks)
    
    isEditingCheck.current = false;
  };

  const handleEdit = (id: number) => {
    console.log('id calling handleEdit:', id);
    lastEditID.current = id;

    console.log('showEdit?:', showEditConfirmation);

    if (showEditConfirmation === undefined || showEditConfirmation) {
      const popup = document.getElementById(`edit-confirm-popup-${location}`);
      if (popup) {
        popup.style.display = 'block';
      }
    } else {
      handleEditConfirmed(true);
    }
  };

  const handleToggle = (id: number) => {
    
    console.log('isEditing:', isEditingCheck.current);
    if (isEditingCheck.current) return;

    const newChecks = checks.map((check) => {
      if (check.id === id) {
        return { ...check, checked: !check.checked };
      }
      return check;
    });

    setChecks(newChecks);
  };

  const handleDelete = (id: number) => {
    const newChecks = checks.filter((check) => check.id !== id);

    setChecks(newChecks);
  };

  const handleEditConfirmed = (isClosedForever?: boolean) => {

    const popup = document.getElementById(`edit-confirm-popup-${location}`);
    if (popup) {
      popup.style.display = 'none';
    }

    const id = lastEditID.current;

    isClosedForever === undefined ?  null : setShowEditConfirmation(!isClosedForever);
    console.log('showEdit?:', showEditConfirmation);

    const clickableDiv = document.getElementById(`clickable-check-${location + id}`) as HTMLDivElement;
    if (clickableDiv) {
      clickableDiv.style.pointerEvents = 'none';
      clickableDiv.style.userSelect = 'none';
    }

    const textInput = document.getElementById(`check-text-${location + id}`) as HTMLDivElement;
    if (textInput) {
      textInput.contentEditable = 'true';
      textInput.focus();
    }
  };

  const closeConfirmation = (isClosedForever: boolean) => {
    const popup = document.getElementById(`edit-confirm-popup-${location}`);
    if (popup) {
      popup.style.display = 'none';
    }
    
    console.log('forever:', isClosedForever);
    setShowEditConfirmation(!isClosedForever);
    console.log('showEdit?:', showEditConfirmation);
  };

  const handleTextChange = (id: number, readOnly: boolean) => {
    isEditingCheck.current = true;
    console.log('isEditing:', isEditingCheck.current);
    console.log('change or blur detected');
    const textInput = document.getElementById(`check-text-${location + id}`) as HTMLDivElement;
    let text = textInput ? sanitizeHtml(textInput.innerHTML, sanitizeConf) : '';
    // const text = textInput ? textInput.innerHTML : ''; // TESTING ONLY

    
    if (text) {
      text = text.slice(0, MAX_CHECK_TEXT_LENGTH);

      updateCheckText(id, text, readOnly);
    }
    
  };

  useEffect(() => { // "needed" because new check must be rendered before it can be focused on
    if (newCheckAdded.current) {
      console.log('new check added:', newCheckAdded.current);
      newCheckAdded.current = false; // Reset the ref
      handleEditConfirmed();
    }
  }, [checks]);


  return (
    <div className="w-5/6 min-w-5/6">
      <div className="italic">{location === 'pre' ? 'Pre-solve' : 'Post-solve'} checklist</div>
      {filteredChecks && filteredChecks.map((check) => {
        const { id, checked, text, location } = check;
        // returns checkbox items
        return (
          <div key={id} id={`checkbox-item-${location + id}`} className="px-2 flex align-middle justify-start hover:bg-slate-400 bg-transparent text-dark group">
  
            <div 
              id={`clickable-check-${location + id}`} 
              className="flex flex-row max-w-[100%-200px] overflow-auto grow align-middle justify-start border-dark border-b hover:bg-slate-400 bg-transparent" 
              onClick={() => handleToggle(id)}
            >
              
              <div className="pr-4 font-semibold items-center flex pointer-events-none select-none text-md w-8" >
                {id > 100 ? shapesTable[Math.floor(id / 100)] + shapesTable[id % 100] : shapesTable[id]
                // for ids greater than 100, the first shape represents how many 100s there are in id. The second shape represents the remainder.
                // if there's more than 10,000 shapes or so, rip
                }
              </div>

              <input className="w-5 flex place-items-center" type="checkbox" checked={checked} readOnly />
              <div className='flex grow max-w-full p-2 overflow-auto'>
                <div 
                  id={`check-text-${location + id}`}
                  className="bg-transparent break-words justify-start w-full z-10 px-2 pl-3 pointer-events-none select-none"
                  dangerouslySetInnerHTML={{ __html: text }}
                  onChange={() => handleTextChange(id, false)} 
                  onBlur={() => handleTextChange(id, true)}
                  autoSave="false"
                  draggable={false}
                  spellCheck={true}
                />
              </div>
            </div>
  
            <div id={`hover-buttons-${location + id}`} className="flex flex-row align-middle justify-start opacity-0 space-x-2 p-2 group-hover:opacity-100">
              <button onClick={() => handleEdit(id)}><WriteIcon /></button>
              <button onClick={() => handleDelete(id)}><CloseIcon /></button>
            </div>
          </div>
        );
      })}
      <button className="flex px-1 m-2 hover:bg-light rounded-full border-dark text-dark font-semibold select-none" onClick={() => addCheckBox()}>+ Add Item</button>
      <div id={`edit-confirm-popup-${location}`} className="hidden">
        <ConfirmationBox 
          confirmationMsg='NOTE: Editing will KEEP statistics for this item. To make a brand new item, click Cancel, then click the "Add Item" button.' 
          confirm="Edit" 
          deny="Cancel" 
          onConfirm={(isClosedForever) => handleEditConfirmed(isClosedForever)} 
          allowCloseForever={true} 
          onDeny={(isClosedForever) => closeConfirmation(isClosedForever)} 
          isConfirmDefault={false} 
        />
      </div>
    </div>
  );
}