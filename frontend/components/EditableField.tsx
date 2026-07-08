"use client";

import { useState } from "react";

// Click-to-edit text field. Enter or blur saves; Escape cancels. Lets a
// coordinator correct AI-extracted details before approving.
export default function EditableField({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => { onSave(draft.trim()); setEditing(false); }}
        onKeyDown={(event) => {
          if (event.key === "Enter") { onSave(draft.trim()); setEditing(false); }
          if (event.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="w-full rounded border border-blue-400 bg-white px-2 py-1 text-sm"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
      className="-mx-1 rounded px-1 text-left text-sm font-medium text-gray-800 hover:bg-blue-50"
    >
      {value || <span className="text-gray-300">—</span>}
    </button>
  );
}
