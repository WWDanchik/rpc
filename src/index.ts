// Main library entry point
export interface RPCOptions {
  timeout?: number;
  retries?: number;
}

export interface RPCRequest {
  id: string;
  method: string;
  params: any[];
}

export interface RPCResponse {
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export class RPCClient {
  private timeout: number;
  private retries: number;

  constructor(options: RPCOptions = {}) {
    this.timeout = options.timeout || 5000;
    this.retries = options.retries || 3;
  }

  async call(method: string, ...params: any[]): Promise<any> {
    const request: RPCRequest = {
      id: this.generateId(),
      method,
      params
    };

    return this.executeCall(request);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private async executeCall(request: RPCRequest): Promise<any> {
    // Example implementation - customize based on your needs
    console.log(`Executing RPC call: ${request.method} (timeout: ${this.timeout}ms, retries: ${this.retries})`, request.params);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return `Result for ${request.method} with params: ${JSON.stringify(request.params)}`;
  }
}

export function createRPCClient(options?: RPCOptions): RPCClient {
  return new RPCClient(options);
}

// Utility functions
export function isRPCError(response: RPCResponse): boolean {
  return response.error !== undefined;
}

export function parseRPCResponse(data: string): RPCResponse {
  try {
    return JSON.parse(data);
  } catch (error) {
    throw new Error('Invalid RPC response format');
  }
}

// Types are already exported as interfaces above 