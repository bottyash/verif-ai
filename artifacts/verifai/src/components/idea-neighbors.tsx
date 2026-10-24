import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Compass, RotateCw } from 'lucide-react';
import {
  getVerifaiIdeaNeighbors,
  useTrackVerifaiNeighborsEvent,
  type IdeaNeighbor,
} from '@workspace/api-client-react';

const relationshipTone: Record<string, string> = {
  'Same problem, different approach': 'tone-forest',
  'Same approach, different market': 'tone-ochre',
  'Adjacent opportunity': 'tone-slate',
  'Direct competitor': 'tone-coral',
  'Aligned with YC RFS': 'tone-ink',
};

function errorMessage(error: unknown): string {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  if (data && typeof data.error === 'string') return data.error;
  return 'We could not load Idea Neighbors right now. The rest of your report is unaffected.';
}

function NeighborCard({ neighbor, onSourceClick }: { neighbor: IdeaNeighbor; onSourceClick: () => void }) {
  const isRfs = neighbor.type === 'rfs';
  return <article className="neighbor-card" data-testid={`card-neighbor-${neighbor.id}`}>
    <div className="neighbor-card-top">
      <span className="neighbor-kind">{isRfs ? 'YC request for startups' : 'YC company'}</span>
      <div className="neighbor-badges">
        {neighbor.batch && <span className="neighbor-badge">{neighbor.batch}</span>}
        {neighbor.status && <span className={`neighbor-badge status-${neighbor.status.toLowerCase()}`}>{neighbor.status}</span>}
      </div>
    </div>
    <h3>{neighbor.title}</h3>
    <span className={`neighbor-chip ${relationshipTone[neighbor.relationshipType] ?? 'tone-slate'}`} data-testid={`chip-relationship-${neighbor.id}`}>{neighbor.relationshipType}</span>
    <dl className="neighbor-points">
      <div><dt>Where you overlap</dt><dd>{neighbor.overlap}</dd></div>
      <div><dt>How to stand apart</dt><dd>{neighbor.differentiationAngle}</dd></div>
      {neighbor.lesson && <div className="neighbor-lesson"><dt>Lesson from their path</dt><dd>{neighbor.lesson}</dd></div>}
    </dl>
    <a className="neighbor-source" href={neighbor.url} target="_blank" rel="noopener noreferrer" onClick={onSourceClick} data-testid={`link-neighbor-source-${neighbor.id}`}>
      Source: Y Combinator <ArrowUpRight size={13} />
    </a>
  </article>;
}

/** Paid-report only. Loads after the verdict so the rest of the report renders immediately. */
export function IdeaNeighbors({ ideaId }: { ideaId: string }) {
  const neighbors = useQuery({
    queryKey: ['verifai', 'idea-neighbors', ideaId],
    queryFn: () => getVerifaiIdeaNeighbors(ideaId),
    enabled: !!ideaId,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const track = useTrackVerifaiNeighborsEvent();
  const sectionRef = useRef<HTMLElement>(null);
  const viewLogged = useRef(false);

  useEffect(() => {
    viewLogged.current = false;
  }, [ideaId]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || !neighbors.isSuccess || viewLogged.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !viewLogged.current) {
        viewLogged.current = true;
        track.mutate({ ideaId, data: { event: 'viewed' } });
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId, neighbors.isSuccess]);

  const logSourceClick = () => track.mutate({ ideaId, data: { event: 'yc_link_clicked' } });
  const items = neighbors.data?.neighbors ?? [];

  return <section className="idea-neighbors" ref={sectionRef} aria-labelledby="idea-neighbors-title" data-testid="section-idea-neighbors">
    <div className="snapshot-section-heading">
      <div>
        <div className="question-count">Who's near you</div>
        <h2 id="idea-neighbors-title">Idea <em>neighbors</em></h2>
        <p className="muted">Y Combinator companies and requests close to your idea, and how you can stand apart from each.</p>
      </div>
      <span className="neighbors-mark" aria-hidden="true"><Compass size={22} /></span>
    </div>

    {neighbors.isPending && <div className="neighbors-loading" role="status" aria-live="polite" data-testid="status-neighbors-loading">
      <p className="muted">Looking through YC companies and requests near your idea…</p>
      <div className="neighbor-grid">{[0, 1, 2].map((index) => <div key={index} className="neighbor-card neighbor-skeleton"><div className="skeleton" style={{ height: 10, width: '45%' }} /><div className="skeleton" style={{ height: 20, width: '70%' }} /><div className="skeleton" style={{ height: 12, width: '55%' }} /><div className="skeleton" style={{ height: 52 }} /></div>)}</div>
    </div>}

    {neighbors.isError && <div className="error-box" role="alert" data-testid="error-neighbors">
      <span>{errorMessage(neighbors.error)}</span>
      <button className="btn btn-outline" type="button" onClick={() => void neighbors.refetch()} disabled={neighbors.isFetching}><RotateCw size={14} /> Try again</button>
    </div>}

    {neighbors.isSuccess && items.length === 0 && <div className="neighbors-empty" data-testid="status-neighbors-empty">
      <h3>No close YC neighbors yet.</h3>
      <p>Nothing in our current YC dataset sits close to this idea. That can mean open space, or a dataset that has not caught up. Check again as it grows.</p>
    </div>}

    {neighbors.isSuccess && items.length > 0 && <>
      <p className="neighbors-summary" data-testid="text-neighbors-summary"><i aria-hidden="true" />{neighbors.data.summary}</p>
      <div className="neighbor-grid">{items.map((item) => <NeighborCard key={item.id} neighbor={item} onSourceClick={logSourceClick} />)}</div>
      <p className="neighbors-note">Matched by AI from a curated YC dataset. Check each source before relying on it.</p>
    </>}
  </section>;
}
