import React from 'react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="pt-16 min-h-[calc(100vh-4rem)]">
      <main className="max-w-7xl mx-auto p-4">{children}</main>
    </div>
  );
};

export default Layout;
