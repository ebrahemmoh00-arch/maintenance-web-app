import { tr } from "../../../shared/config/appConfig.jsx";

export const DEFAULT_OPERATIONAL_ITEMS = [
  { key: "runningHours", label: "Running Hours", unit: "h" },
  { key: "energy", label: "Energy", unit: "kWh" },
  { key: "gas", label: "Gas", unit: "m3" },
  { key: "oil", label: "Oil", unit: "L" },
  { key: "water", label: "Water", unit: "m3" },
  { key: "steam", label: "Steam", unit: "t" },
  { key: "chiller", label: "Chiller", unit: "h" }
];

export function initialOperationalReadings(items = DEFAULT_OPERATIONAL_ITEMS) {
  return items.reduce((acc, item) => ({
    ...acc,
    [item.key]: {
      previous: "",
      current: ""
    }
  }), {});
}

export function normalizeOperationalReadings(current, items = DEFAULT_OPERATIONAL_ITEMS) {
  return items.reduce((acc, item) => ({
    ...acc,
    [item.key]: current?.[item.key] || { previous: "", current: "" }
  }), {});
}

export function normalizeOperationalItem(item) {
  return {
    id: item.id,
    key: String(item.key || "").trim(),
    label: String(item.label || "").trim(),
    unit: String(item.unit || "").trim(),
    sort_order: Number(item.sort_order || 0),
    is_active: item.is_active !== false
  };
}

export function emptyOperationalItemForm() {
  return {
    key: "",
    label: "",
    unit: "",
    sort_order: 0,
    is_active: true
  };
}

export function buildOperationalReport(readings, filters, selectedAssets, language = "en", items = DEFAULT_OPERATIONAL_ITEMS) {
  const consumption = items.reduce((acc, item) => {
    acc[item.key] = positiveDelta(readings[item.key]?.previous, readings[item.key]?.current);
    return acc;
  }, {});
  const workingHours = consumption.runningHours;
  const energyGenerated = consumption.energy;
  const gasConsumption = consumption.gas;
  const oilConsumption = consumption.oil;
  const averageLoad = safeDivide(energyGenerated, workingHours);
  const sfc = safeDivide(gasConsumption, energyGenerated);
  const soc = safeDivide(oilConsumption, energyGenerated);
  const fuelEnergyKwh = gasConsumption > 0 ? gasConsumption * 10.55 : 0;
  const thermalEfficiency = fuelEnergyKwh > 0 ? safeDivide(energyGenerated, fuelEnergyKwh) * 100 : null;
  const plannedHours = plannedPeriodHours(filters) * Math.max(selectedAssets.length, 1);
  const availability = plannedHours ? Math.min(safeDivide(workingHours, plannedHours) * 100, 100) : 0;
  const capacityFactor = null;
  const heatRate = fuelEnergyKwh > 0 && energyGenerated > 0 ? safeDivide(fuelEnergyKwh, energyGenerated) : null;
  const tableRows = items.map(item => {
    const previous = numberValue(readings[item.key]?.previous);
    const current = numberValue(readings[item.key]?.current);
    const itemConsumption = consumption[item.key];
    return {
      ...item,
      previous,
      current,
      consumption: itemConsumption,
      average: item.key === "runningHours" ? safeDivide(itemConsumption, Math.max(selectedAssets.length, 1)) : safeDivide(itemConsumption, Math.max(workingHours, 1))
    };
  });
  return {
    consumption,
    plannedHours,
    periodLabel: reportPeriodLabel(filters, language),
    workingHours,
    energyGenerated,
    gasConsumption,
    oilConsumption,
    averageLoad,
    sfc,
    soc,
    thermalEfficiency,
    availability,
    capacityFactor,
    heatRate,
    tableRows,
    charts: {
      energy: comparisonSeries(readings.energy, energyGenerated, language),
      gas: comparisonSeries(readings.gas, gasConsumption, language),
      oil: comparisonSeries(readings.oil, oilConsumption, language),
      averageLoad: metricSeries(averageLoad, language),
      sfc: metricSeries(sfc, language),
      soc: metricSeries(soc, language)
    }
  };
}

export function positiveDelta(previous, current) {
  return Math.max(numberValue(current) - numberValue(previous), 0);
}

export function numberValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

export function safeDivide(numerator, denominator) {
  const top = numberValue(numerator);
  const bottom = numberValue(denominator);
  return bottom > 0 ? top / bottom : 0;
}

export function formatReportNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "N/A";
  const number = Number(value);
  return Number.isInteger(number) ? number.toLocaleString() : number.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export function comparisonSeries(reading, consumption, language) {
  return [
    { label: tr(language, "Previous"), value: numberValue(reading?.previous) },
    { label: tr(language, "Current"), value: numberValue(reading?.current) },
    { label: tr(language, "Consumption"), value: numberValue(consumption) }
  ];
}

export function metricSeries(value, language) {
  return [
    { label: tr(language, "Previous"), value: 0 },
    { label: tr(language, "Current"), value: numberValue(value) }
  ];
}

export function plannedPeriodHours(filters) {
  if (filters.reportType === "custom" && filters.fromDate && filters.toDate) {
    const from = new Date(`${filters.fromDate}T00:00:00`);
    const to = new Date(`${filters.toDate}T23:59:59`);
    const diffHours = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60));
    return Math.max(diffHours, 0);
  }
  if (filters.reportType === "weekly") return 24 * 7;
  if (filters.reportType === "yearly") return 24 * 365;
  const year = Number(filters.year || new Date().getFullYear());
  const month = Number(filters.month || 1);
  if (filters.reportType === "monthly" || filters.month) {
    return new Date(year, month, 0).getDate() * 24;
  }
  return 24 * 30;
}

export function monthOptions(language) {
  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = index + 1;
    const label = new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", { month: "long" }).format(new Date(2026, index, 1));
    return [String(monthNumber), label];
  });
}

export function listResponseItems(response) {
  if (Array.isArray(response)) return response;
  return response?.items || [];
}

export function selectedSiteName(filters, customers) {
  const site = customers.find(item => String(item.id) === String(filters.siteId));
  return site?.name || "";
}

export function buildOperationalReportPayload(report, readings, filters, selectedAssets, customers) {
  const reportName = buildOperationalReportName(filters, selectedAssets, customers);
  const summary = {
    consumption: report.consumption,
    plannedHours: report.plannedHours,
    periodLabel: report.periodLabel,
    workingHours: report.workingHours,
    energyGenerated: report.energyGenerated,
    gasConsumption: report.gasConsumption,
    oilConsumption: report.oilConsumption,
    averageLoad: report.averageLoad,
    sfc: report.sfc,
    soc: report.soc,
    thermalEfficiency: report.thermalEfficiency,
    availability: report.availability,
    capacityFactor: report.capacityFactor,
    heatRate: report.heatRate
  };
  return {
    report_name: reportName,
    report_type: filters.reportType,
    site_id: filters.siteId ? Number(filters.siteId) : null,
    site_name: selectedSiteName(filters, customers),
    equipment_type: filters.equipmentType,
    asset_ids: JSON.stringify(selectedAssets.map(asset => String(asset.id))),
    asset_names: selectedAssets.map(asset => asset.name).join(", "),
    year: Number(filters.year || 0),
    month: Number(filters.month || 0),
    period_from: reportPeriodBounds(filters).from,
    period_to: reportPeriodBounds(filters).to,
    readings: JSON.stringify(readings),
    summary: JSON.stringify(summary),
    table_rows: JSON.stringify(report.tableRows),
    charts: JSON.stringify(report.charts)
  };
}

export function buildAnnualOperationalReportPayload(report, filters) {
  const year = Number(filters.year || new Date().getFullYear());
  const summary = {
    consumption: {
      runningHours: report.workingHours,
      energy: report.energyGenerated,
      gas: report.gasConsumption,
      oil: report.oilConsumption
    },
    plannedHours: null,
    periodLabel: report.periodLabel,
    workingHours: report.workingHours,
    energyGenerated: report.energyGenerated,
    gasConsumption: report.gasConsumption,
    oilConsumption: report.oilConsumption,
    averageLoad: report.averageLoad,
    sfc: report.sfc,
    soc: report.soc,
    thermalEfficiency: report.thermalEfficiency ?? null,
    availability: report.availability,
    capacityFactor: report.capacityFactor ?? null,
    heatRate: report.heatRate ?? null,
    reportsCount: report.reportsCount,
    boundaryNote: report.boundaryNote,
    isAnnual: true
  };
  return {
    report_name: report.reportName || `${tr("en", "Annual Operational Performance Report")} - ${year}`,
    report_type: "yearly",
    site_id: filters.siteId ? Number(filters.siteId) : null,
    site_name: report.siteName || "",
    equipment_type: filters.equipmentType,
    asset_ids: JSON.stringify(filters.assetIds || []),
    asset_names: report.assetNames || "",
    year,
    month: 0,
    period_from: annualReportPeriodFrom(report, year),
    period_to: annualReportPeriodTo(report, year),
    readings: JSON.stringify({}),
    summary: JSON.stringify(summary),
    table_rows: JSON.stringify(report.monthlyRows || []),
    charts: JSON.stringify(report.charts || {})
  };
}

export function annualReportPeriodFrom(report, year) {
  const firstMonth = Number(report.monthlyRows?.[0]?.month || 1);
  return `${year}-${String(firstMonth).padStart(2, "0")}-01`;
}

export function annualReportPeriodTo(report, year) {
  const lastMonth = Number(report.monthlyRows?.[report.monthlyRows.length - 1]?.month || 12);
  const lastDay = new Date(year, lastMonth, 0).getDate();
  return `${year}-${String(lastMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function buildOperationalReportName(filters, selectedAssets, customers) {
  const siteName = selectedSiteName(filters, customers) || "All Sites";
  const assetName = selectedAssets.length === 1 ? selectedAssets[0].name : selectedAssets.length ? `${selectedAssets.length} Assets` : "All Assets";
  return `Operational Performance - ${siteName} - ${assetName} - ${reportPeriodLabel(filters, "en")}`;
}

export function reportPeriodLabel(filters, language = "en") {
  const t = text => tr(language, text);
  if (filters.reportType === "custom" && filters.fromDate && filters.toDate) return `${filters.fromDate} - ${filters.toDate}`;
  if (filters.reportType === "yearly") return `${t("Year")} ${filters.year || new Date().getFullYear()}`;
  if (filters.reportType === "weekly") return `${t("Weekly")} / ${filters.year || new Date().getFullYear()}`;
  const month = monthOptions(language).find(option => String(option[0]) === String(filters.month))?.[1] || t("All Months");
  return `${month} ${filters.year || new Date().getFullYear()}`;
}

export function reportPeriodBounds(filters) {
  if (filters.reportType === "custom") {
    return {
      from: filters.fromDate || "",
      to: filters.toDate || ""
    };
  }
  const year = Number(filters.year || new Date().getFullYear());
  if (filters.reportType === "yearly") {
    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`
    };
  }
  const month = Number(filters.month || 1);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  };
}

export function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

export function reportFromSavedOperationalRecord(record, language = "en") {
  const summary = safeJsonParse(record.summary, {});
  const tableRows = safeJsonParse(record.table_rows, []);
  const charts = safeJsonParse(record.charts, {});
  if (isAnnualOperationalRecord(record) && (summary.isAnnual || tableRows.some(row => row?.monthLabel))) {
    return {
      reportName: record.report_name || `${tr(language, "Annual Operational Performance Report")} - ${record.year || ""}`.trim(),
      siteName: record.site_name || tr(language, "All Sites"),
      assetNames: record.asset_names || tr(language, "All"),
      periodLabel: summary.periodLabel || savedRecordPeriodLabel(record, language),
      boundaryNote: summary.boundaryNote || "",
      isComplete: true,
      isAnnual: true,
      reportsCount: numberValue(summary.reportsCount) || tableRows.length,
      workingHours: numberValue(summary.workingHours),
      energyGenerated: numberValue(summary.energyGenerated),
      gasConsumption: numberValue(summary.gasConsumption),
      oilConsumption: numberValue(summary.oilConsumption),
      averageLoad: numberValue(summary.averageLoad),
      sfc: numberValue(summary.sfc),
      soc: numberValue(summary.soc),
      thermalEfficiency: summary.thermalEfficiency ?? null,
      availability: numberValue(summary.availability),
      capacityFactor: summary.capacityFactor ?? null,
      heatRate: summary.heatRate ?? null,
      sourceRecordId: record.id,
      monthlyRows: tableRows,
      charts: {
        energy: charts.energy || [],
        gas: charts.gas || [],
        oil: charts.oil || [],
        averageLoad: charts.averageLoad || [],
        sfc: charts.sfc || [],
        soc: charts.soc || []
      }
    };
  }
  return {
    consumption: summary.consumption || {},
    plannedHours: numberValue(summary.plannedHours),
    periodLabel: summary.periodLabel || savedRecordPeriodLabel(record, language),
    workingHours: numberValue(summary.workingHours),
    energyGenerated: numberValue(summary.energyGenerated),
    gasConsumption: numberValue(summary.gasConsumption),
    oilConsumption: numberValue(summary.oilConsumption),
    averageLoad: numberValue(summary.averageLoad),
    sfc: numberValue(summary.sfc),
    soc: numberValue(summary.soc),
    thermalEfficiency: summary.thermalEfficiency ?? null,
    availability: numberValue(summary.availability),
    capacityFactor: summary.capacityFactor ?? null,
    heatRate: summary.heatRate ?? null,
    tableRows: tableRows.length ? tableRows : DEFAULT_OPERATIONAL_ITEMS.map(item => ({ ...item, previous: 0, current: 0, consumption: 0, average: 0 })),
    charts: {
      energy: charts.energy || [],
      gas: charts.gas || [],
      oil: charts.oil || [],
      averageLoad: charts.averageLoad || [],
      sfc: charts.sfc || [],
      soc: charts.soc || []
    }
  };
}

export function savedRecordPeriodLabel(record, language = "en") {
  if (record.period_from && record.period_to) return `${record.period_from} - ${record.period_to}`;
  if (record.month) {
    const month = monthOptions(language).find(option => String(option[0]) === String(record.month))?.[1] || record.month;
    return `${month} ${record.year || ""}`.trim();
  }
  return record.year ? `${tr(language, "Year")} ${record.year}` : "";
}

export function filterOperationalHistory(records, filters, historyReportType = "") {
  return records.filter(record => {
    if (historyReportType && normalizeReportType(record.report_type) !== historyReportType) return false;
    if (filters.year && Number(record.year || 0) !== Number(filters.year)) return false;
    if (filters.siteId && Number(record.site_id || 0) !== Number(filters.siteId)) return false;
    if (filters.equipmentType && String(record.equipment_type || "") !== String(filters.equipmentType)) return false;
    if (filters.assetIds.length) {
      const ids = safeJsonParse(record.asset_ids, []).map(String);
      if (!filters.assetIds.some(id => ids.includes(String(id)))) return false;
    }
    return true;
  });
}

export function normalizeReportType(reportType) {
  return String(reportType || "").toLowerCase();
}

export function isAnnualOperationalRecord(record) {
  return normalizeReportType(record?.report_type) === "yearly";
}

export function reportTypeLabel(reportType) {
  const type = normalizeReportType(reportType);
  if (type === "yearly") return "Annual Report";
  if (type === "monthly") return "Monthly Report";
  if (type === "weekly") return "Weekly Report";
  if (type === "custom") return "Custom Report";
  return "Report";
}

export function buildAnnualOperationalReport(records, filters, language = "en", items = DEFAULT_OPERATIONAL_ITEMS) {
  const year = Number(filters.year || new Date().getFullYear());
  const selectedAssetId = String(filters.assetIds[0] || "");
  const yearlyRecords = dedupeOperationalRecordsByMonth(records
    .filter(record => operationalRecordMatchesAnnualScope(record, filters, selectedAssetId, year))
    .sort(compareOperationalRecordPeriod));
  const openingRecord = yearlyRecords.find(record => operationalRecordYear(record) === year) || null;
  const closingRecord = yearlyRecords.find(record => operationalRecordMonth(record) === 12) || yearlyRecords[yearlyRecords.length - 1] || null;
  const isComplete = Boolean(openingRecord && closingRecord);
  const monthlyRows = yearlyRecords.map(record => {
    const delta = operationalRecordConsumptionDelta(record, items);
    return {
      month: operationalRecordMonth(record),
      monthLabel: operationalRecordLabel(record, language),
      reportsCount: 1,
      workingHours: delta.runningHours,
      energyGenerated: delta.energy,
      gasConsumption: delta.gas,
      oilConsumption: delta.oil,
      averageLoad: safeDivide(delta.energy, delta.runningHours),
      sfc: safeDivide(delta.gas, delta.energy),
      soc: safeDivide(delta.oil, delta.energy),
      availability: annualCoverageAvailability(delta.runningHours, record, record)
    };
  });
  const totals = isComplete
    ? operationalAnnualDelta(openingRecord, closingRecord, items)
    : { runningHours: 0, energy: 0, gas: 0, oil: 0 };
  const availability = isComplete
    ? annualCoverageAvailability(totals.runningHours, openingRecord, closingRecord)
    : 0;
  const assetName = closingRecord?.asset_names || openingRecord?.asset_names || records.find(record => operationalRecordIncludesAsset(record, selectedAssetId))?.asset_names || tr(language, "All");
  const siteName = closingRecord?.site_name || openingRecord?.site_name || tr(language, "All Sites");
  const periodLabel = openingRecord && closingRecord
    ? `${operationalRecordLabel(openingRecord, language)} - ${operationalRecordLabel(closingRecord, language)}`
    : `${tr(language, "Year")} ${year}`;
  const boundaryNote = isComplete
    ? `${tr(language, "Annual calculations use Previous readings from")} ${operationalRecordLabel(openingRecord, language)} ${tr(language, "to Current readings of")} ${operationalRecordLabel(closingRecord, language)}.`
    : tr(language, "Annual report requires at least one saved report in the selected year for the same generator.");
  return {
    reportName: `${tr(language, "Annual Operational Performance Report")} - ${year}`,
    siteName,
    assetNames: assetName,
    periodLabel,
    boundaryNote,
    isComplete,
    reportsCount: yearlyRecords.length,
    workingHours: totals.runningHours,
    energyGenerated: totals.energy,
    gasConsumption: totals.gas,
    oilConsumption: totals.oil,
    averageLoad: safeDivide(totals.energy, totals.runningHours),
    sfc: safeDivide(totals.gas, totals.energy),
    soc: safeDivide(totals.oil, totals.energy),
    availability,
    monthlyRows,
    charts: {
      energy: monthlyRows.map(row => ({ label: row.monthLabel, value: row.energyGenerated })),
      gas: monthlyRows.map(row => ({ label: row.monthLabel, value: row.gasConsumption })),
      oil: monthlyRows.map(row => ({ label: row.monthLabel, value: row.oilConsumption })),
      averageLoad: monthlyRows.map(row => ({ label: row.monthLabel, value: row.averageLoad })),
      sfc: monthlyRows.map(row => ({ label: row.monthLabel, value: row.sfc })),
      soc: monthlyRows.map(row => ({ label: row.monthLabel, value: row.soc }))
    }
  };
}

export function operationalRecordMatchesAnnualScope(record, filters, selectedAssetId, year) {
  if (normalizeReportType(record.report_type) !== "monthly") return false;
  if (!operationalRecordIsSingleSelectedAsset(record, selectedAssetId)) return false;
  if (filters.siteId && Number(record.site_id || 0) !== Number(filters.siteId)) return false;
  if (filters.equipmentType && String(record.equipment_type || "") !== String(filters.equipmentType)) return false;
  return operationalRecordYear(record) === year;
}

export function operationalRecordIncludesAsset(record, assetId) {
  if (!assetId) return false;
  return safeJsonParse(record.asset_ids, []).map(String).includes(String(assetId));
}

export function operationalRecordIsSingleSelectedAsset(record, assetId) {
  if (!assetId) return false;
  const ids = safeJsonParse(record.asset_ids, []).map(String);
  return ids.length === 1 && ids[0] === String(assetId);
}

export function dedupeOperationalRecordsByMonth(records) {
  const map = new Map();
  records.forEach(record => {
    const key = `${operationalRecordYear(record)}-${operationalRecordMonth(record)}`;
    const existing = map.get(key);
    if (!existing || String(record.created_at || "") >= String(existing.created_at || "")) {
      map.set(key, record);
    }
  });
  return [...map.values()].sort(compareOperationalRecordPeriod);
}

export function compareOperationalRecordPeriod(a, b) {
  const yearDiff = operationalRecordYear(a) - operationalRecordYear(b);
  if (yearDiff) return yearDiff;
  const monthDiff = operationalRecordMonth(a) - operationalRecordMonth(b);
  if (monthDiff) return monthDiff;
  return String(a.created_at || "").localeCompare(String(b.created_at || ""));
}

export function operationalRecordYear(record) {
  return Number(record.year || dateYear(record.period_from) || dateYear(record.created_at) || 0);
}

export function operationalRecordMonth(record) {
  return Math.min(Math.max(Number(record.month || dateMonth(record.period_from) || dateMonth(record.created_at) || 1), 1), 12);
}

export function operationalRecordLabel(record, language = "en") {
  const month = monthOptions(language).find(option => String(option[0]) === String(operationalRecordMonth(record)))?.[1] || operationalRecordMonth(record);
  return `${month} ${operationalRecordYear(record)}`;
}

export function operationalReadings(record, field, items = DEFAULT_OPERATIONAL_ITEMS) {
  const readings = safeJsonParse(record.readings, {});
  return items.reduce((acc, item) => {
    acc[item.key] = numberValue(readings[item.key]?.[field]);
    return acc;
  }, {});
}

export function operationalAnnualDelta(openingRecord, closingRecord, items = DEFAULT_OPERATIONAL_ITEMS) {
  const opening = operationalReadings(openingRecord, "previous", items);
  const closing = operationalReadings(closingRecord, "current", items);
  return items.reduce((acc, item) => {
    acc[item.key] = Math.max(numberValue(closing[item.key]) - numberValue(opening[item.key]), 0);
    return acc;
  }, {});
}

export function operationalRecordConsumptionDelta(record, items = DEFAULT_OPERATIONAL_ITEMS) {
  const opening = operationalReadings(record, "previous", items);
  const closing = operationalReadings(record, "current", items);
  return items.reduce((acc, item) => {
    acc[item.key] = Math.max(numberValue(closing[item.key]) - numberValue(opening[item.key]), 0);
    return acc;
  }, {});
}

export function annualCoverageAvailability(workingHours, openingRecord, closingRecord) {
  const from = new Date(operationalRecordYear(openingRecord), operationalRecordMonth(openingRecord) - 1, 1);
  const to = new Date(operationalRecordYear(closingRecord), operationalRecordMonth(closingRecord), 1);
  const hours = Math.max(Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60)), 1);
  return Math.min(safeDivide(workingHours, hours) * 100, 100);
}

export function dateMonth(value) {
  const date = value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getMonth() + 1 : 0;
}

export function dateYear(value) {
  const date = value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getFullYear() : 0;
}
