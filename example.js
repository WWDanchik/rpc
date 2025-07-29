// Example usage of the RPC library
import { createRPCClient, RPCClient } from './dist/index.js';

// Create an RPC client
const client = createRPCClient({
  timeout: 10000,
  retries: 2
});

// Example usage
async function example() {
  try {
    // Call a method
    const result1 = await client.call('getUserInfo', 123);
    console.log('Result 1:', result1);

    const result2 = await client.call('calculateSum', 10, 20, 30);
    console.log('Result 2:', result2);

    // Alternative way using class directly
    const directClient = new RPCClient({ timeout: 5000 });
    const result3 = await directClient.call('processData', { key: 'value' });
    console.log('Result 3:', result3);

  } catch (error) {
    console.error('RPC call failed:', error);
  }
}

// Run the example
example(); 