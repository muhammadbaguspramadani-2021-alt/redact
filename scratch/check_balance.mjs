
async function checkBalance() {
  const address = '33Mf8atixyr6fC6Wev4tEy77YYUoorW1MeehuvEyHqJ3';
  const url = 'https://api.devnet.solana.com';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address]
    })
  });
  
  const data = await response.json();
  console.log(`Balance for ${address}: ${data.result.value / 1000000000} SOL`);
}

checkBalance().catch(console.error);
