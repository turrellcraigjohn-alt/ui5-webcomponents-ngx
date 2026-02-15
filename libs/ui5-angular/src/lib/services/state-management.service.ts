import { Injectable, signal, computed } from '@angular/core';

export interface UI5ComponentState {
  id: string;
  visible: boolean;
  enabled: boolean;
  loading: boolean;
  metadata: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class StateManagementService {
  // Central registry of component states using Signals
  private componentsRegistry = signal<Map<string, UI5ComponentState>>(new Map());

  constructor() {}

  registerComponent(id: string, initialState: Partial<UI5ComponentState> = {}) {
    const currentState = this.componentsRegistry();
    const newState = new Map(currentState);
    newState.set(id, {
      id,
      visible: initialState.visible ?? true,
      enabled: initialState.enabled ?? true,
      loading: initialState.loading ?? false,
      metadata: initialState.metadata ?? {},
    });
    this.componentsRegistry.set(newState);
  }

  updateComponent(id: string, patch: Partial<UI5ComponentState>) {
    const currentState = this.componentsRegistry();
    const component = currentState.get(id);
    if (component) {
      const newState = new Map(currentState);
      newState.set(id, { ...component, ...patch });
      this.componentsRegistry.set(newState);
    }
  }

  getComponentState(id: string) {
    return computed(() => this.componentsRegistry().get(id));
  }

  isLoading(id: string) {
    return computed(() => this.componentsRegistry().get(id)?.loading ?? false);
  }
}
