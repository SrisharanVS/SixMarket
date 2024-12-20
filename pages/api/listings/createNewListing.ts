import prisma from "@/utils/prisma";
import { Prisma } from "@prisma/client";
import { Listing } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { Session, getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

async function CreateNewAd(adData: Prisma.ListingCreateInput) {
  try {
    const newAd = await prisma.listing.create({
      data: adData,
    });
    console.log("New listing created:", newAd); // Log the newly created ad
    return newAd;
  } catch (error: any) {
    console.error("Error creating ad in Prisma:", error); // Log Prisma errors
    throw new Error(error.message);
  }
}

// POST '/api/listings/createNewListing'
export default async function Handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session: Session | null = await getServerSession(req, res, authOptions);
  // Check if session exists
  if (session) {
    console.log("Session found, proceeding with listing creation...");
    console.log('Session:', session);
    if (req.method === "POST") {
      try {
        console.log("Request body:", req.body); // Log the incoming request body

        // Get user info based on session
        const user = await prisma.user.findUnique({
          where: {
            email: session.user?.email as string,
          },
        });
          console.log("User", user);
        if (!user) {
          console.error("User not found for email:", session.user?.email);
          return res.status(404).json({ error: "User not found" });
        }

        const userId = user.id;
        const adData = {
          user: { connect: { id: userId } },
          category: { connect: { id: req.body.categoryId } },
          name: req.body.name,
          description: req.body.description,
          condition: req.body.condition || 'NEW',
          price: parseInt(req.body.price, 10),
          location: req.body.location,
          canDeliver: req.body.canDeliver || false,
          images: req.body.images || [],
          tags: req.body.tags ? {
            connect: req.body.tags.map((tagId: string) => ({ id: tagId })),
          } : undefined,
        };
        
        

        console.log("Ad data to create:", adData); // Log the data to be inserted

        // Create a new listing in the database
        const newAd = await CreateNewAd(adData);

        // Successfully created ad, return the result
        res.status(201).json(newAd);
      } catch (error: any) {
        console.error("API error:", error); // Log the error from API handling
        res.status(500).send({ error: error.message });
      }
    } else {
      console.warn("Invalid method:", req.method); // Log if an invalid method is used
      res.setHeader("Allow", "POST");
      res.status(405).end("Method Not Allowed");
    }
  } else {
    console.warn("Unauthorized request - no session found.");
    res.status(401).send("401 - Not Authorized");
  }
}
