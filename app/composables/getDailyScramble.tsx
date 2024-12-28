
"use client";
"use strict";

import { Amplify } from 'aws-amplify';
import outputs from "../../amplify_outputs.json"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { randomScrambleForEvent } from 'cubing/scramble';


Amplify.configure(outputs);

const client = generateClient<Schema>();

const getDailyScramble = async (day: Date) => {

  const isoDate = day.toISOString().split('T')[0];
  
  const { data } = await client.models.DailyScrambles.list();

  // testing: delete all daily scrambles
  // for (const item of data) {
  //   console.log('deleting:', item);
  //   await client.models.DailyScrambles.delete({ id: item.id });
  // }

  // inefficiently check for existing daily scramble
  for (const item of data) {
    if (item.date === isoDate) {
      return { date: item.date, scramble3x3: item.scramble3x3 };
    }
  }

  // else, create a new daily scramble
  const puzzleType = "333";
  const newScram = createDailyScramble(isoDate, puzzleType);
  return newScram;

}


const createDailyScramble = async (isoDate: string, puzzleType: string) => {
  const scramObj = await getScram(puzzleType);
  const scram = scramObj.toString();

  await client.models.DailyScrambles.create({
    date: isoDate,
    scramble3x3: scram,
  });

  return { date: isoDate, scramble3x3: scram };
}

const getScram = async (puzzleType: string) => {
  const scram = await randomScrambleForEvent(puzzleType);
  return scram;
}

export default getDailyScramble;
