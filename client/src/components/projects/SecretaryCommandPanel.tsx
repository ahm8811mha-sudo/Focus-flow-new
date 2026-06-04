import { useState } from 'react';
import { runSecretaryAutomation } from '@/lib/secretary/automation';
import type { ManagedProject } from './types';

type Props = {
  project: ManagedProject;
  onResult: (summary: string, payload: ReturnType<typeof runSecretaryAutomation>) => void;
};

export default function SecretaryCommandPanel({ project, onResult }: Props) {
  const [request, setRequest] = useState('');
  const [busy, setBusy] = useState(false);

  function run() {
    const text = request.trim();
    if (!text) return;
    setBusy(true);
    const result = runSecretaryAutomation(project, text);
    onResult(result.report.summary, result);
    setRequest('');
    setBusy(false);
  }

  return (
    <section className="panel secretary-command-panel">
      <div className="section-title">
        <h3>تشغيل السكرتير على هذا المشروع</h3>
        <a className="mini-link" href="/secretary">لوحة السكرتير</a>
      </div>
      <p>اكتب طلبًا للسكرتير. سيتم فهم سياق المشروع، تصنيف الطلب، إنشاء خطة إجراءات، وإضافة تقرير تنفيذي داخل نتائج المشروع.</p>
      <textarea value={request} onChange={(e) => setRequest(e.target.value)} placeholder="مثال: احصر مراكز الحقن المجهري في الرياض وجهز متابعات واتصالات" />
      <button onClick={run} disabled={busy || !request.trim()}>{busy ? 'جاري تشغيل السكرتير...' : 'تشغيل السكرتير'}</button>
    </section>
  );
}
