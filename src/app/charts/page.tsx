import EvNtmTimeSeries from "@/components/charts/EvNtmTimeSeries";
import PortfolioValueTimeSeries from "@/components/charts/PortfolioValueTimeSeries";
import ValuationScatter from "@/components/charts/ValuationScatter";

export default function ChartsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Charts &amp; Analytics
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <EvNtmTimeSeries />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <PortfolioValueTimeSeries />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <ValuationScatter
            title="EV/NTM Revenue vs. Growth"
            xMetricKey="revenue_growth"
            xPeriodKey="NTM"
            xLabel="NTM Revenue Growth %"
            xUnit="percent"
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <ValuationScatter
            title="EV/NTM Revenue vs. FCF Margin"
            xMetricKey="fcf_margin"
            xPeriodKey="NTM"
            xLabel="NTM FCF Margin %"
            xUnit="percent"
          />
        </div>
      </div>
    </div>
  );
}
