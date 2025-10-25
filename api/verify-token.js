// api/verify-token.js

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, email } = req.body;

  if (!token) {
    return res.status(400).json({ verified: false, error: 'Token required' });
  }

  try {
    // HubSpot API credentials
    const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

    // Поиск контакта по токену
    const searchResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'verification_token',
                  operator: 'EQ',
                  value: token
                }
              ]
            }
          ],
          properties: ['email', 'email_verified', 'verification_token']
        })
      }
    );

    const searchData = await searchResponse.json();

    // Проверяем результаты
    if (searchData.results && searchData.results.length > 0) {
      const contact = searchData.results[0];
      
      // Проверяем что email совпадает (если передан)
      if (email && contact.properties.email !== email) {
        return res.json({ verified: false, error: 'Invalid token' });
      }

      // Проверяем что email подтверждён
      if (contact.properties.email_verified === 'true') {
        return res.json({ 
          verified: true,
          email: contact.properties.email
        });
      } else {
        return res.json({ verified: false, error: 'Email not verified' });
      }
    } else {
      return res.json({ verified: false, error: 'Invalid token' });
    }

  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ 
      verified: false, 
      error: 'Server error' 
    });
  }
}
