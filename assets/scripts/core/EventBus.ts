type EventHandler<TPayload> = (payload: TPayload) => void;

export class EventBus<TEvents extends object> {
  private readonly handlers = new Map<keyof TEvents, Set<EventHandler<TEvents[keyof TEvents]>>>();

  public on<TKey extends keyof TEvents>(eventName: TKey, handler: EventHandler<TEvents[TKey]>): void {
    const eventHandlers = this.getOrCreateHandlers(eventName);
    eventHandlers.add(handler as EventHandler<TEvents[keyof TEvents]>);
  }

  public off<TKey extends keyof TEvents>(eventName: TKey, handler: EventHandler<TEvents[TKey]>): void {
    const eventHandlers = this.handlers.get(eventName);
    if (!eventHandlers) {
      return;
    }

    eventHandlers.delete(handler as EventHandler<TEvents[keyof TEvents]>);
  }

  public emit<TKey extends keyof TEvents>(eventName: TKey, payload: TEvents[TKey]): void {
    const eventHandlers = this.handlers.get(eventName);
    if (!eventHandlers) {
      return;
    }

    for (const handler of Array.from(eventHandlers)) {
      handler(payload);
    }
  }

  public clear(): void {
    this.handlers.clear();
  }

  private getOrCreateHandlers<TKey extends keyof TEvents>(
    eventName: TKey,
  ): Set<EventHandler<TEvents[keyof TEvents]>> {
    let eventHandlers = this.handlers.get(eventName);
    if (!eventHandlers) {
      eventHandlers = new Set<EventHandler<TEvents[keyof TEvents]>>();
      this.handlers.set(eventName, eventHandlers);
    }

    return eventHandlers;
  }
}
