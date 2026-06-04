import { enhancePMPStage, pmpCompletion, stageHealth, type PMPStage } from './pmp';
import { agentLabel, statusLabel, type ProjectAgent, type ProjectStage, type StageStatus } from './types';

type Props = {
  stages: ProjectStage[];
  busyItem?: string;
  onUpdateStage: (stageId: string, patch: Partial<PMPStage>) => void;
  onRunStage: (stage: ProjectStage) => void;
  onAddStage: (owner: ProjectAgent) => void;
};

const riskLabels: Record<NonNullable<PMPStage['riskLevel']>, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'عالٍ',
  critical: 'حرج',
};

function listToText(value?: string[]) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function textToList(value: string) {
  return value.split('\n').map((x) => x.trim()).filter(Boolean);
}

export default function ProjectPMPStages({ stages, busyItem, onUpdateStage, onRunStage, onAddStage }: Props) {
  return (
    <section className="panel" id="project-stages">
      <div className="section-title">
        <h3>مراحل المشروع PMP</h3>
        <button onClick={() => onAddStage('assistant')}>+ إضافة مرحلة PMP</button>
      </div>
      <div className="timeline">
        {stages.map((raw) => {
          const stage = enhancePMPStage(raw);
          const health = stageHealth(stage);
          const completion = pmpCompletion(stage);
          return (
            <article key={stage.id} className={`stage ${stage.status} pmp-stage health-${health}`}>
              <div className="stage-body">
                <div className="stage-head">
                  <input value={stage.title} onChange={(e) => onUpdateStage(stage.id, { title: e.target.value })} />
                  <select value={stage.owner} onChange={(e) => onUpdateStage(stage.id, { owner: e.target.value as ProjectAgent })}>
                    {Object.entries(agentLabel).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </div>
                <div className="pmp-kpis">
                  <span>صحة المرحلة: {health}</span>
                  <span>اكتمال بيانات PMP: {completion}%</span>
                  <span>إنجاز: {stage.progress || 0}%</span>
                  <span>مخاطر: {riskLabels[stage.riskLevel || 'low']}</span>
                </div>
                <div className="stage-meta pmp-meta">
                  <label>تاريخ البداية<input type="date" value={stage.startDate || ''} onChange={(e) => onUpdateStage(stage.id, { startDate: e.target.value })} /></label>
                  <label>تاريخ النهاية<input type="date" value={stage.endDate || ''} onChange={(e) => onUpdateStage(stage.id, { endDate: e.target.value, dueDate: e.target.value })} /></label>
                  <label>الحالة<select value={stage.status} onChange={(e) => onUpdateStage(stage.id, { status: e.target.value as StageStatus })}>{Object.entries(statusLabel).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
                  <label>المخاطر<select value={stage.riskLevel || 'low'} onChange={(e) => onUpdateStage(stage.id, { riskLevel: e.target.value as PMPStage['riskLevel'] })}><option value="low">منخفض</option><option value="medium">متوسط</option><option value="high">عالٍ</option><option value="critical">حرج</option></select></label>
                  <label>نسبة الإنجاز<input type="number" min="0" max="100" value={stage.progress || 0} onChange={(e) => onUpdateStage(stage.id, { progress: Number(e.target.value) })} /></label>
                  <label>الدور المسؤول<input value={stage.ownerRole || ''} onChange={(e) => onUpdateStage(stage.id, { ownerRole: e.target.value })} placeholder="مثال: مدير المشروع" /></label>
                </div>
                <label className="pmp-field">المخرج / Deliverable<input value={stage.deliverable || ''} onChange={(e) => onUpdateStage(stage.id, { deliverable: e.target.value })} /></label>
                <label className="pmp-field">ملاحظات المرحلة<textarea value={stage.notes || ''} onChange={(e) => onUpdateStage(stage.id, { notes: e.target.value })} /></label>
                <div className="pmp-grid">
                  <label>معايير القبول<textarea value={listToText(stage.acceptanceCriteria)} onChange={(e) => onUpdateStage(stage.id, { acceptanceCriteria: textToList(e.target.value) })} /></label>
                  <label>الاعتماديات<textarea value={listToText(stage.dependencies)} onChange={(e) => onUpdateStage(stage.id, { dependencies: textToList(e.target.value) })} /></label>
                  <label>أصحاب المصلحة<textarea value={listToText(stage.stakeholders)} onChange={(e) => onUpdateStage(stage.id, { stakeholders: textToList(e.target.value) })} /></label>
                  <label>الاعتمادات المطلوبة<textarea value={listToText(stage.approvals)} onChange={(e) => onUpdateStage(stage.id, { approvals: textToList(e.target.value) })} /></label>
                  <label>القيود<textarea value={listToText(stage.constraints)} onChange={(e) => onUpdateStage(stage.id, { constraints: textToList(e.target.value) })} /></label>
                  <label>الافتراضات<textarea value={listToText(stage.assumptions)} onChange={(e) => onUpdateStage(stage.id, { assumptions: textToList(e.target.value) })} /></label>
                </div>
                <div className="pmp-grid compact">
                  <label>التكلفة التقديرية<input value={stage.budgetEstimate || ''} onChange={(e) => onUpdateStage(stage.id, { budgetEstimate: e.target.value })} /></label>
                  <label>التكلفة الفعلية<input value={stage.actualCost || ''} onChange={(e) => onUpdateStage(stage.id, { actualCost: e.target.value })} /></label>
                </div>
                <div className="stage-meta">
                  <button type="button" disabled={busyItem === stage.id} onClick={() => onRunStage(stage)}>{busyItem === stage.id ? 'ينفذ...' : 'توجيه الوكيل'}</button>
                </div>
                {stage.agentResult ? <div className="result-box"><b>نتيجة الوكيل</b><p>{stage.agentResult.summary}</p></div> : <div className="result-box muted">لا توجد نتيجة بعد.</div>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
