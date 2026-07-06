import { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Plus, Trash2, Edit3, Eye, Copy, Code2, X, GripVertical,
  FileText, CheckSquare, ChevronDown, Type, Mail, Phone,
  AlignLeft, Hash, Calendar, ToggleLeft, Send, Users,
  ExternalLink, Search, ArrowLeft, Check, AlertCircle,
  ClipboardList, Layers
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ── Field type definitions ─────────────────────────────────────────────────
const FIELD_TYPES = [
  { type: "text",     label: "Short Text",  icon: Type,        color: "violet" },
  { type: "email",    label: "Email",       icon: Mail,        color: "blue"   },
  { type: "phone",    label: "Phone",       icon: Phone,       color: "green"  },
  { type: "textarea", label: "Long Text",   icon: AlignLeft,   color: "orange" },
  { type: "number",   label: "Number",      icon: Hash,        color: "pink"   },
  { type: "select",   label: "Dropdown",    icon: ChevronDown, color: "cyan"   },
  { type: "checkbox", label: "Checkbox",    icon: CheckSquare, color: "teal"   },
  { type: "date",     label: "Date",        icon: Calendar,    color: "red"    },
];

const TYPE_COLOR = {
  violet: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  blue:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  green:  "bg-green-500/20 text-green-400 border-green-500/30",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  pink:   "bg-pink-500/20 text-pink-400 border-pink-500/30",
  cyan:   "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  teal:   "bg-teal-500/20 text-teal-400 border-teal-500/30",
  red:    "bg-red-500/20 text-red-400 border-red-500/30",
};

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function fieldDefault(type) {
  return {
    id: genId(),
    type,
    label: FIELD_TYPES.find(f => f.type === type)?.label || "Field",
    placeholder: "",
    required: false,
    options: type === "select" ? [{ label: "Option 1", value: "option_1" }] : [],
  };
}

// ── Inline field editor ────────────────────────────────────────────────────
function FieldEditor({ field, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const typeDef = FIELD_TYPES.find(f => f.type === field.type);
  const Icon = typeDef?.icon || Type;
  const colorClass = TYPE_COLOR[typeDef?.color || "violet"];

  const updateField = (key, value) => onChange({ ...field, [key]: value });

  const addOption = () => {
    const opts = [...(field.options || [])];
    opts.push({ label: `Option ${opts.length + 1}`, value: `option_${opts.length + 1}` });
    updateField("options", opts);
  };

  const updateOption = (i, key, value) => {
    const opts = [...(field.options || [])];
    opts[i] = { ...opts[i], [key]: value };
    if (key === "label") opts[i].value = value.toLowerCase().replace(/\s+/g, "_");
    updateField("options", opts);
  };

  const removeOption = (i) => {
    updateField("options", field.options.filter((_, idx) => idx !== i));
  };

  return (
    <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl overflow-hidden group">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="cursor-grab text-gray-600 hover:text-gray-400 transition-colors">
          <GripVertical size={16} />
        </div>

        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${colorClass}`}>
          <Icon size={12} />
          {typeDef?.label}
        </div>

        <input
          className="flex-1 bg-transparent text-white text-sm font-medium placeholder-gray-500 outline-none"
          value={field.label}
          onChange={e => updateField("label", e.target.value)}
          placeholder="Field label..."
        />

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
            title="Edit options"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={field.required}
            onChange={e => updateField("required", e.target.checked)}
            className="accent-violet-500 w-3.5 h-3.5"
          />
          Required
        </label>
      </div>

      {/* Expanded options */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700/50 pt-3 space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Placeholder text</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
              value={field.placeholder || ""}
              onChange={e => updateField("placeholder", e.target.value)}
              placeholder="Enter placeholder..."
            />
          </div>

          {field.type === "select" && (
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Options</label>
              <div className="space-y-2">
                {(field.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-violet-500 transition-colors"
                      value={opt.label}
                      onChange={e => updateOption(i, "label", e.target.value)}
                      placeholder={`Option ${i + 1}`}
                    />
                    <button
                      onClick={() => removeOption(i)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addOption}
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-1 transition-colors"
                >
                  <Plus size={12} /> Add option
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Form preview (read-only render of the form) ────────────────────────────
function FormPreview({ form }) {
  const renderField = (field) => {
    const base = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-500";
    switch (field.type) {
      case "textarea":
        return <textarea className={`${base} resize-none`} rows={3} placeholder={field.placeholder} disabled />;
      case "select":
        return (
          <select className={base} disabled>
            <option value="">{field.placeholder || "Select an option..."}</option>
            {(field.options || []).map((o, i) => (
              <option key={i} value={o.value}>{o.label}</option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-violet-600 w-4 h-4" disabled />
            <span className="text-sm text-gray-700">{field.placeholder || field.label}</span>
          </label>
        );
      default:
        return (
          <input
            type={field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
            className={base}
            placeholder={field.placeholder}
            disabled
          />
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-lg w-full mx-auto">
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-5">
        <h2 className="text-white font-bold text-xl">{form.name || "Untitled Form"}</h2>
        {form.description && <p className="text-violet-200 text-sm mt-1">{form.description}</p>}
      </div>
      <div className="p-6 space-y-4">
        {form.fields.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Add fields to see preview</p>
        )}
        {form.fields.map((field, i) => (
          <div key={field.id || i}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}
        {form.fields.length > 0 && (
          <button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 rounded-lg mt-2 transition-colors">
            {form.submit_button_text || "Submit"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Embed code modal ───────────────────────────────────────────────────────
function EmbedModal({ form, onClose }) {
  const [copied, setCopied] = useState(null);
  const publicUrl = `${window.location.origin}/f/${form.id}`;
  const iframeCode = `<iframe src="${publicUrl}" width="100%" height="600" frameborder="0" style="border-radius:12px;"></iframe>`;
  const scriptCode = `<div id="crm-form-${form.id}"></div>\n<script src="${API}/forms/embed.js?form_id=${form.id}"><\/script>`;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Code2 size={18} className="text-violet-400" />
            <h3 className="text-white font-semibold">Embed Form</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Public URL */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Public Link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-violet-300 font-mono truncate">
                {publicUrl}
              </div>
              <button
                onClick={() => copy(publicUrl, "url")}
                className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-violet-500 transition-all"
              >
                {copied === "url" ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-violet-500 transition-all"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* iframe embed */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">iFrame Embed</label>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 font-mono text-xs text-gray-300 leading-relaxed break-all">
              {iframeCode}
            </div>
            <button
              onClick={() => copy(iframeCode, "iframe")}
              className="mt-2 flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              {copied === "iframe" ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied === "iframe" ? "Copied!" : "Copy embed code"}
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
            <p className="text-violet-300 text-xs leading-relaxed">
              <strong className="text-violet-200">How to use:</strong> Copy the public link to share directly, or paste the iframe code into any website or landing page to embed the form. Submissions automatically create contacts in your CRM.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Submissions viewer ─────────────────────────────────────────────────────
function SubmissionsView({ form, onBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios.get(`${API}/forms/${form.id}/submissions`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => {
      setSubmissions(r.data);
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load submissions");
      setLoading(false);
    });
  }, [form.id]);

  const fields = form.fields || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Forms
        </button>
        <span className="text-gray-600">/</span>
        <h2 className="text-white font-semibold">{form.name}</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
          {submissions.length} submissions
        </span>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading submissions...</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No submissions yet</p>
          <p className="text-gray-600 text-sm mt-1">Share your form to start collecting responses</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/60">
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wide">#</th>
                {fields.map(f => (
                  <th key={f.id} className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wide">
                    {f.label}
                  </th>
                ))}
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wide">Contact</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wide">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, i) => (
                <tr key={sub.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-4 text-gray-500">{i + 1}</td>
                  {fields.map(f => (
                    <td key={f.id} className="py-3 px-4 text-gray-300">
                      {sub.data[f.label] !== undefined ? String(sub.data[f.label]) : <span className="text-gray-600">—</span>}
                    </td>
                  ))}
                  <td className="py-3 px-4">
                    {sub.contact_created ? (
                      <span className="flex items-center gap-1 text-green-400 text-xs">
                        <Check size={12} /> New contact
                      </span>
                    ) : sub.contact_id ? (
                      <span className="text-gray-500 text-xs">Existing</span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {new Date(sub.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Form builder / editor ──────────────────────────────────────────────────
function FormBuilder({ form: initialForm, onSave, onCancel }) {
  const [form, setForm] = useState(
    initialForm || {
      name: "",
      description: "",
      fields: [],
      submit_button_text: "Submit",
      success_message: "Thank you! Your response has been submitted.",
    }
  );
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const addField = (type) => {
    setForm(f => ({ ...f, fields: [...f.fields, fieldDefault(type)] }));
  };

  const updateField = (id, updated) => {
    setForm(f => ({ ...f, fields: f.fields.map(field => field.id === id ? updated : field) }));
  };

  const deleteField = (id) => {
    setForm(f => ({ ...f, fields: f.fields.filter(field => field.id !== id) }));
  };

  // drag-and-drop reorder
  const handleDragStart = (i) => { dragItem.current = i; };
  const handleDragEnter = (i) => { dragOver.current = i; };
  const handleDragEnd = () => {
    const fields = [...form.fields];
    const dragged = fields.splice(dragItem.current, 1)[0];
    fields.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;
    setForm(f => ({ ...f, fields }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Form name is required"); return; }
    if (form.fields.length === 0) { toast.error("Add at least one field"); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="text-white font-semibold">
            {initialForm ? "Edit Form" : "New Form"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
              showPreview
                ? "bg-violet-600 text-white"
                : "bg-gray-800 border border-gray-700 text-gray-300 hover:border-violet-500 hover:text-white"
            }`}
          >
            <Eye size={14} />
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : <><Check size={14} /> Save Form</>}
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? "grid-cols-2" : "grid-cols-1 max-w-3xl"}`}>
        {/* Left: builder */}
        <div className="space-y-5">
          {/* Form meta */}
          <div className="bg-gray-900/60 border border-gray-700/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Form Settings</h3>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Form Name *</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500 transition-colors"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Contact Us, Lead Capture..."
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Description (optional)</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500 transition-colors"
                value={form.description || ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description shown on the form..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Submit Button Text</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500 transition-colors"
                  value={form.submit_button_text || ""}
                  onChange={e => setForm(f => ({ ...f, submit_button_text: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Success Message</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500 transition-colors"
                  value={form.success_message || ""}
                  onChange={e => setForm(f => ({ ...f, success_message: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Add fields palette */}
          <div className="bg-gray-900/60 border border-gray-700/60 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Add Fields</h3>
            <div className="grid grid-cols-4 gap-2">
              {FIELD_TYPES.map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  onClick={() => addField(type)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50 hover:border-violet-500/50 hover:bg-violet-500/10 transition-all group"
                >
                  <Icon size={16} className="text-gray-400 group-hover:text-violet-400 transition-colors" />
                  <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fields list */}
          <div className="space-y-2">
            {form.fields.length === 0 ? (
              <div className="border-2 border-dashed border-gray-700 rounded-2xl py-10 text-center">
                <Layers size={28} className="text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Click a field type above to add it</p>
              </div>
            ) : (
              form.fields.map((field, i) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragEnter={() => handleDragEnter(i)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                >
                  <FieldEditor
                    field={field}
                    onChange={updated => updateField(field.id, updated)}
                    onDelete={() => deleteField(field.id)}
                    isFirst={i === 0}
                    isLast={i === form.fields.length - 1}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: preview */}
        {showPreview && (
          <div className="sticky top-6">
            <div className="bg-gray-800/40 border border-gray-700/40 rounded-2xl p-4">
              <p className="text-xs text-gray-500 text-center mb-4 uppercase tracking-wide">Live Preview</p>
              <FormPreview form={form} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Forms page ────────────────────────────────────────────────────────
export default function Forms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list | builder | submissions
  const [selectedForm, setSelectedForm] = useState(null);
  const [embedForm, setEmbedForm] = useState(null);
  const [search, setSearch] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const loadForms = async () => {
    try {
      const r = await axios.get(`${API}/forms/`, { headers });
      setForms(r.data);
    } catch {
      toast.error("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadForms(); }, []);

  const handleSave = async (formData) => {
    try {
      if (selectedForm?.id) {
        await axios.put(`${API}/forms/${selectedForm.id}`, formData, { headers });
        toast.success("Form updated!");
      } else {
        await axios.post(`${API}/forms/`, formData, { headers });
        toast.success("Form created!");
      }
      await loadForms();
      setView("list");
      setSelectedForm(null);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(Array.isArray(detail) ? detail.map(e => e.msg).join(", ") : detail || "Failed to save form");
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this form? All submissions will be lost.")) return;
    try {
      await axios.delete(`${API}/forms/${id}`, { headers });
      toast.success("Form deleted");
      setForms(f => f.filter(x => x.id !== id));
    } catch {
      toast.error("Failed to delete form");
    }
  };

  const toggleActive = async (form) => {
    try {
      await axios.put(`${API}/forms/${form.id}`, { is_active: !form.is_active }, { headers });
      setForms(f => f.map(x => x.id === form.id ? { ...x, is_active: !x.is_active } : x));
    } catch {
      toast.error("Failed to update form");
    }
  };

  const filtered = forms.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render sub-views ─────────────────────────────────────────────────────
  if (view === "builder") {
    return (
      <div className="p-6">
        <FormBuilder
          form={selectedForm}
          onSave={handleSave}
          onCancel={() => { setView("list"); setSelectedForm(null); }}
        />
      </div>
    );
  }

  if (view === "submissions" && selectedForm) {
    return (
      <div className="p-6">
        <SubmissionsView
          form={selectedForm}
          onBack={() => { setView("list"); setSelectedForm(null); }}
        />
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Form Builder</h1>
          <p className="text-gray-400 text-sm mt-1">Create lead capture forms that auto-create contacts</p>
        </div>
        <button
          onClick={() => { setSelectedForm(null); setView("builder"); }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-violet-500/20"
        >
          <Plus size={16} /> New Form
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="w-full bg-gray-800/60 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500 transition-colors"
          placeholder="Search forms..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Forms", value: forms.length, icon: FileText, color: "violet" },
          { label: "Active Forms", value: forms.filter(f => f.is_active).length, icon: ToggleLeft, color: "green" },
          { label: "Total Submissions", value: forms.reduce((a, f) => a + (f.submission_count || 0), 0), icon: Users, color: "blue" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900/60 border border-gray-700/60 rounded-2xl p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
              <Icon size={20} className={`text-${color}-400`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Forms grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading forms...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-semibold text-lg">
            {search ? "No forms match your search" : "No forms yet"}
          </p>
          <p className="text-gray-600 text-sm mt-1">
            {!search && "Create your first form to start capturing leads"}
          </p>
          {!search && (
            <button
              onClick={() => { setSelectedForm(null); setView("builder"); }}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors mx-auto"
            >
              <Plus size={16} /> Create Form
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(form => (
            <div
              key={form.id}
              className="bg-gray-900/60 border border-gray-700/60 rounded-2xl p-5 hover:border-violet-500/40 transition-all group"
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{form.name}</h3>
                  {form.description && (
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{form.description}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleActive(form)}
                  className={`ml-3 flex-shrink-0 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    form.is_active
                      ? "bg-green-500/10 text-green-400 border-green-500/30"
                      : "bg-gray-700/50 text-gray-500 border-gray-600/30"
                  }`}
                >
                  {form.is_active ? "Active" : "Inactive"}
                </button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Layers size={11} />
                  {(form.fields || []).length} fields
                </span>
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {form.submission_count || 0} submissions
                </span>
                <span>{new Date(form.created_at).toLocaleDateString()}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-700/50">
                <button
                  onClick={() => { setSelectedForm(form); setView("submissions"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs transition-all"
                >
                  <ClipboardList size={12} /> Submissions
                </button>
                <button
                  onClick={() => { setSelectedForm(form); setView("builder"); }}
                  className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
                  title="Edit"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={() => setEmbedForm(form)}
                  className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
                  title="Embed"
                >
                  <Code2 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(form.id)}
                  className="p-1.5 rounded-lg bg-gray-800 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Embed modal */}
      {embedForm && <EmbedModal form={embedForm} onClose={() => setEmbedForm(null)} />}
    </div>
  );
}