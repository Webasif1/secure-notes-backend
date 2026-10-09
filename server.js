import app from "./src/app.js";
import connectToDB from "./src/config/database.js";
import { config } from "./src/config/config.js";

connectToDB().then(() => {
  app.listen(config.PORT, () => {
    console.log(`The server is running on port ${config.PORT}`);
  });
});
