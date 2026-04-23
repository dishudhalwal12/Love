"use client";

import { useState, useEffect } from "react";
import { deleteFile } from "@/features/storage";
import { FileItem } from "@/features/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, FileText, Download, Trash2, Loader2, FileArchive,
  Image as ImageIcon, FolderOpen, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { activityEvents } from "@/features/activity";

/** Detect file category from filename */
const detectCategory = (name: string): FileItem["category"] => {
  const n = name.toLowerCase();
  if (n.includes("synopsis")) return "synopsis";
  if (n.includes("report") || n.includes("rpt")) return "report";
  if (n.includes("source") || n.includes("code") || n.includes("src")) return "source";
  if (
    n.includes("receipt") ||
    n.includes("payment") ||
    n.includes("invoice") ||
    n.includes("bill")
  )
    return "receipt";
  return "other";
};

const CATEGORY_COLORS: Record<string, string> = {
  synopsis: "bg-primary/10 text-primary border-primary/20",
  report: "bg-status-success/10 text-status-success border-status-success/20",
  source: "bg-status-active/10 text-status-active border-status-active/20",
  receipt: "bg-status-pending/10 text-status-pending border-status-pending/20",
  other: "bg-muted text-muted-foreground border-border/50",
};

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAllFiles = async () => {
      try {
        const snapshot = await getDocs(collection(db, "files"));
        const allFiles = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<FileItem, "id">;
          return {
            id: doc.id,
            ...data,
            category: data.category || detectCategory(data.name),
          } as FileItem;
        });
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
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      toast.success("File deleted");
    } catch {
      toast.error("Failed to delete file");
    }
  };

  const filteredFiles = files.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.orderId.toLowerCase().includes(search.toLowerCase())
  );

  // Group by orderId
  const grouped = filteredFiles.reduce<Record<string, FileItem[]>>((acc, file) => {
    const key = file.orderId || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(file);
    return acc;
  }, {});

  const toggleFolder = (orderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const getFileIcon = (type: string) => {
    if (type.includes("image")) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (type.includes("zip") || type.includes("rar") || type.includes("tar"))
      return <FileArchive className="w-8 h-8 text-yellow-500" />;
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
        <div className="space-y-6">
          {Object.entries(grouped).map(([orderId, orderFiles]) => {
            const isCollapsed = collapsedFolders.has(orderId);
            return (
              <div key={orderId} className="space-y-3">
                {/* Folder Header */}
                <button
                  className="flex items-center gap-2 group w-full text-left"
                  onClick={() => toggleFolder(orderId)}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    {isCollapsed
                      ? <ChevronRight className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />
                    }
                    <FolderOpen className="w-4 h-4 text-primary" />
                    <span className="font-mono">{orderId}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50">
                      {orderFiles.length} file{orderFiles.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pl-6">
                    {orderFiles.map((file) => (
                      <Card key={file.id} className="bg-card border-border/40 hover:border-border/80 transition-all shadow-sm group">
                        <CardContent className="p-4 flex flex-col items-center text-center space-y-3 relative overflow-hidden">
                          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-2">
                            {getFileIcon(file.type)}
                          </div>

                          <div className="w-full">
                            <h3 className="font-medium text-sm truncate" title={file.name}>{file.name}</h3>
                            <div className="flex justify-center mt-1.5">
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 py-0 h-4 ${CATEGORY_COLORS[file.category || "other"]}`}
                              >
                                {file.category || "other"}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex justify-between px-1">
                              <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              <span>{formatDistanceToNow(file.uploadedAt, { addSuffix: true })}</span>
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
          })}
        </div>
      )}
    </div>
  );
}
