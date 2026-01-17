import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import outputs from "../amplify_outputs.json";

const s3 = new S3Client({ region: "us-east-1" });

export const fetchDailyScramble = async (): Promise<string> => {
  const bucketName = outputs.storage.buckets.find(b => b.name === 'daily-scram')?.bucket_name || outputs.storage.bucket_name;
  
  if (!bucketName) {
    console.error("Storage bucket not configured");
    return "";
  }
  
  const key = "scramble3x3.txt";
  console.log("Fetching daily scramble from S3 bucket:", bucketName);

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
    return "";
  }
};
