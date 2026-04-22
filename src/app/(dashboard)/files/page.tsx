"use client";

import { useState, useEffect } from "react";
import { getOrderFiles, deleteFile } from "@/features/storage";
import { FileItem } from "@/features/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText, Download, Trash2, Loader2, FileArchive, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchAllFiles = async () => {
      try {
        const snapshot = await getDocs(collection(db, "files"));
        const allFiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileItem));
        setFiles(allFiles.sort((a, b) => b.uploadedAt - a.uploadedAt));
      } catch (err) {
        console.error("Failed to fetch files", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllFiles();
  }, []);

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    try {
      await deleteFile(file);
      setFiles(files.filter(f => f.id !== file.id));
      toast.success("File deleted");
    } catch (err) {
      toast.error("Failed to delete file");
    }
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.orderId.toLowerCase().includes(search.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    if (type.includes("image")) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (type.includes("zip") || type.includes("rar") || type.includes("tar")) return <FileArchive className="w-8 h-8 text-yellow-500" />;
    return <FileText className="w-8 h-8 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Files</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage documents and assets across all orders.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Order ID or filename..."
            className="pl-8 bg-card border-border/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-border/50">
          No files found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="bg-card border-border/40 hover:border-border/80 transition-all shadow-sm group">
              <CardContent className="p-4 flex flex-col items-center text-center space-y-3 relative overflow-hidden">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-2">
                  {getFileIcon(file.type)}
                </div>
                
                <div className="w-full">
                  <h3 className="font-medium text-sm truncate" title={file.name}>{file.name}</h3>
                  <div className="text-xs text-muted-foreground mt-1 flex justify-between px-1">
                    <span className="truncate max-w-[50%]">{file.orderId}</span>
                    <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(file.uploadedAt, { addSuffix: true })}
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-2 bg-card border-t border-border/50 flex justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform">
                  <Button variant="secondary" size="sm" className="h-8 flex-1" onClick={() => window.open(file.url, "_blank")}>
                    <Download className="w-4 h-4 mr-1" /> DL
                  </Button>
                  <Button variant="destructive" size="sm" className="h-8 px-2" onClick={() => handleDelete(file)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
