// api/verify-token.js

export default async function handler(req, res) {
res.setHeader('Access-Control-Allow-Credentials', 'true');
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
res.setHeader(
  'Access-Control-Allow-Headers',
  'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
);

if (req.method === 'OPTIONS') {
  res.status(200).end();
  return;
}

if (req.method !== 'POST') {
  return res.status(405).json({ error: 'Method not allowed', verified: false });
}

const { token } = req.body;

if (!token) {
  return res.status(400).json({ verified: false, error: 'Token required' });
}

try {
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

  const searchResponse = await fetch(
    'https://api.hubapi.com/crm/v3/objects/contacts/search',
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
        properties: ['email', 'verification_token']
      })
    }
  );

  const searchData = await searchResponse.json();

  if (searchData.results && searchData.results.length > 0) {
    const contact = searchData.results[0];
    
    // Токен найден = доступ разрешён!
    return res.json({ 
      verified: true,
      email: contact.properties.email
    });
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
