"use client";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { debounce } from "lodash";
import { randomScrambleForEvent } from 'cubing/scramble';
// import { db } from "../../composables/notimer/db";
import { getLastSolve, getNextSolve, getPreviousSolve, getChecks, getSolve, addCheck, addSolve, deleteCheck, updateCheck, updateSolve } from "../../composables/notimer/dbUtils";
import type { dbCheck, NotimerSolve } from "../../composables/notimer/db";


import NoTimeSolveBox, { Check, NoTimeSolveBoxProps, handleSetChecks } from "../../components/notimer/NoTimeSolveBox";


// the act of updating a check should save it to indexeddb
// the act of scrolling should save the previous box to indexeddb
// deleting a box should be a thing

interface solveCard extends NotimerSolve {
  color: string;
}

export default function NoTimer() {
  // console.log('reloading page');
  const BOX_COUNT = 3; // must be > 2 or scroll effect will cause infinite loop
  const PUZZLE_TYPE = "333";

  const [isLoaded, setIsLoaded] = useState(false);

  const [solveCards, setSolveCards] = useState<solveCard[]>([]);
  const [pendingScrollAction, setPendingScrollAction] = useState<string | null>(null);
  const [showEditConfirmation, setShowEditConfirmation] = useState<boolean>(true);
  const [checks, setChecks] = useState<Check[]>([]);
  const activeID = useRef<number>(0);
  const nextScram = useRef<string>('');
  const startingPage = useRef<number>(0);

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

    let newCards: solveCard[] = [];
    for (let i = 0; i < count; i++) {
      newCards.push({ 
        color: '#ece6ef', 
        id: i + startID,
        scramble: await getScram(PUZZLE_TYPE).then((scram) => scram.toString()),
        puzzleType: PUZZLE_TYPE,
        solveDateTime: new Date(),
        solveResult: 0,
        solveModifier: "OK" as "OK" | "DNF" | "+2",
        comment: null,
      });
    }
    setSolveCards((prev) =>
      direction === "top" ? [...newCards, ...prev] : [...prev, ...newCards]
    );
  };

  const parseIndexedChecks = (indexedChecks: dbCheck[]) => {
    return indexedChecks.map((check) => {
      return { // remove notimerSolveId from dbCheck
        id: check.id,
        checked: check.checked,
        text: check.text,
        location: check.location,
      };
    });
  }

  const createCardData = async (solve: NotimerSolve | undefined, id: number): Promise<solveCard> => {
    if (!solve) {
      return {
        color: '#ece6ef',
        id: id,
        scramble: await getScram(PUZZLE_TYPE).then((scram) => scram.toString()),
        puzzleType: PUZZLE_TYPE,
        solveDateTime: new Date(),
        solveResult: 0,
        solveModifier: "OK",
        comment: null,
      };
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
    };
  }

  const getOriginalSolveID = async () => {
    const lastSolve = await getLastSolve();
    if (lastSolve) {
      return lastSolve.id + 1;
    } else {
      return 0;
    }
  }

  const shiftActiveBoxToLower = async (): Promise<[number, number]> => { // displays bottom box and preloads box below that
    const shiftedCards = solveCards.slice(1); // removes first box
    const lowestCard = shiftedCards[shiftedCards.length - 1]; // assumes 2nd to last box is one being displayed on screen
    
    const oldID = shiftedCards[shiftedCards.length - 2].id;
    // activeID.current = lowestCard.id; // shouldn't be needed. Handled in handleScroll.

    //preload next box (the one below activeID)
    const nextSolve = await getNextSolve(activeID.current + 1);
    // BUG: new indexeddb entry hasn't been completed, so getOriginalSolveID will return the same ID as activeID
    const nextSolveID = nextSolve ? nextSolve.id : await getOriginalSolveID();
    const nextSolveCard = await createCardData(nextSolve, nextSolveID);
    
    setSolveCards([...shiftedCards, nextSolveCard]);

    return [oldID, activeID.current];
  };



  const shiftActiveBoxToUpper = async () => { // load box on top
    const shiftedCards = solveCards.slice(0, solveCards.length - 1);
    const highestCard = shiftedCards[0];

    const oldID = shiftedCards[1].id;
    // activeID.current = highestCard.id; // shouldn't be needed. Handled in handleScroll.

    //preload prev box (the one above activeID)
    const prevSolve = await getPreviousSolve(activeID.current - 1);
    const prevID = prevSolve ? prevSolve.id : await getOriginalSolveID(); // possible bug: if shiftActiveBoxToLower was called, this might have the same activeID
    const prevSolveCard = await createCardData(prevSolve, prevID);
    console.log('1+', shiftedCards.length);
    setSolveCards([prevSolveCard, ...shiftedCards]);

    return [oldID, activeID.current];
  };

  const addOrUpdateSolve = async (solve: NotimerSolve) => {
    const id = solve.id;
    const existingSolve = await getSolve(id);
    if (existingSolve) {
      console.log('updating solve', id);
      updateSolve(id, solve);
    } else {
      console.log('adding solve', id);
      addSolve(solve);
    }
  };

  const addOrUpdateCheck = async (check: dbCheck) => {
    const id = check.id;
    const existingCheck = await getChecks(id);
    if (existingCheck) {
      updateCheck(id, check);
    } else {
      addCheck(check);
    }
  }


  const handleScrollDown = async () => {
    console.log('scrolling down');

    const [oldID, newID] = await shiftActiveBoxToLower();

    let scram = solveCards.find((card) => card.id === oldID)?.scramble;
    if (!scram) {
      console.warn('scramble not found');
      scram = '';
    }

    const scrambleDiv = document.getElementById(`scramble-${newID}`);
    if (scrambleDiv) {
      scrambleDiv.innerText = nextScram.current;
    }
    
    // now get solve if it exists. Create otherwise. Then get checks.
    const solve = await getSolve(newID);
    const indexedChecks = await getChecks(newID);
    let latestChecks = parseIndexedChecks(indexedChecks);

    if (!latestChecks) {
      // return old checks
      const oldChecks = checks.map((check) => {
        return {
          id: check.id,
          checked: false,
          text: check.text,
          location: check.location,
        };
      });

      latestChecks = oldChecks;
    }

    latestChecks.forEach(async (check) => {
      await addOrUpdateCheck({
        id: check.id,
        notimerSolveId: newID,
        checked: check.checked,
        text: check.text,
        location: check.location,
      });
    });

    setChecks(latestChecks); // these do not need to be saved to indexeddb

    nextScram.current = await getScram(PUZZLE_TYPE).then((scram) => scram.toString());
  };

  const handleScrollUp = async () => {
    const [oldID, newID] = await shiftActiveBoxToUpper();
    const oldScrambleDiv = document.getElementById(`scramble-${oldID}`);
    let scram: string = '';
    if (oldScrambleDiv) {
      scram = oldScrambleDiv.innerText
    }

    const scrambleDiv = document.getElementById(`scramble-${newID}`);
    if (scrambleDiv) {
      scrambleDiv.innerText = nextScram.current;
    }

    // now get solve if it exists. Create otherwise. Then get checks.
    const solve = await getSolve(newID);
    const indexedChecks = await getChecks(newID);
    const latestChecks = parseIndexedChecks(indexedChecks);

    if (!latestChecks) {
      // return old checks
      const oldChecks = checks.map((check) => {
        return {
          id: check.id,
          checked: false,
          text: check.text,
          location: check.location,
        };
      });

      setChecks(oldChecks); // these do not need to be saved to indexeddb
    } else {
      setChecks(latestChecks); // these do not need to be saved to indexeddb
    }

    nextScram.current = await getScram(PUZZLE_TYPE).then((scram) => scram.toString());
  }

  const handleScroll = debounce( async (e) => {

    const container = document.getElementById("scrollContainer");
    if (!container) return;

    const currentCard = solveCards.find((card) => card.id === activeID.current);

    const currentSolve = {
      id: activeID.current,
      scramble: currentCard?.scramble ?? '',
      puzzleType: currentCard?.puzzleType ?? PUZZLE_TYPE,
      solveDateTime: currentCard?.solveDateTime ?? new Date(),
      solveResult: 0,
      solveModifier: "OK" as "OK" | "DNF" | "+2",
      comment: null,
    }

    console.log('handling scroll');
    console.log('currentSolve', currentSolve);
    await addOrUpdateSolve(currentSolve);

    // TODO: deleting solve will need custom scroll logic
    // TODO: handling case where user wants to scroll to end will need custom logic

    const { scrollTop, clientHeight, scrollHeight } = container;
    const endingPage = Math.floor((scrollTop + 0.5 * clientHeight) / clientHeight);

    if (endingPage === startingPage.current) return;
    
    startingPage.current = endingPage;

    activeID.current = solveCards[endingPage].id;
    console.log('activeID set to', activeID.current);

    if (scrollTop + clientHeight >= scrollHeight && endingPage === 2) {
      setPendingScrollAction("down");
    } else if (scrollTop === 0) {
      setPendingScrollAction("up");
    }

    console.log('adding latest solve');
    await addLatestSolve();

  }, 200, { leading: false, trailing: true,  });





  const mountCards = async () => {
    console.log('adding cards');
    //find if there's any solve data
    const lastSolve = await getLastSolve();
    if (lastSolve) {

      const latestID = lastSolve.id;
      addCards(BOX_COUNT, 'bottom', latestID);

      const indexedChecks = await getChecks(latestID);
      const latestChecks = parseIndexedChecks(indexedChecks);
      setChecks(latestChecks);

    } else {
      addCards(BOX_COUNT, 'bottom', 0);
      activeID.current = 0;
      addLatestSolve();
    }
  }
  
  const saveLatestChecks = () => {
    checks.forEach(async (check) => {
      await addCheck({
        id: check.id,
        notimerSolveId: activeID.current,
        checked: check.checked,
        text: check.text,
        location: check.location,
      });
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

    console.log('saving activeID solve:', activeID.current);

    const newSolve = {
      id: activeID.current,
      scramble: scram,
      puzzleType: PUZZLE_TYPE,
      solveDateTime: new Date(),
      solveResult: 0,
      solveModifier: "OK" as "OK" | "DNF" | "+2",
      comment: null,
    };

    console.log('adding latest solve');
    await addOrUpdateSolve(newSolve);
  };

  const handleAddCheck = async (actionCheck: Check) => {
    await addCheck({
      id: actionCheck.id,
      notimerSolveId: activeID.current,
      checked: actionCheck.checked,
      text: actionCheck.text,
      location: actionCheck.location,
    });
  };

  const handleUpdateCheck = async (actionCheck: Check) => {

    const updatedCheck = {
      id: actionCheck.id,
      notimerSolveId: activeID.current,
      checked: actionCheck.checked,
      text: actionCheck.text,
      location: actionCheck.location,
    }

    await updateCheck(actionCheck.id, updatedCheck);
  };


  const handleSetChecks: handleSetChecks = async (newChecks, action, actionCheck ) => {
    
    console.log('handling set checks');
    await addLatestSolve();

    setChecks(newChecks);

    switch (action) {
      case 'add':
        handleAddCheck(actionCheck);
        break;
      case 'update':
        handleUpdateCheck(actionCheck);
        break;
      case 'delete':
        deleteCheck(actionCheck.id);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const loadContent = async () => {
      await mountCards();
      console.log('boxes mounted');
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
  }, [pendingScrollAction]);


  
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // todo, add debounce indicator across the bottom of the screen. Then show simple down arrow, indicating scrolling is allowed.

  return (
    <div
      id="scrollContainer"
      className="h-[calc(100vh-64px)] overflow-y-scroll snap-y snap-mandatory " //scrollbar-hidden
      onScroll={handleScroll}
      ref={containerRef}
    >
      {/* <h1>Do you ever find yourself rushing to start solves? Do you keep ignoring bad habits? This tool is for you.</h1> */}
      { solveCards.map((card, index) => (
        <div
          key={card.id}
          className="h-[calc(100vh-64px)] snap-start flex flex-col space-y-4 items-center justify-center"
          style={{ backgroundColor: card.color }}
        >
          <NoTimeSolveBox checks={checks} handleSetChecks={handleSetChecks} location={'pre'} showEditConfirmation={showEditConfirmation} setShowEditConfirmation={setShowEditConfirmation}/>
          <div className="text-2xl font-regular select-none">Scramble {card.id}</div>
          <div id={`scramble-${card.id}`} className="text-2xl font-medium px-5 text-center pb-2 select-all">{card.scramble}</div>
          <NoTimeSolveBox checks={checks} handleSetChecks={handleSetChecks} location={'post'} showEditConfirmation={showEditConfirmation} setShowEditConfirmation={setShowEditConfirmation}/>
        </div>
      ))}
    </div>
  );
}
