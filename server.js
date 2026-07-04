import "dotenv/config";
import { connectDB } from "./src/config/database.js";
import app from "./src/app.js";

const PORT = process.env.PORT || 5000;

await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
