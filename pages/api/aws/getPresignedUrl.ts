import { NextApiRequest, NextApiResponse } from "next";
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_BUCKET_REGION,
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { files } = req.body as { files: { fileName: string; fileType: string }[] };
  console.log("Im at the backend");
  console.log(files);
  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ error: "Invalid request. 'files' must be an array." });
  }

  try {
    // Generate presigned URLs for each file
    const urls = files.map(({ fileName, fileType }) => {
      const params = {
        Bucket: BUCKET_NAME as string,
        Key: `uploads/${Date.now()}_${fileName}`, // Unique key for the file
        ContentType: fileType, // MIME type
        Expires: 60, // URL expiration time in seconds
      };

      const uploadUrl = s3.getSignedUrl("putObject", params);
      console.log(uploadUrl);
      return {
        uploadUrl,
        key: params.Key, // Return the S3 key for reference
      };
    });

    res.status(200).json({ urls });
  } catch (error) {
    console.error("Error generating presigned URLs:", error);
    res.status(500).json({ error: "Error generating presigned URLs" });
  }
}
