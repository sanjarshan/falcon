export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { clientId, amount } = req.body;

    try {
        const details = new URLSearchParams({
            userSecretKey: process.env.TOYYIBPAY_SECRET_KEY,
            categoryCode: process.env.TOYYIBPAY_CATEGORY_CODE,
            billName: 'Falcon 100 Credits',
            billDescription: 'Computation engine credits',
            billPriceSetting: 1, // Fixed price
            billPayorInfo: 0, // 0 = Don't force them to fill a long form
            billAmount: amount * 100, // ToyyibPay uses cents (900 = RM9.00)
            billReturnUrl: 'https://sumtying.com/falcon/', // Where they go after paying
            billCallbackUrl: 'https://falcon-tawny.vercel.app/api/toyyibpay-webhook', // Where ToyyibPay sends the receipt
            billExternalReferenceNo: clientId // This is the Google ID so we know who to credit!
        });

        const response = await fetch('https://toyyibpay.com/index.php/api/createBill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: details
        });

        const data = await response.json();
        
        if (data && data[0] && data[0].BillCode) {
            res.status(200).json({ url: `https://toyyibpay.com/${data[0].BillCode}` });
        } else {
            res.status(500).json({ error: 'Failed to generate ToyyibPay bill.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}