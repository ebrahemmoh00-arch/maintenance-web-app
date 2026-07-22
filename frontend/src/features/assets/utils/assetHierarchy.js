import { Box, Building2, Cpu, Factory, Layers3, Wrench } from "lucide-react";

export function calculateIntervalDays(intervalHours) {
  if (!Number(intervalHours)) return 0;
  return Math.ceil(Number(intervalHours) / 24);
}

export function classifyAssetLevel(assetType = "", name = "") {
  const text = `${assetType} ${name}`.toLowerCase();
  if (/(bearing|seal|gasket|connector|component)/.test(text)) return "Component";
  if (/(cooling system|system|radiator|ignition)/.test(text)) return "System";
  if (/(pump|motor|generator|engine|compressor|equipment)/.test(text)) return "Equipment";
  if (/(area|department|unit)/.test(text)) return "Area / Department";
  if (/(site|plant|company)/.test(text)) return "Site";
  return "Equipment";
}

export function nextAssetLevel(level) {
  const levels = ["Site", "Area / Department", "System", "Equipment", "Component"];
  const index = levels.indexOf(level || "Site");
  return levels[Math.min(index + 1, levels.length - 1)] || "Equipment";
}

export function buildAssetTree(rows, search = "", filters = {}) {
  const normalized = rows.map(row => ({
    ...row,
    children: []
  }));
  const byId = new Map(normalized.map(row => [Number(row.id), row]));
  const rootNodes = [];
  normalized.forEach(row => {
    const parent = byId.get(Number(row.parent_id));
    if (parent && Number(parent.id) !== Number(row.id)) {
      parent.children.push(row);
    } else {
      rootNodes.push(row);
    }
  });
  const sortedRoots = sortAssetNodes(rootNodes);
  const query = search.trim().toLowerCase();
  if (!query && !filters.status && !filters.level && !filters.criticality) return sortedRoots;
  return filterAssetNodes(sortedRoots, query, filters);
}

export function buildCompanyTrees(departments, assetTree, selectedDepartment, showAllAssets) {
  if (!showAllAssets && selectedDepartment) {
    return [{
      ...selectedDepartment,
      children: assetTree
    }];
  }
  const trees = departments.map(department => ({
    ...department,
    children: assetTree.filter(asset => nodeBelongsToDepartment(asset, department))
  }));
  const groupedIds = new Set();
  trees.forEach(tree => collectNodeIds(tree.children, groupedIds));
  const unassigned = assetTree.filter(asset => !groupedIds.has(idKey(asset.id)));
  if (unassigned.length) {
    trees.push({
      id: "unassigned-assets",
      name: "Unassigned Assets",
      children: unassigned
    });
  }
  return trees;
}

export function filterAssetsByDepartment(rows, department) {
  const byId = new Map(rows.map(row => [idKey(row.id), row]));
  const childrenByParent = rows.reduce((map, row) => {
    const parentKey = idKey(row.parent_id);
    if (!parentKey) return map;
    if (!map.has(parentKey)) map.set(parentKey, []);
    map.get(parentKey).push(row);
    return map;
  }, new Map());
  const included = new Set();
  rows.filter(row => assetLinkedToDepartment(row, department)).forEach(row => {
    let cursor = row;
    const visited = new Set();
    while (cursor && !visited.has(idKey(cursor.id))) {
      included.add(idKey(cursor.id));
      visited.add(idKey(cursor.id));
      cursor = byId.get(idKey(cursor.parent_id));
    }
    const stack = [...(childrenByParent.get(idKey(row.id)) || [])];
    while (stack.length) {
      const child = stack.pop();
      if (!child || included.has(idKey(child.id))) continue;
      included.add(idKey(child.id));
      stack.push(...(childrenByParent.get(idKey(child.id)) || []));
    }
  });
  return rows.filter(row => included.has(idKey(row.id)));
}

export function sortAssetNodes(nodes) {
  return nodes.sort((first, second) => String(first.asset_code || first.name).localeCompare(String(second.asset_code || second.name), undefined, {
    numeric: true
  })).map(node => ({
    ...node,
    children: sortAssetNodes(node.children || [])
  }));
}

export function filterAssetNodes(nodes, query, filters) {
  return nodes.reduce((result, node) => {
    const children = filterAssetNodes(node.children || [], query, filters);
    const matchesQuery = !query || [node.name, node.asset_code, node.location].filter(Boolean).some(value => String(value).toLowerCase().includes(query));
    const matchesStatus = !filters.status || String(node.status || "").toLowerCase() === filters.status.toLowerCase();
    const matchesLevel = !filters.level || node.asset_level === filters.level;
    const matchesCriticality = !filters.criticality || node.criticality === filters.criticality;
    if (matchesQuery && matchesStatus && matchesLevel && matchesCriticality || children.length) {
      result.push({
        ...node,
        children
      });
    }
    return result;
  }, []);
}

export function assetLevelMeta(level = "Equipment") {
  const map = {
    Site: {
      icon: Building2,
      bg: "bg-blue-50",
      fg: "text-blue-700"
    },
    "Area / Department": {
      icon: Factory,
      bg: "bg-cyan-50",
      fg: "text-cyan-700"
    },
    System: {
      icon: Layers3,
      bg: "bg-violet-50",
      fg: "text-violet-700"
    },
    Equipment: {
      icon: Cpu,
      bg: "bg-orange-50",
      fg: "text-orange-700"
    },
    Component: {
      icon: Box,
      bg: "bg-slate-100",
      fg: "text-slate-700"
    }
  };
  return map[level] || {
    icon: Wrench,
    bg: "bg-slate-100",
    fg: "text-slate-700"
  };
}

export function canPlaceAssetUnder(asset, parent, rows) {
  if (!asset || !parent) return ["Site", "Equipment"].includes(asset?.asset_level || "Equipment");
  if (Number(asset.id) === Number(parent.id)) return false;
  if (getDescendantIds(asset.id, rows).has(Number(parent.id))) return false;
  const levels = ["Site", "Area / Department", "System", "Equipment", "Component"];
  const parentLevel = parent.asset_level || "Site";
  const childLevel = asset.asset_level || nextAssetLevel(parentLevel);
  if (parentLevel === "Equipment" && childLevel === "Equipment") return true;
  return levels.indexOf(childLevel) > levels.indexOf(parentLevel);
}

export function getDescendantIds(assetId, rows) {
  const descendants = new Set();
  const stack = rows.filter(row => Number(row.parent_id) === Number(assetId));
  while (stack.length) {
    const current = stack.pop();
    descendants.add(Number(current.id));
    stack.push(...rows.filter(row => Number(row.parent_id) === Number(current.id)));
  }
  return descendants;
}

export function buildAssetBreadcrumb(asset, rows) {
  const path = [];
  const byId = new Map(rows.map(row => [Number(row.id), row]));
  let cursor = asset;
  const visited = new Set();
  while (cursor && !visited.has(Number(cursor.id))) {
    path.unshift(cursor);
    visited.add(Number(cursor.id));
    cursor = byId.get(Number(cursor.parent_id));
  }
  return path;
}

function nodeBelongsToDepartment(node, department) {
  return assetLinkedToDepartment(node, department) || (node.children || []).some(child => nodeBelongsToDepartment(child, department));
}

function assetLinkedToDepartment(asset, department) {
  if (!asset || !department) return false;
  if (sameId(asset.customer_id, department.id)) return true;
  const departmentName = normalizeText(department.name);
  if (!departmentName) return false;
  return [asset.customer_name, asset.customer, asset.location, asset.site, asset.department, asset.work_location].some(value => {
    const normalized = normalizeText(value);
    return normalized && (normalized === departmentName || normalized.includes(departmentName) || departmentName.includes(normalized));
  });
}

function collectNodeIds(nodes, target) {
  nodes.forEach(node => {
    target.add(idKey(node.id));
    collectNodeIds(node.children || [], target);
  });
}

export function sameId(first, second) {
  if (first === null || first === undefined || second === null || second === undefined) return false;
  return String(first) === String(second) || Number(first) === Number(second);
}

function idKey(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}
