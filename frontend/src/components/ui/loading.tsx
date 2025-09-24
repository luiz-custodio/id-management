import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="relative">
        {/* Círculo externo com gradiente */}
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/20"></div>
        
        {/* Círculo animado com gradiente */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-400 animate-spin"></div>
        
        {/* Círculo interno com glow */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-blue-600/20 to-blue-400/20 animate-pulse"></div>
      </div>
    </div>
  );
};

interface PulseLoadingProps {
  className?: string;
  lines?: number;
}

export const PulseLoading: React.FC<PulseLoadingProps> = ({ 
  className = '', 
  lines = 3 
}) => {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg ${
            i === 0 ? 'w-3/4' : i === lines - 1 ? 'w-1/2' : 'w-full'
          }`}
          style={{
            animationDelay: `${i * 0.1}s`,
          }}
        ></div>
      ))}
    </div>
  );
};

export default LoadingSpinner;