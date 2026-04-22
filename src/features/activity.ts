import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ActivityLog } from "./types";

export const logActivity = async (message: string, status: ActivityLog["status"], type: string) => {
  try {
    await addDoc(collection(db, "activity_logs"), {
      message,
      status,
      type,
      timestamp: Date.now(), // using client time for easy sorting locally, could use serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
