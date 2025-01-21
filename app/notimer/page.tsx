"use client";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { debounce } from "lodash";
import { randomScrambleForEvent } from 'cubing/scramble';
// import { db } from "../../composables/notimer/db";
import { getLastSolve, getNextSolve, getPreviousSolve, getChecks, getSolve } from "../../composables/notimer/dbUtils";
import type { dbCheck } from "../../composables/notimer/db";


import NoTimeSolveBox, { Check, NoTimeSolveBoxProps } from "../../components/notimer/NoTimeSolveBox";

export default function NoTimer() {
  const BOX_COUNT = 5; // must be > 2 or scroll effect will cause infinite loop
  const PUZZLE_TYPE = "333";
  
  const [boxes, setBoxes] = useState<{ color: string; id: number }[]>([]);
  const [pendingScroll, setPendingScroll] = useState<boolean>(false);
  const [showEditConfirmation, setShowEditConfirmation] = useState<boolean>(true);
  const [checks, setChecks] = useState<Check[]>([]);

  const getScram = async (puzzleType: string) => {
    const scram = await randomScrambleForEvent(puzzleType);
    return scram;
  }

  const addBoxes = (count: number, direction: "top" | "bottom") => {
    const newBoxes = Array.from({ length: count }, (_, i) => ({
      color: '#ece6ef',
      id: -1,
    }));
    setBoxes((prev) =>
      direction === "top" ? [...newBoxes, ...prev] : [...prev, ...newBoxes]
    );
  };

  const addBox = (direction: "top" | "bottom") => {
    const box = { color: '#ece6ef', id: -1 };
    setBoxes((prev) =>
      direction === "top" ? [box, ...prev] : [...prev, box]
    );
  }

  const scrollDownBoxes = async (): Promise<number> => { // creates newest box on bottom, create its storage item
    const shiftedBoxes = boxes.slice(1);
    const activeBox = shiftedBoxes[shiftedBoxes.length - 2]; // assumes 2nd to last box is one being displayed on screen
    
    let activeID = activeBox.id; // grab the second to last box   
    let newID = 0;
    if (activeID === -1) {
      // generate new activeID
      const lastSolve = await getLastSolve();
      lastSolve ? newID = lastSolve.id + 1 : null;
      shiftedBoxes[activeID] = { color: '#ece6ef', id: newID };
      activeID = newID;
    }

    let nextID = -1;
    const nextSolve = await getNextSolve(activeID);
    nextSolve ? nextID = nextSolve.id : null; // this may be incorrect

    setBoxes([...shiftedBoxes, { color: '#ece6ef', id: nextID }]);
    return activeID;
  };

  const scrollUpBoxes = () => { // load box on top
    const shiftedBoxes = boxes.slice(0, boxes.length - 1);
    setBoxes([{ color: '#ece6ef', id: -1 }, ...shiftedBoxes]);
  }

  const handleScroll = debounce( async (e) => {

    // ids are stored in the html boxes
    // when a new box is created, it attempts to find next box in the sequence (up or down, depending)
    // if none is find in indexeddb, then set it to -1
    // when an id = -1 is reached, then a new box with reset checks is rendered
    // when not id = -1, then indexeddb content (check and solve) is rendered instead.
    const container = document.getElementById("scrollContainer");
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    if (scrollTop + clientHeight >= scrollHeight) {
      // handle down scroll     
      const activeID = scrollDownBoxes();

      // now get solve if it exists. Create otherwise. Then get checks.
    }

    if (scrollTop + clientHeight <= clientHeight) {
      // handle up scroll

      const activeID = scrollUpBoxes();
    }
  }, 500);

  // Ensure scroll adjustment happens before rendering new boxes
  // useLayoutEffect(() => {
  //   if (pendingScroll) {
  //     const container = document.getElementById("scrollContainer");
  //     if (container) {
  //       container.scrollTop -= container.clientHeight; // Adjust the scroll position
  //     }

  //     setPendingScroll(false);
  //   }
  // }, [pendingScroll]);

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

  const loadLatestBox = async () => {

    addBoxes(BOX_COUNT, "bottom"); // preload html box entities

    //populate displayed box with data as needed

    const lastSolve = await getLastSolve();

    if (lastSolve) {
      const indexedChecks = await getChecks(lastSolve.id);
      const latestChecks = parseIndexedChecks(indexedChecks);
      setChecks(latestChecks);

    } else {
      console.log('adding bottom box');
    }
  }
  
  const saveLatestBox = () => {
    // save to indexeddb
  }

  useEffect(() => {

    console.log('component mounted');
    loadLatestBox();

    return () => {
      saveLatestBox();
    }
  }, []);

  // todo, add debounce indicator across the bottom of the screen. Then show simple down arrow, indicating scrolling is allowed.

  return (
    <div
    id="scrollContainer"
    className="h-[calc(100vh-64px)] overflow-y-scroll snap-y snap-mandatory" // scrollbar-hidden
    onScroll={handleScroll}
    >
      {/* <h1>Do you ever find yourself rushing to start solves? Do you keep ignoring bad habits? This tool is for you.</h1> */}
      { boxes.map((box, index) => (
        <div
          id={`box-${index + 1}`}
          key={box.id}
          className="h-[calc(100vh-64px)] snap-start flex flex-col space-y-4 items-center justify-center"
          style={{ backgroundColor: box.color }}
        >
          <NoTimeSolveBox checks={checks} setChecks={setChecks} location={'pre'} showEditConfirmation={showEditConfirmation} setShowEditConfirmation={setShowEditConfirmation}/>
          <div className="text-2xl font-regular">Scramble {box.id}</div>
          <div className="text-2xl font-medium px-5 text-center pb-2">L&apos; F U2 R2 U2 R2 U2 B&apos; R2 B2 D2 B&apos; U R2 F U F2 U L U</div>
          <NoTimeSolveBox checks={checks} setChecks={setChecks} location={'post'} showEditConfirmation={showEditConfirmation} setShowEditConfirmation={setShowEditConfirmation}/>
        </div>
      ))}
    </div>
  );
}
