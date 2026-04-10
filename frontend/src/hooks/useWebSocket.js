import { useState, useEffect, useRef, useCallback } from 'react';
import { BASE_URL } from '../services/api';

/**
 * A robust custom hook for handling WebSocket communication.
 * Provides real-time event listening and automatic reconnection.
 */
export const useWebSocket = (path = '/api/attendance/ws') => {
    const [status, setStatus] = useState('connecting'); // connecting, open, closed
    const [lastMessage, setLastMessage] = useState(null);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connect = useCallback(() => {
        // Derive WS URL from BASE_URL carefully
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Remove protocol (http/https) and everything after the host (e.g. /api)
        const wsHost = BASE_URL.replace(/^https?:\/\//, '').split('/')[0];
        const socketUrl = `${protocol}//${wsHost}${path}`;

        console.log(`[WebSocket] Connecting to ${socketUrl}...`);
        const socket = new WebSocket(socketUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('[WebSocket] Connection established.');
            setStatus('open');
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLastMessage(data);
            } catch (err) {
                console.error('[WebSocket] Failed to parse message:', err);
            }
        };

        socket.onclose = () => {
            console.log('[WebSocket] Connection closed.');
            setStatus('closed');
            // Auto-reconnect after 5 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, 5000);
        };

        socket.onerror = (err) => {
            console.error('[WebSocket] Error occurred:', err);
            socket.close();
        };
    }, [path]);

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);

    const sendMessage = (msg) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
    };

    return {
        status,
        lastMessage,
        sendMessage,
        isLive: status === 'open'
    };
};
