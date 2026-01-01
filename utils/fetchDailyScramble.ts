import outputs from "../amplify_outputs.json";

export const fetchDailyScramble = async (): Promise<string> => {
  const bucketName = outputs.storage.buckets.find(b => b.name === 'daily-scram')?.bucket_name || outputs.storage.bucket_name;
  const region = outputs.storage.aws_region;
  const key = "scramble3x3.txt";
  const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) {
      console.error(`Failed to fetch daily scramble: ${response.statusText}`);
      return "";
    }
    return await response.text();
  } catch (error) {
    console.error("Error fetching daily scramble:", error);
    return "";
  }
};
