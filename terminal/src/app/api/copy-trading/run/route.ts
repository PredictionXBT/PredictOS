import { NextRequest, NextResponse } from 'next/server';
import { CopyTrader } from '@/lib/copy-trader';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get('target') || undefined;
    const isTest = searchParams.get('test') === 'true';
    const amountParam = searchParams.get('amount');
    
    // Parse and validate trade amount (default: 5 USDC)
    const tradeAmount = amountParam ? parseFloat(amountParam) : 5;
    if (isNaN(tradeAmount) || tradeAmount <= 0) {
        return NextResponse.json(
            { error: 'Invalid trade amount. Must be a positive number.' },
            { status: 400 }
        );
    }

    try {
        const trader = new CopyTrader();
        
        if (isTest) {
            const result = await trader.testExecution();
            return NextResponse.json({ success: true, data: result });
        }

        const result = await trader.run(target, tradeAmount);

        return NextResponse.json({ 
            success: true, 
            data: result 
        });
    } catch (error) {
        console.error('Copy Trading execution failed:', error);
        return NextResponse.json(
            { error: 'Failed to run copy trader', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
