export class SovereignApiRouter {
  private static singleton: SovereignApiRouter | null = null;
  private constructor() {}
  static getInstance(): SovereignApiRouter {
    if (!this.singleton) this.singleton = new SovereignApiRouter();
    return this.singleton;
  }
  async handleRequest(path: string, method: string): Promise<{status:number;data:Record<string, unknown>}> {
    if (method !== 'GET') return {status:405,data:{error:'METHOD_NOT_ALLOWED'}};
    if (path === '/api/system/health') return {status:200,data:{status:'ok'}};
    if (path === '/api/system/status') return {status:200,data:{status:'available'}};
    return {status:404,data:{error:'NOT_FOUND'}};
  }
}
