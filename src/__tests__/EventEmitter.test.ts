import { describe, it, expect, beforeEach } from "vitest";
import { EventEmitter } from "../core/event/EventEmitter";

describe("EventEmitter", () => {
    let emitter: EventEmitter;

    beforeEach(() => {
        emitter = new EventEmitter();
    });

    describe("on", () => {
        it("should add event listener", () => {
            let eventFired = false;
            const listener = () => {
                eventFired = true;
            };

            emitter.on("dataChanged", listener);
            emitter.emit("dataChanged");

            expect(eventFired).toBe(true);
        });

        it("should add multiple listeners", () => {
            let count = 0;
            const listener1 = () => count++;
            const listener2 = () => count++;

            emitter.on("dataChanged", listener1);
            emitter.on("dataChanged", listener2);
            emitter.emit("dataChanged");

            expect(count).toBe(2);
        });
    });

    describe("emit", () => {
        it("should emit event with arguments", () => {
            let receivedData: any = null;
            const listener = (data: any) => {
                receivedData = data;
            };

            emitter.on("dataChanged", listener);
            emitter.emit("dataChanged", { id: 1, name: "test" });

            expect(receivedData).toEqual({ id: 1, name: "test" });
        });

        it("should emit event with multiple arguments", () => {
            let receivedArgs: any[] = [];
            const listener = (...args: any[]) => {
                receivedArgs = args;
            };

            emitter.on("dataChanged", listener);
            emitter.emit("dataChanged", "arg1", "arg2", "arg3");

            expect(receivedArgs).toEqual(["arg1", "arg2", "arg3"]);
        });

        it("should not throw when no listeners exist", () => {
            expect(() => emitter.emit("dataChanged")).not.toThrow();
        });
    });

    describe("off", () => {
        it("should remove specific listener", () => {
            let count = 0;
            const listener1 = () => count++;
            const listener2 = () => count++;

            emitter.on("dataChanged", listener1);
            emitter.on("dataChanged", listener2);
            emitter.emit("dataChanged");
            expect(count).toBe(2);

            emitter.off("dataChanged", listener1);
            emitter.emit("dataChanged");
            expect(count).toBe(3); // Only listener2 fired
        });

        it("should remove all listeners for event when no specific listener provided", () => {
            let count = 0;
            const listener1 = () => count++;
            const listener2 = () => count++;

            emitter.on("dataChanged", listener1);
            emitter.on("dataChanged", listener2);
            emitter.emit("dataChanged");
            expect(count).toBe(2);

            emitter.off("dataChanged");
            emitter.emit("dataChanged");
            expect(count).toBe(2);
        });

        it("should not throw when removing non-existent listener", () => {
            const listener = () => {};
            expect(() => emitter.off("dataChanged", listener)).not.toThrow();
        });
    });

    describe("removeAllListeners", () => {
        it("should remove all listeners for specific event", () => {
            let count = 0;
            const listener1 = () => count++;
            const listener2 = () => count++;

            emitter.on("dataChanged", listener1);
            emitter.on("dataChanged", listener2);

            emitter.removeAllListeners("dataChanged");
            emitter.emit("dataChanged");

            expect(count).toBe(0);
        });

        it("should remove all listeners when no event specified", () => {
            let count = 0;
            const listener = () => count++;

            emitter.on("dataChanged", listener);

            emitter.removeAllListeners();
            emitter.emit("dataChanged");

            expect(count).toBe(0);
        });
    });

    describe("chaining", () => {
        it("should support method chaining", () => {
            let count = 0;
            const listener = () => count++;

            const result = emitter
                .on("dataChanged", listener)
                .emit("dataChanged")
                .off("dataChanged", listener);

            expect(result).toBe(emitter);
            expect(count).toBe(1);
        });
    });
});
