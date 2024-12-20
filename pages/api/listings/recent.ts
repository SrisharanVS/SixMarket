import prisma from "@/utils/prisma";
import { Listing as PrismaListing } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
const logger = require("@/utils/logger"); // Import the logger middleware using the 'require' syntax
import { S3 } from "aws-sdk";
// import { PrismaListing } from "@prisma/client";

const s3 = new S3({
  region: "eu-north-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN, // If using temporary credentials
});

function generatePresignedUrl(bucketName: string, key: string): string {
  const params = {
    Bucket: bucketName,
    Key: key,
    Expires: 300, // URL expiry time in seconds
  };
  const temp = s3.getSignedUrl("getObject", params);
  console.log("temp", temp);
  return temp;
}

async function getRecentListings(): Promise<(PrismaListing & { images: string[] })[] | null> {
  try {
    const listings = await prisma.listing.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    const bucketName = "sixmarket"; // Replace with your bucket name

    // Map over listings to generate presigned URLs for images
    const listingsWithPresignedUrls = listings.map((listing) => {
      return {
        ...listing,
        images: listing.images.map((key) => generatePresignedUrl(bucketName, key)),
      };
    });
    console.log("lisitngs", listingsWithPresignedUrls);
    return listingsWithPresignedUrls;
  } catch (error: any) {
    console.error("Failed to fetch data", error);
    return null;
  }
}

export default async function Handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  logger(req, res, async () => {
    if (req.method === "HEAD") {
      res.status(200).end();
      return;
    }

    if (req.method !== "GET") {
      res.status(405).send({ error: "405 - Method not allowed" })
      return;
    }

    try {
      const recentAds = await getRecentListings();
      // console.log(recentAds);

      if (!recentAds || recentAds.length === 0) {
        res.status(200).send([]);
        return;
      }

      res.status(200).json(recentAds);
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).send({ error: error.message });
      } else {
        res.status(500).send({
          error: "500 - An unexpected error occured.",
        });
      }
    }
  });
}
