import React from 'react';

const Layout = ({ children }) => {
    return (
        <div>
            <header>
                <h1>Movement Dashboard</h1>
            </header>
            <main>{children}</main>
            <footer>
                <p>&copy; 2023 Movement Dashboard</p>
            </footer>
        </div>
    );
};

export default Layout;