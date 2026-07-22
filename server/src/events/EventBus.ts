import { EventEmitter } from 'events';
import { SynchronizationEngine } from './SynchronizationEngine.js';

type DomainEventAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVAL' | 'REJECT' | 'COMPLETE' | 'CANCEL';

export interface DomainEventPayload {
  idempotencyKey: string;
  entityId: string;
  userId: string;
  data?: any;
  oldData?: any;
}

class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    this.emitter.on('ENTITY_MUTATION', async (
      entityType: string, 
      action: DomainEventAction, 
      payload: DomainEventPayload
    ) => {
      // Offload to Synchronization Engine
      if (action === 'CREATE' || action === 'UPDATE' || action === 'DELETE') {
        await SynchronizationEngine.handleEntityMutation(action, entityType, payload);
      }
    });
  }

  public publishMutation(entityType: string, action: DomainEventAction, userId: string, entityId: string, idempotencyKey: string, data?: any, oldData?: any) {
    const payload: DomainEventPayload = {
      idempotencyKey,
      entityId,
      userId,
      data,
      oldData
    };
    
    this.emitter.emit('ENTITY_MUTATION', entityType, action, payload);
  }

  public emit(event: string, payload: any) {
    this.emitter.emit(event, payload);
  }
}

export const eventBus = new EventBus();
