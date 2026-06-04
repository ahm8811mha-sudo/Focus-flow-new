import { useEffect, useMemo, useState } from 'react';
import { loadTables, type InternalTable } from '@/lib/internalTables';
import TableRowActions from './TableRowActions';

type ProjectRef = { id: string; name: string };

type Props = {
  project: ProjectRef;
};

function asArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function relatedToProject(item: any, project: ProjectRef) {
  return item?.projectId === project.id || item?.projectName === project.name || item?.project === project.name || item?.listName === `مشروع: ${project.name}`;
}

export default function ProjectLinkedTables({ project }: Props) {
  const [tables, setTables] = useState<InternalTable[]>([]);

  function refresh() {
    setTables(loadTables());
  }

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [project.id]);

  const linkedTables = useMemo(() => asArray<InternalTable>(tables).filter((table) => relatedToProject(table, project)), [tables, project]);

  return (
    <section className="panel" id="project-linked-tables-actions">
      <div className="section-title">
        <h3>الجداول التنفيذية المرتبطة</h3>
        <a className="mini-link" href="/tables">فتح الجداول</a>
      </div>
      {!linkedTables.length && <p>لا توجد جداول مرتبطة بعد. شغّل السكرتير أو احفظ نتيجة وكيل كجدول.</p>}
      <div className="linked-table-list">
        {linkedTables.map((table) => (
          <article className="resource-card linked-table-card" key={table.id}>
            <div className="resource-head">
              <b>{table.title}</b>
              <small>{table.rows?.length || 0} صف · {table.source || 'Agent'}</small>
            </div>
            <div className="result-table">
              <table>
                <thead>
                  <tr>{table.columns.map((column) => <th key={column}>{column}</th>)}<th>إجراءات</th></tr>
                </thead>
                <tbody>
                  {table.rows.slice(0, 6).map((row, rowIndex) => (
                    <tr key={`${table.id}-${rowIndex}`}>
                      {table.columns.map((_, cellIndex) => <td key={cellIndex}>{String(row?.[cellIndex] ?? '-')}</td>)}
                      <td><TableRowActions project={project} table={table} row={row} rowIndex={rowIndex} onChange={refresh} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
