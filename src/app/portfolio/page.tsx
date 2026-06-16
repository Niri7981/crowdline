import {
  CrowdlineCategoryNav,
  CrowdlineTopNav,
} from "@/components/crowdline/CrowdlineMarketShell";
import { CrowdlinePortfolioClient } from "@/components/crowdline/CrowdlinePortfolioClient";

export default function PortfolioPage() {
  return (
    <main className="pm-page">
      <CrowdlineTopNav />
      <CrowdlineCategoryNav />

      <div className="pm-container">
        <CrowdlinePortfolioClient />
      </div>
    </main>
  );
}
