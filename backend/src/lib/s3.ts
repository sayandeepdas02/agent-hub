import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

function getClient() {
  return new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
    ...(process.env.S3_ENDPOINT
      ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
      : {}),
  });
}

const bucket = () => process.env.S3_BUCKET ?? "agent-hub";

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  mimeType: string
): Promise<void> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: mimeType })
  );
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 900
): Promise<string> {
  const client = getClient();
  const cmd = new GetObjectCommand({ Bucket: bucket(), Key: key });
  return awsGetSignedUrl(client, cmd, { expiresIn });
}

export async function getSignedUploadUrl(
  key: string,
  mimeType: string,
  expiresIn = 300
): Promise<string> {
  const client = getClient();
  const cmd = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: mimeType,
  });
  return awsGetSignedUrl(client, cmd, { expiresIn });
}

export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export function buildKey(
  workspaceId: string,
  category: "attachments" | "uploads",
  filename: string
) {
  const ts = Date.now();
  return `${workspaceId}/${category}/${ts}-${filename}`;
}
