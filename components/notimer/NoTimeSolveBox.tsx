import React, { useRef, useState, useEffect } from 'react';
import { addCheck, updateCheck, deleteCheck } from "../../composables/notimer/dbUtils";
import CloseIcon from "../../components/icons/close";
import WriteIcon from "../../components/icons/write";
import ConfirmationBox from "../ConfirmationBox";
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

export interface handleSetChecks {
  (
    checks: Check[],
    action: 'add' | 'update' | 'delete',
    check: Check // check that action impacts
  ): void;
}

export interface NoTimeSolveBoxProps {
  checks: Check[];
  handleSetChecks: handleSetChecks;
  showEditConfirmation: boolean;
  setShowEditConfirmation: (showEditConfirmation: boolean) => void;
  location: 'pre' | 'post';
}

export default function NoTimeSolveBox(props: NoTimeSolveBoxProps) {
  const { checks, handleSetChecks, showEditConfirmation, setShowEditConfirmation, location } = props;
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
    // console.log('adding check', location);

    handleSetChecks([...oldChecks, newCheck], 'add', newCheck);

    lastEditID.current = newId;
    newCheckAdded.current = true;
  };

  const updateCheckText = (id: number, newText: string) => {


    // set check back to read-only
    const textInput = document.getElementById(`check-text-${location + id}`) as HTMLDivElement;
    if (textInput) {
      console.log('found input:', textInput);
      textInput.contentEditable = 'false';
      textInput.style.pointerEvents = 'none';
      textInput.style.userSelect = 'none';
    }

    const clickableDiv = document.getElementById(`clickable-check-${location + id}`);

    if (document.activeElement !== textInput && clickableDiv) {
      // console.log('focus is not on text input. Making clickable. Editable=false');
      clickableDiv.style.pointerEvents = 'auto';
      clickableDiv.style.userSelect = 'auto';
      isEditingCheck.current = false;
    }

    let updatedCheck: Check | undefined;
    const newChecks = checks.map((check) => {
      if (check.id === id) {
        updatedCheck = { ...check, text: newText };
        return updatedCheck;
      }
      return check;
    });

    updatedCheck ? handleSetChecks(newChecks, 'update', updatedCheck) : console.error('updatedCheck text change is undefined'); 
  };

  const handleEdit = (id: number) => {
    // console.log('id calling handleEdit:', id);
    lastEditID.current = id;

    // console.log('showEdit?:', showEditConfirmation);

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
    
    // console.log('isEditing:', isEditingCheck.current);
    if (isEditingCheck.current) {
      // console.log('skipping toggle')
      return;
    }

    console.log('toggling:', id);

    let updatedCheck: Check | undefined;
    const newChecks = checks.map((check) => {
      if (check.id === id) {
        updatedCheck = { ...check, checked: !check.checked };
        return updatedCheck;
      }
      return check;
    });

    updatedCheck ? handleSetChecks(newChecks, 'update', updatedCheck) : console.error('updatedCheck toggle is undefined');
  };

  const handleDeleteConfirmed = () => {
    const id = lastEditID.current;
    const deletedCheck = checks.find((check) => check.id === id);
    if (!deletedCheck) {
      return;
    }

    const newChecks = checks.filter((check) => check.id !== id);

    handleSetChecks(newChecks, 'delete', deletedCheck);

    const popup = document.getElementById(`delete-confirm-popup-${location}`);
    if (popup) {
      popup.style.display = 'none';
    }
    
  };

  const handleDelete = (id: number) => {
    lastEditID.current = id;
    const popup = document.getElementById(`delete-confirm-popup-${location}`);
    if (popup) {
      popup.style.display = 'block';
    }
  };


  const handleEditConfirmed = (isClosedForever?: boolean) => {

    const popup = document.getElementById(`edit-confirm-popup-${location}`);
    if (popup) {
      popup.style.display = 'none';
    }

    const id = lastEditID.current;

    isClosedForever === undefined ?  null : setShowEditConfirmation(!isClosedForever);
    // console.log('showEdit?:', showEditConfirmation);

    const clickableDiv = document.getElementById(`clickable-check-${location + id}`) as HTMLDivElement;
    if (clickableDiv) {
      // console.log('setting clickable div to UNclickable')
      clickableDiv.style.pointerEvents = 'none';
      clickableDiv.style.userSelect = 'none';
    }

    const textInput = document.getElementById(`check-text-${location + id}`) as HTMLDivElement;
    if (textInput) {
      textInput.contentEditable = 'true';
      textInput.style.pointerEvents = 'auto';
      textInput.style.userSelect = 'auto';
      textInput.focus();

      // attempt to put caret at end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(textInput);
      range.collapse(false);
      selection!.removeAllRanges();
      selection!.addRange(range);

      isEditingCheck.current = true;
    }
  };

  const closeEditConfirmation = (id: string, isClosedForever: boolean) => {
    const popup = document.getElementById(id);
    if (popup) {
      popup.style.display = 'none';
    }
    
    setShowEditConfirmation(!isClosedForever);
  };

  const handleTextChange = (id: number) => {

    const textInput = document.getElementById(`check-text-${location + id}`) as HTMLDivElement;
    let text = textInput ? sanitizeHtml(textInput.innerHTML, sanitizeConf) : '';

    text ? text = text.slice(0, MAX_CHECK_TEXT_LENGTH) : null;

    updateCheckText(id, text);
    
    
  };

  useEffect(() => { // useEffect "needed" because new check must be rendered before it can be focused on
    if (newCheckAdded.current) {
      // console.log('new check added:', newCheckAdded.current);
      newCheckAdded.current = false; // Reset the ref
      handleEditConfirmed();
    }
  }, [checks]);


  return (
    <div className="w-5/6 min-w-5/6">
      <div className="italic select-none">{location === 'pre' ? 'Pre-solve' : 'Post-solve'} checklist</div>
      {filteredChecks && filteredChecks.map((check) => {
        const { id, checked, text, location } = check;
        // returns checkbox items
        return (
          <div key={id} id={`checkbox-item-${location + id}`} className="px-2 flex align-middle justify-start hover:bg-slate-400 bg-transparent text-dark group">
  
            <div 
              id={`clickable-check-${location + id}`} 
              className="flex flex-row max-w-[100%-200px] overflow-auto grow align-middle justify-start border-dark border-b hover:bg-slate-400 bg-transparent cursor-pointer" 
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
                  onChange={() => handleTextChange(id)} 
                  onBlur={() => handleTextChange(id)}
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
      <button className="flex px-1 m-2 hover:bg-primary-100 rounded-full border-dark text-dark font-semibold select-none" onClick={() => addCheckBox()}>+ Add Item</button>
      <div id={`edit-confirm-popup-${location}`} className="hidden">
        <ConfirmationBox 
          confirmationMsg='NOTE: Editing will KEEP statistics for this item. To start tracking a new item, click Cancel, then click the "Add Item" button.' 
          confirm="Edit" 
          deny="Cancel" 
          confirmStyle="bg-blue-500 hover:bg-light_accent text-primary-100"
          denyStyle='bg-neutral-400 hover:bg-neutral-600 text-dark'
          onConfirm={(isClosedForever) => handleEditConfirmed(isClosedForever)} 
          allowCloseForever={true} 
          onDeny={(isClosedForever) => closeEditConfirmation(`edit-confirm-popup-${location}`, isClosedForever)} 
        />
      </div>
      <div id={`delete-confirm-popup-${location}`} className="hidden">
        <ConfirmationBox 
          confirmationMsg='Delete this item? This cannot be undone.\n '
          // TODO for desktop: messageByline='Bypass this warning by holding Ctrl when deleting.' 
          confirm="Delete" 
          deny="Cancel" 
          confirmStyle="bg-red-500 hover:bg-red-700 text-white"
          denyStyle='bg-neutral-400 hover:bg-neutral-600 text-dark'
          onConfirm={() => handleDeleteConfirmed()} 
          allowCloseForever={false} 
          onDeny={() => closeEditConfirmation(`delete-confirm-popup-${location}`, false)} 
        />
      </div>
    </div>
  );
}