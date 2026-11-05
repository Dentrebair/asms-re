"use client";

import { useEffect, useState, type FormEvent } from "react";
import { explain, supabase, type StaffRow } from "./lib";

type Notify = (message: string, tone?: "ok" | "error") => void;

export function StaffAdmin({ me, notify }: { me: StaffRow; notify: Notify }) {
  const [rows, setRows] = useState<StaffRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRow["role"]>("editor");

  async function load() {
    const { data, error } = await supabase().from("staff").select("*").order("created_at");
    if (error) notify(explain(error), "error");
    else setRows(data as StaffRow[]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- load once on open
  useEffect(() => { void load(); }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase().from("staff").insert({ email: email.trim().toLowerCase(), name: name.trim() || null, role });
    if (error) return notify(explain(error), "error");
    notify(`${email} added. Now invite them from Supabase so they can set a password (see the note below).`);
    setEmail(""); setName(""); setRole("editor");
    void load();
  }

  async function changeRole(row: StaffRow, next: StaffRow["role"]) {
    const { error } = await supabase().from("staff").update({ role: next }).eq("email", row.email);
    if (error) return notify(explain(error), "error");
    void load();
  }

  async function remove(row: StaffRow) {
    if (!confirm(`Remove ${row.email} from staff? They will no longer be able to edit the website.`)) return;
    const { error } = await supabase().from("staff").delete().eq("email", row.email);
    if (error) return notify(explain(error), "error");
    notify(`${row.email} removed.`);
    void load();
  }

  return (
    <section>
      <div className="adm-toolbar"><h2>Staff <small>{rows ? rows.length : "…"}</small></h2></div>
      {rows && (
        <ul className="adm-list adm-staff">
          {rows.map((r) => (
            <li key={r.email}>
              <div className="adm-list-main"><strong>{r.name || r.email}</strong><span>{r.email}{r.email === me.email && " (you)"}</span></div>
              <div className="adm-list-actions">
                <select aria-label={`Role for ${r.email}`} value={r.role} disabled={r.email === me.email} onChange={(e) => changeRole(r, e.target.value as StaffRow["role"])}>
                  <option value="editor">Editor — properties &amp; products</option>
                  <option value="owner">Owner — also manages staff</option>
                </select>
                <button type="button" className="adm-btn adm-btn-danger" disabled={r.email === me.email} onClick={() => remove(r)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form className="adm-form adm-staff-add" onSubmit={add}>
        <fieldset><legend>Add a staff member</legend>
          <label className="adm-field"><span className="adm-label">Email *</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="adm-field"><span className="adm-label">Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="adm-field"><span className="adm-label">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as StaffRow["role"])}><option value="editor">Editor</option><option value="owner">Owner</option></select>
          </label>
          <div className="adm-inline adm-wide"><button type="submit" className="adm-btn">Add to staff</button></div>
        </fieldset>
      </form>
      <p className="adm-note">
        <strong>Then send them a login:</strong> in Supabase go to <em>Authentication → Users → Invite user</em> and enter the same email.
        They’ll get an email with a link back to this page to choose a password.
      </p>
    </section>
  );
}
