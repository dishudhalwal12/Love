import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject } from "firebase/storage";
import { FileItem } from "./types";
import { addDoc, collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const uploadFile = async (
  file: File, 
  orderId: string, 
  onProgress?: (progress: number) => void
): Promise<FileItem> => {
  const storageRef = ref(storage, `orders/${orderId}/${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        const fileDoc: Omit<FileItem, "id"> = {
          name: file.name,
          url: downloadURL,
          size: file.size,
          type: file.type,
          uploadedAt: Date.now(),
          orderId
        };
        
        // Save metadata to Firestore
        const docRef = await addDoc(collection(db, "files"), fileDoc);
        
        resolve({ id: docRef.id, ...fileDoc });
      }
    );
  });
};

export const getOrderFiles = async (orderId: string): Promise<FileItem[]> => {
  const q = query(collection(db, "files"), where("orderId", "==", orderId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileItem));
};

export const deleteFile = async (file: FileItem) => {
  const storageRef = ref(storage, `orders/${file.orderId}/${file.name}`);
  await deleteObject(storageRef);
  await deleteDoc(doc(db, "files", file.id));
};
