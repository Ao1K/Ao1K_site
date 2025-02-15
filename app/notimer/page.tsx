"use client";
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { debounce } from "lodash";
import { randomScrambleForEvent } from 'cubing/scramble';
// import { db } from "../../composables/notimer/db";
import { getLastSolve, getNextSolve, getPreviousSolve, getChecks, getSolve, addCheck, addSolve, deleteCheck, updateCheck, updateSolve, addCheckTemplate, getCheckTemplate, updateCheckTemplate, deleteCheckTemplate, getLastCheck } from "../../composables/notimer/dbUtils";
import type { dbCheck, CheckTemplate, NotimerSolve } from "../../composables/notimer/db";
import ConfirmationBox from "../../components/ConfirmationBox";


import NoTimeSolveBox, { Check, NoTimeSolveBoxProps, handleSetChecks } from "../../components/notimer/NoTimeSolveBox";


// todo: deleting a card should be a thing
// todo: allow scroll to bottom
// todo: handle edge case were user gets stuck at bottom or top card. 
//          Default to off if user is on first card of page load. 
//          Add sufficient debouncing in case user isn't actually stuck there. Or some sort of logic, anyway, to check it's not normal scroll.
//          scroll should be handled once user releases click

interface SolveCard extends NotimerSolve {
  color: string;
  checks: Check[] | [];
}

export default function NoTimer() {
  // console.log('reloading page');
  const CARD_COUNT = 3; // must be > 2 or scroll effect will cause infinite loop
  const PUZZLE_TYPE = "333";

  const [isLoaded, setIsLoaded] = useState(false);

  const [solveCards, setSolveCards] = useState<SolveCard[]>([]);
  
  const [pendingScrollAction, setPendingScrollAction] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);

  const [showEditConfirmation, setShowEditConfirmation] = useState<boolean>(true);
  const activeID = useRef<number>(0);
  const nextScram = useRef<string>('');
  const startingPage = useRef<number>(0);
  const [editStatus, setEditStatus] = useState<'none' | number>('none');
  const [deleteStatus, setDeleteStatus] = useState<'none' | number>('none');

  
  const lastCheckEditID = useRef<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  const getScram = async (puzzleType: string) => {
    const scram = (await randomScrambleForEvent(puzzleType));
    return scram;
  }

  useEffect(() => {
    const fetchScramble = async () => {
      nextScram.current = await getScram(PUZZLE_TYPE).then((scram) => scram.toString());
    };
    fetchScramble();
  }, []);


  const addCards = async (count: number, direction: "top" | "bottom", startID: number) => {

    let newCards: SolveCard[] = [];
    for (let i = 0; i < count; i++) {
      const dbChecks: dbCheck[] = await getChecks(i + startID);
      const parsedChecks: Check[] = await parseDbChecks(dbChecks) ?? [];

      newCards.push({ 
        color: '#ece6ef', 
        id: i + startID,
        scramble: await getScram(PUZZLE_TYPE).then((scram) => scram.toString()),
        puzzleType: PUZZLE_TYPE,
        solveDateTime: new Date(),
        solveResult: 0,
        solveModifier: "OK" as "OK" | "DNF" | "+2",
        comment: null,
        checks: parsedChecks,
      });
    }
    setSolveCards((prev) =>
      direction === "top" ? [...newCards, ...prev] : [...prev, ...newCards]
    );
  };

  const parseDbChecks = async (indexedChecks: dbCheck[]): Promise<Check[]> => {
    return Promise.all(indexedChecks.map(async (check) => {

      const checkTemplate = await getCheckTemplate(check.checkTemplateId);
      const text = checkTemplate ? checkTemplate.text : '';

      console.log('parsing check:', check.id);
      console.trace();

      return { // remove notimerSolveId from dbCheck
        id: check.id,
        checked: check.checked,
        text: text,
        textID: check.checkTemplateId,
        location: check.location,
      };
    }));
  }

  const createCardData = async (solve: NotimerSolve | undefined, id: number): Promise<SolveCard> => {
    let checks: Check[] = [];
    console.log('creating card data for cardID:', id);
    
    async function deriveChecksFromLastSolve() {
      // takes the last solve in the DB and modifies them to create new checks

      const lastSolve = await getLastSolve();
      if (!lastSolve) return [];

      const lastChecks = await getChecks(lastSolve.id);
      if (!lastChecks || lastChecks.length === 0) return [];

      const highestCheckID = lastChecks.reduce((acc, check) => check.id > acc ? check.id : acc, 0);
      let i = highestCheckID;

      const parsedChecks: Check[] = await parseDbChecks(lastChecks);
      return parsedChecks.map(check => {
        i++;
        console.log('creating check with id:', i);
        return({...check, checked: false, id: i});
      });
    }
    
    if (solve) {
      const dbChecks = await getChecks(solve.id);

      let checks: Check[] = [];
      if (dbChecks && dbChecks.length > 0) {
        checks = await parseDbChecks(dbChecks);
      } else {
        checks = await deriveChecksFromLastSolve();
      }
      
      return {
        color: '#e446ef',
        id: solve.id,
        scramble: solve.scramble,
        puzzleType: solve.puzzleType,
        solveDateTime: solve.solveDateTime,
        solveResult: solve.solveResult,
        solveModifier: solve.solveModifier,
        comment: solve.comment,
        checks,
      };
    } 

    // if (!solve)
    checks = await deriveChecksFromLastSolve();
    return {
      color: '#ece6ef',
      id: id,
      scramble: await getScram(PUZZLE_TYPE).then((scram) => scram.toString()),
      puzzleType: PUZZLE_TYPE,
      solveDateTime: new Date(),
      solveResult: 0,
      solveModifier: "OK",
      comment: null,
      checks,
    };
  };

  const isAllUnchecked = (checks: Check[]): Boolean => {
    return checks.every((check) => !check.checked);
  };

  const updateCardsWithChecks = async (newChecks: Check[]) => {
    const lastSolveID = await getLastSolve().then((solve) => solve?.id) ?? -10; // -10 arbitrarily assures it won't match any card.id

    setSolveCards((prev) => {
      return prev.map((card) => {
        if (card.id === activeID.current) {
          return { ...card, checks: newChecks };

        // check if last or 2nd last solve hasn't been reached. If so, add checks.
        } else if ((card.id === lastSolveID || card.id === lastSolveID - 1) && isAllUnchecked(newChecks)) {
          console.log('updating last(ish) solve with new checks, card.id:', card.id);
          return { ...card, checks: newChecks };
        
        } else {
          return card;
        }
      });
    });
  };
    

  

  const getOriginalSolveID = async () => {
    const lastSolve = await getLastSolve();
    if (lastSolve) {
      return lastSolve.id + 1;
    } else {
      return 0;
    }
  }

  const shiftActiveCardToLower = async (): Promise<number> => { // displays bottom box and preloads box below that
    const shiftedCards: SolveCard[] = solveCards.slice(1); // removes first box
    console.log('shifting cards. Orig solve cards:', solveCards);
    
    const oldID = shiftedCards[shiftedCards.length - 2].id;

    //preload next card (the one below activeID)
    const nextSolve = await getNextSolve(activeID.current + 1);
    const nextSolveID = nextSolve ? nextSolve.id : await getOriginalSolveID();
    const nextSolveCard = await createCardData(nextSolve, nextSolveID);
    console.log('shifting cards. Shifted cards:', shiftedCards, 'nextSolveCard:', nextSolveCard);
    
    setSolveCards([...shiftedCards, nextSolveCard]);

    return oldID
  };



  const shiftActiveCardToUpper = async (): Promise<number> => { // load box on top
    const shiftedCards = solveCards.slice(0, solveCards.length - 1);

    const oldID = shiftedCards[1].id;

    //preload prev card (the one above activeID)
    const prevSolve = await getPreviousSolve(activeID.current - 1);
    const prevID = prevSolve ? prevSolve.id : await getOriginalSolveID();
    const prevSolveCard = await createCardData(prevSolve, prevID);

    setSolveCards([prevSolveCard, ...shiftedCards]);

    return oldID
  };

  const addOrUpdateSolve = async (solve: NotimerSolve) => {
    const id = solve.id;
    const existingSolve = await getSolve(id);
    if (existingSolve) {
      updateSolve(id, solve);
    } else {
      addSolve(solve);
    }
  };

  const getHighestCheckID = async (): Promise<number> => {
    let highestID = await getLastCheck().then((check) => check ? check.id : 0);
    return highestID;
  }

  const createNextChecks = async (): Promise<Check[]> => {
    //return old checks but with checked = false, and new ids

    let i = await getHighestCheckID();

    const activeChecks = solveCards.find((card) => card.id === activeID.current)?.checks;

    const nextChecks = activeChecks?.map((check) => {
      i++;
      console.log('creating new check with id:', i);
      return {
        id: i,
        checked: false,
        text: check.text,
        textID: check.textID,
        location: check.location,
      };
    }) ?? [];

    return nextChecks
  };


  const processChecks = async (): Promise<Check[]> => {
    let nextDbChecks: dbCheck[] = await getChecks(activeID.current);
    let nextChecks: Check[];

    if (nextDbChecks) {
      nextChecks = await parseDbChecks(nextDbChecks);
    } else {
      nextChecks = await createNextChecks();
      await saveLatestChecks(activeID.current);
    }
    return nextChecks;
  };


  const handleScrollDown = async () => {
    console.log('scrolling down');

    const oldID = await shiftActiveCardToLower();

    const nextChecks = await processChecks();
    updateCardsWithChecks(nextChecks);

    nextScram.current = await getScram(PUZZLE_TYPE).then((scram) => scram.toString());

  };


  const handleScrollUp = async () => {
    console.log('scrolling up');
    console.trace();

    const oldID = await shiftActiveCardToUpper();

    const prevChecks = await processChecks();
    updateCardsWithChecks(prevChecks);

    nextScram.current = await getScram(PUZZLE_TYPE).then((scram) => scram.toString());
  }


  const handleScroll = useCallback(
    debounce( async (e) => {
      console.log('scroll triggered');

      // TODO: deleting solve will need custom scroll logic
      // TODO: handling case where user wants to scroll to end will need custom logic
      
      const container = document.getElementById("scrollContainer");
      if (!container) return;    
      
      const { scrollTop, clientHeight, scrollHeight } = container;
      const endingPage = Math.floor((scrollTop + 0.5 * clientHeight) / clientHeight);
      if (endingPage === startingPage.current) return;

      
      startingPage.current = endingPage;

      const oldID = activeID.current;
      const currentCard = solveCards[endingPage];
      activeID.current = currentCard.id;
      
      console.log('activeID set to', activeID.current);
      

      if (currentCard) {
        const currentSolve = {
          id: activeID.current,
          scramble: currentCard.scramble ,
          puzzleType: currentCard.puzzleType ,
          solveDateTime: currentCard.solveDateTime,
          solveResult: currentCard.solveResult,
          solveModifier: currentCard.solveModifier as "OK" | "DNF" | "+2",
          comment: null,
        }

        console.log('currentSolve', currentSolve);
        await addOrUpdateSolve(currentSolve);
      }

      // TODO: handle case where scroll from page 1 to 2. Need to add checks not just currentSolve.
      await saveLatestChecks(activeID.current);

      const fudgeFactor = 10; // px
      if ((scrollTop + clientHeight) >= (scrollHeight - fudgeFactor) && endingPage === 2) {
        setPendingScrollAction("down");
      } else if (scrollTop === 0) {
        setPendingScrollAction("up");
      }

      console.log('adding latest solve');
      await addLatestSolve();

    }, 50, { leading: false, trailing: true,  }), [isInteracting]
  );




  const mountCards = async () => {
    // find if there's any solve data
    const lastSolve = await getLastSolve();
    if (lastSolve) {

      const latestID = lastSolve.id;
      addCards(CARD_COUNT, 'bottom', latestID);
      
      activeID.current = latestID;

      const indexedChecks = await getChecks(latestID);
      const latestChecks = await parseDbChecks(indexedChecks);
      updateCardsWithChecks(latestChecks);

    } else {
      addCards(CARD_COUNT, 'bottom', 0);
      activeID.current = 0;
      addLatestSolve();
    }
  }
  
  const saveLatestChecks = async (id: number | null) => {
    const solveID = id ?? activeID.current;
    const checks = solveCards.find((card) => card.id === solveID)?.checks;
    if (!checks) return;

    checks.forEach(async (check) => {

      let existingCheckTemplate = await getCheckTemplate(undefined, check.text);
      if (!existingCheckTemplate) {
        await addCheckTemplate(check.text);
        existingCheckTemplate = await getCheckTemplate(undefined, check.text);
      }

      const templateID = existingCheckTemplate!.id;
      const existingCheck = (await getChecks(solveID)).find((check) => check.checkTemplateId === templateID);
      if (!existingCheck) {
        const newCheck = {
          notimerSolveId: solveID,
          checkTemplateId: templateID,
          checked: false,
          location: check.location,
        };
        await addCheck(newCheck);
      }
    });
  }

  const addLatestSolve = async (scramble?: string) => {

    let scram: string = '';
    if (scramble) {
      scram = scramble;
    } else {

      const scrambleDiv = document.getElementById(`scramble-${activeID.current}`);

      if (scrambleDiv) {
        scram = scrambleDiv.innerText
      }
    }

    // console.log('saving activeID solve:', activeID.current);

    const newSolve = {
      id: activeID.current,
      scramble: scram,
      puzzleType: PUZZLE_TYPE,
      solveDateTime: new Date(),
      solveResult: 0,
      solveModifier: "OK" as "OK" | "DNF" | "+2",
      comment: null,
    };

    // console.log('adding latest solve');
    await addOrUpdateSolve(newSolve);
  };

  const handleAddCheck = async (actionCheck: Check) => {

    let existingCheckTemplate = await getCheckTemplate(undefined, actionCheck.text);
    if (!existingCheckTemplate) {
      await addCheckTemplate(actionCheck.text);
      existingCheckTemplate = await getCheckTemplate(undefined, actionCheck.text);
    }

    const templateID = existingCheckTemplate?.id ?? 0;

    await addCheck({
      // id: actionCheck.id,
      notimerSolveId: activeID.current,
      checkTemplateId: templateID,
      checked: actionCheck.checked,
      location: actionCheck.location,
    });
  };

  const handleUpdateCheck = async (actionCheck: Check) => {

    const checks = solveCards.find((card) => card.id === activeID.current)?.checks;

    const oldText = checks?.find((check) => check.id === actionCheck.id)?.text ?? '';

    const existingCheckTemplate = await getCheckTemplate(undefined, oldText);

    // create or update template
    let templateID;
    if (existingCheckTemplate) {
      templateID = existingCheckTemplate.id;
      
      // update check template if text has changed
      if (oldText !== actionCheck.text) {
        const template = { id: templateID, text: actionCheck.text };
        await updateCheckTemplate(templateID, template);
      }

    } else {
      console.log('adding new check template with text:', actionCheck.text);
      await addCheckTemplate(actionCheck.text);
      const newCheckTemplate = await getCheckTemplate(undefined, actionCheck.text);
      templateID = newCheckTemplate?.id ?? 0;
    }

    // create or update check
    const existingCheck = (await getChecks(activeID.current)).find((check) => check.checkTemplateId === templateID);
    let updatedCheck;
    if (existingCheck) {
      updatedCheck = {
        id: existingCheck.id,
        notimerSolveId: activeID.current,
        checkTemplateId: templateID,
        checked: actionCheck.checked,
        location: actionCheck.location,
      }
      await updateCheck(existingCheck.id, updatedCheck);

    } else {
      addCheck({
        // id: actionCheck.id,
        notimerSolveId: activeID.current,
        checkTemplateId: templateID,
        checked: actionCheck.checked,
        location: actionCheck.location,
      })
    }
  };

  const handleDeleteCheck = async (id: number) => {
    await deleteCheck(id);
  };

  const handleSetChecks: handleSetChecks = async (newChecks, action, actionCheck ) => {
        
    // todo: moves confirmation boxes out to page level to avoid having to manage lasteditid state in several NoTimeSolveBox components
    switch (action) {
      case 'add':
        handleAddCheck(actionCheck);
        break;
      case 'update':
        handleUpdateCheck(actionCheck);
        break;
      case 'delete':
        handleDeleteCheck(actionCheck.id);
        break;
      default:
        break;
    }
    
    updateCardsWithChecks(newChecks);

    console.log('FINISHED SCROLL. cards:', solveCards);


  };

  const closeEditConfirmation = (id: string, isClosedForever: boolean) => {
    const popup = document.getElementById(id);
    if (popup) {
      popup.style.display = 'none';
    }
    
    setShowEditConfirmation(!isClosedForever);
  };

  const closeDeleteConfirmation = (id: string) => {
    const popup = document.getElementById(id);
    if (popup) {
      popup.style.display = 'none';
    }
  };

  const handleDeleteConfirmed = () => {
    console.log('deleting:', lastCheckEditID.current);
    
    const popup = document.getElementById(`delete-confirm-popup`);
    if (popup) {
      popup.style.display = 'none';
    }

    const id = lastCheckEditID.current;

    let deletedCheck: Check | null = null;
    let newCards: SolveCard[] = [];

    solveCards.forEach((card) => {
      const oldChecks = card.checks;

      // filter out deleted check and set deleted check
      const newChecks = card.checks.reduce<Check[]>((acc, check) => {
        if (check.id === id) {

          deletedCheck = check;

          return acc;
        }
        
        acc.push(check);
        return acc;
      }, []);

      // if no newChecks, continue
      if (oldChecks.length === newChecks.length) return;

      if (!deletedCheck) return;

      newCards.push({ ...card, checks: newChecks });

      handleSetChecks(newChecks, 'delete', deletedCheck);
    }); 

    setSolveCards(newCards);   
  };

  const handleEditConfirmed = (isClosedForever?: boolean) => {
    isClosedForever !== undefined ? setShowEditConfirmation(!isClosedForever) : null;
    const popup = document.getElementById(`edit-confirm-popup`);
    if (popup) {
      popup.style.display = 'none';
    }
    setEditStatus(lastCheckEditID.current);
  }; 

  useEffect(() => {
    const loadContent = async () => {
      await mountCards();
      setIsLoaded(true);
    };
  
    loadContent();
  
    return () => {
      // saveLatestSolve();
      // saveLatestChecks();
    }
  }, []);

  // Ensure scroll adjustment happens before rendering new boxes
  useLayoutEffect(() => {
    if (!pendingScrollAction) return;
    console.log('handling pending scroll action:', pendingScrollAction);
    const action = pendingScrollAction;
    setPendingScrollAction(null);

    switch (action) {
      case "up":
        handleScrollUp();
        break;
      case "down":
        handleScrollDown();
        break;
      case "delete": // TODO
        break;
    }

    const onPointerDown = () => setIsInteracting(true);
    const onPointerUp = () => {
      setIsInteracting(false);
      handleScroll;
    }

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    }

  }, [pendingScrollAction]);


  
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // todo, add debounce indicator across the bottom of the screen. Then show simple down arrow, indicating scrolling is allowed.

  return (
    <div>
      <div
        id="scrollContainer"
        className="h-[calc(100vh-64px)] overflow-y-scroll snap-y snap-mandatory " //scrollbar-hidden
        onScroll={handleScroll}
        ref={containerRef}
      >
        {/* <h1>Do you ever find yourself rushing to start solves? Do you keep ignoring bad habits? This tool is for you.</h1> */}
        { solveCards.map((card, index) => (
          console.log('drawing card. index:', index, 'checks:', card.checks),
          <div
            key={card.id}
            className="h-[calc(100vh-64px)] snap-start flex flex-col space-y-4 items-center justify-center"
            style={{ backgroundColor: card.color }}
          >
            <NoTimeSolveBox 
              checks={card.checks}
              handleSetChecks={handleSetChecks}
              location={'pre'}
              showEditConfirmation={showEditConfirmation}
              editStatus={editStatus}
              setEditStatus={setEditStatus}
              deleteStatus={deleteStatus}
              setDeleteStatus={setDeleteStatus}
              lastEditID={lastCheckEditID}
            />
            <div className="text-2xl font-regular select-none">Scramble {card.id}</div>
            <div id={`scramble-${card.id}`} className="text-2xl font-medium px-5 text-center pb-2 select-all">{card.scramble}</div>
            <NoTimeSolveBox 
              checks={card.checks}
              handleSetChecks={handleSetChecks}
              location={'post'}
              showEditConfirmation={showEditConfirmation}
              editStatus={editStatus}
              setEditStatus={setEditStatus}
              deleteStatus={deleteStatus}
              setDeleteStatus={setDeleteStatus}
              lastEditID={lastCheckEditID}
            />          
          </div>
        ))}
      </div>
          <div id={`edit-confirm-popup`} className="hidden">
            <ConfirmationBox 
              confirmationMsg='NOTE: Editing this checklist item will KEEP the data that was associated with it. To start tracking a new item, click Cancel, then click the "Add Item" button.' 
              confirm="Edit" 
              deny="Cancel" 
              confirmStyle="bg-blue-500 hover:bg-light_accent text-primary-100"
              denyStyle='bg-neutral-400 hover:bg-neutral-600 text-dark'
              onConfirm={(isClosedForever) => handleEditConfirmed(isClosedForever)} 
              allowCloseForever={true} 
              onDeny={(isClosedForever) => closeEditConfirmation(`edit-confirm-popup`, isClosedForever)} 
            />
          </div>
          <div id={`delete-confirm-popup`} className="hidden">
            <ConfirmationBox 
              confirmationMsg='Delete this item? Deleting this item will KEEP the data that was associated with it, but the item cannot be added back to the checklist.\n '
              confirm="Delete" 
              deny="Cancel" 
              confirmStyle="bg-red-500 hover:bg-red-700 text-white"
              denyStyle='bg-neutral-200 hover:bg-neutral-300 text-dark'
              onConfirm={() => handleDeleteConfirmed()} 
              allowCloseForever={false} 
              onDeny={() => closeDeleteConfirmation(`delete-confirm-popup`)} 
            />
          </div>
  </div>
  );
}
