import { NextRequest, NextResponse } from 'next/server';
import type { AnchorApiResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function debugLog(runId: string, hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch('http://127.0.0.1:7285/ingest/7d3689ba-e0bb-4445-b1c6-22b2be5799a6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'377cbf'},body:JSON.stringify({sessionId:'377cbf',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

/**
 * POST /api/anchor
 *
 * Anchors a SHA-256 evidence hash to Solana via the Tether WDK.
 *
 * Uses @tetherto/wdk + @tetherto/wdk-wallet-solana for real on-chain writes.
 *
 * Environment variables required:
 *   WDK_SEED_PHRASE    — BIP-39 seed phrase for the operator wallet
 *   SOLANA_RPC_URL     — RPC endpoint (default: devnet)
 *   SOLANA_WS_URL      — WebSocket endpoint (default: devnet)
 *
 * The transaction embeds the hash as a Solana memo instruction via the
 * SPL Memo program. This is the canonical way to write arbitrary data
 * on-chain without a custom program.
 *
 * How to run on devnet (no real funds required):
 *   1. Set WDK_SEED_PHRASE in .env.local
 *   2. Run: solana airdrop 1 <your-address> --url devnet
 *   3. Hit this endpoint — hash appears as a memo in Solana Explorer
 */
export async function POST(req: NextRequest): Promise<NextResponse<AnchorApiResponse>> {
  const runId = `anchor-${Date.now().toString(36)}`;
  try {
    const body = await req.json();
    const { hash } = body as { hash?: string };

    if (!hash || typeof hash !== 'string' || hash.length !== 64) {
      debugLog(runId, 'H3', 'src/app/api/anchor/route.ts:43', 'Anchor rejected hash validation', {
        hashType: typeof hash,
        hashLength: typeof hash === 'string' ? hash.length : null,
      });
      return NextResponse.json({ success: false, error: 'Valid 64-char hex hash required.' } as any, { status: 400 });
    }

    // ── Validate environment ─────────────────────────────────────────────────
    const seedPhrase = process.env.WDK_SEED_PHRASE;
    const rpcUrl = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
    const wsUrl  = process.env.SOLANA_WS_URL  ?? 'wss://api.devnet.solana.com';

    if (!seedPhrase) {
      debugLog(runId, 'H3', 'src/app/api/anchor/route.ts:57', 'Missing seed phrase for anchoring', {
        hasRpc: Boolean(rpcUrl),
        hasWs: Boolean(wsUrl),
      });
      return NextResponse.json({
        success: false,
        error: 'WDK_SEED_PHRASE environment variable not set. Add it to .env.local to enable real anchoring.',
      } as any, { status: 503 });
    }

    // ── Dynamic import of WDK + Solana helpers ───────────────────────────────
    // We import dynamically to allow the file to compile even without the env
    const WDK = (await import('@tetherto/wdk')).default;
    const WalletManagerSolana = (await import('@tetherto/wdk-wallet-solana')).default;
    const { createSolanaRpc } = await import('@solana/rpc');
    const { address } = await import('@solana/addresses');
    const {
      createTransactionMessage,
      setTransactionMessageFeePayer,
      setTransactionMessageLifetimeUsingBlockhash,
      appendTransactionMessageInstruction,
    } = await import('@solana/transaction-messages');
    const { getUtf8Encoder } = await import('@solana/codecs-strings');

    // ── Initialise WDK with operator wallet ─────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wdk = new WDK(seedPhrase).registerWallet('solana', WalletManagerSolana as any, {
      rpcUrl,
      wsUrl,
    });

    const account = await wdk.getAccount('solana', 0);
    const senderAddress = await account.getAddress();
    console.log(`[/api/anchor] Anchoring from Solana address: ${senderAddress}`);

    const rpc = createSolanaRpc(rpcUrl);
    
    // Check balance to provide better error feedback
    const { value: balanceLamports } = await rpc.getBalance(address(senderAddress)).send();
    if (balanceLamports === 0n && rpcUrl.includes('devnet')) {
      return NextResponse.json({
        success: false,
        error: `Account ${senderAddress} has 0 SOL. Run 'solana airdrop 1 ${senderAddress} --url devnet' to enable anchoring.`,
      } as any, { status: 402 });
    }

    // ── Build memo transaction embedding the hash ────────────────────────────
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    const memoProgramId = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

    // Cast to avoid overly strict transaction size typing in @solana/kit types.
    let txMessage = createTransactionMessage({ version: 0 }) as any;
    txMessage = setTransactionMessageFeePayer(address(senderAddress), txMessage);
    txMessage = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, txMessage);
    txMessage = appendTransactionMessageInstruction({
      programAddress: address(memoProgramId),
      data: getUtf8Encoder().encode(hash),
    }, txMessage);

    const txResult = await account.sendTransaction(txMessage as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txId: string = (txResult as any).hash ?? (txResult as any).signature ?? String(txResult);
    const slot: number = typeof (txResult as any).slot === 'number' ? (txResult as any).slot : 0;
    const confirmedAt = Date.now();
    const network = rpcUrl.includes('mainnet') ? '' : '?cluster=devnet';
    const explorerUrl = `https://explorer.solana.com/tx/${txId}${network}`;

    console.log(`[/api/anchor] Confirmed! TxID: ${txId} | Slot: ${slot}`);
    debugLog(runId, 'H3', 'src/app/api/anchor/route.ts:112', 'Anchor transaction sent', {
      txId,
      slot,
      rpcUrl,
    });

    return NextResponse.json({
      success: true,
      txId,
      slot,
      hash,
      confirmedAt,
      explorerUrl,
    });

  } catch (err) {
    debugLog(runId, 'H3', 'src/app/api/anchor/route.ts:125', 'Anchor route threw error', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    console.error('[/api/anchor] Error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Anchoring failed.',
    } as any, { status: 500 });
  }
}
