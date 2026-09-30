import { useState } from "react";
import type { SourceCreate } from "./types";
import demoAdd from "./mocks/demo-source.add.json";

const empty: SourceCreate = {
  type: "email",
  title: "",
  date: new Date().toISOString().slice(0, 10),
  owner: "",
  country: "BE",
  body: "",
  claims: [{ topic: "remote_work_days_per_week", value: "" }],
  supersedesIds: [],
  referencesIds: [],
};

export function AddSourceForm({
  onSubmit,
  busy,
}: {
  onSubmit: (body: SourceCreate) => Promise<void>;
  busy: boolean;
}) {
  const [form, setForm] = useState<SourceCreate>(empty);
  const claim = form.claims[0];

  return (
    <form
      className="add-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          ...form,
          owner: form.owner || null,
        });
      }}
    >
      <strong>Add source</strong>
      <label>
        Type
        <select
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value as SourceCreate["type"] })
          }
        >
          <option value="doc">doc</option>
          <option value="email">email</option>
          <option value="teams">teams</option>
        </select>
      </label>
      <label>
        Title
        <input
          required
          maxLength={200}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </label>
      <label>
        Date
        <input
          type="date"
          required
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
      </label>
      <label>
        Owner
        <input
          maxLength={80}
          value={form.owner ?? ""}
          onChange={(e) => setForm({ ...form, owner: e.target.value })}
        />
      </label>
      <label>
        Country
        <select
          value={form.country}
          onChange={(e) =>
            setForm({ ...form, country: e.target.value as SourceCreate["country"] })
          }
        >
          <option value="BE">BE</option>
          <option value="NL">NL</option>
          <option value="ALL">ALL</option>
        </select>
      </label>
      <label>
        Days / week
        <input
          required
          maxLength={64}
          value={claim.value}
          onChange={(e) =>
            setForm({
              ...form,
              claims: [{ topic: "remote_work_days_per_week", value: e.target.value }],
            })
          }
        />
      </label>
      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {busy ? "Adding…" : "Add source"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSubmit(demoAdd as SourceCreate)}
        >
          Add Sam’s email (demo)
        </button>
      </div>
    </form>
  );
}
