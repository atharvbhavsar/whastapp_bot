"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { GroupedDuplicates } from "@/app/actions/upload-document";

interface DuplicateChunksDialogProps {
  isOpen: boolean;
  duplicateData: {
    totalMatches: number;
    groupedByFile: GroupedDuplicates[];
  };
  onConfirm: (chunkIdsToDelete: string[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DuplicateChunksDialog({
  isOpen,
  duplicateData,
  onConfirm,
  onCancel,
  isLoading = false,
}: DuplicateChunksDialogProps) {
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set());
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    console.log("DuplicateChunksDialog opened with data:", {
      isOpen,
      totalMatches: duplicateData?.totalMatches,
      filesCount: duplicateData?.groupedByFile?.length,
      groupedByFile: duplicateData?.groupedByFile,
    });
  }, [isOpen, duplicateData]);

  const toggleFileExpansion = (fileId: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedFiles(newExpanded);
  };

  const toggleChunkSelection = (chunkId: string) => {
    const newSelected = new Set(selectedChunks);
    if (newSelected.has(chunkId)) {
      newSelected.delete(chunkId);
    } else {
      newSelected.add(chunkId);
    }
    setSelectedChunks(newSelected);
  };

  const selectAllChunks = () => {
    const allChunkIds = new Set<string>();
    duplicateData.groupedByFile.forEach((group) => {
      group.chunkMatches.forEach((match) => {
        match.similarChunks.forEach((chunk) => {
          allChunkIds.add(chunk.id);
        });
      });
    });
    setSelectedChunks(allChunkIds);
  };

  const deselectAllChunks = () => {
    setSelectedChunks(new Set());
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedChunks));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Similar Chunks Detected
          </DialogTitle>
          <DialogDescription>
            Found {duplicateData.totalMatches} similar chunks across{" "}
            {duplicateData.groupedByFile.length} document(s). Select which
            chunks to delete before uploading the new document.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 border rounded-lg p-4">
          <div className="space-y-4">
            {duplicateData.groupedByFile &&
            duplicateData.groupedByFile.length > 0 ? (
              duplicateData.groupedByFile.map((fileGroup) => (
                <div key={fileGroup.fileId} className="border rounded-lg p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleFileExpansion(fileGroup.fileId)}
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">
                        {fileGroup.filename}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {fileGroup.totalMatches} chunk
                        {fileGroup.totalMatches !== 1 ? "s" : ""} matching •{" "}
                        {(fileGroup.avgSimilarity * 100).toFixed(1)}% avg
                        similarity
                      </p>
                    </div>
                    <Badge variant="secondary">{fileGroup.totalMatches}</Badge>
                    {expandedFiles.has(fileGroup.fileId) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>

                  {expandedFiles.has(fileGroup.fileId) && (
                    <div className="mt-4 space-y-3 ml-2">
                      {fileGroup.chunkMatches.map((match, idx) =>
                        match.similarChunks.map((chunk) => (
                          <div
                            key={chunk.id}
                            className="flex gap-3 p-3 bg-gray-50 rounded border text-sm"
                          >
                            <Checkbox
                              checked={selectedChunks.has(chunk.id)}
                              onCheckedChange={() =>
                                toggleChunkSelection(chunk.id)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded">
                                  Chunk #{chunk.chunk_index || idx}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {(chunk.similarity * 100).toFixed(1)}% match
                                </Badge>
                              </div>
                              <p className="text-gray-600 line-clamp-2">
                                {chunk.content.substring(0, 150)}
                                {chunk.content.length > 150 ? "..." : ""}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <p>No duplicate chunks found.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 flex flex-wrap">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllChunks}
              disabled={isLoading}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAllChunks}
              disabled={isLoading}
            >
              Deselect All
            </Button>
          </div>
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel Upload
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || selectedChunks.size === 0}
              className="gap-2"
            >
              {isLoading
                ? "Deleting..."
                : `Delete & Upload (${selectedChunks.size})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
