import { Rpc } from "../rpc/Rpc";
import {
    DataChangeEvent,
    DataChangeFilter,
    DataChangeListener,
} from "../types";

export type Events = "dataChanged";

export class EventEmitter<
    TTypes extends Record<string, Rpc<any>> = Record<string, Rpc<any>>
> {
    private events = new Map<string, Function[]>();
    private dataChangeListeners = new Map<
        string,
        DataChangeListener<TTypes>[]
    >();
    private dataChangeFilters = new Map<string, DataChangeFilter<TTypes>>();
    private pendingEvents: Array<DataChangeEvent<TTypes>> = [];
    private emitTimeout: NodeJS.Timeout | null = null;

    constructor() {}

    public on(event: Events, listener: Function) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(listener);
        return this;
    }

    public emit(event: Events, ...args: any[]) {
        const listeners = this.events.get(event);
        if (listeners) {
            listeners.forEach((listener) => listener(...args));
        }
        return this;
    }

    public off(event: Events, listener?: Function) {
        if (!listener) {
            this.events.delete(event);
        } else {
            const listeners = this.events.get(event);
            if (listeners) {
                const index = listeners.indexOf(listener);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        }
        return this;
    }

    public removeAllListeners(event?: Events) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
        return this;
    }

    public onDataChanged<TFilteredTypes extends keyof TTypes = keyof TTypes>(
        listener: DataChangeListener<TTypes, TFilteredTypes>,
        filter?: DataChangeFilter<TTypes>
    ): string {
        const listenerId = this.generateListenerId();
        this.dataChangeListeners.set(listenerId, [listener as any]);

        if (filter) {
            this.dataChangeFilters.set(listenerId, filter);
        }

        return listenerId;
    }

    public offDataChanged(listenerId: string): boolean {
        const removed = this.dataChangeListeners.delete(listenerId);
        this.dataChangeFilters.delete(listenerId);
        return removed;
    }

    public emitDataChanged(event: DataChangeEvent<TTypes>): void {
        this.pendingEvents.push(event);

        if (this.emitTimeout) {
            clearTimeout(this.emitTimeout);
        }

        this.emitTimeout = setTimeout(() => {
            this.flushPendingEvents();
        }, 0);
    }

    private flushPendingEvents(): void {
        if (this.pendingEvents.length === 0) return;

        const eventsToEmit = [...this.pendingEvents];
        this.pendingEvents = [];

        for (const [
            listenerId,
            listeners,
        ] of this.dataChangeListeners.entries()) {
            const filter = this.dataChangeFilters.get(listenerId);

            const filteredEvents = eventsToEmit.filter((event) =>
                this.shouldEmitToListener(event, filter)
            );

            if (filteredEvents.length > 0) {
                listeners.forEach((listener) => {
                    try {
                        const typedEvents = filteredEvents.map((event) => ({
                            type: event.type,
                            payload: event.payload,
                        }));
                        listener(typedEvents as any);
                    } catch (error) {
                        console.error("Error in data change listener:", error);
                    }
                });
            }
        }
    }

    private shouldEmitToListener(
        event: DataChangeEvent<TTypes>,
        filter?: DataChangeFilter<TTypes>
    ): boolean {
        if (!filter) return true;

        if (filter.types && !filter.types.includes(event.type)) {
            return false;
        }

        return true;
    }

    private generateListenerId(): string {
        return `listener_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
    }

    public getDataChangedListenerCount(): number {
        return this.dataChangeListeners.size;
    }

    public clearAllDataChangedListeners(): void {
        this.dataChangeListeners.clear();
        this.dataChangeFilters.clear();
    }
}
