/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const APP_ID = process.env.ASTRONOMY_APP_ID;
const APP_SECRET = process.env.ASTRONOMY_APP_SECRET;

if (!APP_ID || !APP_SECRET) {
  throw new Error("Astronomy API credentials are not set");
}

console.log(APP_ID, APP_SECRET);

// Function to generate the Authorization header
const generateAuthHeader = (): string => {
  return `Basic ${Buffer.from(`${APP_ID}:${APP_SECRET}`).toString("base64")}`;
};

// Function to fetch the moon phase
const fetchMoonPhase = async (
  latitude: number,
  longitude: number,
  date: string
) => {
  const payload = {
    style: {
      moonStyle: "default",
      backgroundStyle: "stars",
      backgroundColor: "#000000",
      headingColor: "#ffffff",
      textColor: "#ffffff",
    },
    observer: {
      latitude: latitude,
      longitude: longitude,
      date: date,
    },
    view: {
      type: "landscape-simple",
      parameters: {},
    },
  };

  try {
    const response = await axios.post(
      "https://api.astronomyapi.com/api/v2/studio/moon-phase",
      payload,
      {
        headers: {
          Authorization: generateAuthHeader(), // Use the generateAuthHeader function here
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    throw new Error("Failed to fetch moon phase data: " + error.message);
  }
};

// Moon phase endpoint
router.get(
  "/moon-phase",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const date =
        (req.query.date as string) || new Date().toISOString().split("T")[0];
      const latitude = req.query.latitude
        ? parseFloat(req.query.latitude as string)
        : 31.9023; // Default location (Modiin)
      const longitude = req.query.longitude
        ? parseFloat(req.query.longitude as string)
        : 35.0259; // Default location (Modiin)

      const moonPhaseData = await fetchMoonPhase(latitude, longitude, date);
      res.json(moonPhaseData);
    } catch (error: any) {
      console.error("Error fetching moon phase data:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

// Function to fetch the star chart
const fetchStarChart = async (
  latitude: number,
  longitude: number,
  date: string
) => {
  const payload = {
    style: "default",
    observer: {
      latitude: latitude,
      longitude: longitude,
      date: date,
    },
    view: {
      type: "area",
      parameters: {
        position: {
          equatorial: {
            rightAscension: 14.83,
            declination: -15.23,
          },
        },
        zoom: 3,
      },
    },
  };

  try {
    const response = await axios.post(
      "https://api.astronomyapi.com/api/v2/studio/star-chart",
      payload,
      {
        headers: {
          Authorization: generateAuthHeader(),
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    throw new Error("Failed to fetch star chart data: " + error.message);
  }
};

// Star chart endpoint
router.get(
  "/star-chart",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const latitude = req.query.latitude
        ? parseFloat(req.query.latitude as string)
        : 31.9023; // Default latitude (Modiin)
      const longitude = req.query.longitude
        ? parseFloat(req.query.longitude as string)
        : 35.0259; // Default longitude (Modiin)
      const date =
        (req.query.date as string) || new Date().toISOString().split("T")[0];

      const starChartData = await fetchStarChart(latitude, longitude, date);
      res.json(starChartData);
    } catch (error: any) {
      console.error("Error fetching star chart data:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
