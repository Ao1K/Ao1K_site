import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';

const s3 = new AWS.S3();

export async function GET(request: Request): Promise<NextResponse> {
    try {
        const params = {
            Bucket: 'daily-scramble-string',
            Key: 'scrambles/scramble3x3.txt',
        };

        const data = await s3.getObject(params).promise();

        if (!data.Body) {
            return NextResponse.json({ error: 'File not found in S3 bucket' }, { status: 404 });
        }

        const content = data.Body.toString('utf-8');

        return NextResponse.json({ message: content });

    } catch (error) {
        const errorMessage = (error as Error).message;
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}