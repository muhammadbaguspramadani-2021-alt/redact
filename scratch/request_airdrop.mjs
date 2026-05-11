
async function airdrop() {
  const address = '33Mf8atixyr6fC6Wev4tEy77YYUoorW1MeehuvEyHqJ3';
  const url = 'https://api.devnet.solana.com';
  
  console.log(`Requesting airdrop for ${address}...`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'requestAirdrop',
      params: [address, 1000000000] // 1 SOL
    })
  });
  
  const data = await response.json();
  if (data.error) {
    console.error('Airdrop failed:', data.error);
    process.exit(1);
  }
  
  console.log('Airdrop signature:', data.result);
}

airdrop().catch(console.error);
