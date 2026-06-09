import axios from 'axios';

const WEBHOOK_URL = 'http://localhost:5000/api/v1/sms-webhooks/delivery/json-applink';

const payloads = [
  {
    name: 'EXPIRED',
    data: {
      "responseDateTime": "2023-06-04T00:51:54",
      "submitDateTime": "2023-06-03T12:46:42",
      "recipient": { "msisdn": "27821234567" },
      "responseType": "error",
      "status": {
        "code": -1,
        "reason": " SMSC Error: Message validity period has expired. stat:EXPIRED "
      },
      "correlator": "test_msg_expired"
    }
  },
  {
    name: 'BLACKLISTED',
    data: {
      "responseDateTime": "2023-06-04T07:00:04",
      "submitDateTime": "2023-06-04T07:00:03",
      "recipient": { "msisdn": "27821234567" },
      "responseType": "error",
      "status": {
        "code": -1,
        "reason": " Blacklisted msisdn: 27821234567, serviceCode: XXX000_APPLINK_HTTP_SMS. Message will not be sent. stat:BLACKLISTED "
      },
      "correlator": "test_msg_blacklisted"
    }
  },
  {
    name: 'UNDELIVERED',
    data: {
      "responseDateTime": "2023-06-04T01:07:16",
      "submitDateTime": "2023-06-03T11:37:05",
      "recipient": { "msisdn": "27821234567" },
      "responseType": "error",
      "status": {
        "code": -1,
        "reason": " SMSC Error: Message is undeliverable. stat:UNDELVR "
      },
      "correlator": "test_msg_undelivered"
    }
  },
  {
    name: 'DELIVERED',
    data: {
      "responseDateTime": "2023-06-04T00:52:00",
      "submitDateTime": "2023-06-04T00:52:00",
      "recipient": { "msisdn": "27821234567" },
      "responseType": "receipt",
      "status": {
        "code": 0,
        "reason": "Message is delivered to destination. stat:DELIVRD"
      },
      "correlator": "test_msg_delivered"
    }
  },
  {
    name: 'REPLY',
    data: {
      "responseDateTime": "2023-06-04T01:25:06",
      "recipient": { "msisdn": "27821234567" },
      "responseType": "reply",
      "response": "RENEW 8501015000081"
    }
  }
];

async function runTests() {
  console.log('--- Starting SMS Postback Verification ---');
  
  for (const payload of payloads) {
    try {
      console.log(`\nTesting ${payload.name}...`);
      const response = await axios.post(WEBHOOK_URL, payload.data, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, response.data);
    } catch (error: any) {
      console.error(`Error testing ${payload.name}:`, error.message);
      if (error.response) console.error('Response data:', error.response.data);
    }
  }
  
  console.log('\n--- Verification Finished ---');
}

runTests();
