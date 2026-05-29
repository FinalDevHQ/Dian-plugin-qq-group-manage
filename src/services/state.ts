import type { ActionResult } from "@myfinal/plugin-runtime";

type SendActionFn = (action: string, params?: Record<string, unknown>) => Promise<ActionResult>;

class PluginState {
  private _sendAction: SendActionFn | null = null;

  set sendAction(fn: SendActionFn) {
    this._sendAction = fn;
  }

  get sendAction(): SendActionFn {
    if (!this._sendAction) {
      throw new Error("sendAction not initialized");
    }
    return this._sendAction;
  }

  get available(): boolean {
    return this._sendAction !== null;
  }
}

export const pluginState = new PluginState();
