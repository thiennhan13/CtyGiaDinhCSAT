import Image from 'next/image';
import { CodeIcon } from './CodeIcon';
import { Reveal } from './PublicMotion';
import { RoadmapAssembly } from './RoadmapAssembly';
import { RoadmapCourseSection } from './RoadmapCourseSection';
import { RoadmapConsultation, RoadmapSelectionProvider, RoadmapSelector } from './RoadmapSelection';

export function RoadmapExperience() {
  return <RoadmapSelectionProvider><div className="roadmap-experience roadmap-overview">
    <section className="rm-opening">
      <div className="wrap rm-hero">
        <Reveal variant="rise" className="rm-hero-heading"><p className="eyebrow">IDEA → CODE → SOLUTION</p><h1>Lộ trình học lập trình<br /><em>cùng CSAT Tutor</em></h1></Reveal>
        <Reveal variant="rise" className="rm-hero-art"><div className="rm-code-stage" aria-hidden="true"><span className="rm-css-motif rm-css-pixels"><i/><i/><i/><i/></span><span className="rm-css-motif rm-css-bracket"/><div className="rm-3d-frame"><span className="rm-3d-heading mono">IDEA → CODE → SOLUTION <span><i /><i /><i /></span></span><div className="rm-3d-screen"><span className="rm-3d-brackets">&lt;/&gt;</span><div className="rm-code-lines"><i /><i /><i /><i /></div><CodeIcon name="terminal" /></div><div className="rm-3d-base"><span /><span /><span /><span /><span /></div></div><span className="rm-orbit rm-orbit-a"><CodeIcon name="cube" /></span><span className="rm-orbit rm-orbit-b"><CodeIcon name="function" /></span><span className="rm-orbit rm-orbit-c"><CodeIcon name="merge" /></span></div></Reveal>
        <div className="rm-hero-mosaic" aria-hidden="true">
          {[['basic-class', 'CƠ BẢN'], ['books', 'NÂNG CAO'], ['comp-program', 'CHỦ LỰC'], ['code4', 'NHỊP RIÊNG']].map(([asset, label], index) => <div className={`rm-hero-tile rm-hero-tile-${index + 1}`} key={asset}><Image src={`/images/site/${asset}.webp`} alt="" fill sizes="(max-width: 800px) 44vw, 29vw" priority={index < 2} /><span className="mono">{label}</span></div>)}
          <span className="rm-hero-center"><CodeIcon name="brackets" /></span>
        </div>
      </div>
    </section>
    <RoadmapSelector />
    <RoadmapAssembly />
    {(['A', 'B', 'C', 'E', 'K'] as const).map((code, index) => <RoadmapCourseSection key={code} code={code} chapter={String(index + 2).padStart(2, '0')} />)}
    <RoadmapConsultation />
  </div></RoadmapSelectionProvider>;
}
