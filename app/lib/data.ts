import { sql } from "@vercel/postgres";
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";

// 이 함수는 revenue 테이블에서 수익 데이터를 가져옴으로써,
// 이를 Revenue 타입의 객체 배열로 반환하는 역할을 합니다.
export async function fetchRevenue() {
  try {
    // 데모 목적으로 인위적으로 3초의 지연을 추가함으로써,
    // 사용자가 데이터가 로드되고 있음을 인지하게 할 수 있습니다.
    // 하지만 실제 프로덕션 환경에서는 이와 같은 지연을 추가하지 않는 것이 좋습니다.

    // console.log('Fetching revenue data...');
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    // revenue 테이블에서 모든 데이터를 선택하여 가져옴으로써,
    // 수익 데이터를 배열 형태로 반환합니다.
    const data = await sql<Revenue>`SELECT * FROM revenue`;

    // console.log('Data fetch completed after 3 seconds.');

    // 데이터의 행(rows)을 반환함으로써, 이를 후속 처리에 사용하도록 합니다.
    return data.rows;
  } catch (error) {
    // 데이터베이스 오류가 발생한 경우 콘솔에 로그를 기록함으로써,
    // 오류 원인을 파악할 수 있습니다. 이후 해당 오류를 throw하여
    // 호출자가 이 오류를 처리하도록 합니다.
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

// 이 함수는 최신 송장 데이터를 가져옴으로써,
// invoices와 customers 테이블을 조인하여 최신 송장 5개를 반환하는 역할을 합니다.
export async function fetchLatestInvoices() {
  try {
    // invoices 테이블과 customers 테이블을 조인하여 최신 송장 5개를 선택함으로써,
    // 최신 송장 데이터를 가져옵니다.
    const data = await sql<LatestInvoiceRaw>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    // 가져온 송장 데이터의 amount(금액)를 포맷팅함으로써,
    // 최신 송장 데이터를 반환합니다.
    const latestInvoices = data.rows.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    // 데이터베이스 오류가 발생한 경우 콘솔에 로그를 기록함으로써,
    // 오류 원인을 파악하고, throw하여 호출자가 이 오류를 처리하도록 합니다.
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

// 이 함수는 카드 UI에 표시될 데이터를 가져옴으로써,
// 총 송장 수, 총 고객 수, 결제 완료된 송장 금액, 미결제 송장 금액을 반환하는 역할을 합니다.
export async function fetchCardData() {
  try {
    // 각각의 SQL 쿼리를 비동기로 병렬 실행함으로써,
    // 데이터베이스에서 필요한 데이터를 가져옵니다.
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    // 모든 쿼리가 완료될 때까지 대기한 후 결과를 가져옴으로써,
    // 각각의 데이터를 적절하게 처리합니다.
    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    // 가져온 데이터를 사용하여 필요한 형식으로 변환함으로써,
    // UI에 사용할 수 있는 형태로 반환합니다.
    const numberOfInvoices = Number(data[0].rows[0].count ?? "0");
    const numberOfCustomers = Number(data[1].rows[0].count ?? "0");
    const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? "0");
    const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? "0");

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    // 데이터베이스 오류가 발생한 경우 콘솔에 로그를 기록함으로써,
    // 오류 원인을 파악하고, throw하여 호출자가 이 오류를 처리하도록 합니다.
    console.error("Database Error:", error);
    throw new Error("Failed to fetch card data.");
  }
}

// 이 함수는 특정 조건(query)에 맞는 송장 데이터를 가져옴으로써,
// 페이지네이션 처리가 된 송장 목록을 반환하는 역할을 합니다.
const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    // 특정 조건에 맞는 송장 데이터를 가져옴으로써,
    // 페이지네이션이 적용된 송장 목록을 반환합니다.
    const invoices = await sql<InvoicesTable>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoices.rows;
  } catch (error) {
    // 데이터베이스 오류가 발생한 경우 콘솔에 로그를 기록함으로써,
    // 오류 원인을 파악하고, throw하여 호출자가 이 오류를 처리하도록 합니다.
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

// 이 함수는 특정 조건(query)에 맞는 송장의 총 페이지 수를 가져옴으로써,
// 페이지네이션에 필요한 총 페이지 수를 반환하는 역할을 합니다.
export async function fetchInvoicesPages(query: string) {
  try {
    // 특정 조건에 맞는 송장의 총 수를 가져옴으로써,
    // 이를 페이지 수로 계산하여 반환합니다.
    const count = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    // 데이터베이스 오류가 발생한 경우 콘솔에 로그를 기록함으로써,
    // 오류 원인을 파악하고, throw하여 호출자가 이 오류를 처리하도록 합니다.
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

// 이 함수는 특정 ID에 해당하는 송장 데이터를 가져옴으로써,
// 단일 송장 정보를 반환하는 역할을 합니다.
export async function fetchInvoiceById(id: string) {
  try {
    // 특정 ID에 해당하는 송장 데이터를 가져옴으로써,
    // 해당 송장 정보를 반환합니다.
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // 금액을 센트 단위에서 달러 단위로 변환함으로써,
      // 더 읽기 쉬운 형식으로 반환합니다.
      amount: invoice.amount / 100,
    }));
    console.log(invoice); // Invoice is an empty array []
    return invoice[0];
  } catch (error) {
    // 데이터베이스 오류가 발생한 경우 콘솔에 로그를 기록함으로써,
    // 오류 원인을 파악하고, throw하여 호출자가 이 오류를 처리하도록 합니다.
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoice.");
  }
}

// 이 함수는 모든 고객 데이터를 가져옴으로써,
// 고객 목록을 반환하는 역할을 합니다.
export async function fetchCustomers() {
  try {
    // 모든 고객 데이터를 가져옴으로써,
    // 고객 목록을 반환합니다.
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

// 이 함수는 특정 조건(query)에 맞는 고객 데이터를 가져옴으로써,
// 필터링된 고객 목록을 반환하는 역할을 합니다.
export async function fetchFilteredCustomers(query: string) {
  try {
    // 특정 조건에 맞는 고객 데이터를 가져옴으로써,
    // 필터링된 고객 목록을 반환합니다.
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
          customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    // 가져온 데이터를 포맷팅하여 반환함으로써,
    // UI에서 쉽게 사용할 수 있는 형식으로 변환합니다.
    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    // 데이터베이스 오류가 발생한 경우 콘솔에 로그를 기록함으로써,
    // 오류 원인을 파악하고, throw하여 호출자가 이 오류를 처리하도록 합니다.
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}
