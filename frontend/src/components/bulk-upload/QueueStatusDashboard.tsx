import React, { useState, useEffect } from 'react';
import {
    useQueueStatusWebSocket,
    type QueuePositionInfo,
    type QueueDashboardStatus,
    type ProcessingStage
} from '../../hooks/useQueueStatusWebSocket';
import './QueueStatusDashboard.css';

/**
 * Format minutes into readable time string
 */
const formatWaitTime = (minutes: number): string => {
    if (minutes < 1) return 'Less than a minute';
    if (minutes === 1) return '1 minute';
    if (minutes < 60) return `${minutes} minutes`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
        return hours === 1 ? '1 hour' : `${hours} hours`;
    }

    return `${hours}h ${remainingMinutes}m`;
};

/**
 * Get status badge class based on job status
 */
const getStatusClass = (status: string): string => {
    switch (status) {
        case 'waiting':
            return 'status-waiting';
        case 'active':
            return 'status-active';
        case 'completed':
            return 'status-completed';
        case 'failed':
            return 'status-failed';
        default:
            return 'status-unknown';
    }
};

interface QueueStatusDashboardProps {
    className?: string;
    compact?: boolean;
    showAllJobs?: boolean;
}

/**
 * Queue Status Dashboard Component
 * 
 * Displays real-time queue status including:
 * - User's jobs with queue positions
 * - Estimated wait times
 * - Processing stages with visual indicators
 * - Overall queue statistics
 */
export const QueueStatusDashboard: React.FC<QueueStatusDashboardProps> = ({
    className = '',
    compact = false,
    showAllJobs = false
}) => {
    const [notifications, setNotifications] = useState<string[]>([]);

    const {
        isConnected,
        connectionError,
        dashboard,
        userJobs,
        refreshDashboard
    } = useQueueStatusWebSocket({
        onJobQueued: (data) => {
            addNotification(`📥 File "${data.file_name}" queued at position #${data.position}`);
        },
        onJobStarted: (data) => {
            addNotification(`🚀 Processing started for "${data.file_name}"`);
        },
        onJobCompleted: (data) => {
            addNotification(`✅ "${data.file_name}" completed: ${data.stats.inserts} inserts, ${data.stats.updates} updates`);
        },
        onJobFailed: (data) => {
            addNotification(`❌ "${data.file_name}" failed: ${data.error}`);
        }
    });

    const addNotification = (message: string) => {
        setNotifications(prev => [message, ...prev.slice(0, 4)]);
        // Auto-remove after 10 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n !== message));
        }, 10000);
    };

    if (compact) {
        return (
            <div className={`queue-status-compact ${className}`}>
                <div className="queue-status-indicator">
                    <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`} />
                    {userJobs.filter(j => j.status === 'waiting').length > 0 && (
                        <span className="queue-badge">
                            {userJobs.filter(j => j.status === 'waiting').length} in queue
                        </span>
                    )}
                    {userJobs.filter(j => j.status === 'active').length > 0 && (
                        <span className="processing-badge">
                            Processing...
                        </span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`queue-status-dashboard ${className}`}>
            {/* Connection Status */}
            <div className="dashboard-header">
                <h3>Upload Queue Status</h3>
                <div className="connection-status">
                    <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`} />
                    <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    {connectionError && <span className="error-text">({connectionError})</span>}
                    <button onClick={refreshDashboard} className="refresh-btn" title="Refresh">
                        🔄
                    </button>
                </div>
            </div>

            {/* System Message */}
            {dashboard?.system_message && (
                <div className="system-message">
                    ⚠️ {dashboard.system_message}
                </div>
            )}

            {/* Notifications */}
            {notifications.length > 0 && (
                <div className="notifications-panel">
                    {notifications.map((notification, index) => (
                        <div key={index} className="notification-item">
                            {notification}
                        </div>
                    ))}
                </div>
            )}

            {/* Queue Statistics */}
            {dashboard && (
                <div className="queue-stats-grid">
                    <div className="stat-card waiting">
                        <div className="stat-value">{dashboard.queue_stats.total_waiting}</div>
                        <div className="stat-label">Waiting</div>
                    </div>
                    <div className="stat-card active">
                        <div className="stat-value">{dashboard.queue_stats.total_active}</div>
                        <div className="stat-label">Processing</div>
                    </div>
                    <div className="stat-card completed">
                        <div className="stat-value">{dashboard.queue_stats.total_completed_today}</div>
                        <div className="stat-label">Completed Today</div>
                    </div>
                    <div className="stat-card failed">
                        <div className="stat-value">{dashboard.queue_stats.total_failed_today}</div>
                        <div className="stat-label">Failed Today</div>
                    </div>
                </div>
            )}

            {/* User's Jobs */}
            <div className="user-jobs-section">
                <h4>Your Uploads</h4>
                {userJobs.length === 0 ? (
                    <p className="no-jobs-message">No pending uploads</p>
                ) : (
                    <div className="jobs-list">
                        {userJobs.map((job) => (
                            <JobCard key={job.job_id} job={job} />
                        ))}
                    </div>
                )}
            </div>

            {/* Currently Processing (Active Job) */}
            {dashboard?.active_job && (
                <div className="active-job-section">
                    <h4>Currently Processing</h4>
                    <JobCard job={dashboard.active_job} isActive />
                </div>
            )}

            {/* All Waiting Jobs (Admin View) */}
            {showAllJobs && dashboard?.all_waiting_jobs && dashboard.all_waiting_jobs.length > 0 && (
                <div className="all-jobs-section">
                    <h4>All Waiting Jobs ({dashboard.all_waiting_jobs.length})</h4>
                    <div className="jobs-list">
                        {dashboard.all_waiting_jobs.map((job) => (
                            <JobCard key={job.job_id} job={job} showUser />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface JobCardProps {
    job: QueuePositionInfo;
    isActive?: boolean;
    showUser?: boolean;
}

/**
 * Individual Job Card Component
 */
const JobCard: React.FC<JobCardProps> = ({ job, isActive = false, showUser = false }) => {
    return (
        <div className={`job-card ${isActive ? 'active' : ''} ${getStatusClass(job.status)}`}>
            <div className="job-header">
                <span className="job-filename">{job.file_name}</span>
                <span className={`job-status-badge ${getStatusClass(job.status)}`}>
                    {job.stage_info.icon} {job.stage_info.label}
                </span>
            </div>

            {job.status === 'waiting' && (
                <div className="queue-position-info">
                    <div className="position-display">
                        <span className="position-number">#{job.position}</span>
                        <span className="position-label">in queue</span>
                    </div>
                    <div className="wait-info">
                        <span className="jobs-ahead">{job.jobs_ahead} job(s) ahead</span>
                        <span className="estimated-wait">
                            Est. wait: {formatWaitTime(job.estimated_wait_minutes)}
                        </span>
                    </div>
                </div>
            )}

            {(job.status === 'active' || isActive) && (
                <div className="processing-info">
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar"
                            style={{
                                width: `${job.progress}%`,
                                backgroundColor: job.stage_info.color
                            }}
                        />
                    </div>
                    <div className="progress-text">
                        <span>{job.progress}%</span>
                        <span className="processing-message">{job.message}</span>
                    </div>
                </div>
            )}

            {job.status === 'completed' && (
                <div className="completed-info">
                    <span className="completion-message">{job.message}</span>
                </div>
            )}

            {job.status === 'failed' && (
                <div className="failed-info">
                    <span className="error-message">{job.message}</span>
                </div>
            )}

            <div className="job-footer">
                <span className="uploaded-time">
                    Uploaded: {new Date(job.uploaded_at).toLocaleString()}
                </span>
            </div>
        </div>
    );
};

export default QueueStatusDashboard;
