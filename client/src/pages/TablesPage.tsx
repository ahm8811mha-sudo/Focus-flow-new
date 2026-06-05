import { useEffect, useMemo, useState } from 'react';
import { deleteTable, loadTables, toCsv, type InternalTable } from '@/lib/internalTables';
import './tables-page.css';

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
