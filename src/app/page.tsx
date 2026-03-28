import { Dashboard } from "@/components/Dashboard";
import { DashboardData } from "@/lib/types";
import impactData from "@/data/impact-data.json";

export default function Home() {
  return <Dashboard data={impactData as DashboardData} />;
}
