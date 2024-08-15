// 인보이스 편집 폼 컴포넌트 import
import Form from "@/app/ui/invoices/edit-form";
// 페이지 위치 표시용 Breadcrumbs 컴포넌트 import
import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
// 데이터 가져오기 함수들 import
import { fetchInvoiceById, fetchCustomers } from "@/app/lib/data";

// 비동기 페이지 컴포넌트 정의. URL 파라미터로 id를 받음
export default async function Page({ params }: { params: { id: string } }) {
  // URL에서 받은 id 저장
  const id = params.id;
  
  // Promise.all로 두 개의 데이터 fetching 병렬 수행
  // 특정 id의 인보이스 데이터와 모든 고객 데이터 동시에 가져옴
  const [invoice, customers] = await Promise.all([
    fetchInvoiceById(id),
    fetchCustomers(),
  ]);

  // 페이지 JSX 반환
  return (
    <main>
      {/* 현재 페이지 위치 표시하는 Breadcrumbs 컴포넌트 */}
      <Breadcrumbs
        breadcrumbs={[
          { label: "Invoices", href: "/dashboard/invoices" },
          {
            label: "Edit Invoice",
            href: `/dashboard/invoices/${id}/edit`,
            active: true,
          },
        ]}
      />
      {/* 인보이스 편집 폼. 가져온 invoice와 customers 데이터 전달 */}
      <Form invoice={invoice} customers={customers} />
    </main>
  );
}