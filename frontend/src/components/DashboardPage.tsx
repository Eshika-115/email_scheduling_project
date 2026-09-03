import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Clock, Send, RefreshCw, Star, Plus, LogOut } from 'lucide-react';
import { EmailDetailPage } from './EmailDetailPage';
import { ComposeEmailPage } from './ComposeEmailPage';
import '../styles/DashboardPage.css';

import { API_BASE } from '../config';

interface EmailJob {
    id: string;
    recipientEmail: string;
    status: string;
    scheduledFor: string;
    campaign: {
        subject: string;
        bodyTemplate: string;
    };
}

interface AnalyticsSummary {
    totalCampaigns: number;
    totalJobs: number;
    sentCount: number;
    failedCount: number;
    delayedCount: number;
    pendingCount: number;
}

export const DashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
    const [jobs, setJobs] = useState<EmailJob[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [showComposePage, setShowComposePage] = useState(false);
    const [selectedJob, setSelectedJob] = useState<EmailJob | null>(null);
    const storedUserStr = localStorage.getItem('reachinbox_user');
    const initialUser = storedUserStr ? (() => {
        try {
            const parsed = JSON.parse(storedUserStr);
            return {
                name: parsed.name || 'Oliver Brown',
                email: parsed.email || 'oliver.brown@domain.io',
                avatar: parsed.avatarUrl || parsed.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            };
        } catch (e) {
            return null;
        }
    })() : null;

    const [userProfile, setUserProfile] = useState(initialUser || {
        name: 'Oliver Brown',
        email: 'oliver.brown@domain.io',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    });

    // auth user & analytics fetch kr rhe
    const fetchData = async () => {
        setLoading(true);
        try {
            let activeUserEmail = userProfile?.email;
            const stored = localStorage.getItem('reachinbox_user');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.email) activeUserEmail = parsed.email;
                } catch (e) {}
            }

            const [jobsRes, analyticsRes, meRes] = await Promise.all([
                axios.get(`${API_BASE}/jobs`, { params: { userEmail: activeUserEmail } }),
                axios.get(`${API_BASE}/analytics`, { params: { userEmail: activeUserEmail } }),
                axios.get(`${API_BASE}/auth/me`, { withCredentials: true }),
            ]);

            setJobs(jobsRes.data.jobs || []);
            setAnalytics(analyticsRes.data.summary || null);

            if (meRes.data.user) {
                const u = meRes.data.user;
                setUserProfile({
                    name: u.name || 'User',
                    email: u.email || activeUserEmail || 'user@example.com',
                    avatar: u.avatarUrl || u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
                });
                localStorage.setItem('reachinbox_user', JSON.stringify(u));
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const timer = setInterval(() => {
            fetchData();
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    const handleLogout = async () => {
        try {
            localStorage.clear();
            await axios.post(`${API_BASE}/auth/logout`, {}, { withCredentials: true });
            window.location.reload();
        } catch (err) {
            localStorage.clear();
            window.location.reload();
        }
    };

    const scheduledCount = analytics?.pendingCount ?? jobs.filter(j => j.status === 'pending' || j.status === 'delayed_rate_limit').length;
    const sentCount = jobs.filter(j => j.status === 'sent' || j.status === 'sending').length || analytics?.sentCount || 0;

    const filteredJobs = jobs
        .filter((job) => {
            const matchesTab =
                activeTab === 'scheduled'
                    ? job.status === 'pending' || job.status === 'delayed_rate_limit'
                    : job.status === 'sent' || job.status === 'sending';

            const matchesSearch =
                job.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.campaign?.subject?.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesTab && matchesSearch;
        })
        .sort((a, b) => {
            if (activeTab === 'sent') {
                const timeA = (a as any).sentAt ? new Date((a as any).sentAt).getTime() : new Date(a.scheduledFor).getTime();
                const timeB = (b as any).sentAt ? new Date((b as any).sentAt).getTime() : new Date(b.scheduledFor).getTime();
                return timeB - timeA;
            }
            return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
        });

    if (showComposePage) {
        return <ComposeEmailPage userEmail={userProfile.email} onBack={() => { setShowComposePage(false); fetchData(); }} />;
    }

    if (selectedJob) {
        return (
            <EmailDetailPage
                job={selectedJob}
                userEmail={userProfile.email}
                userName={userProfile.name}
                onBack={() => setSelectedJob(null)}
            />
        );
    }

    return (
        <div className="app-layout">

            <aside className="figma-sidebar">
                <div className="omg-logo">ONB</div>


                <div className="user-profile-pill" onClick={handleLogout} title="Click to Logout">
                    <img src={userProfile.avatar} alt={userProfile.name} className="user-avatar" />
                    <div className="user-info">
                        <div className="user-name">{userProfile.name}</div>
                        <div className="user-email">{userProfile.email}</div>
                    </div>
                    <LogOut size={14} style={{ color: '#94a3b8' }} />
                </div>

                <button className="compose-btn" onClick={() => setShowComposePage(true)}>
                    <Plus size={18} className="compose-icon" /> Compose
                </button>

                <div className="section-label">CORE</div>

                <div
                    className={`nav-item ${activeTab === 'scheduled' ? 'active' : ''}`}
                    onClick={() => setActiveTab('scheduled')}
                >
                    <div className="nav-item-content">
                        <Clock size={16} />
                        <span>Scheduled</span>
                    </div>
                    <span className="nav-count">{scheduledCount}</span>
                </div>

                <div
                    className={`nav-item ${activeTab === 'sent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sent')}
                >
                    <div className="nav-item-content">
                        <Send size={16} />
                        <span>Sent</span>
                    </div>
                    <span className="nav-count">{sentCount}</span>
                </div>
            </aside>


            <main className="figma-main">
                <div className="search-header">
                    <div className="search-input-wrapper">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search emails..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button onClick={fetchData} className="refresh-btn">
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                    </button>
                </div>


                <div>
                    {filteredJobs.length === 0 ? (
                        <div className="empty-state-text">
                            No {activeTab} emails found. Click "Compose" to create new campaign!
                        </div>
                    ) : (
                        filteredJobs.map((job) => {
                            const dateStr = new Date(job.scheduledFor).toLocaleTimeString([], {
                                weekday: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                            });

                            return (
                                <div key={job.id} className="email-row" onClick={() => setSelectedJob(job)}>
                                    <div className="email-recipient">To: {job.recipientEmail}</div>

                                    <div className="time-badge">
                                        <Clock size={12} />
                                        <span>{dateStr}</span>
                                    </div>

                                    <div className="email-subject-preview">
                                        <span className="email-subject">{job.campaign?.subject || 'Meeting follow-up'}</span>
                                        <span className="email-preview">
                                            {' '}
                                            - {job.campaign?.bodyTemplate || 'Hi, just following up on our meeting...'}
                                        </span>
                                    </div>

                                    <Star size={16} className="star-icon" />
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
};
