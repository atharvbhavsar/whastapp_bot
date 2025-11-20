"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  status: "processed" | "processing" | "failed";
}

const DUMMY_FILES: UploadedFile[] = [
  {
    id: "1",
    name: "Academic_Calendar_2024.pdf",
    size: "2.4 MB",
    uploadDate: "2024-03-15",
    status: "processed",
  },
  {
    id: "2",
    name: "Fee_Structure_2024-25.docx",
    size: "1.1 MB",
    uploadDate: "2024-03-14",
    status: "processed",
  },
  {
    id: "3",
    name: "Hostel_Rules_Regulations.pdf",
    size: "856 KB",
    uploadDate: "2024-03-10",
    status: "processed",
  },
];

export default function UploadsPage() {
  const [uploadedFiles, setUploadedFiles] =
    useState<UploadedFile[]>(DUMMY_FILES);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const handleFileUpload = (files: File[]) => {
    setNewFiles(files);
    toast.success(`${files.length} file(s) selected for upload`);
    // In a real app, we would upload these files here
  };

  const handleDelete = (id: string) => {
    setUploadedFiles(uploadedFiles.filter((file) => file.id !== id));
    toast.success("File deleted successfully");
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 h-full">
      <div className="flex flex-col md:flex-row h-full gap-6">
        {/* Left Side: Upload Area */}
        <div className="flex-1 flex flex-col h-full">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Upload Documents</h2>
            <p className="text-sm text-muted-foreground">
              Drag and drop files here or click to browse. Supported formats:
              PDF, DOCX, TXT.
            </p>
          </div>
          <div className="flex-1 w-full border border-dashed bg-white border-neutral-200 rounded-lg overflow-hidden">
            <FileUpload onChange={handleFileUpload} />
          </div>
        </div>

        <Separator
          orientation="vertical"
          className="hidden md:block h-full bg-neutral-200"
        />

        {/* Right Side: Uploaded Files List */}
        <div className="flex-1 flex flex-col h-full">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              Recently Uploaded Documents
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage your recents and view their processing status.
            </p>
          </div>
          <div className="flex-1 overflow-auto pr-2">
            <div className="space-y-4">
              {uploadedFiles.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                  No documents uploaded yet.
                </div>
              ) : (
                <AnimatePresence>
                  {uploadedFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{file.size}</span>
                            <span>•</span>
                            <span>{file.uploadDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.status === "processed" && (
                          <Badge
                            variant="secondary"
                            className="text-green-600 bg-green-100 hover:bg-green-100 gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Processed
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() => handleDelete(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
