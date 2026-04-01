import { useEffect, useRef } from 'react';
import type { PaperDeepContent } from '../../data/paper_content';
import katex from 'katex';

function KaTeXInline({ latex }: { latex: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex, ref.current, { throwOnError: false, displayMode: true });
      } catch {
        ref.current.textContent = latex;
      }
    }
  }, [latex]);
  return <span ref={ref} />;
}

interface Props {
  content: PaperDeepContent;
  categoryColor: string;
}

export default function DeepPaperContent({ content, categoryColor }: Props) {
  return (
    <div className="space-y-16">
      {/* 研究背景 */}
      <section>
        <h3 className="text-xl font-headline font-bold text-text-primary mb-4 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono" style={{ background: categoryColor + '20', color: categoryColor }}>
            A
          </span>
          研究背景
        </h3>
        <div className="p-6 bg-bg-card rounded-xl border border-border-subtle">
          <p className="text-text-secondary leading-relaxed text-[15px]">{content.researchBackground}</p>
        </div>
      </section>

      {/* 详细算法介绍 */}
      <section>
        <h3 className="text-xl font-headline font-bold text-text-primary mb-4 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono" style={{ background: categoryColor + '20', color: categoryColor }}>
            B
          </span>
          算法详解
        </h3>
        <div className="p-6 bg-bg-card rounded-xl border border-border-subtle">
          <p className="text-text-secondary leading-relaxed text-[15px]">{content.algorithmIntroduction}</p>
        </div>
      </section>

      {/* 公式详解 */}
      {content.formulaExplanations.length > 0 && (
        <section>
          <h3 className="text-xl font-headline font-bold text-text-primary mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono" style={{ background: categoryColor + '20', color: categoryColor }}>
              C
            </span>
            公式详解
          </h3>
          <div className="space-y-6">
            {content.formulaExplanations.map((fe, i) => (
              <div key={i} className="p-6 bg-bg-card rounded-xl border border-border-subtle">
                <div className="bg-bg-primary rounded-lg p-4 mb-4 flex justify-center overflow-x-auto">
                  <KaTeXInline latex={fe.formula} />
                </div>
                <p className="text-text-secondary leading-relaxed text-sm">{fe.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 算法步骤详解 */}
      {content.stepDetails.length > 0 && (
        <section>
          <h3 className="text-xl font-headline font-bold text-text-primary mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono" style={{ background: categoryColor + '20', color: categoryColor }}>
              D
            </span>
            算法步骤详解
          </h3>
          <div className="space-y-4">
            {content.stepDetails.map((sd, i) => (
              <div key={i} className="flex gap-4 p-5 bg-bg-card rounded-xl border border-border-subtle">
                <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm" style={{ background: categoryColor + '15', color: categoryColor }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <h4 className="font-headline font-semibold text-text-primary mb-2">{sd.step}</h4>
                  <p className="text-text-secondary text-sm leading-relaxed">{sd.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 局限性分析 */}
      {content.limitations.length > 0 && (
        <section>
          <h3 className="text-xl font-headline font-bold text-text-primary mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono bg-amber-500/15 text-amber-400">
              E
            </span>
            局限性分析
          </h3>
          <div className="p-6 bg-bg-card rounded-xl border-l-4 border-amber-500">
            <ul className="space-y-3">
              {content.limitations.map((lim, i) => (
                <li key={i} className="flex items-start gap-3 text-text-secondary text-sm leading-relaxed">
                  <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>
                  {lim}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 改进方向 */}
      {content.improvements.length > 0 && (
        <section>
          <h3 className="text-xl font-headline font-bold text-text-primary mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono bg-accent-blue/15 text-accent-blue">
              F
            </span>
            改进方向
          </h3>
          <div className="p-6 bg-bg-card rounded-xl border-l-4 border-accent-blue">
            <ul className="space-y-3">
              {content.improvements.map((imp, i) => (
                <li key={i} className="flex items-start gap-3 text-text-secondary text-sm leading-relaxed">
                  <span className="text-accent-blue mt-0.5 shrink-0">→</span>
                  {imp}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 结论 */}
      <section>
        <h3 className="text-xl font-headline font-bold text-text-primary mb-4 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono" style={{ background: categoryColor + '20', color: categoryColor }}>
            G
          </span>
          结论
        </h3>
        <div className="p-6 bg-bg-card rounded-xl border border-border-subtle" style={{ borderLeftWidth: '4px', borderLeftColor: categoryColor }}>
          <p className="text-text-secondary leading-relaxed text-[15px]">{content.conclusion}</p>
        </div>
      </section>
    </div>
  );
}
