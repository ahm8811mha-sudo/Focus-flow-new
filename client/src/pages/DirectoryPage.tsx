import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Phone, MapPin, Globe, Mail, Table2, CalendarClock } from 'lucide-react';

type DirectoryContact = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  mapsUrl?: string;
  category?: string;
  notes?: string;
  source?: string;
};

const STORAGE_KEY = 'focus-flow-directory-contacts';

function uid() { return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function today() { return new Date().toISOString().slice(0, 10); }

function loadContacts(): DirectoryContact[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveContacts(contacts: DirectoryContact[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

function toCsv(contacts: DirectoryContact[]) {
  const columns = ['الاسم', 'الهاتف', 'البريد', 'الموقع', 'العنوان', 'رابط الخريطة', 'التصنيف', 'ملاحظات'];
  const rows = contacts.map((item) => [item.name, item.phone || '', item.email || '', item.website || '', item.address || '', item.mapsUrl || '', item.category || '', item.notes || '']);
  return [columns, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
}

function downloadTextFile(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DirectoryPage() {
  const [query, setQuery] = useState('عيادات أطفال الأنابيب في الرياض');
  const [contacts, setContacts] = useState<DirectoryContact[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setContacts(loadContacts()); }, []);
  useEffect(() => { saveContacts(contacts); }, [contacts]);

  const stats = useMemo(() => ({
    total: contacts.length,
    withPhone: contacts.filter((item) => item.phone).length,
    withWebsite: contacts.filter((item) => item.website).length,
  }), [contacts]);

  async function searchWithGemini() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/directory/gemini-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'فشل البحث');
      const next = (data.contacts || []).map((item: any) => ({ id: uid(), source: 'Gemini', ...item }));
      setContacts((current) => [...next, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    downloadTextFile(`directory-${today()}.csv`, `\ufeff${toCsv(contacts)}`, 'text/csv;charset=utf-8');
  }

  function clearDirectory() {
    if (!confirm('حذف كل جهات الدليل؟')) return;
    setContacts([]);
  }

  return (
    <main className="directory-shell" dir="rtl">
      <style>{styles}</style>
      <motion.header initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hero-card">
        <a className="back" href="/">← الرئيسية</a>
        <span className="eyebrow">Directory / Contacts</span>
        <h1>الدليل</h1>
        <p>وحدة جهات الاتصال التي يعتمد عليها الوكيل في الحصر والمتابعة: أسماء، أرقام، مواقع، وروابط.</p>
      </motion.header>

      <section className="search-panel">
        <div className="input-wrap"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثال: عيادات أطفال الأنابيب في الرياض" /></div>
        <button onClick={searchWithGemini} disabled={busy}>{busy ? 'جاري البحث...' : 'بحث Gemini'}</button>
        <button className="ghost" onClick={exportCsv} disabled={!contacts.length}><Table2 /> تصدير CSV</button>
        <button className="ghost" onClick={clearDirectory} disabled={!contacts.length}>مسح الدليل</button>
      </section>

      {error && <div className="error">{error}</div>}

      <section className="stats-grid">
        <article><span>الإجمالي</span><strong>{stats.total}</strong><small>جهة محفوظة</small></article>
        <article><span>بها هاتف</span><strong>{stats.withPhone}</strong><small>جاهزة للاتصال</small></article>
        <article><span>مواقع</span><strong>{stats.withWebsite}</strong><small>روابط ومواقع</small></article>
        <article><span>تنبيه مهم</span><strong>تحقق</strong><small>راجع الأرقام قبل الاتصال</small></article>
      </section>

      <section className="contacts-grid">
        {contacts.map((item) => (
          <article key={item.id} className="contact-card">
            <div className="contact-head"><b>{item.name}</b><small>{item.category || item.source || 'Directory'}</small></div>
            <p>{item.notes || 'لا توجد ملاحظات.'}</p>
            <div className="info-list">
              {item.phone && <a href={`tel:${item.phone}`}><Phone />{item.phone}</a>}
              {item.email && <a href={`mailto:${item.email}`}><Mail />{item.email}</a>}
              {item.website && <a href={item.website} target="_blank" rel="noreferrer"><Globe />الموقع الإلكتروني</a>}
              {item.mapsUrl && <a href={item.mapsUrl} target="_blank" rel="noreferrer"><MapPin />Google Maps</a>}
              {item.address && <span><MapPin />{item.address}</span>}
            </div>
            <a className="schedule" href={`/agents?directory=${encodeURIComponent(item.name)}`}><CalendarClock /> استخدمها في الوكيل</a>
          </article>
        ))}
        {!contacts.length && <div className="empty">ابدأ بالبحث أو أضف بياناتك لاحقًا. هذه الوحدة لا تستخدم Places API؛ تعتمد على Gemini وما تحفظه محليًا.</div>}
      </section>
    </main>
  );
}

const styles = `
.directory-shell{min-height:100vh;padding:18px 14px 100px;background:linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px),radial-gradient(circle at 15% 0%,rgba(34,211,238,.18),transparent 30%),radial-gradient(circle at 85% 0%,rgba(124,58,237,.20),transparent 32%),#020202;background-size:3rem 3rem,3rem 3rem,auto,auto,auto;color:#f8fafc}.hero-card,.search-panel,.stats-grid article,.contact-card,.empty{border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.04));border-radius:34px;box-shadow:0 28px 90px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(22px)}.hero-card{position:relative;display:grid;gap:12px;text-align:center;padding:28px;overflow:hidden}.hero-card:before{content:"";position:absolute;right:-90px;top:-120px;width:360px;height:360px;border-radius:999px;background:rgba(34,211,238,.18);filter:blur(70px)}.back{position:relative;justify-self:start;color:#bfdbfe;text-decoration:none}.eyebrow{position:relative;color:#67e8f9;letter-spacing:.22em;text-transform:uppercase;font-weight:950;font-size:12px}.hero-card h1{position:relative;margin:0;font-size:clamp(44px,10vw,82px);letter-spacing:-.055em}.hero-card p{position:relative;max-width:760px;margin:auto;color:#cbd5e1;line-height:1.9}.search-panel{display:grid;grid-template-columns:1fr auto auto auto;gap:10px;padding:14px;margin:16px 0}.input-wrap{display:flex;align-items:center;gap:10px;background:rgba(15,23,42,.72);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:0 14px}.input-wrap svg{color:#67e8f9}.input-wrap input{width:100%;min-height:54px;background:transparent;border:0;color:#fff;outline:0;font:inherit}.search-panel button,.schedule{min-height:54px;border:0;border-radius:20px;padding:0 18px;font-weight:950;color:#fff;background:linear-gradient(135deg,#06b6d4,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none}.search-panel button:disabled{opacity:.55}.search-panel .ghost{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}.error{margin:12px 0;border-radius:20px;background:rgba(239,68,68,.16);color:#fecaca;padding:14px}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.stats-grid article{padding:18px;display:grid;gap:8px}.stats-grid span{color:#67e8f9;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:950}.stats-grid strong{font-size:34px}.stats-grid small,.contact-card p,.contact-head small,.empty{color:#cbd5e1}.contacts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.contact-card{padding:18px;display:grid;gap:12px}.contact-head{display:flex;justify-content:space-between;gap:12px}.contact-head b{font-size:20px}.info-list{display:grid;gap:8px}.info-list a,.info-list span{display:flex;align-items:center;gap:8px;color:#dbeafe;text-decoration:none;background:rgba(15,23,42,.55);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:10px}.info-list svg{width:16px;color:#67e8f9}.schedule{margin-top:4px}.empty{grid-column:1/-1;padding:22px;text-align:center}@media(max-width:760px){.directory-shell{padding:12px 10px 92px}.search-panel{grid-template-columns:1fr}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero-card{border-radius:38px;padding:26px 20px}.contacts-grid{grid-template-columns:1fr}}
`;
