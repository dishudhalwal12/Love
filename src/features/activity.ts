import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { ActivityLog } from "./types";

export const logActivity = async (
  message: string,
  status: ActivityLog["status"],
  type: string,
  targetId?: string,
  meta?: Record<string, unknown>
) => {
  try {
    await addDoc(collection(db, "activity_logs"), {
      message,
      status,
      type,
      timestamp: Date.now(),
      ...(targetId && { targetId }),
      ...(meta && { meta }),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

/**
 * Deletes all activity logs associated with a specific entity ID.
 */
export const deleteActivityLogs = async (targetId: string) => {
  try {
    const q = query(collection(db, "activity_logs"), where("targetId", "==", targetId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((d) => {
      batch.delete(doc(db, "activity_logs", d.id));
    });
    await batch.commit();
  } catch (error) {
    console.error("Failed to delete activity logs:", error);
  }
};

// Typed activity helpers for common events
export const activityEvents = {
  leadCreated: (leadId: string, name: string, college: string) =>
    logActivity(`New lead added: ${name} from ${college}`, "new", "lead", leadId),

  leadStatusChanged: (leadId: string, name: string, from: string, to: string) =>
    logActivity(
      `Lead ${name}: ${from} → ${to}`,
      "active",
      "lead_status",
      leadId
    ),

  leadConverted: (leadId: string, name: string, orderId: string) =>
    logActivity(
      `Lead ${name} converted to Order #${orderId}`,
      "success",
      "conversion",
      leadId
    ),

  orderStatusChanged: (orderId: string, from: string, to: string, realOrderId: string) =>
    logActivity(`Order ${orderId}: ${from} → ${to}`, "active", "order_status", realOrderId),

  paymentAdded: (orderId: string, amount: number, method: string, paymentId: string) =>
    logActivity(
      `Payment ₹${amount} via ${method} added to ${orderId}`,
      "success",
      "payment",
      paymentId
    ),

  taskCompleted: (taskId: string, title: string) =>
    logActivity(`Task completed: "${title}"`, "success", "task", taskId),

  partnerInvited: (partnerId: string, name: string) =>
    logActivity(`Partner invited: ${name}`, "new", "partner", partnerId),

  fileUploaded: (filename: string, orderId: string, fileId: string) =>
    logActivity(`File uploaded: ${filename} → ${orderId}`, "new", "file", fileId),

  reminderSent: (target: string, targetId: string) =>
    logActivity(`Reminder sent to: ${target}`, "pending", "reminder", targetId),
};
