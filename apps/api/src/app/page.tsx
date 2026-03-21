export default function ApiRootPage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>@xelnova/api-app</h1>
      <p>Version 1.0.0</p>
      <h2>Endpoints</h2>
      <ul>
        <li>POST /api/auth/login — Login (email, password, remember)</li>
        <li>POST /api/auth/logout — Logout</li>
        <li>GET /api/dashboard — Dashboard data (Authorization: Bearer token)</li>
        <li>GET /api/logs — System logs (query: status, dateFrom, dateTo, search)</li>
      </ul>
    </main>
  );
}
