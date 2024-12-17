import { downloadData } from 'aws-amplify/storage';

import { Amplify } from 'aws-amplify';
import outputs from "../../amplify_outputs.json"

Amplify.configure(outputs);



const getDailyScramble = async () => {
  try {
    const downloadScrambleResult = await downloadData({
      path: 'scrambles/scramble3x3.txt',
      options: { 
        bucket: 'daily-scramble-strings/**/*',
      }
    }).result;
    const scrambleText = await downloadScrambleResult.body.text();
    console.log('succeeded:', scrambleText);
    return scrambleText;
  } catch (error) {
    console.error('error:', error);
    return null;

  }
}

export default getDailyScramble;