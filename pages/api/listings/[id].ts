import prisma from "@/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { S3 } from "aws-sdk";
// import { PrismaListing } from "@prisma/client";

const s3 = new S3({
  region: "eu-north-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN, // If using temporary credentials
});

// Base URL for your image hosting service (e.g., S3)

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

async function getListing(id: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: id },
    include: {
      user: true,
      category: true,
      favorites: true,
      tags: true,
      messages: true,
    },
  });

  if (listing) {
    // Map over images to generate full URLs if needed
    listing.images = listing.images.map((image) => generatePresignedUrl("sixmarket", image));
  }

  return listing;
}

// GET '/api/listings/[id]'
export default async function Handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    const id: string = req.query.id as string;

    // Input validation
    if (!id) {
      return res.status(400).send("Missing id parameter in the request.");
    }

    try {
      const listingInfo = await getListing(id);

      // If listing not found
      if (!listingInfo) {
        return res.status(404).send("Listing not found.");
      }

      return res.status(200).json(listingInfo);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "An error occurred.", error: error.message });
    }
  } else {
    res.setHeader("Allow", "GET");
    res.status(405).send("Method not allowed. Use 'GET' instead.");
  }
}
