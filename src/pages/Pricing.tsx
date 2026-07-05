import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import './Pricing.css';

const Pricing = () => {
  const { profile, loading } = useProfile();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isYearly, setIsYearly] = useState(false);

  const handleSubscribe = async () => {
    setIsProcessing(true);
    
    const monthlyLink = import.meta.env.VITE_STRIPE_MONTHLY_LINK;
    const yearlyLink = import.meta.env.VITE_STRIPE_YEARLY_LINK;
    
    const paymentLink = isYearly ? yearlyLink : monthlyLink;
    
    if (!paymentLink) {
      alert("Stripe Payment Links are not configured in your .env file!");
      setIsProcessing(false);
      return;
    }

    const userId = profile?.id;
    if (!userId) {
      alert("You must be logged in to subscribe!");
      setIsProcessing(false);
      return;
    }

    // Redirect to Stripe Payment Link and securely pass the user ID
    window.location.href = `${paymentLink}?client_reference_id=${userId}`;
  };

  if (loading) return <div className="pricing-container">Loading...</div>;

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Upgrade your learning journey</h1>
        <p>Choose the plan that fits your vocabulary goals.</p>
        
        <div className="billing-toggle">
          <span className={!isYearly ? 'active' : ''}>Monthly</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={isYearly} 
              onChange={() => setIsYearly(!isYearly)} 
            />
            <span className="slider round"></span>
          </label>
          <span className={isYearly ? 'active' : ''}>Yearly <span className="save-badge">Save $10</span></span>
        </div>
      </div>

      <div className="pricing-cards">
        {/* FREE TIER */}
        <div className="pricing-card card">
          <h2>Free</h2>
          <div className="price">$0<span>/forever</span></div>
          <p className="pricing-desc">Perfect for casual learners starting out.</p>
          <ul className="pricing-features">
            <li>✅ Create up to 3 Dictionaries</li>
            <li>✅ 3D Flashcards Practice</li>
            <li>✅ Basic AI Translation</li>
            <li>✅ Clone Public Dictionaries</li>
          </ul>
          <button 
            className="btn-secondary pricing-btn" 
            disabled={true}
          >
            {profile?.is_premium ? 'Downgrade' : 'Current Plan'}
          </button>
        </div>

        {/* PRO TIER */}
        <div className="pricing-card card pro-card">
          <div className="pro-badge-ribbon">Most Popular</div>
          <h2>Lingora PRO <span className="pro-icon">⭐</span></h2>
          <div className="price">
            ${isYearly ? '50' : '5'}<span>/{isYearly ? 'year' : 'month'}</span>
          </div>
          <p className="pricing-desc">Unlock unlimited learning potential.</p>
          <ul className="pricing-features">
            <li>✨ <strong>Unlimited</strong> Dictionaries</li>
            <li>✨ Multiple Choice Quizzes</li>
            <li>✨ Premium AI Translation Engine</li>
            <li>✨ Ad-Free Experience</li>
          </ul>
          
          <button 
            onClick={handleSubscribe} 
            className="btn-primary pricing-btn"
            disabled={isProcessing || profile?.is_premium}
          >
            {isProcessing ? 'Processing Payment...' : 
             profile?.is_premium ? 'Active Subscription' : (isYearly ? 'Subscribe Yearly' : 'Subscribe Monthly')}
          </button>

          <p className="secure-checkout">
            🔒 Secure checkout powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
