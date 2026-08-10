import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getAmplifyOutputs } from "./amplifyOutputs";

const s3 = new S3Client({ region: "us-east-1" });

const isDev = process.env.NODE_ENV === 'development';

const generateDevFallbackScramble = async (): Promise<string> => {
  try {
    const { randomScrambleForEvent } = await import("cubing/scramble");
    const scramble = (await randomScrambleForEvent("333")).toString();
    console.warn("fetchDailyScramble: using dev-only generated scramble. This NEVER happens in production.");
    return `dev fallback — not the real daily scramble\n${scramble}`;
  } catch (error) {
    console.error("Dev fallback scramble generation failed:", error);
    return "";
  }
};

export const fetchDailyScramble = async (): Promise<string> => {
  const outputs = getAmplifyOutputs();
  const bucketName = outputs?.storage?.buckets?.find((b: { name: string }) => b.name === 'daily-scram')?.bucket_name || outputs?.storage?.bucket_name;

  if (!bucketName) {
    console.warn("Storage bucket not configured");
    return isDev ? generateDevFallbackScramble() : "";
  }

  const key = "scramble3x3.txt";

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    return await res.Body!.transformToString();
  } catch (error) {
    console.error("Error fetching daily scramble:", error);
    return isDev ? generateDevFallbackScramble() : "";
  }
};
