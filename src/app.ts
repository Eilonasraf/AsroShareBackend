import initializeServer from "./server";
import https from "https"
import fs from "fs"


const startServer = async () => {
  try {
    const app = await initializeServer();
    const PORT = process.env.PORT;

    if (process.env.NODE_ENV !== "production") {
      app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    } else {
      const prop = {
        key: fs.readFileSync("../client-key.pem"),
        cert: fs.readFileSync("../client-cert.pem")
      }
      https.createServer(prop, app).listen(PORT)
      console.log(`Server running on port ${PORT}`);
    }
  } catch (error) {
    console.error("Failed to start the server:", error);
  }
};

startServer();
