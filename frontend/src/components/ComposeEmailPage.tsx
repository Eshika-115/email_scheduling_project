import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Paperclip, Clock, Calendar, Bold, Italic, Underline, List, Quote, AlignLeft, Upload, X, FileText } from 'lucide-react';
import '../styles/ComposeEmailPage.css';

import { API_BASE } from '../config';

interface AttachedFile {
    name: string;
    size: string;
    type: string;
}

interface ComposeEmailPageProps {
    userEmail?: string;
    onBack: () => void;
}

export const ComposeEmailPage: React.FC<ComposeEmailPageProps> = ({ userEmail = 'eshikamathur01@gmail.com', onBack }) => {
    const [fromEmail, setFromEmail] = useState(userEmail);
    const [senderOptions, setSenderOptions] = useState<string[]>([userEmail, 'oliver.brown@domain.io']);

    // listbstart completely empty byd efaukt
    const [toEmailList, setToEmailList] = useState<string[]>([]);
    const [typedEmail, setTypedEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [delaySeconds, setDelaySeconds] = useState<number | string>('');
    const [hourlyLimit, setHourlyLimit] = useState<number | string>('');
    const [bodyText, setBodyText] = useState('');

    // attachments state


    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);


    const [showSchedulePopover, setShowSchedulePopover] = useState(false);
    const [scheduledDateTime, setScheduledDateTime] = useState('');


    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);


    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    useEffect(() => {
        const loadSenders = async () => {
            try {
                const sendersRes = await axios.get(`${API_BASE}/senders`);
                const senderEmails = sendersRes.data.senders?.map((s: any) => s.email) || [];
                const combinedSenders = Array.from(new Set([userEmail, ...senderEmails, 'oliver.brown@domain.io']));
                setSenderOptions(combinedSenders);
                setFromEmail(userEmail);
            } catch (err) {
                setSenderOptions([userEmail, 'oliver.brown@domain.io']);
                setFromEmail(userEmail);
            }
        };

        loadSenders();
    }, [userEmail]);

    const addEmailChip = (email: string) => {
        const trimmed = email.trim();
        if (trimmed && EMAIL_REGEX.test(trimmed) && !toEmailList.includes(trimmed)) {
            setToEmailList((prev) => [...prev, trimmed]);
            setTypedEmail('');
        }
    };

    const removeEmailChip = (index: number) => {
        setToEmailList((prev) => prev.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addEmailChip(typedEmail);
        }
    };

    // reci  csv/txt upload 
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                const extracted = content
                    .split(/[\n,;\r]/)
                    .map((item) => item.trim())
                    .filter((item) => EMAIL_REGEX.test(item));

                if (extracted.length === 0) {
                    alert('No valid email addresses found in the uploaded file!');
                    return;
                }

                setToEmailList((prev) => Array.from(new Set([...prev, ...extracted])));
                alert(`Successfully imported ${extracted.length} valid email addresses!`);
            }
        };
        reader.readAsText(file);
    };

    // attachment upload 
    const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newAttachments: AttachedFile[] = [];
        Array.from(files).forEach((file) => {
            const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
            newAttachments.push({
                name: file.name,
                size: sizeStr,
                type: file.type || 'document',
            });
        });

        setAttachedFiles((prev) => [...prev, ...newAttachments]);
    };

    const removeAttachment = (index: number) => {
        setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        const finalRecipients = [...toEmailList];
        if (typedEmail.trim() && EMAIL_REGEX.test(typedEmail.trim())) {
            finalRecipients.push(typedEmail.trim());
        }

        if (finalRecipients.length === 0 || !subject || !bodyText) {
            alert('Please fill in To recipients, Subject, and Email Body');
            return;
        }

        try {
            await axios.post(`${API_BASE}/campaigns`, {
                userId: 'demo-user-id',
                subject,
                bodyTemplate: bodyText,
                recipientEmails: finalRecipients,
                delaySeconds: Number(delaySeconds) || 0,
                hourlyLimit: Number(hourlyLimit) > 0 ? Number(hourlyLimit) : 50,
                attachments: attachedFiles,
                startTime: scheduledDateTime ? new Date(scheduledDateTime).toISOString() : new Date().toISOString(),
            });

            alert('Campaign Created & Scheduled Successfully!');
            onBack();
        } catch (err: any) {
            alert('Error creating campaign: ' + (err.response?.data?.error || err.message));
        }
    };

    const handlePresetSelect = (daysOffset: number = 1, targetHour: number = 10) => {
        const d = new Date();
        d.setDate(d.getDate() + daysOffset);
        d.setHours(targetHour, 0, 0, 0);
        setScheduledDateTime(d.toISOString().slice(0, 16));
    };

    const visibleChips = toEmailList.slice(0, 3);
    const remainingCount = toEmailList.length > 3 ? toEmailList.length - 3 : 0;

    return (
        <div className="compose-page">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.txt,.json"
                className="hidden-file-input"
            />

            <input
                type="file"
                ref={attachmentInputRef}
                onChange={handleAttachmentUpload}
                accept="image/*,.pdf,.doc,.docx"
                multiple
                className="hidden-file-input"
            />


            <div className="compose-top-bar">
                <div className="compose-title-wrapper">
                    <ArrowLeft size={22} className="icon-back" onClick={onBack} />
                    <h1 className="compose-title">Compose New Email</h1>
                </div>

                <div className="compose-actions">
                    <div className="paperclip-wrapper">
                        <Paperclip
                            size={20}
                            className="icon-green"
                            onClick={() => attachmentInputRef.current?.click()}
                        />
                        {attachedFiles.length > 0 && (
                            <span className="attachment-counter-badge">
                                {attachedFiles.length}
                            </span>
                        )}
                    </div>

                    <Clock
                        size={20}
                        className={showSchedulePopover || scheduledDateTime ? 'icon-green' : 'icon-slate'}
                        onClick={() => setShowSchedulePopover(!showSchedulePopover)}
                    />
                    <button onClick={handleSend} className="send-btn-outline">
                        {scheduledDateTime ? 'Send Later' : 'Send'}
                    </button>
                </div>
            </div>


            <div className="compose-form-area">
                {/* From Field */}
                <div className="form-field-row">
                    <span className="form-field-label">From</span>
                    <select
                        value={fromEmail}
                        onChange={(e) => setFromEmail(e.target.value)}
                        className="select-dropdown"
                    >
                        {senderOptions.map((email, idx) => (
                            <option key={idx} value={email}>
                                {email}
                            </option>
                        ))}
                    </select>
                </div>


                <div className="form-field-row to-row">
                    <span className="form-field-label">To</span>

                    {visibleChips.map((email, idx) => (
                        <div key={idx} className="email-chip-item">
                            <span>{email}</span>
                            <X size={13} className="chip-icon-close" onClick={() => removeEmailChip(idx)} />
                        </div>
                    ))}

                    {remainingCount > 0 && <div className="remaining-count-badge">+{remainingCount}</div>}

                    <input
                        type="text"
                        placeholder={toEmailList.length === 0 ? 'recipient@example.com' : ''}
                        value={typedEmail}
                        onChange={(e) => setTypedEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => addEmailChip(typedEmail)}
                        className="text-input-field"
                    />

                    <button type="button" onClick={() => fileInputRef.current?.click()} className="upload-list-btn">
                        <Upload size={15} />
                        <span>Upload List</span>
                    </button>
                </div>


                <div className="form-field-row">
                    <span className="form-field-label">Subject</span>
                    <input
                        type="text"
                        placeholder="Subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="text-input-field"
                    />
                </div>




                {/* Delay,Hourly Limit*/}


                <div className="delay-limit-row">
                    <div className="delay-group">
                        <span className="field-sublabel">Delay between 2 emails</span>
                        <input
                            type="number"
                            placeholder="0"
                            value={delaySeconds}
                            onChange={(e) => setDelaySeconds(e.target.value)}
                            className="number-input-field"
                        />
                    </div>

                    <div className="delay-group">
                        <span className="field-sublabel">Hourly Limit</span>
                        <input
                            type="number"
                            placeholder="50"
                            value={hourlyLimit}
                            onChange={(e) => setHourlyLimit(e.target.value)}
                            className="number-input-field"
                        />
                    </div>
                </div>


                <div className="body-editor-wrapper">
                    <textarea
                        placeholder="Type Your Reply..."
                        className="body-textarea"
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                    />

                    <div className="editor-toolbar">
                        <Bold size={16} className="icon-pointer" />
                        <Italic size={16} className="icon-pointer" />
                        <Underline size={16} className="icon-pointer" />
                        <AlignLeft size={16} className="icon-pointer" />
                        <List size={16} className="icon-pointer" />
                        <Quote size={16} className="icon-pointer" />
                    </div>
                </div>

                {/* Attached Files  */}


                {attachedFiles.length > 0 && (
                    <div className="attached-files-container">
                        {attachedFiles.map((file, i) => (
                            <div key={i} className="attached-file-chip">
                                <FileText size={14} className="attached-file-icon" />
                                <span>{file.name} ({file.size})</span>
                                <X size={13} className="attached-file-close" onClick={() => removeAttachment(i)} />
                            </div>
                        ))}
                    </div>
                )}
            </div>


            {showSchedulePopover && (
                <div className="scheduler-popover">
                    <h3 className="scheduler-title">Send Later</h3>

                    <div className="datetime-container">
                        <div className="datetime-input-wrapper">
                            <input
                                type="datetime-local"
                                value={scheduledDateTime}
                                onChange={(e) => setScheduledDateTime(e.target.value)}
                                className="datetime-picker"
                            />
                            <Calendar size={16} className="icon-calendar" />
                        </div>
                    </div>

                    <div className="presets-list">
                        <div className="preset-item" onClick={() => handlePresetSelect(1, 9)}>Tomorrow</div>
                        <div className="preset-item" onClick={() => handlePresetSelect(1, 10)}>Tomorrow, 10:00 AM</div>
                        <div className="preset-item" onClick={() => handlePresetSelect(1, 11)}>Tomorrow, 11:00 AM</div>
                        <div className="preset-item" onClick={() => handlePresetSelect(1, 15)}>Tomorrow, 3:00 PM</div>
                    </div>

                    <div className="scheduler-actions">
                        <button onClick={() => setShowSchedulePopover(false)} className="btn-cancel-text">
                            Cancel
                        </button>
                        <button onClick={() => setShowSchedulePopover(false)} className="send-btn-outline btn-small">
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
