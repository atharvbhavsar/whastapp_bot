"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Globe, Plus, Loader2, Trash2, ExternalLink } from "lucide-react";
import {
  addWebsiteContent,
  getWebsiteContent,
  deleteWebsiteContent,
  WebsiteContentItem,
} from "@/app/actions/website-content";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { Textarea } from "./ui/textarea";

interface WebsiteContentUploadProps {
  collegeId: string;
  onContentChange?: () => void;
}

export function WebsiteContentUpload({
  collegeId,
  onContentChange,
}: WebsiteContentUploadProps) {
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [websiteItems, setWebsiteItems] = useState<WebsiteContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWebsiteContent = useCallback(async () => {
    setIsLoading(true);
    const result = await getWebsiteContent(collegeId);
    if (result.success) {
      setWebsiteItems(result.data || []);
    }
    setIsLoading(false);
  }, [collegeId]);

  useEffect(() => {
    loadWebsiteContent();
  }, [loadWebsiteContent]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a page title");
      return;
    }
    if (!sourceUrl.trim()) {
      toast.error("Please enter the source URL");
      return;
    }
    if (!content.trim() || content.trim().length < 20) {
      toast.error("Content must be at least 20 characters");
      return;
    }

    // Validate URL
    try {
      new URL(sourceUrl);
    } catch {
      toast.error("Please enter a valid URL (including https://)");
      return;
    }

    setIsSubmitting(true);
    toast.info("Processing website content...");

    try {
      const result = await addWebsiteContent(
        collegeId,
        title,
        content,
        sourceUrl
      );

      if (result.success) {
        toast.success(`Added "${title}" with ${result.chunkCount} chunks`);
        setTitle("");
        setSourceUrl("");
        setContent("");
        loadWebsiteContent();
        onContentChange?.();
      } else {
        toast.error(result.error || "Failed to add content");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to add content");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    toast.promise(deleteWebsiteContent(id), {
      loading: `Deleting "${itemTitle}"...`,
      success: () => {
        setWebsiteItems(websiteItems.filter((item) => item.id !== id));
        onContentChange?.();
        return "Content deleted successfully";
      },
      error: "Failed to delete content",
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Left Side: Add Content Form */}
      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Add Website Content
            </CardTitle>
            <CardDescription>
              Paste scraped website content with its source URL. The URL will be
              used for citations when the AI references this content. Great for:
              college website pages, department info, course details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Page Title Input */}
            <div className="grid gap-2">
              <Label htmlFor="title">Page Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Admission Process - GPC Barmer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Source URL Input */}
            <div className="grid gap-2">
              <Label htmlFor="sourceUrl">Source URL (for citations) *</Label>
              <Input
                id="sourceUrl"
                type="url"
                placeholder="https://gpcbarmer.ac.in/admission"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                This URL will be shown as a citation when AI uses this content
              </p>
            </div>

            {/* Content Input */}
            <div className="grid gap-2">
              <Label htmlFor="content">Page Content (Markdown) *</Label>
              <Textarea
                id="content"
                placeholder="Paste the scraped markdown content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isSubmitting}
                className="min-h-[250px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {content.length} characters
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title || !sourceUrl || !content}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Website Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Side: Website Content List */}
      <div className="flex-1 flex flex-col">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Website Pages</h2>
          <p className="text-sm text-muted-foreground">
            Scraped content with citation URLs
          </p>
        </div>

        <div className="flex-1 overflow-auto pr-2">
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : websiteItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                No website content added yet.
              </div>
            ) : (
              <AnimatePresence>
                {websiteItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-blue-100 rounded-full shrink-0">
                          <Globe className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{item.title}</p>
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate"
                          >
                            {item.source_url}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.content.length} chars •{" "}
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="secondary"
                          className="text-blue-600 bg-blue-100 hover:bg-blue-100"
                        >
                          Website
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() => handleDelete(item.id, item.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
