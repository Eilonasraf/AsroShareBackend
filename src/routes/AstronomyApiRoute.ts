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

// Function to generate the Authorization header
const generateAuthHeader = (): string => {
  return `Basic ${Buffer.from(`${APP_ID}:${APP_SECRET}`).toString("base64")}`;
};

// Function to fetch latitude and longitude from a place name
const fetchCoordinates = async (place: string) => {
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: place,
          format: "json",
          limit: 1, // Get only the first result
        },
      }
    );

    if (response.data.length === 0) {
      throw new Error("Location not found");
    }

    return {
      latitude: parseFloat(response.data[0].lat),
      longitude: parseFloat(response.data[0].lon),
    };
  } catch (error: any) {
    throw new Error("Failed to fetch coordinates: " + error.message);
  }
};

// Function to fetch the moon phase
const fetchMoonPhase = async (
  latitude: number,
  longitude: number,
  date: string
) => {
  const payload = {
    format: "png",
    style: {
      moonStyle: "default",
      backgroundStyle: "stars",
      backgroundColor: "#000000",
      headingColor: "#ffffff",
      textColor: "#ffffff",
    },
    observer: {
      latitude,
      longitude,
      date,
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
          Authorization: generateAuthHeader(),
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    throw new Error("Failed to fetch moon phase data: " + error.message);
  }
};

// Moon phase endpoint (uses location API if place is given)
/**
 * @swagger
 * /api/astronomy/moon-phase:
 *   get:
 *     tags:
 *       - Astronomy
 *     description: Fetches moon phase data for a given location and date
 *     parameters:
 *       - name: date
 *         in: query
 *         description: The date for the moon phase data (default is today's date)
 *         required: false
 *         type: string
 *       - name: place
 *         in: query
 *         description: The name of the place to fetch coordinates for
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: Successfully fetched moon phase data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 moonPhase:
 *                   type: string
 *                   description: The phase of the moon
 *       500:
 *         description: Failed to fetch moon phase data
 */
router.get(
  "/moon-phase",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const date =
        (req.query.date as string) || new Date().toISOString().split("T")[0];
      let latitude: number;
      let longitude: number;

      if (req.query.place) {
        const coordinates = await fetchCoordinates(req.query.place as string);
        latitude = coordinates.latitude;
        longitude = coordinates.longitude;
      } else {
        latitude = req.query.latitude
          ? parseFloat(req.query.latitude as string)
          : 31.9023; // Default: Modiin
        longitude = req.query.longitude
          ? parseFloat(req.query.longitude as string)
          : 35.0259;
      }

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
      latitude,
      longitude,
      date,
    },
    view: {
      type: "constellation",
      parameters: {
        constellation: "ori", // 3-letter constellation ID (e.g., Orion = "ori")
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

// Star chart endpoint (uses location API if place is given)
/**
 * @swagger
 * /api/astronomy/star-chart:
 *   get:
 *     tags:
 *       - Astronomy
 *     description: Fetches star chart data for a given location and date
 *     parameters:
 *       - name: date
 *         in: query
 *         description: The date for the star chart data (default is today's date)
 *         required: false
 *         type: string
 *       - name: place
 *         in: query
 *         description: The name of the place to fetch coordinates for
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: Successfully fetched star chart data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 starChart:
 *                   type: object
 *                   description: The star chart data
 *       500:
 *         description: Failed to fetch star chart data
 */
router.get(
  "/star-chart",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const date =
        (req.query.date as string) || new Date().toISOString().split("T")[0];
      let latitude: number;
      let longitude: number;

      if (req.query.place) {
        const coordinates = await fetchCoordinates(req.query.place as string);
        latitude = coordinates.latitude;
        longitude = coordinates.longitude;
      } else {
        latitude = req.query.latitude
          ? parseFloat(req.query.latitude as string)
          : 31.9023; // Default: Modiin
        longitude = req.query.longitude
          ? parseFloat(req.query.longitude as string)
          : 35.0259;
      }

      const starChartData = await fetchStarChart(latitude, longitude, date);
      res.json(starChartData);
    } catch (error: any) {
      console.error("Error fetching star chart data:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
