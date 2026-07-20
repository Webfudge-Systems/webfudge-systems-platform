import React from 'react';

export const GlassMetricCard = ({ title, value, icon: Icon, accentColor = '#F5630F', className = '' }) => {
  return (
    <div 
      className={`outer glass-metric-outer ${className}`} 
      style={{ '--card-accent': accentColor }}
    >
      <div className="dot"></div>
      <div className="card glass-metric-card">
        <div className="ray"></div>
        
        <div className="flex items-center gap-4 relative z-10 w-full mb-1">
           {Icon && (
             <div 
               className="flex h-10 w-10 items-center justify-center rounded-xl"
               style={{ 
                 backgroundColor: `${accentColor}15`, 
                 color: accentColor,
                 borderColor: `${accentColor}30`,
                 borderWidth: '1px'
               }}
             >
               <Icon className="h-5 w-5" />
             </div>
           )}
           <div className="flex flex-col">
             <div className="text text-2xl font-extrabold text-brand-foreground">{value}</div>
             <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{title}</div>
           </div>
        </div>

        <div className="line topl"></div>
        <div className="line leftl"></div>
        <div className="line bottoml"></div>
        <div className="line rightl"></div>
      </div>
    </div>
  );
};
