export default async function handler(req, res) {
    // 1. CORS HEADERS (Prevents browser security from blocking the request)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { clientId, amount } = req.body;

    try {
        // 2. STRICT TOYYIBPAY PAYLOAD FORMATTING
        const formData = new URLSearchParams();
        formData.append('userSecretKey', process.env.TOYYIBPAY_SECRET_KEY);
        formData.append('categoryCode', process.env.TOYYIBPAY_CATEGORY_CODE);
        formData.append('billName', 'Falcon 100 Credits');
        formData.append('billDescription', 'Computation engine credits');
        formData.append('billPriceSetting', '1');
        formData.append('billPayorInfo', '0'); 
        formData.append('billAmount', (amount * 100).toString()); // RM9.00 -> 900
        formData.append('billReturnUrl', 'https://sumtying.com/falcon/');
        formData.append('billCallbackUrl', 'https://falcon-tawny.vercel.app/api/toyyibpay-webhook');
        formData.append('billExternalReferenceNo', clientId || 'guest');
        
        // ToyyibPay sometimes demands these fields even if billPayorInfo is 0. 
        // We inject generic data to prevent their server from rejecting it.
        formData.append('billTo', 'Sumtying Architect');
        formData.append('billEmail', 'sanjarshan.work@gmail.com');
        formData.append('billPhone', '0199241027');

        // 3. THE HANDSHAKE
        const response = await fetch('https://toyyibpay.com/index.php/api/createBill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });

        // Parse as raw text first so we don't crash if ToyyibPay sends an HTML error
        const textData = await response.text(); 
        console.log("ToyyibPay Raw Response:", textData); 

        const data = JSON.parse(textData);
        
        // 4. THE ROUTING
        if (data && data[0] && data[0].BillCode) {
            res.status(200).json({ url: `https://toyyibpay.com/${data[0].BillCode}` });
        } else {
            res.status(500).json({ error: 'Gateway rejected bill creation', details: data });
        }

    } catch (error) {
        console.error("Vercel Execution Error:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
