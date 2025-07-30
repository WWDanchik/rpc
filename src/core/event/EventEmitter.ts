export type Events = "dataChanged";

export class EventEmitter {
    private events = new Map<string, Function[]>();

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
}
