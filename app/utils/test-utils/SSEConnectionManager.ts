// @/app/utils/test-utils/SSEConnectionManager.ts
import { EventSourcePolyfill as EventSource } from 'event-source-polyfill';

type StatusListener = (data: any) => void;

interface Connection {
    source: EventSource;
    listeners: Map<string, StatusListener>;
    lastData: any | null;
}

/**
 * Singleton manager for SSE connections to prevent duplicate connections
 * and reduce unnecessary API calls to the server
 */
class SSEConnectionManager {
    private static instance: SSEConnectionManager;
    private connections: Map<string, Connection> = new Map();
    private resultsCache: Map<string, any> = new Map();

    /**
     * Get the singleton instance
     */
    static getInstance(): SSEConnectionManager {
        if (!this.instance) {
            this.instance = new SSEConnectionManager();
        }
        return this.instance;
    }

    /**
     * Subscribe to SSE updates for a specific test
     */
    subscribe(projectId: string, testId: string, listenerId: string, callback: StatusListener): () => void {
        if (!projectId || !testId) return () => { };

        const connectionKey = `${projectId}:${testId}`;

        // If we already have a connection, just add the new listener
        if (this.connections.has(connectionKey)) {
            const connection = this.connections.get(connectionKey)!;
            connection.listeners.set(listenerId, callback);

            // Send cached data immediately if available
            if (connection.lastData) {
                setTimeout(() => callback(connection.lastData), 0);
            }
        } else {
            // Create a new connection
            console.log(`[SSEManager] Creating new connection for test: ${testId}`);

            try {
                const source = new EventSource(`/api/projects/${projectId}/sse-status/${testId}`);

                const connection: Connection = {
                    source,
                    listeners: new Map([[listenerId, callback]]),
                    lastData: null
                };

                this.connections.set(connectionKey, connection);

                // Set up event listeners
                source.addEventListener('open', () => {
                    console.log(`[SSEManager] Connection opened for test: ${testId}`);
                });

                source.addEventListener('status', (event) => {
                    try {
                        const messageEvent = event as MessageEvent;
                        const data = JSON.parse(messageEvent.data);
                        console.log(`[SSEManager] Status update for test ${testId}:`, data.status);

                        // Cache the data
                        connection.lastData = data;

                        // Notify all listeners
                        this.notifyListeners(connectionKey, data);

                        // Cache results if present
                        if (data.results) {
                            this.resultsCache.set(testId, data.results);
                        }

                        // Close connection on terminal states
                        if (['completed', 'error', 'aborted', 'not_found'].includes(data.status)) {
                            console.log(`[SSEManager] Terminal state reached for test: ${testId}`);
                            this.closeConnection(connectionKey);
                        }
                    } catch (e) {
                        console.error('[SSEManager] Error parsing data:', e);
                    }
                });

                source.addEventListener('error', (err) => {
                    console.error(`[SSEManager] Connection error for test ${testId}:`, err);
                });

                source.addEventListener('close', () => {
                    console.log(`[SSEManager] Server closed connection for test: ${testId}`);
                    this.closeConnection(connectionKey);
                });

            } catch (error) {
                console.error(`[SSEManager] Failed to create connection for test ${testId}:`, error);
            }
        }

        // Return unsubscribe function
        return () => this.unsubscribe(connectionKey, listenerId);
    }

    /**
     * Get cached results for a test
     */
    getCachedResults(testId: string): any | null {
        return this.resultsCache.get(testId) || null;
    }

    /**
     * Notify all listeners for a connection
     */
    private notifyListeners(connectionKey: string, data: any): void {
        const connection = this.connections.get(connectionKey);
        if (connection) {
            connection.listeners.forEach(listener => {
                try {
                    listener(data);
                } catch (err) {
                    console.error('[SSEManager] Error in listener callback:', err);
                }
            });
        }
    }

    /**
     * Remove a listener from a connection
     */
    private unsubscribe(connectionKey: string, listenerId: string): void {
        const connection = this.connections.get(connectionKey);
        if (connection) {
            connection.listeners.delete(listenerId);

            // Close connection if no listeners remain
            if (connection.listeners.size === 0) {
                this.closeConnection(connectionKey);
            }
        }
    }

    /**
     * Close and clean up a connection
     */
    private closeConnection(connectionKey: string): void {
        const connection = this.connections.get(connectionKey);
        if (connection) {
            console.log(`[SSEManager] Closing connection: ${connectionKey}`);
            connection.source.close();
            this.connections.delete(connectionKey);
        }
    }

    /**
     * Close all connections
     */
    closeAll(): void {
        console.log(`[SSEManager] Closing all connections`);
        this.connections.forEach((connection, key) => {
            connection.source.close();
        });
        this.connections.clear();
    }
}

// Export the singleton instance
export default SSEConnectionManager.getInstance();