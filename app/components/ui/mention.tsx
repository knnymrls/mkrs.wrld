"use client";

import * as MentionPrimitive from "@diceui/mention";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Mention({
  className,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Root>) {
  return (
    <MentionPrimitive.Root
      data-slot="mention"
      className={cn(
        "**:data-tag:rounded **:data-tag:bg-primary/10 **:data-tag:py-px **:data-tag:text-primary **:data-tag:underline **:data-tag:decoration-primary/30 **:data-tag:underline-offset-2",
        "dark:**:data-tag:bg-primary/20 dark:**:data-tag:text-primary",
        className,
      )}
      {...props}
    />
  );
}

function MentionLabel({
  className,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Label>) {
  return (
    <MentionPrimitive.Label
      data-slot="mention-label"
      className={cn("px-0.5 py-1.5 font-medium text-sm text-onsurface-primary", className)}
      {...props}
    />
  );
}

function MentionInput({
  className,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Input>) {
  return (
    <MentionPrimitive.Input
      data-slot="mention-input"
      className={cn(
        "flex w-full rounded-lg border border-border bg-surface-container-muted px-3 py-2 text-sm text-onsurface-primary placeholder:text-onsurface-secondary",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-onsurface-secondary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-all",
        className,
      )}
      {...props}
    />
  );
}

function MentionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Content>) {
  return (
    <MentionPrimitive.Portal>
      <MentionPrimitive.Content
        data-slot="mention-content"
        className={cn(
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          "relative min-w-[8rem] overflow-hidden rounded-lg border border-border bg-surface-container shadow-lg",
          "data-[state=closed]:animate-out data-[state=open]:animate-in",
          "p-1",
          className,
        )}
        style={{ zIndex: 99999 }}
        {...props}
      >
        {children}
      </MentionPrimitive.Content>
    </MentionPrimitive.Portal>
  );
}

function MentionItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Item>) {
  return (
    <MentionPrimitive.Item
      data-slot="mention-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none",
        "data-disabled:pointer-events-none",
        "data-highlighted:bg-surface-container-muted data-highlighted:text-onsurface-primary",
        "data-disabled:opacity-50",
        "transition-colors",
        className,
      )}
      {...props}
    >
      {children}
    </MentionPrimitive.Item>
  );
}

export { Mention, MentionContent, MentionInput, MentionItem, MentionLabel };
