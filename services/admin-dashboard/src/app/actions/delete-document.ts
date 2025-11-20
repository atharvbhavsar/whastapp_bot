"use server";

import { supabaseAdmin } from "@/lib/supabase";

export async function deleteDocument(fileId: string, storagePath: string) {
  try {
    // 1. Delete from Storage
    const { error: storageError } = await supabaseAdmin.storage
      .from("documents")
      .remove([storagePath]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
      // Continue to delete DB record even if storage fails (to keep DB clean)
    }

    // 2. Delete from Database (Files table)
    // This will CASCADE delete all related chunks in 'documents' table
    const { error: dbError } = await supabaseAdmin
      .from("files")
      .delete()
      .eq("id", fileId);

    if (dbError) {
      throw new Error(`Database delete failed: ${dbError.message}`);
    }

    return { success: true, message: "Document deleted successfully" };
  } catch (error: any) {
    console.error("Delete error:", error);
    return { success: false, error: error.message };
  }
}
