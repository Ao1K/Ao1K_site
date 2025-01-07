"use client";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { debounce } from "lodash";
import { randomScrambleForEvent } from 'cubing/scramble';


import NoTimeSolveBox, { Check, NoTimeSolveBoxProps } from "../../components/notimer/NoTimeSolveBox";


const sampleChecks: Check[] = [
  {
    1: { checked: true, text: 'Check 1', isReadOnly: false },
  },
  {
    2: { checked: false, text: 'Check 2', isReadOnly: true },
  },
  {
    3: { checked: true, text: 'Check 3', isReadOnly: false },
  },
];

export default function NoTimer() {
  const [boxes, setBoxes] = useState<{ color: string; id: number }[]>([]);
  const [boxCount, setBoxCount] = useState<number>(5);
  const [pendingScroll, setPendingScroll] = useState<boolean>(false);
  const nextId = useRef<number>(1); 
  const [checks, setChecks] = useState<Check[]>([]);
  const puzzleType = "333";

  const getScram = async (puzzleType: string) => {
    const scram = await randomScrambleForEvent(puzzleType);
    return scram;
  }

  const generateRandomColor = () => {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  };



  const addBoxes = (count: number, direction: "top" | "bottom") => {
    const newBoxes = Array.from({ length: count }, (_, i) => ({
      color: generateRandomColor(),
      id: nextId.current + i,
    }));
    nextId.current += count; 
    setBoxes((prev) =>
      direction === "top" ? [...newBoxes, ...prev] : [...prev, ...newBoxes]
    );
  };

  const scrollDownBoxes = () => { // creates newest box on bottom, create its storage item
    const shiftedBoxes = boxes.slice(1);
    setBoxes([...shiftedBoxes, { color: generateRandomColor(), id: nextId.current }]);
    nextId.current += 1;
  };

  const scrollUpBoxes = () => { // load box on top
    const shiftedBoxes = boxes.slice(0, boxes.length - 1);
    setBoxes([{ color: generateRandomColor(), id: nextId.current }, ...shiftedBoxes]);
    nextId.current += 1;
  }

  const handleScroll = debounce((e) => {
    //todo: check only if scroll is moving up or down. prevent default behavior. then run this code.
    // or find some way to allow instant updates to the latest box
    if (e.deltaY < 0) {
      console.log("scrolling up");
    }
    if (e.deltaY > 0) { // ignore == 0
      console.log("scrolling down");
    }

    const container = document.getElementById("scrollContainer");
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    if (scrollTop + clientHeight >= scrollHeight) {
      scrollDownBoxes();
      setPendingScroll(true);
    }
  }, 300);

  // Ensure scroll adjustment happens before rendering new boxes
  useLayoutEffect(() => {
    if (pendingScroll) {
      const container = document.getElementById("scrollContainer");
      if (container) {
        // container.scrollTop -= container.clientHeight; // Adjust the scroll position

        // set checkbox to unchecked for the 2nd to last box
        const lastBoxCheckbox = document.querySelector(`#checkbox-${boxCount - 1}`);
        if (lastBoxCheckbox) {
          (lastBoxCheckbox as HTMLInputElement).checked = false;
        }
      }
      setPendingScroll(false);
    }
  }, [pendingScroll]);

  useEffect(() => {
    addBoxes(boxCount, "bottom");
  }, []);

  return (
    <div
      id="scrollContainer"
      className="h-[calc(100vh-64px)] overflow-y-scroll snap-y snap-mandatory scrollbar-hidden"
      onScroll={handleScroll}
    >
      {boxes.map((box, index) => (
      <div
        id={`box-${index + 1}`}
        key={box.id}
        className="h-[calc(100vh-64px)] snap-start flex flex-col space-y-3 items-center justify-center"
        style={{ backgroundColor: box.color }}
      >
        <NoTimeSolveBox checks={checks} setChecks={setChecks} />
      </div>
      ))}
    </div>
  );
}
