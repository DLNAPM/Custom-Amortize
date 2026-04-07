import dotenv from 'dotenv';
dotenv.config();

const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!sa) {
  console.log("FIREBASE_SERVICE_ACCOUNT is not set.");
} else {
  try {
    const parsed = JSON.parse(sa);
    console.log("FIREBASE_SERVICE_ACCOUNT is valid JSON. Project ID:", parsed.project_id);
  } catch (e) {
    console.error("FIREBASE_SERVICE_ACCOUNT is NOT valid JSON:", e.message);
    console.log("First 50 chars:", sa.substring(0, 50));
  }
}
