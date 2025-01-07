import React, { useRef, useState, useEffect } from 'react';
import { debounce } from "lodash";
import CloseIcon from "../../components/icons/close";
import WriteIcon from "../../components/icons/write";
import ConfirmationBox from "../../components/ConfirmationBox";
import sanitizeHtml from 'sanitize-html';

interface CheckValues {
  checked: boolean;
  text: string;
  isReadOnly: boolean;
}

export interface Check {
  [id: number]: CheckValues;
}

export interface CheckBoxProps extends CheckValues {
  editChecked: (id: number, state: boolean) => void; // cycles between checked, unchecked, and null
  editText: (id: number) => void; // updates text, maintains id
  handleToggle: (id: number) => void; // toggles checked state
}

export interface NoTimeSolveBoxProps {
  checks: Check[];
  setChecks: (checks: Check[]) => void;
}

export default function NoTimeSolveBox(props: NoTimeSolveBoxProps) {
  // console.log('starting render');
  const { checks, setChecks } = props;
  
  const [showEditConfirmation, setShowEditConfirmation] = useState<boolean>(true);
  const lastEditID = useRef<number>(-1);
  const newCheckAdded = useRef<boolean>();
  const isEditingCheck = useRef<boolean>();

  const sanitizeConf = {
    allowedTags: ["b", "i","br", "div"],
    allowedAttributes: { span: ["className","class"]}
  };
  

  const getHighestId = (checks: Check[]) => {
    let highest = 0;
    if (!checks || checks.length === 0) {
      return highest;
    }
    checks.forEach((check) => {
      const id = Number(Object.keys(check)[0]);
      if (id > highest) {
        highest = id;
      }
    });
    return highest;
  };

  const highestId = useRef<number>(getHighestId(checks));

  const addCheckBox = () => {
    const newId = highestId.current + 1;
    highestId.current = newId;

    const newCheck: Check = { [newId]: ({ checked: false, text: '', isReadOnly: true}) };
    const oldChecks = checks ? checks : [];
    setChecks([...oldChecks, newCheck]);
    lastEditID.current = newId;
    newCheckAdded.current = true;
    console.log('lastEditID:', lastEditID.current);
  };


  const updateCheckText = (id: number, newText: string, readOnly?: boolean) => {
    if (readOnly === undefined) { readOnly = true; }

    // set check back to read-only
    const textInput = document.getElementById(`check-text-${id}`) as HTMLDivElement;
    if (textInput) {
      textInput.contentEditable = 'false';
    }

    const clickableDiv = document.getElementById(`clickable-check-${id}`);
    if (clickableDiv) {
      clickableDiv.style.pointerEvents = 'auto';
      clickableDiv.style.userSelect = 'text';
    }

    const newChecks = checks.map((check) => {
      if (check[id]) {
        return { [id]: { ...check[id], text: newText, isReadOnly: readOnly } };
      }
      return check;
    });

    setChecks(newChecks)
    
    isEditingCheck.current = false;
  };

  const handleEdit = (id: number) => {
    console.log('id calling handleEdit:', id);
    lastEditID.current = id;

    console.log('showEdit?:', showEditConfirmation);

    if (showEditConfirmation === undefined || showEditConfirmation) {
      const popup = document.getElementById('edit-confirm-popup');
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
      if (check[id]) {
        return { [id]: { ...check[id], checked: !check[id].checked } };
      }
      return check;
    });

    setChecks(newChecks);
  };

  const handleDelete = (id: number) => {
    const newChecks = checks.filter((check) => !check[id]);

    setChecks(newChecks);
  };

  const handleEditConfirmed = (isClosedForever?: boolean) => {

    const popup = document.getElementById('edit-confirm-popup');
    if (popup) {
      popup.style.display = 'none';
    }

    const id = lastEditID.current;

    isClosedForever === undefined ?  null : setShowEditConfirmation(!isClosedForever);
    console.log('showEdit?:', showEditConfirmation);

    const clickableDiv = document.getElementById(`clickable-check-${id}`);
    if (clickableDiv) {
      clickableDiv.style.pointerEvents = 'none';
      clickableDiv.style.userSelect = 'none';
    }

    const textInput = document.getElementById(`check-text-${id}`) as HTMLDivElement;
    if (textInput) {
      textInput.contentEditable = 'true';
      textInput.focus();
    }
  };

  const closeConfirmation = (isClosedForever: boolean) => {
    const popup = document.getElementById('edit-confirm-popup');
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
    const textInput = document.getElementById(`check-text-${id}`) as HTMLDivElement;
    const text = textInput ? sanitizeHtml(textInput.innerHTML, sanitizeConf) : '';
    // const text = textInput ? textInput.innerHTML : ''; // TESTING ONLY

    if (textInput) {
      updateCheckText(id, text, readOnly);
    }
    
  };



  useEffect(() => { // "needed" because new check must be rendered before it can be focused on
    if (newCheckAdded.current) {
      console.log('new check added:', newCheckAdded.current);
      // console.log('lastEditID:', lastEditID.current);
      newCheckAdded.current = false; // Reset the ref
      handleEditConfirmed();
    }
  }, [checks]);


  return (
    <div className="w-5/6 min-w-5/6">
      {checks && checks.map((check) => {
        const key: number = Number(Object.keys(check)[0]); // returns ID in Check datatype
        const checkVal = check[key];
        const { checked, text, isReadOnly } = checkVal;

        // returns checkbox items
        return (
          <div key={key} id={`checkbox-item-${key}`} className="px-2 flex align-middle justify-start hover:bg-slate-400 bg-transparent text-dark group">
  
            <div 
              id={`clickable-check-${key}`} 
              className="flex flex-row max-w-[100%-200px] overflow-auto grow align-middle justify-start border-dark border-b hover:bg-slate-400 bg-transparent" 
              onClick={() => handleToggle(key)}
            >
              <input type="checkbox" checked={checked} readOnly />
              <div className='flex grow max-w-full p-2 overflow-auto'>
                <div 
                  id={`check-text-${key}`}
                  className="bg-transparent break-words justify-start w-full z-10 px-2 pointer-events-none select-none"
                  dangerouslySetInnerHTML={{ __html: text }}
                  onChange={() => handleTextChange(key, false)} 
                  onBlur={() => handleTextChange(key, true)}
                  autoSave="false"
                  draggable={false}
                  spellCheck={true}
                />
              </div>
            </div>
  
            <div id={`hover-buttons-${key}`} className="flex flex-row align-middle justify-start opacity-0 space-x-2 p-2 group-hover:opacity-100">
              <button onClick={() => handleEdit(key)}><WriteIcon /></button>
              <button onClick={() => handleDelete(key)}><CloseIcon /></button>
            </div>
          </div>
        );
      })}
      <button className="flex px-1 m-2 hover:bg-light rounded-full border-dark text-dark font-semibold select-none" onClick={() => addCheckBox()}>+ Add Item</button>
      <div id="edit-confirm-popup" className="hidden">
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