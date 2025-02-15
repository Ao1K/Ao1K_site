import React, { useRef, useState, useEffect } from 'react';
import { addCheck, updateCheck, getLastCheck } from "../../composables/notimer/dbUtils";
import CloseIcon from "../../components/icons/close";
import WriteIcon from "../../components/icons/write";
import sanitizeHtml from 'sanitize-html';
import { shapesTable } from '../../utils/shapesTable';

export interface Check {
  id: number;
  checked: boolean;
  text: string;
  textID: number;
  location: 'pre' | 'post';
}

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
  location: 'pre' | 'post';
  editStatus: 'none' | number;
  setEditStatus: (editStatus: 'none' | number) => void;
  deleteStatus: 'none' | number;
  setDeleteStatus: (deleteStatus: 'none' | number) => void;
  lastEditID: React.MutableRefObject<number>;
}

export default function NoTimeSolveBox(props: NoTimeSolveBoxProps) {
  const { checks, handleSetChecks, showEditConfirmation, 
    location, editStatus, setEditStatus, deleteStatus, setDeleteStatus, lastEditID } = props;

  const filteredChecks = checks ? checks.filter((check) => check.location === location) : [];

  const MAX_CHECK_TEXT_LENGTH = 500;
  
  const newCheckAdded = useRef<boolean>();
  const isEditingCheck = useRef<boolean>();

  const sanitizeConf = {
    allowedTags: ["b", "i", "u", "br", "div"],
  };
  

  const getHighestCheckID = async (): Promise<number> => {
    let highestID = await getLastCheck().then((check) => check ? check.id : 0);
    return highestID;
  }

  const addCheckBox = async () => {
    const newCheckID = await getHighestCheckID() + 1;

    // presume templateID
    const highestTextID = checks.reduce((acc, check) => check.textID > acc ? check.textID : acc, 0);
    const nextTextID = highestTextID + 1;

    const newCheck: Check = { id: newCheckID, checked: false, text: '', textID: nextTextID, location: location };
    const oldChecks = checks ? checks : [];

    handleSetChecks([...oldChecks, newCheck], 'add', newCheck);

    lastEditID.current = newCheckID;
    console.log('lastEditID (addCheckBox):', lastEditID.current);
    newCheckAdded.current = true;
  };

  const updateCheckText = (checkID: number, newText: string) => {

    // set check back to read-only
    const textInput = document.getElementById(`check-text-${location + checkID}`) as HTMLDivElement;
    if (textInput) {
      // console.log('found input:', textInput);
      textInput.contentEditable = 'false';
      textInput.style.pointerEvents = 'none';
      textInput.style.userSelect = 'none';
    }

    const clickableDiv = document.getElementById(`clickable-check-${location + checkID}`) as HTMLDivElement;

    if (document.activeElement !== textInput && clickableDiv) {
      // console.log('focus is not on text input. Making clickable. Editable=false');
      clickableDiv.style.pointerEvents = 'auto';
      clickableDiv.style.userSelect = 'auto';
      isEditingCheck.current = false;
    }

    let updatedCheck: Check | undefined;
    const newChecks = checks.map((check) => {
      if (check.id === checkID) {
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
    console.log('lastEditID (handleEdit):', lastEditID.current);

    // console.log('showEdit?:', showEditConfirmation);

    if (showEditConfirmation === undefined || showEditConfirmation) {
      const popup = document.getElementById(`edit-confirm-popup`);
      if (popup) {
        popup.style.display = 'block';
      }
    } else {
      handleEditConfirmed(id);
    }
  };

  const handleToggle = (id: number) => {
    
    console.log('isEditing:', isEditingCheck.current);
    if (isEditingCheck.current) {
      console.log('skipping toggle')
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

  const handleDelete = (id: number) => {
    lastEditID.current = id;
    console.log('lastEditID (handleDelete):', lastEditID.current);
    const popup = document.getElementById(`delete-confirm-popup`);
    if (popup) {
      popup.style.display = 'block';
    }
  };


  const handleEditConfirmed = (id: number) => {
    const clickableDiv = document.getElementById(`clickable-check-${location + id}`) as HTMLDivElement;
    if (clickableDiv) {
      console.log('setting clickable div to UNclickable:', clickableDiv);
      clickableDiv.style.pointerEvents = 'none';
      clickableDiv.style.userSelect = 'none';
    }

    const textInput = document.getElementById(`check-text-${location + id}`) as HTMLDivElement;
    if (textInput) {
      console.log('found input:', textInput);
      textInput.contentEditable = 'true';
      textInput.style.pointerEvents = 'auto';
      textInput.style.userSelect = 'auto';
      // TODO: for some reason, the previous check-text div's id is set to the next id. So there's two checks with the same id. Fix.
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

  const prevEditStatus = useRef<'none' | number>('none');

  if (editStatus !== 'none' && editStatus !== prevEditStatus.current) {
    handleEditConfirmed(editStatus);
    prevEditStatus.current = editStatus;
  }

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
      handleEditConfirmed(lastEditID.current);
    }
  }, [checks]);


  return (
    <div className="w-5/6 min-w-5/6">
      <div className="italic select-none">{location === 'pre' ? 'Pre-solve' : 'Post-solve'} checklist</div>
      {filteredChecks && filteredChecks.map((check) => {
        const { id, checked, text, textID, location } = check;
        // returns checkbox items
        return (
          <div key={id} id={`checkbox-item-${location + id}`} className="px-2 flex align-middle justify-start hover:bg-slate-400 bg-transparent text-dark group">
  
            <div 
              id={`clickable-check-${location + id}`} 
              className="flex flex-row max-w-[100%-200px] overflow-auto grow align-middle justify-start border-dark border-b hover:bg-slate-400 bg-transparent cursor-pointer" 
              onClick={() => handleToggle(id)}
            >
              
              <div className="pr-4 font-semibold items-center flex pointer-events-none select-none text-md w-8" >
                {textID > 100 ? shapesTable[Math.floor(textID / 100)] + shapesTable[textID % 100] : shapesTable[textID]
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
    </div>
  );
}