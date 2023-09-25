import * as path from "node:path";
import { S3Client, StorageClass } from "@aws-sdk/client-s3";
import { backUp } from "./back-up";
import { program } from "commander";
import z from "zod";

program
  .requiredOption("--folder <path>")
  .requiredOption("--bucket <name>")
  .requiredOption("--key <key>")
  .requiredOption("--storage-class <class>");

program.parse();

(async () => {
  const options = z
    .object({
      folder: z.string(),
      bucket: z.string(),
      key: z.string(),
      storageClass: z.nativeEnum(StorageClass),
    })
    .parse(program.opts());

  const env = z
    .object({
      AWS_ACCESS_KEY_ID: z.string(),
      AWS_REGION: z.string(),
      AWS_SECRET_ACCESS_KEY: z.string(),
      AWS_SESSION_TOKEN: z.string(),
      BUCKET_NAME: z.string(),
    })
    .parse(process.env);

  const s3Client = new S3Client({
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      sessionToken: env.AWS_SESSION_TOKEN,
    },
    region: env.AWS_REGION,
  });

  const result = await backUp({
    s3Client,
    key: options.key,
    bucketName: options.bucket,
    folderToBackUp: path.join(process.cwd(), options.folder),
    storageClass: options.storageClass,
  });

  switch (result.tag) {
    case "success": {
      console.log("folder backed up successfully");
      process.exit(0);
    }
    case "upload failed": {
      console.log("upload failed");
      process.exit(1);
    }
    case "invalid checksum": {
      console.log("upload failed");
      process.exit(1);
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});