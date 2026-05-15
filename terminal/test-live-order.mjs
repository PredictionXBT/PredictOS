// Test script to execute a real order on an active Polymarket market
import { PolymarketClient } from './src/lib/polymarket-client.js';
import { getSystemWallet, createPrivySigner } from './src/lib/privy-client.js';

async function testLiveOrder() {
    console.log('🧪 TESTING LIVE ORDER EXECUTION');
    console.log('='.repeat(80));

    try {
        // Step 1: Get bot wallet
        console.log('\n📍 Step 1: Getting bot wallet...');
        const wallet = await getSystemWallet();
        if (!wallet) {
            throw new Error('Failed to get bot wallet');
        }
        console.log(`✅ Bot Wallet: ${wallet.address}`);

        // Step 2: Create Privy signer
        console.log('\n📍 Step 2: Creating Privy signer...');
        const signer = await createPrivySigner(wallet.id, wallet.address);
        console.log('✅ Signer created');

        // Step 3: Initialize Polymarket client
        console.log('\n📍 Step 3: Initializing Polymarket client...');
        const polyClient = new PolymarketClient();
        await polyClient.initializeForWallet(wallet.address, signer);
        console.log('✅ Polymarket client initialized');

        // Step 4: Prepare test order
        console.log('\n📍 Step 4: Preparing test order...');
        const testOrder = {
            tokenId: "13018971792603393862521629014128024641178044618205296260525674415067194037856",
            conditionId: "0x49a20c7523c271099008f3ef9a31521263b24d637959852a391e6b4697b1a437",
            side: "BUY",
            price: 0.004,
            size: 1 // $1 USDC
        };

        console.log('📊 Order Details:');
        console.log(`   Market: Trump deportation 1-1.25M`);
        console.log(`   Side: ${testOrder.side}`);
        console.log(`   Price: $${testOrder.price}`);
        console.log(`   Size: ${testOrder.size} USDC`);
        console.log(`   Token ID: ${testOrder.tokenId.substring(0, 20)}...`);
        console.log(`   Condition ID: ${testOrder.conditionId}`);

        // Step 5: Execute order
        console.log('\n📍 Step 5: Executing order...');
        console.log('⏳ This may take a moment...\n');

        const response = await polyClient.postOrder(testOrder);

        // Step 6: Show results
        console.log('\n' + '='.repeat(80));
        console.log('🎉 ORDER EXECUTION RESULT');
        console.log('='.repeat(80));
        console.log('Response:', JSON.stringify(response, null, 2));

        if (response.orderID) {
            console.log('\n✅ SUCCESS! Order was created:');
            console.log(`   Order ID: ${response.orderID}`);
            console.log(`   Status: ${response.status || 'Pending'}`);
            if (response.transactionHash) {
                console.log(`   TX Hash: ${response.transactionHash}`);
            }
        } else {
            console.log('\n⚠️ Order response received but no Order ID');
        }

    } catch (error) {
        console.error('\n' + '='.repeat(80));
        console.error('❌ TEST FAILED');
        console.error('='.repeat(80));
        console.error('Error:', error.message);

        if (error.response) {
            console.error('API Response:', error.response);
        }

        // Provide helpful debugging info
        if (error.message?.includes('Unauthorized')) {
            console.error('\n💡 TIP: API credentials issue - try regenerating them');
        } else if (error.message?.includes('balance') || error.message?.includes('insufficient')) {
            console.error('\n💡 TIP: Insufficient USDC balance in wallet');
            console.error('   Deposit USDCe on Polygon to:', wallet?.address);
        } else if (error.message?.includes('orderbook')) {
            console.error('\n💡 TIP: Market orderbook issue - try a different market');
        }

        process.exit(1);
    }
}

// Run the test
testLiveOrder();
