// Aggregated paper deep content from all 3 batches (46 models total)
import type { PaperDeepContent } from './paper_content_batch1';
import { PAPER_CONTENT_BATCH1 } from './paper_content_batch1';
import { PAPER_CONTENT_BATCH2 } from './paper_content_batch2';
import { PAPER_CONTENT_BATCH3 } from './paper_content_batch3';

export type { PaperDeepContent };

export const ALL_PAPER_CONTENT: Record<string, PaperDeepContent> = {
  ...PAPER_CONTENT_BATCH1,
  ...PAPER_CONTENT_BATCH2,
  ...PAPER_CONTENT_BATCH3,
};

export function getPaperContent(modelId: string): PaperDeepContent | null {
  return ALL_PAPER_CONTENT[modelId] || null;
}
