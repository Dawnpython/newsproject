import { useNavigate } from 'react-router-dom';
import '../pr/Pr.css';

export default function Pr() {
  const navigate = useNavigate();
  const go = () => navigate('/c/boats', { state: { slug: 'boats' } });

  return (
    <div
      className="pr"
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      }}
      style={{ cursor: 'pointer' }}
      aria-label="Перейти к категории: лодки"
      data-slug="boats"
    />
  );
}
