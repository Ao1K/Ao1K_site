
"use client";
"use strict";

import { Amplify } from 'aws-amplify';
import outputs from "../../amplify_outputs.json"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { randomScrambleForEvent } from 'cubing/scramble';


Amplify.configure(outputs);

const client = generateClient<Schema>();

const getDailyScramble = async (day: Date, attempt: number = 0) => {

  console.log('attempt:', attempt);

  if (attempt >= 1) {
    console.error("Could not get daily scramble");
    return;
  }

  const isoDate = day.toISOString().split('T')[0];
  console.log('isoDate:', isoDate);
  
  const { data } = await client.models.DailyScrambles.list({
    // filter: { date: { eq: isoDate } },
  });

  // console.log('deleting:', data);
  // for (const item of data) {
  //   console.log('deleting:', item);
  //   await client.models.DailyScrambles.delete({ id: item.id });
  // }

  if (!data || data.length === 0) {
    const puzzleType = "333";
    createDailyScramble(isoDate, puzzleType);
    getDailyScramble(day, attempt + 1);

  } else {
    console.log('data', data);
    const [{ date, scramble3x3 }] = data;
    return { date, scramble3x3 };
  }
}


const createDailyScramble = async (isoDate: string, puzzleType: string) => {
  const scramObj = await getScram(puzzleType);
  console.log('scramObj:', scramObj);
  const scram = scramObj.toString();
  console.log('scram:', scram);
  // await client.models.DailyScrambles.create({
  //   date: isoDate,
  //   scramble3x3: scram,
  // });
}

const getScram = async (puzzleType: string) => {
  const scram = await randomScrambleForEvent(puzzleType);
  return scram;
}

export default getDailyScramble;
