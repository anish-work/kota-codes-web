import { SITE } from '../content';

export function Footer() {
  return (
    <>
      <footer className="band">
        <div className="frame cells foot">
          <div>kota.codes</div>
          <div>learn tech. meet people.</div>
          <div>made in kota</div>
          <div>
            <a href={SITE.instagram} target="_blank" rel="noopener">
              {SITE.handle}
            </a>
          </div>
        </div>
      </footer>
      <div className="band end">
        <div className="frame"></div>
      </div>
    </>
  );
}
