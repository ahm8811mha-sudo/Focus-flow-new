import { useEffect, useMemo, useState } from 'react';
import { deleteTable, loadTables, toCsv, type InternalTable } from '@/lib/internalTables';

function downloadTextFile(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TablesPage() {
  const [tables, setTables] = useState<InternalTable[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => { setTables(loadTables()); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((table) => `${table.title} ${table.notes} ${table.source}`.toLowerCase().includes(q));
  }, [tables, query]);

  function remove(id: string) {
    if (!confirm('حذف هذا الجدول؟')) return;
    deleteTable(id);
    setTables(loadTables());
  }

  function exportCsv(table: InternalTable) {
    downloadTextFile(`${table.title}.csv`, `\ufeff${toCsv(table)}`, 'text/csv;charset=utf-8');
  }

  return (
    <main className="tables-shell" dir="rtl">
      <style>{styles}</style>
      <header className="hero-card">
        <a className="back" href="/">← الرئيسية</a>
        <span className="eyebrow">Internal Tables</span>
        <h1>الجداول</h1>
        <p>كل الجداول التي ينشئها الوكلاء تظهر هنا داخل التطبيق أولًا. التصدير إلى CSV يكون يدويًا فقط.</p>
      </header>

      <section className="toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في الجداول..." />
        <button onClick={() => setTables(loadTables())}>تحديث</button>
      </section>

      <section className="tables-list">
        {filtered.map((table) => (
          <article key={table.id} className="table-card">
            <div className="table-head">
              <div><b>{table.title}</b><small>{table.source || 'Agent'} · {new Date(table.updatedAt).toLocaleString('ar-SA')}</small></div>
              <div className="actions"><button onClick={() => exportCsv(table)}>تصدير CSV</button><button className="danger" onClick={() => remove(table.id)}>حذف</button></div>
            </div>
            {table.notes && <p>{table.notes}</p>}
            <div className="table-wrap"><table><thead><tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{table.rows.map((row, index) => <tr key={index}>{table.columns.map((_, i) => <td key={i}>{String(row[i] ?? '')}</td>)}</tr>)}</tbody></table></div>
          </article>
        ))}
        {!filtered.length && <div className="empty">لا توجد جداول محفوظة بعد.</div>}
      </section>
    </main>
  );
}

const styles = `
.tables-shell{min-height:100vh;padding:18px 14px 100px;background:linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px),radial-gradient(circle at 15% 0%,rgba(34,211,238,.18),transparent 30%),radial-gradient(circle at 85% 0%,rgba(124,58,237,.20),transparent 32%),#020202;background-size:3rem 3rem,3rem 3rem,auto,auto,auto;color:#f8fafc}.hero-card,.toolbar,.table-card,.empty{border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.04));border-radius:34px;box-shadow:0 28px 90px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(22px)}.hero-card{position:relative;display:grid;gap:12px;text-align:center;padding:28px;overflow:hidden}.back{position:relative;justify-self:start;color:#bfdbfe;text-decoration:none}.eyebrow{position:relative;color:#67e8f9;letter-spacing:.22em;text-transform:uppercase;font-weight:950;font-size:12px}.hero-card h1{position:relative;margin:0;font-size:clamp(44px,10vw,82px);letter-spacing:-.055em}.hero-card p{position:relative;max-width:760px;margin:auto;color:#cbd5e1;line-height:1.9}.toolbar{display:grid;grid-template-columns:1fr auto;gap:10px;padding:14px;margin:16px 0}.toolbar input{min-height:54px;border:1px solid rgba(255,255,255,.14);border-radius:22px;background:rgba(15,23,42,.72);color:#fff;padding:0 16px;font:inherit;outline:0}.toolbar button,.actions button{min-height:46px;border:0;border-radius:18px;padding:0 16px;font-weight:950;color:#fff;background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed)}.tables-list{display:grid;gap:14px}.table-card{padding:18px;display:grid;gap:12px}.table-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.table-head b{font-size:22px}.table-head small,.table-card p,.empty{color:#cbd5e1}.actions{display:flex;gap:8px;flex-wrap:wrap}.actions .danger{background:rgba(239,68,68,.2);color:#fecaca;border:1px solid rgba(239,68,68,.25)}.table-wrap{overflow:auto;border:1px solid rgba(255,255,255,.1);border-radius:20px}table{width:100%;border-collapse:collapse;min-width:680px}th,td{padding:12px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right}th{color:#67e8f9;background:rgba(15,23,42,.65)}td{color:#e5e7eb}.empty{padding:24px;text-align:center}@media(max-width:760px){.tables-shell{padding:12px 10px 92px}.toolbar{grid-template-columns:1fr}.table-head{display:grid}.actions button{width:100%}}
`;
