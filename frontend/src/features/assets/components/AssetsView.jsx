import { api } from "../../../api.js";
import { DataTable } from "../../../shared/components/DataTable.jsx";
import { EmptyState } from "../../../shared/components/EmptyState.jsx";
import { Panel } from "../../../shared/components/Panel.jsx";
import { localizedConfig, tableLabels, tr } from "../../../shared/config/appConfig.jsx";
import { assetLevelMeta, buildAssetTree, canPlaceAssetUnder } from "../utils/assetHierarchy.js";
import { AssetDetailsPanel, AssetHealthDot, AssetMiniSelect } from "./AssetDetails.jsx";
import { Building2, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function AssetsView({
  rows,
  departments,
  onCreate,
  onEdit,
  onDelete,
  onCreateDepartment,
  onEditDepartment,
  onDeleteDepartment,
  onMoveAsset,
  workOrders = [],
  pmTasks = [],
  inventory = [],
  canManage,
  canCreateAsset = canManage,
  canEditAsset = canManage,
  canDeleteAsset = canManage,
  canCreateDepartment = canManage,
  canEditDepartment = canManage,
  canDeleteDepartment = canManage,
  language
}) {
  const t = text => tr(language, text);
  const [activeAssetSection, setActiveAssetSection] = useState("hierarchy");
  const [selectedAssetId, setSelectedAssetId] = useState(rows[0]?.id || "");
  const [expanded, setExpanded] = useState({});
  const [assetSearch, setAssetSearch] = useState("");
  const [assetFilters, setAssetFilters] = useState({
    status: "",
    level: "",
    criticality: ""
  });
  const [assetLifecycle, setAssetLifecycle] = useState({
    history: [],
    timeline: [],
    health: null,
    measurements: [],
    events: [],
    documents: [],
    photos: [],
    failures: [],
    downtime: []
  });
  const [assetLifecycleLoading, setAssetLifecycleLoading] = useState(false);
  const [assetLifecycleError, setAssetLifecycleError] = useState("");
  const customerConfig = localizedConfig("customers", language);
  const assetConfig = localizedConfig("equipment", language);
  const assetTree = useMemo(() => buildAssetTree(rows, assetSearch, assetFilters), [rows, assetSearch, assetFilters]);
  const companyTrees = useMemo(() => departments.map(department => ({
    ...department,
    children: assetTree.filter(asset => Number(asset.customer_id) === Number(department.id))
  })), [departments, assetTree]);
  const selectedAsset = rows.find(asset => Number(asset.id) === Number(selectedAssetId)) || rows[0];
  const sections = [{
    key: "customers",
    title: t("Customers / Locations"),
    count: departments.length
  }, {
    key: "hierarchy",
    title: t("Asset Hierarchy"),
    count: rows.length
  }, {
    key: "assets",
    title: t("Assets"),
    count: rows.length
  }];
  useEffect(() => {
    if (rows.length && !rows.some(asset => Number(asset.id) === Number(selectedAssetId))) {
      setSelectedAssetId(rows[0].id);
    }
  }, [rows, selectedAssetId]);
  useEffect(() => {
    if (!selectedAsset?.id) {
      setAssetLifecycle({
        history: [],
        timeline: [],
        health: null,
        measurements: [],
        events: [],
        documents: [],
        photos: [],
        failures: [],
        downtime: []
      });
      return;
    }
    let cancelled = false;
    async function loadLifecycle() {
      setAssetLifecycleLoading(true);
      setAssetLifecycleError("");
      try {
        const [history, timeline, health, measurements, events, documents, photos, failures, downtime] = await Promise.all([api.list(`assets/${selectedAsset.id}/history`), api.list(`assets/${selectedAsset.id}/timeline`), api.list(`assets/${selectedAsset.id}/health`), api.list(`assets/${selectedAsset.id}/measurements`), api.list(`assets/${selectedAsset.id}/events`), api.list(`assets/${selectedAsset.id}/documents`), api.list(`assets/${selectedAsset.id}/photos`), api.list(`assets/${selectedAsset.id}/failures`).catch(() => []), api.list(`assets/${selectedAsset.id}/downtime`).catch(() => [])]);
        if (!cancelled) setAssetLifecycle({
          history,
          timeline,
          health,
          measurements,
          events,
          documents,
          photos,
          failures,
          downtime
        });
      } catch (error) {
        if (!cancelled) {
          setAssetLifecycle({
            history: [],
            timeline: [],
            health: null,
            measurements: [],
            events: [],
            documents: [],
            photos: [],
            failures: [],
            downtime: []
          });
          setAssetLifecycleError(error.message || "Failed to load asset lifecycle");
        }
      } finally {
        if (!cancelled) setAssetLifecycleLoading(false);
      }
    }
    loadLifecycle();
    return () => {
      cancelled = true;
    };
  }, [selectedAsset?.id]);
  async function reloadAssetLifecycle(assetId = selectedAsset?.id) {
    if (!assetId) return;
    setAssetLifecycleLoading(true);
    setAssetLifecycleError("");
    try {
      const [history, timeline, health, measurements, events, documents, photos, failures, downtime] = await Promise.all([api.list(`assets/${assetId}/history`), api.list(`assets/${assetId}/timeline`), api.list(`assets/${assetId}/health`), api.list(`assets/${assetId}/measurements`), api.list(`assets/${assetId}/events`), api.list(`assets/${assetId}/documents`), api.list(`assets/${assetId}/photos`), api.list(`assets/${assetId}/failures`).catch(() => []), api.list(`assets/${assetId}/downtime`).catch(() => [])]);
      setAssetLifecycle({
        history,
        timeline,
        health,
        measurements,
        events,
        documents,
        photos,
        failures,
        downtime
      });
    } catch (error) {
      setAssetLifecycleError(error.message || "Failed to load asset lifecycle");
    } finally {
      setAssetLifecycleLoading(false);
    }
  }
  async function handleAssetLifecycleCreate(kind, payload) {
    if (!selectedAsset?.id) return;
    const resource = kind === "document" ? "documents" : kind === "photo" ? "photos" : "measurements";
    try {
      await api.create(`assets/${selectedAsset.id}/${resource}`, payload);
      await reloadAssetLifecycle(selectedAsset.id);
    } catch (error) {
      window.alert(error.message || "Failed to save asset lifecycle item");
    }
  }
  function toggleExpanded(id) {
    setExpanded(current => ({
      ...current,
      [id]: !current[id]
    }));
  }
  function handleDrop(asset, parentId) {
    if (!canEditAsset || !onMoveAsset) return;
    const parent = parentId ? rows.find(item => Number(item.id) === Number(parentId)) : null;
    if (parent && !canPlaceAssetUnder(asset, parent, rows)) return;
    onMoveAsset(asset, parentId);
  }
  return <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {sections.map(section => {
          const active = activeAssetSection === section.key;
          return <button key={section.key} type="button" onClick={() => setActiveAssetSection(section.key)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${active ? "bg-slate-950 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
                <span>{section.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/15 text-white" : "bg-white text-blue-700"}`}>{section.count}</span>
              </button>;
        })}
        </div>
      </div>

      {activeAssetSection === "customers" ? <Panel title={t("Customers / Locations")} subtitle={t("Create, update, and control operational records through the existing REST API.")} actions={canCreateDepartment ? <button onClick={onCreateDepartment} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              <Plus className="h-4 w-4" />
              {t("New Record")}
            </button> : null}>
          <DataTable columns={customerConfig.columns} rows={departments} onEdit={canEditDepartment ? onEditDepartment : null} onDelete={canDeleteDepartment ? onDeleteDepartment : null} emptyMessage={t("No customers / locations")} labels={tableLabels(language)} />
        </Panel> : null}

      {activeAssetSection === "hierarchy" ? <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
          <Panel title={t("Asset Hierarchy")} subtitle={t("Customer / location to asset structure for fast plant navigation.")} actions={canCreateAsset ? <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800">
                <Plus className="h-4 w-4" />
                Add Asset
              </button> : null}>
            <div className="mb-4 space-y-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" placeholder="Search by name or code" value={assetSearch} onChange={event => setAssetSearch(event.target.value)} />
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                <AssetMiniSelect value={assetFilters.status} onChange={value => setAssetFilters(current => ({
              ...current,
              status: value
            }))} options={["", "Active", "Down", "Maintenance", "operational", "warning", "down"]} label="Status" />
                <AssetMiniSelect value={assetFilters.level} onChange={value => setAssetFilters(current => ({
              ...current,
              level: value
            }))} options={["", "Site", "Area / Department", "System", "Equipment", "Component"]} label="Type" />
                <AssetMiniSelect value={assetFilters.criticality} onChange={value => setAssetFilters(current => ({
              ...current,
              criticality: value
            }))} options={["", "Low", "Medium", "High", "Critical"]} label="Criticality" />
              </div>
            </div>

            <div className="max-h-[68vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2" onDragOver={event => {
          if (canEditAsset) event.preventDefault();
        }} onDrop={event => {
          event.preventDefault();
          const draggedId = event.dataTransfer.getData("text/plain");
          const dragged = rows.find(asset => Number(asset.id) === Number(draggedId));
          if (dragged) handleDrop(dragged, null);
        }}>
              {companyTrees.map(company => <AssetCompanyNode key={company.id} company={company} rows={rows} selectedId={selectedAsset?.id} expanded={expanded} onToggle={toggleExpanded} onSelect={setSelectedAssetId} onDropAsset={handleDrop} canManage={canEditAsset} language={language} />)}
              {!companyTrees.some(company => company.children.length) ? <EmptyState title={t("No equipment")} message="Add Site assets first, then attach areas, systems, equipment, and components." /> : null}
            </div>
          </Panel>

          <AssetDetailsPanel asset={selectedAsset} rows={rows} departments={departments} workOrders={workOrders} pmTasks={pmTasks} inventory={inventory} onEdit={onEdit} onDelete={onDelete} canManage={canEditAsset || canDeleteAsset} canEdit={canEditAsset} canDelete={canDeleteAsset} lifecycle={assetLifecycle} lifecycleLoading={assetLifecycleLoading} lifecycleError={assetLifecycleError} onAddLifecycleItem={handleAssetLifecycleCreate} language={language} />
        </div> : null}

      {activeAssetSection === "assets" ? <Panel title={t("Assets")} subtitle={t("Create, update, and control operational records through the existing REST API.")} actions={canCreateAsset ? <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              <Plus className="h-4 w-4" />
              {t("New Record")}
            </button> : null}>
          <DataTable columns={assetConfig.columns} rows={rows} onEdit={canEditAsset ? onEdit : null} onDelete={canDeleteAsset ? onDelete : null} emptyMessage={t("No equipment")} labels={tableLabels(language)} />
        </Panel> : null}
    </div>;
}

export function AssetCompanyNode({
  company,
  rows,
  selectedId,
  expanded,
  onToggle,
  onSelect,
  onDropAsset,
  canManage,
  language
}) {
  const isOpen = expanded[`company-${company.id}`] ?? true;
  return <div className="mb-2">
      <div className="mb-1 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2 py-2" onDragOver={event => {
      if (canManage) event.preventDefault();
    }} onDrop={event => {
      event.preventDefault();
      const draggedId = event.dataTransfer.getData("text/plain");
      const dragged = rows.find(asset => Number(asset.id) === Number(draggedId));
      if (dragged) onDropAsset(dragged, null);
    }}>
        <button type="button" onClick={() => onToggle(`company-${company.id}`)} className="grid h-6 w-6 shrink-0 place-items-center rounded text-blue-700 hover:bg-white/70">
          {company.children.length ? <span className={`text-xs font-black transition ${isOpen ? "rotate-90" : ""}`}>{">"}</span> : <span>-</span>}
        </button>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-blue-700">
          <Building2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{company.name}</p>
          <p className="truncate text-xs font-semibold text-blue-700">Company / Location Root</p>
        </div>
      </div>
      {isOpen ? company.children.map(node => <AssetTreeNode key={node.id} node={node} rows={rows} selectedId={selectedId} expanded={expanded} onToggle={onToggle} onSelect={onSelect} onDropAsset={onDropAsset} canManage={canManage} depth={1} language={language} />) : null}
    </div>;
}

export function AssetTreeNode({
  node,
  rows,
  selectedId,
  expanded,
  onToggle,
  onSelect,
  onDropAsset,
  canManage,
  depth,
  language
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded[node.id] ?? depth < 2;
  const selected = Number(selectedId) === Number(node.id);
  const meta = assetLevelMeta(node.asset_level);
  const Icon = meta.icon;
  return <div>
      <div className={`group mb-1 flex items-center gap-2 rounded-lg border px-2 py-2 transition ${selected ? "border-blue-300 bg-blue-50" : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"}`} style={{
      marginInlineStart: depth * 16
    }} draggable={canManage} onDragStart={event => event.dataTransfer.setData("text/plain", String(node.id))} onDragOver={event => {
      if (canManage) event.preventDefault();
    }} onDrop={event => {
      event.preventDefault();
      const draggedId = event.dataTransfer.getData("text/plain");
      const dragged = rows.find(asset => Number(asset.id) === Number(draggedId));
      if (dragged && Number(dragged.id) !== Number(node.id)) onDropAsset(dragged, node.id);
    }}>
        <button type="button" onClick={() => onToggle(node.id)} className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-500 hover:bg-slate-100">
          {hasChildren ? <span className={`text-xs font-black transition ${isOpen ? "rotate-90" : ""}`}>{">"}</span> : <span className="text-slate-300">-</span>}
        </button>
        <button type="button" onClick={() => onSelect(node.id)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${meta.bg} ${meta.fg}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{node.name}</p>
              <p className="truncate text-xs font-semibold text-slate-500">{node.asset_code || `AST-${node.id}`} - {node.asset_level || "Equipment"}</p>
            </div>
          </div>
        </button>
        <AssetHealthDot value={node.status} />
      </div>
      {hasChildren && isOpen ? node.children.map(child => <AssetTreeNode key={child.id} node={child} rows={rows} selectedId={selectedId} expanded={expanded} onToggle={onToggle} onSelect={onSelect} onDropAsset={onDropAsset} canManage={canManage} depth={depth + 1} language={language} />) : null}
    </div>;
}
