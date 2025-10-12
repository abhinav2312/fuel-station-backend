// Test script to verify auto-seed data
const https = require('https');

const API_BASE = 'fuel-station-backend.onrender.com';

function makeRequest(method, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_BASE,
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function testSeedData() {
    console.log('🧪 Testing auto-seed data...\n');

    const endpoints = [
        { name: 'Tanks', path: '/api/tanks' },
        { name: 'Pumps', path: '/api/pumps' },
        { name: 'Clients', path: '/api/clients' },
        { name: 'Prices', path: '/api/prices' }
    ];

    let allGood = true;

    for (const endpoint of endpoints) {
        try {
            const response = await makeRequest('GET', endpoint.path);
            if (response.status === 200 && Array.isArray(response.data)) {
                const count = response.data.length;
                if (count > 0) {
                    console.log(`✅ ${endpoint.name}: ${count} items found`);
                } else {
                    console.log(`⚠️  ${endpoint.name}: No data found (auto-seed may not have run yet)`);
                    allGood = false;
                }
            } else {
                console.log(`❌ ${endpoint.name}: Error (${response.status})`);
                allGood = false;
            }
        } catch (error) {
            console.log(`❌ ${endpoint.name}: Failed to fetch - ${error.message}`);
            allGood = false;
        }
    }

    console.log('\n🎯 Test Results:');
    if (allGood) {
        console.log('✅ Auto-seed data is present! Your app should work now.');
    } else {
        console.log('⚠️  Auto-seed data is missing or incomplete.');
        console.log('💡 The backend may need to restart to run the auto-seed script.');
        console.log('🔄 Try redeploying your backend to trigger the auto-seed.');
    }
}

testSeedData();
