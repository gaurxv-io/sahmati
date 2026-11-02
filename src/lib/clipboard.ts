import { toast } from "@/components/toast";

/** Copies text, with a plain fallback message when the browser blocks clipboard access. */
export async function copyText(text: string, done = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast("Couldn't copy automatically. Select the text and copy it by hand.");
  }
}
