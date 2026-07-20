import { useCMMS } from "../../../app/context/CMMSContext.jsx";
import { Reports } from "../components/ReportsView.jsx";

export default function ReportsPage() {
  const {
    data,
    alerts,
    stats,
    language,
    page
  } = useCMMS();

  return (
    <Reports
      data={data}
      alerts={alerts}
      stats={stats}
      language={language}
      mode={page === "kpis" ? "kpis" : "reports"}
    />
  );
}
