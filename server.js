import "dotenv/config";
import { connectDB } from "./dbConfig.js";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
