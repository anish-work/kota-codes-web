import type { ReactNode } from 'react';

export function SectionHead({ id, title, aside }: { id: string; title: string; aside?: ReactNode }) {
  return (
    <div className="band" id={id}>
      <div className="frame">
        <div className={aside ? 'head head-pix' : 'head'}>
          <h2 id={`${id}-h`}>{title}</h2>
          {aside}
        </div>
      </div>
    </div>
  );
}
