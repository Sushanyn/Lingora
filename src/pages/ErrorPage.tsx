import { useNavigate } from 'react-router-dom';
import './ErrorPage.css';

const ErrorPage = () => {
  const navigate = useNavigate();

  return (
    <div className="error-page">
      <div className="error-container">
        <div className="panda-scene">
          <div className="bamboo-stick b1"></div>
          <div className="bamboo-stick b2"></div>
          <div className="bamboo-stick b3"></div>
          <div className="panda-sleeping">🐼</div>
          <div className="z-mark z1">Z</div>
          <div className="z-mark z2">z</div>
          <div className="z-mark z3">z</div>
        </div>
        
        <h1 className="error-code">404</h1>
        <h2 className="error-title">Oops! The Panda is asleep.</h2>
        <p className="error-desc">
          We couldn't find the page you were looking for. It seems our mascot has taken a nap in the bamboo forest.
        </p>

        <button onClick={() => navigate('/')} className="btn-primary error-btn">
          Wake up & Go Home
        </button>
      </div>
    </div>
  );
};

export default ErrorPage;
