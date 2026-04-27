"use client";

import type { ReactNode } from "react";

type ChatMarkdownProps = {
  content: string;
};

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  const blocks = splitIntoBlocks(content);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <ul key={`list-${index}`} className="space-y-1.5 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`item-${itemIndex}`} className="list-disc">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="whitespace-pre-wrap">
            {renderInlineMarkdown(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function splitIntoBlocks(content: string) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: Array<{ type: "paragraph"; text: string } | { type: "list"; items: string[] }> =
    [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  function flushParagraph() {
    const text = paragraphBuffer.join("\n").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    paragraphBuffer = [];
  }

  function flushList() {
    if (listBuffer.length > 0) {
      blocks.push({ type: "list", items: [...listBuffer] });
    }
    listBuffer = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (bulletMatch) {
      flushParagraph();
      listBuffer.push(bulletMatch[1]);
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <span key={index}>{part}</span>;
  });
}
