export function SectionHead({ id, title }: { id: string; title: string }) {
  return (
    <div className="band" id={id}>
      <div className="frame">
        <div className="head">
          <h2 id={`${id}-h`}>{title}</h2>
        </div>
      </div>
    </div>
  );
}
