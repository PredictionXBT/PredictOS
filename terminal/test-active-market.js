// Quick script to fetch active Polymarket markets
const fetch = require('node-fetch');

async function getActiveMarkets() {
    try {
        console.log('Fetching active markets from Polymarket...\n');

        // Use gamma API for better market data
        const response = await fetch('https://gamma-api.polymarket.com/markets?limit=20&active=true');
        const markets = await response.json();

        if (!markets || markets.length === 0) {
            console.log('No markets found');
            return;
        }

        console.log(`Found ${markets.length} active markets:\n`);
        console.log('='.repeat(80));

        markets.slice(0, 5).forEach((market, idx) => {
            console.log(`\n${idx + 1}. ${market.question}`);
            console.log(`   Market Slug: ${market.slug || market.market_slug}`);
            console.log(`   Condition ID: ${market.condition_id || market.conditionId}`);
            console.log(`   Active: ${market.active}`);
            console.log(`   End Date: ${market.end_date_iso || 'N/A'}`);

            if (market.tokens && market.tokens.length > 0) {
                console.log(`   Tokens:`);
                market.tokens.forEach(token => {
                    console.log(`     - ${token.outcome}: ${token.token_id}`);
                    console.log(`       Price: $${token.price || 'N/A'}`);
                });
            } else if (market.outcomes && Array.isArray(market.outcomes)) {
                console.log(`   Outcomes: ${market.outcomes.join(', ')}`);
            }
            console.log('-'.repeat(80));
        });

        // Show a recommended market for testing
        if (markets.length > 0) {
            const testMarket = markets[0];
            console.log('\n\n🎯 RECOMMENDED TEST MARKET:');
            console.log('='.repeat(80));
            console.log(`Question: ${testMarket.question}`);
            console.log(`Market Slug: ${testMarket.slug || testMarket.market_slug}`);
            console.log(`Condition ID: ${testMarket.condition_id || testMarket.conditionId}`);
            console.log(`End Date: ${testMarket.end_date_iso || 'N/A'}`);

            if (testMarket.tokens && testMarket.tokens.length > 0) {
                const token = testMarket.tokens[0];
                console.log(`\n✅ Test Order Parameters (Copy this):`);
                console.log(`{`);
                console.log(`  tokenId: "${token.token_id}",`);
                console.log(`  conditionId: "${testMarket.condition_id || testMarket.conditionId}",`);
                console.log(`  side: "BUY",`);
                console.log(`  price: ${token.price || 0.5},`);
                console.log(`  size: 1`);
                console.log(`}`);
            } else if (testMarket.clobTokenIds && testMarket.clobTokenIds.length > 0) {
                console.log(`\n✅ Test Order Parameters (Copy this):`);
                console.log(`{`);
                console.log(`  tokenId: "${testMarket.clobTokenIds[0]}",`);
                console.log(`  conditionId: "${testMarket.condition_id || testMarket.conditionId}",`);
                console.log(`  side: "BUY",`);
                console.log(`  price: 0.5,`);
                console.log(`  size: 1`);
                console.log(`}`);
            }
        }

    } catch (error) {
        console.error('Error fetching markets:', error.message);
        console.error('Stack:', error.stack);
    }
}

getActiveMarkets();
