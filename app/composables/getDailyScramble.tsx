import { getUrl } from 'aws-amplify/storage';


const getDailyScramble = async () => await getUrl({
  path: 'scrambles/scramble3x3.txt',
  options: {
    bucket: 'daily-scramble-string',
  }
});

export default getDailyScramble;