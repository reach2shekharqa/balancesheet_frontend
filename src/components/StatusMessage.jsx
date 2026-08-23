import { useEffect, useState } from "react";

const STATUS_DURATION = 1800;

function StatusMessage({ message = "", loading = false, loadingMessages = [], tone, persist = false }) {
    const messages = loadingMessages.length > 0 ? loadingMessages : [message];
    const [messageIndex, setMessageIndex] = useState(0);
    const [visible, setVisible] = useState(Boolean(message) || loading);

    useEffect(() => {
        const reset = window.setTimeout(() => {
            setMessageIndex(0);
            setVisible(Boolean(message) || loading);
        }, 0);
        return () => window.clearTimeout(reset);
    }, [message, loading, loadingMessages.length]);

    useEffect(() => {
        if (!visible || persist) return undefined;
        const timeout = window.setTimeout(() => setVisible(false), STATUS_DURATION);
        return () => window.clearTimeout(timeout);
    }, [visible, persist]);

    useEffect(() => {
        if (!loading || messages.length < 2) return undefined;
        const interval = window.setInterval(() => {
            setMessageIndex(current => (current + 1) % messages.length);
        }, STATUS_DURATION);
        return () => window.clearInterval(interval);
    }, [loading, messages.length]);

    if (!visible || (!message && !loading)) return null;

    const currentMessage = loading ? messages[messageIndex] || message : message;
    const statusTone = tone || (loading ? "loading" : "success");
    return (
        <div className={`status-banner ${statusTone}`} role={statusTone === "error" ? "alert" : "status"} aria-live="polite">
            <strong>{loading ? "In progress" : statusTone === "error" ? "Action could not be completed" : "Update"}</strong>
            <span>{currentMessage}</span>
        </div>
    );
}

export default StatusMessage;
