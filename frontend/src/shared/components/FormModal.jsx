import { useState } from "react";
import { uiText } from "../i18n/index.js";

export default function FormModal({ title, fields, value, setValue, onSubmit, onClose, options = {}, onAddOption, labels = {}, language }) {
  const [optionDrafts, setOptionDrafts] = useState({});
  const update = (key, next) => setValue({ ...value, [key]: next });
  const optionValue = (field, raw) => {
    if (!field.number) return raw;
    return raw === "" ? null : Number(raw);
  };
  const updateOptionDraft = (key, next) => setOptionDrafts((current) => ({ ...current, [key]: next }));
  const visibleFields = fields.filter((field) => !field.visibleWhen || field.visibleWhen(value));
  const selectOptions = (field) => {
    const rawOptions = options[field.options] || field.options || [];
    const normalized = rawOptions.map((option) => ({
      value: option.value ?? option,
      label: option.label ?? option
    }));
    const currentValue = value[field.key];
    if (currentValue !== "" && currentValue !== null && currentValue !== undefined && !normalized.some((option) => String(option.value) === String(currentValue))) {
      return [{ value: currentValue, label: currentValue }, ...normalized];
    }
    return normalized;
  };
  const addOption = async (field) => {
    const draft = String(optionDrafts[field.key] || "").trim();
    if (!draft || !onAddOption) return;
    const saved = await onAddOption(field, draft);
    if (saved) {
      update(field.key, draft);
      updateOptionDraft(field.key, "");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{uiText(labels.record || "Maintenance Record", language)}</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">{uiText(title, language)}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-950">
            {uiText(labels.close || "Close", language)}
          </button>
        </div>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-6 md:grid-cols-2">
          {visibleFields.map((field) => {
            const common = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
            const isRequired = typeof field.required === "function" ? field.required(value) : Boolean(field.required);
            return (
              <label key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  {uiText(field.label, language)}
                  {isRequired ? <span className="text-red-600"> *</span> : null}
                </span>
                {field.type === "select" ? (
                  <>
                    <select className={common} value={value[field.key] ?? ""} onChange={(event) => update(field.key, optionValue(field, event.target.value))} disabled={field.readOnly} required={isRequired} aria-required={isRequired}>
                      <option value="">{uiText(labels.select || "Select", language)}</option>
                      {selectOptions(field).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {field.allowAddOption ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          className={common}
                          type="text"
                          value={optionDrafts[field.key] ?? ""}
                          placeholder={uiText(field.addPlaceholder || "Add option", language)}
                          onChange={(event) => updateOptionDraft(field.key, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addOption(field);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => addOption(field)}
                          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-blue-800"
                        >
                          {uiText(field.addLabel || labels.add || "Add", language)}
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : field.type === "textarea" ? (
                  <textarea className={common} rows={4} value={value[field.key] ?? ""} onChange={(event) => update(field.key, event.target.value)} readOnly={field.readOnly} required={isRequired} aria-required={isRequired} />
                ) : (
                  <input
                    className={`${common} ${field.readOnly ? "bg-slate-50 font-bold text-slate-600" : ""}`}
                    type={field.type || "text"}
                    value={value[field.key] ?? ""}
                    onChange={(event) => update(field.key, field.type === "number" ? Number(event.target.value) : event.target.value)}
                    readOnly={field.readOnly}
                    required={isRequired}
                    aria-required={isRequired}
                  />
                )}
                {field.hint ? <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{uiText(field.hint, language)}</p> : null}
              </label>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
            {uiText(labels.cancel || "Cancel", language)}
          </button>
          <button type="submit" className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-800">
            {uiText(labels.save || "Save Changes", language)}
          </button>
        </div>
      </form>
    </div>
  );
}

export { FormModal };
