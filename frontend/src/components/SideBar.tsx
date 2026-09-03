import React from 'react';
import { Send, BarChart2, Search, Mail, LogOut, Layers } from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
    const navItems = [
        { id: 'campaigns', label: 'Campaigns', icon: Send },
        { id: 'analytics', label: 'Analytics', icon: BarChart2 },
        { id: 'logs', label: 'Search Logs', icon: Search },
        { id: 'senders', label: 'Senders', icon: Mail },
    ];

    return (
        <div className="sidebar">
            <div className="sidebar-logo">
                <Layers size={24} style={{ color: '#00a859' }} />
                <span>ReachInbox</span>
            </div>

            <nav style={{ flex: 1 }}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <div
                            key={item.id}
                            className={`nav-link ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <Icon size={18} />
                            <span>{item.label}</span>
                        </div>
                    );
                })}
            </nav>

            <div className="nav-link" onClick={onLogout} style={{ color: '#ef4444', marginTop: 'auto' }}>
                <LogOut size={18} />
                <span>Logout</span>
            </div>
        </div>
    );
};
