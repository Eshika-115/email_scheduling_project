import React from 'react';
import { ArrowLeft, Star, Archive, Trash2, FileText, Image } from 'lucide-react';
import '../styles/EmailDetailPage.css';

interface AttachedFile {
    name: string;
    size: string;
    type?: string;
}

interface EmailJob {
    id: string;
    recipientEmail: string;
    status: string;
    scheduledFor: string;
    campaign: {
        subject: string;
        bodyTemplate: string;
        attachments?: AttachedFile[];
    };
}

interface EmailDetailPageProps {
    job: EmailJob;
    userEmail?: string;
    userName?: string;
    onBack: () => void;
}

export const EmailDetailPage: React.FC<EmailDetailPageProps> = ({
    job,
    userEmail = 'eshikamathur01@gmail.com',
    userName = 'Eshika Mathur',
    onBack,
}) => {
    const avatarLetter = userName.charAt(0).toUpperCase();

    //  attached files fetch kr rhe

    const attachments: AttachedFile[] = (job.campaign?.attachments as AttachedFile[]) || [];

    return (
        <div className="detail-page">

            <div className="detail-top-nav">
                <ArrowLeft size={22} className="icon-back" onClick={onBack} />
                <div className="action-icons-group">
                    <Star size={18} className="action-icon" />
                    <Archive size={18} className="action-icon" />
                    <Trash2 size={18} className="action-icon" />
                </div>
            </div>

            <div className="sender-bar">
                <div className="sender-info-group">
                    <div className="sender-avatar-circle">{avatarLetter}</div>
                    <div>
                        <div className="sender-name">{userName}</div>
                        <div className="sender-email-text">From: {userName} &lt;{userEmail}&gt;</div>
                        <div className="sender-email-text">To: {job.recipientEmail}</div>
                    </div>
                </div>

                <div className="date-text">
                    {new Date(job.scheduledFor).toLocaleString()}
                </div>
            </div>


            <div className="yellow-callout-banner">
                Hello! You are receiving this message regarding the upcoming schedule. Please review all attached documents carefully.
            </div>


            <div className="email-body-content">
                {job.campaign?.bodyTemplate || 'Hi, just wanted to follow up on our meeting...'}
            </div>


            {attachments.length > 0 && (
                <div className="attachments-grid">
                    {attachments.map((file, i) => (
                        <div key={i} className="attachment-card">
                            <div className="attachment-icon-box">
                                {file.name.toLowerCase().endsWith('.pdf') ? (
                                    <FileText size={24} style={{ color: '#ef4444' }} />
                                ) : (
                                    <Image size={24} style={{ color: '#00a859' }} />
                                )}
                            </div>
                            <div className="attachment-meta">
                                <div className="attachment-filename">{file.name}</div>
                                <div className="attachment-filesize">{file.size}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
