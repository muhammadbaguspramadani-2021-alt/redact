
import WDK from '@tetherto/wdk';
import WalletManagerSolana from '@tetherto/wdk-wallet-solana';
import fs from 'fs';
import path from 'path';

async function main() {
  const envPath = path.join(process.cwd(), '.env.local');
  const env = fs.readFileSync(envPath, 'utf-8');
  const seedMatch = env.match(/WDK_SEED_PHRASE=(.*)/);
  if (!seedMatch) {
    console.error('No WDK_SEED_PHRASE found in .env.local');
    process.exit(1);
  }
  const seedPhrase = seedMatch[1].trim();

  const wdk = new WDK(seedPhrase).registerWallet('solana', WalletManagerSolana, {
    rpcUrl: 'https://api.devnet.solana.com',
    wsUrl: 'wss://api.devnet.solana.com',
  });

  const account = await wdk.getAccount('solana', 0);
  const address = await account.getAddress();
  console.log(address);
}

main().catch(console.error);
