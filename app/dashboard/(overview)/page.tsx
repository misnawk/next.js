// Card 컴포넌트를 가져옵니다.
import { Card } from "@/app/ui/dashboard/cards";
// RevenueChart 컴포넌트를 가져옵니다.
import RevenueChart from "@/app/ui/dashboard/revenue-chart";
// LatestInvoices 컴포넌트를 가져옵니다.
import LatestInvoices from "@/app/ui/dashboard/latest-invoices";
// lusitana 폰트를 가져옵니다.
import { lusitana } from "@/app/ui/fonts";
// 데이터 가져오기 함수들을 임포트합니다.
import { fetchLatestInvoices, fetchCardData } from "@/app/lib/data";
// React의 Suspense 컴포넌트를 가져옵니다.
import { Suspense } from "react";
// 로딩 중 표시할 스켈레톤 UI를 가져옵니다.
import { RevenueChartSkeleton } from "@/app/ui/skeletons";

// 비동기 Page 컴포넌트를 정의합니다.
export default async function Page() {
  // 최근 인보이스 데이터를 가져옵니다.
  const latestInvoices = await fetchLatestInvoices();
  // 카드에 표시할 데이터를 가져옵니다.
  const {
    numberOfInvoices,
    numberOfCustomers,
    totalPaidInvoices,
    totalPendingInvoices,
  } = await fetchCardData();

  return (
    <main>
      {/* 대시보드 제목 */}
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Dashboard
      </h1>
      {/* 카드 그리드 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* 수금된 금액 카드 */}
        <Card title="Collected" value={totalPaidInvoices} type="collected" />
        {/* 대기 중인 금액 카드 */}
        <Card title="Pending" value={totalPendingInvoices} type="pending" />
        {/* 총 인보이스 수 카드 */}
        <Card title="Total Invoices" value={numberOfInvoices} type="invoices" />
        {/* 총 고객 수 카드 */}
        <Card
          title="Total Customers"
          value={numberOfCustomers}
          type="customers"
        />
      </div>
      {/* 차트와 최근 인보이스 섹션 */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        {/* Suspense로 RevenueChart를 감싸 로딩 중 스켈레톤 UI를 표시합니다. */}
        <Suspense fallback={<RevenueChartSkeleton />}>
          <RevenueChart />
        </Suspense>
        {/* 최근 인보이스 컴포넌트에 데이터를 전달합니다. */}
        <LatestInvoices latestInvoices={latestInvoices} />
      </div>
    </main>
  );
}
